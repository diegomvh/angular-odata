import { ODataSettings } from '../settings';
import { PlainObject } from './types';
import { Types, Enums } from '../utils';
import { ODataEntityRequest, ODataRequest, ODataNavigationPropertyRequest } from './requests';

export interface Key {
  name: string;
  resolve?: (attrs: PlainObject) => number | string | PlainObject;
}

export interface Field {
  name: string;
  type: string;
  enum?: {[key: number]: string | number};
  schema?: Schema<any>;
  ctor?: { new(attrs: PlainObject | PlainObject[], query: ODataRequest<any>): any };
  default?: any;
  maxLength?: number;
  isCollection?: boolean;
  isNullable?: boolean;
  isFlags?: boolean;
  isNavigation?: boolean;
  field?: string;
  ref?: string;
}

const PARSERS = {
  'string': (value) => String(value),
  'number': (value) => Number(value),
  'boolean': (value) => Boolean(value),
  'Date': (value) => new Date(value),
};

export class Schema<Type> {
  keys: Key[];
  fields: Field[];
  stringAsEnums: boolean;

  constructor(keys?: Key[], fields?: Field[]) {
    this.keys = keys || [];
    this.fields = fields || [];
  }

  extend<Type>(keys?: Key[], fields?: Field[]): Schema<Type> {
    let Ctor = <typeof Schema>this.constructor;
    keys = [...this.keys, ...(keys || [])];
    fields = [...this.fields, ...(fields || [])];
    return new Ctor(keys, fields) as Schema<Type>;
  }

  configure(settings: ODataSettings) {
    this.stringAsEnums = !!settings.stringAsEnum;
    this.fields.forEach(f => {
      if (f.type in settings.enums) {
        f.enum = settings.enums[f.type];
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

  isEmpty() {
    return Types.isEmpty(this.keys) && Types.isEmpty(this.fields);
  }

  getField(name: string): Field {
    return this.fields.find(f => f.name === name);
  }

  resolveKey(attrs: PlainObject) {
    let keys = this.keys
      .map(key => [key.name, (key.resolve) ? key.resolve(attrs) : attrs[key.name]]);
    let key = keys.length === 1 ?
      keys[0][1] :
      keys.reduce((acc, key) => Object.assign(acc, { [key[0]]: key[1] }), {});
    if (!Types.isEmpty(key))
      return key;
  }

  isNew(attrs: PlainObject) {
    return !this.resolveKey(attrs);
  }

  navigations(): Field[] {
    return this.fields.filter(f => f.isNavigation);
  }

  properties(): Field[] {
    return this.fields.filter(f => !f.isNavigation);
  }

  schemaForField<E>(name: string): Schema<E> {
    let field = this.getField(name) as Field;
    if (field) 
      return field.schema as Schema<E>;
  }

  parse(field: Field, value: any, query?: ODataRequest<any>) {
    if (value === null) return value;
    if (field.enum) {
      return field.isFlags ?
        Enums.toFlags(field.enum, value) :
        Enums.toValue(field.enum, value);
    } else if (field.schema) {
      return (Array.isArray(value) && field.isCollection) ?
        value.map(v => field.schema.deserialize(v, query)) :
        field.schema.deserialize(value, query);
    } else if (field.ctor) {
      if (!value)
        value = field.isCollection ? [] : {};
      return new field.ctor(value, query);
    } else if (field.type in PARSERS) {
      return (Array.isArray(value) && field.isCollection) ?
        value.map(PARSERS[field.type]) :
        PARSERS[field.type](value);
    }
    return value;
  }

  toJSON(field: Field, value: any) {
    if (value === null) return value;
    if (field.enum) {
      return Enums.toString(field.enum, value);
    } else if (field.ctor) {
      return value.toJSON();
    } else if (field.schema) {
      return (Array.isArray(value) && field.isCollection) ?
        value.map(v => field.schema.serialize(v)) :
        field.schema.serialize(value);
    }
    return value;
  }

  serialize(obj: Partial<Type>): PlainObject {
    return Object.assign(obj, this.fields
      .filter(f => f.name in obj)
      .reduce((acc, f) => Object.assign(acc, { [f.name]: this.toJSON(f, obj[f.name]) }), {}) 
    );
  }

  deserialize(obj: PlainObject, query?: ODataRequest<any>): Type {
    return Object.assign(obj, this.fields
      .filter(f => f.name in obj)
      .reduce((acc, f) => Object.assign(acc, { [f.name]: this.parse(f, obj[f.name], query) }), {})
    ) as Type;
  }

  relationships(obj: Type, query: ODataRequest<any>) {
    let parse = this.parse;
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
            this.relationships[field.name] = parse(field, obj[field.name], nav);
          }
          return this.relationships[field.name];
        },
        set(value: Type | null) {
          if (field.isCollection)
            throw new Error(`Can't set ${field.name} to collection, use add`);
          if (!((value as any).query instanceof ODataEntityRequest))
            throw new Error(`Can't set ${value} to model`);
          this.relationships[field.name] = value;
          /*
          let query = this._query.clone() as ODataQueryBuilder;
          query.entityKey(this.resolveKey());
          query.navigationProperty(field.name);
          this._relationships[field.name] = this._context.createInstance(
            field.type, value !== null ? value.toJSON() : {}, query);
          this.setState(ModelState.Modified);
          this._relationships[field.name].setState(value !== null ? ModelState.Added : ModelState.Deleted);
          */
        }
      });
    });
  }
}