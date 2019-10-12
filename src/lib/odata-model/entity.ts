import { Schema, Field, Key } from './schema';
import { Enums } from '../utils/enums';
import { ODataSettings } from '../settings';

interface EntityKey extends Key {
}

interface EntityField extends Field {
  enum?: {[key: number]: string | number};
  schema?: EntitySchema<any> | 'self';
}

const PARSERS = {
  'string': (value) => String(value),
  'number': (value) => Number(value),
  'boolean': (value) => Boolean(value),
  'Date': (value) => new Date(value),
};

export class EntitySchema<E> extends Schema<EntityKey, EntityField, E> {
  static create<M>(opts: { keys?: EntityKey[], fields?: EntityField[] }) {
    var keys = opts.keys || [];
    var fields = opts.fields || [];
    return Object.assign(new EntitySchema(), { keys, fields }) as EntitySchema<M>;
  }

  extend<M extends E>(opts: { keys?: EntityKey[], fields?: EntityField[] }) {
    let Cotr = <typeof EntitySchema>this.constructor;
    let keys = [...this.keys, ...(opts.keys || [])];
    let fields = [...this.fields, ...(opts.fields || [])];
    return Object.assign(new Cotr(), { keys, fields }) as EntitySchema<M>;
  }

  configure(settings: ODataSettings) {
    super.configure(settings);
    this.fields.forEach(f => {
      if (f.type in settings.enums) {
        f.enum = settings.enums[f.type];
      } 
    });
  }

  parse(field: EntityField, value: any) {
    console.log(field);
    if (value === null) return value;
    if (field.enum) {
      return field.isFlags ?
        Enums.toFlags(field.enum, value) :
        Enums.toValues(field.enum, value);
    } else if (field.type in PARSERS) {
      return (Array.isArray(value) && field.isCollection) ?
        value.map(PARSERS[field.type]) :
        PARSERS[field.type](value);
    }
    return value;
  }

  toJSON(field: EntityField, value: any) {
    if (value === null) return value;
    if (field.enum) {
      return Enums.toString(field.enum, value);
    }
    return value;
  }

  serialize(entity: E): E {
    let properties = this.properties.filter(f => f.name in entity).reduce((acc, f) =>
      Object.assign(acc, { [f.name]: this.toJSON(f, entity[f.name]) }),
      {});
    Object.assign(entity, properties);
    return entity;
  }

  deserialize(entity: E): E {
    let properties = this.properties.filter(f => f.name in entity).reduce((acc, f) =>
      Object.assign(acc, { [f.name]: this.parse(f, entity[f.name]) }),
      {});
    Object.assign(entity, properties);
    return entity;
  }
}
