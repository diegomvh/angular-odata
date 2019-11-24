import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PlainObject, VALUE, ODATA_ANNOTATION_PREFIX } from '../types';
import { ODataClient } from '../client';
import { ODataSchema, Parser } from '../models';

import { ODataSegments } from './segments';
import { ODataCollection, ODataValue, ODataSingle } from './responses';
import { ODataOptions } from './options';
import { ODataAnnotations } from './responses/annotations';

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
    parser?: Parser<Type> | null
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
    return this.parser.toJSON(obj);
  }

  deserialize(attrs: any): Type | Type[] {
    return this.parser.parse(attrs) as Type | Type[];
  }

  toSingle(body: any): ODataSingle<Type> {
    let attrs = Object.keys(body).filter(k => !k.startsWith(ODATA_ANNOTATION_PREFIX))
      .reduce((acc, k) => Object.assign(acc, {[k]: body[k]}), {});
    let single: ODataSingle<Type> = <any>this.deserialize(attrs);
    single.annotations = new ODataAnnotations(body);
    return single;
  }

  toCollection(body: any): ODataCollection<Type> {
    let value = <any>this.deserialize(body[VALUE]);
    return {value, annotations: new ODataAnnotations(body)};
  }

  toValue(body: any): ODataValue<Type> {
    let value = <any>this.deserialize(body[VALUE]);
    return {value, annotations: new ODataAnnotations(body)};
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