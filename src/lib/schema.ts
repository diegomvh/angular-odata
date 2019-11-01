import { ODataSettings } from './settings';
import { Types, Enums } from './utils';
import { ODataResource, ODataNavigationPropertyResource, ODataPropertyResource, ODataEntityResource, ODataEntitySetResource } from './resources/requests';
import { PlainObject } from './types';

export interface Field {
  type: string;
  enum?: { [key: number]: string | number };
  schema?: Schema<any>;
  ctor?: { new(attrs: PlainObject | PlainObject[], query: ODataResource<any>): any };
  enumString?: boolean;
  default?: any;
  maxLength?: number;
  isKey?: boolean;
  isCollection?: boolean;
  isNullable?: boolean;
  isFlags?: boolean;
  isNavigation?: boolean;
  field?: string;
  ref?: string;
}

export interface Parser<T> {
  parse(value: any, query?: ODataResource<any>): T;
  toJSON(value: T): any;
  parser<E>(name: string): Parser<E>;
  resolveKey(attrs: any);
}

const PARSERS = {
  'Date': (value) => new Date(value),
};

class SchemaField<T> implements Field, Parser<T> {
  name: string;
  type: string;
  enum?: { [key: number]: string | number };
  schema?: Schema<any>;
  model?: { new(...any): any };
  collection?: { new(...any): any };
  enumString?: boolean;
  default?: any;
  maxLength?: number;
  isKey?: boolean;
  isCollection?: boolean;
  isNullable?: boolean;
  isFlags?: boolean;
  isNavigation?: boolean;
  field?: string;
  ref?: string;

  constructor(name: string, field: Field) {
    this.name = name;
    Object.assign(this, field);
  }

  resolve(value: any) {
    return this.ref.split('/').reduce((acc, name) => acc[name], value);
  }

  parse(value: any, query?: ODataResource<any>) {
    if (value === null) return value;
    if (this.enum) {
      return this.isFlags ?
        Enums.toFlags(this.enum, value) :
        Enums.toValue(this.enum, value);
    } else if (this.schema) {
      value = (Array.isArray(value) && this.isCollection) ?
        value.map(v => this.schema.parse(v, query)) :
        this.schema.parse(value, query);
      if (this.model) {
        let mq = (query as ODataNavigationPropertyResource<any>).entity();
        value = (Array.isArray(value) && this.isCollection) ?
          value.map(v => new this.model(v, mq)) :
          new this.model(value, mq);
      }
      if (this.collection)
        value = new this.collection(value, (query as ODataNavigationPropertyResource<any>).clone<any>());
      return value;
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
        Enums.toEnums(this.enum, value).join(", ") :
        Enums.toEnum(this.enum, value);
    } else if (this.model) {
      return value.toJSON();
    } else if (this.collection) {
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
  private fields: { [name: string]: SchemaField<any> };
  model?: { new(...any): any };

  constructor(fields?: { [name: string]: Field }) {
    this.fields = Object.entries(fields || {})
      .reduce((acc, [name, f]) => Object.assign(acc, { [name]: new SchemaField(name, f) }), {});
  }

  configure(type: string, settings: ODataSettings) {
    if (type in settings.models) {
      this.model = settings.models[type];
    }
    Object.values(this.fields).forEach(f => {
      if (f.type in settings.enums) {
        f.enum = settings.enums[f.type];
        f.enumString = settings.stringAsEnum;
      }
      if (f.type in settings.schemas) {
        f.schema = settings.schemas[f.type] as Schema<any>;
      }
      if (f.type in settings.models) {
        f.model = settings.models[f.type];
      }
      if (f.type in settings.collections) {
        f.collection = settings.collections[f.type];
      }
    });
  }

  toJSON(obj: Partial<Type>): any {
    return Object.assign(obj, Object.entries(this.fields)
      .filter(([name, f]) => name in obj)
      .reduce((acc, [name, f]) => Object.assign(acc, { [name]: f.toJSON(obj[name]) }), {})
    );
  }

  parse(obj: any, query?: ODataResource<any>): Type {
    let attrs = Object.assign(obj, Object.entries(this.fields)
      .filter(([name, f]) => name in obj)
      .reduce((acc, [name, f]) => Object.assign(acc, { [name]: f.parse(obj[name], query) }), {})
    );
    if (this.model) {
      return new this.model(attrs, (query as ODataEntitySetResource<any>).entity());
    }
    return attrs;
  }

  parser<E>(name: string): Parser<E> {
    return this.fields[name] as Parser<E>;
  }

  resolveKey(attrs: any) {
    let keys = Object.entries(this.fields)
      .filter(([name, f]) => f.isKey)
      .map(([name, f]) => [name, f.resolve(attrs)]);
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