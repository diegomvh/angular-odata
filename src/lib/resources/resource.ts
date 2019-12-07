import { PlainObject, VALUE, ODATA_ANNOTATION_PREFIX, entityAttributes, odataAnnotations } from '../types';
import { ODataClient } from '../client';
import { Parser, ODataSchema, ODataModel, ODataModelCollection } from '../models';

import { ODataSegments } from './segments';
import { ODataOptions } from './options';
import { ODataEntityAnnotations, ODataCollectionAnnotations, ODataAnnotations, ODataPropertyAnnotations } from './responses';

export abstract class ODataResource<Type> {
  public static readonly QUERY_SEPARATOR = '?';

  // VARIABLES
   protected client: ODataClient;
   protected segments: ODataSegments;
   protected options: ODataOptions;
   protected parser: Parser<Type> | null;

  constructor(
    client: ODataClient,
    segments?: ODataSegments,
    options?: ODataOptions,
    parser?: Parser<Type>
  ) {
    this.client = client;
    this.segments = segments || new ODataSegments();
    this.options = options || new ODataOptions();
    this.parser = parser;
  }

  type(): string {
    return this.parser.type;
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

  protected toCollection(body: any): [Type[] | null, ODataCollectionAnnotations | null] {
    return body ? 
      [<Type[]>this.deserialize(body[VALUE]), ODataCollectionAnnotations.factory(body)] :
      [null, null];
  }

  protected toProperty(body: any): [Type | null, ODataPropertyAnnotations | null] {
    return body ? 
      [<Type>this.deserialize(body[VALUE]), ODataPropertyAnnotations.factory(body)] :
      [null, null];
  }

  toString(): string {
    let path = this.path();
    let queryString = Object.entries(this.params())
      .map(e => `${e[0]}${ODataOptions.VALUE_SEPARATOR}${e[1]}`)
      .join(ODataOptions.PARAM_SEPARATOR);
    return queryString ? `${path}${ODataResource.QUERY_SEPARATOR}${queryString}` : path
  }

  clone<T>(
    type?: { new(client: ODataClient, segments: ODataSegments, options: ODataOptions, parser: Parser<Type>): ODataResource<T>; }
  ): ODataResource<T> {
    if (!type) 
      type = this.constructor as { new(service: ODataClient, segments: ODataSegments, options: ODataOptions, parser: Parser<Type>): ODataResource<T>; };
    return new type(this.client, this.segments.clone(), this.options.clone(), this.parser) as ODataResource<T>;
  };

  toJSON() {
    return {
      segments: this.segments.toJSON(),
      params: this.options.toJSON()
    }
  }

  static fromJSON<T>(
    client: ODataClient, 
    json: {segments: any[], options: PlainObject},
    type?: { new(client: ODataClient, segments: ODataSegments, options: ODataOptions, parser: Parser<T>): ODataResource<T>; },
    parser?: Parser<T>
  ): ODataResource<T> {
    if (!type) 
      type = this.constructor as { new(client: ODataClient, segments: ODataSegments, options: ODataOptions, parser: Parser<T>): ODataResource<T>; };
    return new type(client, new ODataSegments(json.segments || []), new ODataOptions(json.options || {}), parser) as ODataResource<T>;
  }

  is(type: string) {
    return this.segments.last().type === type;
  }
}