import { ODataSettings } from '../settings';
import { PlainObject } from './types';
import { Types, Enums } from '../utils';
import { ODataRequest } from './requests';

export interface Key {
  name: string;
  ref: string; 
}

export interface Field {
  name: string;
  type: string;
  enum?: {[key: number]: string | number};
  schema?: Schema<any>;
  ctor?: { new(attrs: PlainObject | PlainObject[], query: ODataRequest<any>): any };
  enumString?: boolean;
  default?: any;
  maxLength?: number;
  isCollection?: boolean;
  isNullable?: boolean;
  isFlags?: boolean;
  isNavigation?: boolean;
  field?: string;
  ref?: string;
}

export interface Parser<T> {
  parse(value: any, query?: ODataRequest<any>): T;
  toJSON(value: T): any;
  parser<E>(name: string): Parser<E>;
  resolveKey(attrs: any);
}

const PARSERS = {
  'string': (value) => String(value),
  'number': (value) => Number(value),
  'boolean': (value) => Boolean(value),
  'Date': (value) => new Date(value),
};

class SchemaKey implements Key {
  name: string;
  ref: string;

  constructor(key: Key) {
    Object.assign(this, key);
  }

  attributes() {
    return {
      name: this.name,
      ref: this.ref
    }
  }

  resolve(attrs: PlainObject) {
    return this.ref.split('/').reduce((acc, name) => acc[name], attrs);
  }
}

class SchemaField<T> implements Field, Parser<T> {
  name: string;
  type: string;
  enum?: {[key: number]: string | number};
  schema?: Schema<any>;
  ctor?: { new(attrs: PlainObject | PlainObject[], query: ODataRequest<any>): T };
  enumString?: boolean;
  default?: any;
  maxLength?: number;
  isCollection?: boolean;
  isNullable?: boolean;
  isFlags?: boolean;
  isNavigation?: boolean;
  field?: string;
  ref?: string;

  constructor(field: Field) {
    Object.assign(this, field);
  }

  attributes() {
    return {
      name: this.name, type: this.type,
      default: this.default, maxLength: this.maxLength,
      isCollection: this.isCollection, isNullable: this.isNullable, isFlags: this.isFlags, 
      isNavigation: this.isNavigation,
      field: this.field,
      ref: this.ref
    }
  }

  parse(value: any, query?: ODataRequest<any>) {
    if (value === null) return value;
    if (this.enum) {
      return this.isFlags ?
        Enums.toFlags(this.enum, value) :
        Enums.toValue(this.enum, value);
    } else if (this.schema) {
      return (Array.isArray(value) && this.isCollection) ?
        value.map(v => this.schema.parse(v, query)) :
        this.schema.parse(value, query);
    } else if (this.ctor) {
      if (!value)
        value = this.isCollection ? [] : {};
      return new this.ctor(value, query);
    } else if (this.type in PARSERS) {
      return (Array.isArray(value) && this.isCollection) ?
        value.map(PARSERS[this.type]) :
        PARSERS[this.type](value);
    }
    return value;
  }

  toJSON(value: any) {
    if (value === null) return value;
    if (this.enum) {
      return this.isFlags ?
        Enums.toEnums(this.enum, value) :
        Enums.toEnum(this.enum, value);
    } else if (this.ctor) {
      return value.toJSON();
    } else if (this.schema) {
      return (Array.isArray(value) && this.isCollection) ?
        value.map(v => this.schema.toJSON(v)) :
        this.schema.toJSON(value);
    }
    return value;
  }

  parser<E>(name: string): Parser<E> {
    return this.schema ? this.schema.parser(name) : new Schema<E>();
  }

  resolveKey(attrs: any) {
    return this.schema ? this.schema.resolveKey(attrs) : attrs;
  }
}

export class Schema<Type> implements Parser<Type> {
  keys: SchemaKey[];
  fields: SchemaField<any>[];

  constructor(keys?: Key[], fields?: Field[]) {
    this.keys = (keys || []).map(k => new SchemaKey(k));
    this.fields = (fields || []).map(f => new SchemaField(f));
  }

  extend<Type>(keys?: Key[], fields?: Field[]): Schema<Type> {
    let Ctor = <typeof Schema>this.constructor;
    keys = [...this.keys.map(k => k.attributes()), 
      ...(keys || [])];
    fields = [...this.fields.map(f => f.attributes()), 
      ...(fields || [])];
    return new Ctor(keys, fields) as Schema<Type>;
  }

  configure(settings: ODataSettings) {
    this.fields.forEach(f => {
      if (f.type in settings.enums) {
        f.enum = settings.enums[f.type];
        f.enumString = settings.stringAsEnum; 
      } else if (f.type in settings.schemas) {
        f.schema = settings.schemas[f.type] as Schema<any>;
      } else if (f.type in settings.models) {
        f.ctor = settings.models[f.type];
      }
      else if (f.type in settings.collections) {
        f.ctor = settings.collections[f.type];
      }
    });
  }

  toJSON(obj: Partial<Type>): PlainObject {
    return Object.assign(obj, this.fields
      .filter(f => f.name in obj)
      .reduce((acc, f) => Object.assign(acc, { [f.name]: f.toJSON(obj[f.name]) }), {}) 
    );
  }

  parse(obj: any, query?: ODataRequest<any>): Type {
    return Object.assign(obj, this.fields
      .filter(f => f.name in obj)
      .reduce((acc, f) => Object.assign(acc, { [f.name]: f.parse(obj[f.name], query) }), {})
    ) as Type;
  }

  parser<E>(name: string): Parser<E> {
    return this.fields.find(f => f.name === name) as Parser<E>;
  }

  resolveKey(attrs: any) {
    let keys = this.keys
      .map(key => [key.name, key.resolve(attrs)]);
    let key = keys.length === 1 ?
      keys[0][1] :
      keys.reduce((acc, key) => Object.assign(acc, { [key[0]]: key[1] }), {});
    if (!Types.isEmpty(key))
      return key;
    return attrs;
  }


          /*
  relationships(obj: Type, query: ODataRequest<any>) {
    (obj as any).relationships = {};
    this.navigations().forEach(field => {
      Object.defineProperty(obj, field.name, {
        get() {
          if (!(field.name in this.relationships)) {
            let query: ODataEntityRequest<Type> | ODataNavigationPropertyRequest<Type> = this.query.clone();
            if (query instanceof ODataEntityRequest) {
              if (this.isNew())
                throw new Error(`Can't resolve ${field.name} relation from new entity`);
              query.key(this.resolveKey());
            }
            let nav = query.navigationProperty<any>(field.name);
            this.relationships[field.name] = field.parse(obj[field.name], nav);
          }
          return this.relationships[field.name];
        },
        set(value: Type | null) {
          if (field.isCollection)
            throw new Error(`Can't set ${field.name} to collection, use add`);
          if (!((value as any).query instanceof ODataEntityRequest))
            throw new Error(`Can't set ${value} to model`);
          this.relationships[field.name] = value;
          let query = this._query.clone() as ODataQueryBuilder;
          query.entityKey(this.resolveKey());
          query.navigationProperty(field.name);
          this._relationships[field.name] = this._context.createInstance(
            field.type, value !== null ? value.toJSON() : {}, query);
          this.setState(ModelState.Modified);
          this._relationships[field.name].setState(value !== null ? ModelState.Added : ModelState.Deleted);
        }
      });
    });
  }

          */
}