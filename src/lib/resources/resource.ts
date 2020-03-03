import { PlainObject, VALUE, entityAttributes } from '../types';
import { ODataClient } from '../client';
import { Parser, ODataSchema, ODataModel, ODataCollection } from '../models';

import { ODataPathSegments } from './segments';
import { ODataQueryOptions } from './options';
import { ODataEntityAnnotations, ODataCollectionAnnotations, ODataPropertyAnnotations, ODataAnnotations } from './responses';

export abstract class ODataResource<Type> {
  public static readonly QUERY_SEPARATOR = '?';

  // VARIABLES
   protected client: ODataClient;
   protected segments: ODataPathSegments;
   protected options: ODataQueryOptions;
   protected parser: Parser<Type> | null;

  constructor(
    client: ODataClient,
    segments?: ODataPathSegments,
    options?: ODataQueryOptions,
    parser?: Parser<Type>
  ) {
    this.client = client;
    this.segments = segments || new ODataPathSegments();
    this.options = options || new ODataQueryOptions();
    this.parser = parser;
  }

  type(): string {
    return this.parser.type;
  }

  schema() {
    return this.client.parserForType(this.type()) as ODataSchema<any>;
  }

  path(): string {
    return this.segments.path();
  }

  params(): PlainObject {
    return this.options.params();
  }

  serialize(obj: Type | Partial<Type>): any {
    return this.parser ? this.parser.toJSON(obj) : obj;
  }

  deserialize(attrs: any): Type | Type[] {
    return this.parser ? this.parser.parse(attrs) : attrs;
  }

  protected toEntity(body: any): [Type | null, ODataEntityAnnotations | null] {
    return body ? 
      [<Type>this.deserialize(entityAttributes(body)), ODataEntityAnnotations.factory(body)] :
      [null, null];
  }

  protected toEntities(body: any): [Type[] | null, ODataCollectionAnnotations | null] {
    return body ? 
      [<Type[]>this.deserialize(body[VALUE]), ODataCollectionAnnotations.factory(body)] :
      [null, null];
  }

  protected toValue(body: any): [Type | null, ODataPropertyAnnotations | null] {
    return body ? 
      [<Type>this.deserialize(body[VALUE]), ODataPropertyAnnotations.factory(body)] :
      [null, null];
  }

  // Model
  toModel<M extends ODataModel<Type>>(entity?: Partial<Type>, annots?: ODataAnnotations): M {
    let Model = this.client.modelForType(this.type());
    return new Model(this, entity, annots) as M;
  }

  toCollection<C extends ODataCollection<Type, ODataModel<Type>>>(entities?: Partial<Type>[], annots?: ODataAnnotations): C {
    let Collection = this.client.collectionForType(this.type());
    return new Collection(this, entities, annots) as C;
  }

  toString(): string {
    let path = this.path();
    let queryString = Object.entries(this.params())
      .map(e => `${e[0]}${ODataQueryOptions.VALUE_SEPARATOR}${e[1]}`)
      .join(ODataQueryOptions.PARAM_SEPARATOR);
    return queryString ? `${path}${ODataResource.QUERY_SEPARATOR}${queryString}` : path
  }

  clone<T>(
    type?: { new(client: ODataClient, segments: ODataPathSegments, options: ODataQueryOptions, parser: Parser<Type>): ODataResource<T>; }
  ): ODataResource<T> {
    if (!type) 
      type = this.constructor as { new(service: ODataClient, segments: ODataPathSegments, options: ODataQueryOptions, parser: Parser<Type>): ODataResource<T>; };
    return new type(this.client, this.segments.clone(), this.options.clone(), this.parser) as ODataResource<T>;
  };

  toJSON() {
    return {
      type: this.type(),
      segments: this.segments.toJSON(),
      options: this.options.toJSON()
    }
  }

  static fromJSON<T>(
    client: ODataClient, 
    json: {segments: any[], options: PlainObject},
    type?: { new(client: ODataClient, segments: ODataPathSegments, options: ODataQueryOptions, parser: Parser<T>): ODataResource<T>; },
    parser?: Parser<T>
  ): ODataResource<T> {
    if (!type) 
      type = this.constructor as { new(client: ODataClient, segments: ODataPathSegments, options: ODataQueryOptions, parser: Parser<T>): ODataResource<T>; };
    return new type(client, new ODataPathSegments(json.segments || []), new ODataQueryOptions(json.options || {}), parser) as ODataResource<T>;
  }

  is(type: string) {
    return this.segments.last().type === type;
  }
}