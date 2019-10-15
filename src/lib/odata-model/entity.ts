import { Schema, Field, Key } from './schema';
import { Enums } from '../utils/enums';
import { ODataNavigationPropertyRequest } from '../odata-request/requests/navigationproperty';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataRequest, ODataEntitySetRequest } from '../odata-request';
import { ODataEntitySet } from '../odata-response';
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
  static create<M>(opts: { keys?: EntityKey[], fields?: EntityField[] }): EntitySchema<M> {
    var keys = opts.keys || [];
    var fields = opts.fields || [];
    return Object.assign(new EntitySchema(), { keys, fields }) as EntitySchema<M>;
  }

  extend<M>(opts: { keys?: EntityKey[], fields?: EntityField[] }): EntitySchema<M> {
    let keys = [...this.keys, ...(opts.keys || [])];
    let fields = [...this.fields, ...(opts.fields || [])];
    return Object.assign(new EntitySchema(), { keys, fields }) as EntitySchema<M>;
  }

  configure(settings: ODataSettings) {
    super.configure(settings);
    this.fields.forEach(f => {
      if (f.type in settings.enums) {
        f.enum = settings.enums[f.type];
      } else if (f.type in settings.schemas) {
        f.schema = settings.schemas[f.type];
      }
    });
  }

  getField<E>(name: string): EntityField {
    return this.fields.find(f => f.name === name);
  }

  schemaForField<E>(name: string): EntitySchema<E> {
    let field = this.getField(name);
    if (field) 
      return ((field.schema === 'self') ? this : field.schema) as EntitySchema<E>;
  }

  parse(field: EntityField, value: any) {
    if (value === null) return value;
    if (field.enum) {
      return field.isFlags ?
        Enums.toFlags(field.enum, value) :
        Enums.toValue(field.enum, value);
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

export class EntityCollection<E> implements Iterable<E> {
  query: ODataEntitySetRequest<E> | ODataNavigationPropertyRequest<E>;
  schema: EntitySchema<E>;
  entities: E[];

  state: {
    records?: number,
    size?: number,
    page?: number,
    pages?: number
  } = {};

  constructor(entityset: ODataEntitySet<E>, query: ODataRequest, schema: EntitySchema<E>) {
    this.query = query as ODataEntitySetRequest<E> | ODataNavigationPropertyRequest<E>;
    this.schema = schema;
    this.state.page = 1;
    this.assign(entityset);
  }

  // Iterable
  public [Symbol.iterator]() {
    let pointer = 0;
    let entities = this.entities;
    return {
      next(): IteratorResult<E> {
        return {
          done: pointer === entities.length,
          value: entities[pointer++]
        };
      }
    }
  }

  assign(entitySet: ODataEntitySet<E>) {
    this.state.records = entitySet.count;
    this.state.size = entitySet.value.length;
    this.state.pages = Math.ceil(this.state.records / this.state.size);
    this.entities = entitySet.value.map(entity => this.schema.deserialize(entity));
    return this;
  }

  private fetch(): Observable<this> {
    if (this.state.size) {
      this.query.top(this.state.size);
      this.query.skip(this.state.size * (this.state.page - 1));
    }
    return this.query.get({ responseType: 'entityset', withCount: true })
      .pipe(
        map(set => set ? this.assign(set) : this)
      );
  }

  page(page: number) {
    this.state.page = page;
    return this.fetch();
  }

  firstPage() {
    return this.page(1);
  }

  previousPage() {
    return (this.state.page) ? this.page(this.state.page - 1) : this.fetch();
  }

  nextPage() {
    return (this.state.page) ? this.page(this.state.page + 1) : this.fetch();
  }

  lastPage() {
    return (this.state.pages) ? this.page(this.state.pages) : this.fetch();
  }

  setPageSize(size: number) {
    this.state.size = size;
    if (this.state.records) {
      this.state.pages = Math.ceil(this.state.records / this.state.size);
      if (this.state.page > this.state.pages)
        this.state.page = this.state.pages;
    }
  }
}
