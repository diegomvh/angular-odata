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
  schema?: EntitySchema<any>;
}

const PARSERS = {
  'string': (value) => String(value),
  'number': (value) => Number(value),
  'boolean': (value) => Boolean(value),
  'Date': (value) => new Date(value),
};

export class EntitySchema<E> extends Schema<EntityKey, EntityField, E> {
  configure(settings: ODataSettings) {
    super.configure(settings);
    this.fields.forEach((f: EntityField) => {
      if (f.type in settings.enums) {
        f.enum = settings.enums[f.type];
      } else if (f.type in settings.schemas) {
        f.schema = settings.schemas[f.type] as EntitySchema<any>;
      }
    });
  }

  schemaForField<E>(name: string): Schema<Key, Field, E> {
    let field = this.getField(name) as EntityField;
    if (field) 
      return field.schema as Schema<Key, Field, E>;
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
  private query: ODataEntitySetRequest<E> | ODataNavigationPropertyRequest<E>;
  private schema: EntitySchema<E>;
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
    this.setState({
      records: entityset.count, 
      page: 1, 
      size: entityset.skip || entityset.value.length
    })
  }

  private setState(state: {records?: number, page?: number, size?: number}) {
    if (state.records)
      this.state.records = state.records;
    if (state.page)
      this.state.page = state.page;
    if (state.size) {
      this.state.size = state.size;
      this.state.pages = Math.ceil(this.state.records / this.state.size);
    }
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

  private fetch(): Observable<this> {
    if (this.state.size) {
      this.query.top(this.state.size);
      let skip = this.state.size * (this.state.page - 1);
      if (skip)
        this.query.skip(skip);
    }
    return this.query.get({ responseType: 'entityset'})
      .pipe(
        map(set => {
          if (set) {
            if (set.skip) {
              this.setState({size: set.skip});
            }
            this.entities = set.value.map(entity => this.schema.deserialize(entity));
          }
          return this;
        }));
  }

  page(page: number) {
    this.setState({page});
    return this.fetch();
  }

  size(size: number) {
    this.setState({size});
    return this.page(1);
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

}
