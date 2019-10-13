import { Schema, Field, Key } from './schema';
import { Enums } from '../utils/enums';
import { ODataNavigationPropertyRequest } from '../odata-request/requests/navigationproperty';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ODataRequest, ODataEntitySetRequest } from '../odata-request';
import { ODataEntitySet } from '../odata-response';

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
  shcema: EntitySchema<E>;
  entities: E[];

  state: {
    page?: number,
    pages?: number,
    size?: number,
    records?: number,
  };

  constructor(entityset: ODataEntitySet<E>, schema: EntitySchema<E>, query: ODataRequest) {
    this.query = query as ODataEntitySetRequest<E> | ODataNavigationPropertyRequest<E>;
    this.shcema = schema;
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
    let skip = entitySet.skip;
    if (skip)
      this.state.size = skip;
    if (this.state.size)
      this.state.pages = Math.ceil(this.state.records / this.state.size);
    this.entities = entitySet.entities.map(entity => this.shcema.deserialize(entity));
    return this;
  }

  private fetch(): Observable<this> {
    if (!this.state.page)
      this.state.page = 1;
    if (this.state.size) {
      this.query.top(this.state.size);
      this.query.skip(this.state.size * (this.state.page - 1));
    }
    return this.query.get({ responseType: 'entityset', withCount: true })
      .pipe(
        map(set => set ? this.assign(set) : this)
      );
  }

  getPage(page: number) {
    this.state.page = page;
    return this.fetch();
  }

  getFirstPage() {
    return this.getPage(1);
  }

  getPreviousPage() {
    return (this.state.page) ? this.getPage(this.state.page - 1) : this.fetch();
  }

  getNextPage() {
    return (this.state.page) ? this.getPage(this.state.page + 1) : this.fetch();
  }

  getLastPage() {
    return (this.state.pages) ? this.getPage(this.state.pages) : this.fetch();
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
