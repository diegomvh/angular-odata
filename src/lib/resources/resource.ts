import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  PlainObject,
  VALUE,
  entityAttributes,
  odataAnnotations,
  Parser,
  $COUNT
} from '../types';
import { ODataClient } from '../client';
import {
  ODataModel,
  ODataCollection
} from '../models';
import { Types } from '../utils';

import { ODataPathSegments } from './path-segments';
import {
  ODataQueryOptions,
  QueryOptionTypes
} from './query-options';
import {
  ODataValueAnnotations,
  ODataEntityAnnotations,
  ODataEntitiesAnnotations
} from './responses';
import { HttpOptions } from './http-options';

export class ODataResource<Type> {
  public static readonly QUERY_SEPARATOR = '?';

  // VARIABLES
  protected client: ODataClient;
  protected pathSegments: ODataPathSegments;
  protected queryOptions: ODataQueryOptions;
  protected parser: Parser<Type> | null;

  constructor(
    client: ODataClient,
    segments?: ODataPathSegments,
    options?: ODataQueryOptions,
    parser?: Parser<Type>
  ) {
    this.client = client;
    this.pathSegments = segments || new ODataPathSegments();
    this.queryOptions = options || new ODataQueryOptions();
    this.parser = parser;
  }

  type(): string {
    return this.parser && this.parser.type;
  }

  // Proxy to client
  entityConfigForType(type?: string) {
    return this.client.entityConfigForType<Type>(type || this.type());
  }

  parserForType(type?: string) {
    return this.client.parserForType(type || this.type());
  }

  modelForType(type?: string) {
    return this.client.modelForType(type || this.type());
  }

  collectionForType(type?: string) {
    return this.client.collectionForType(type || this.type());
  }

  path(): string {
    return this.pathSegments.path();
  }

  params(): PlainObject {
    return this.queryOptions.params();
  }

  protected applyType(type: string) {
    this.parser = this.parserForType(type);
  }

  protected serialize(obj: Type | Partial<Type>): any {
    return this.parser ? this.parser.toJSON(obj) : obj;
  }

  protected deserialize<T>(value: any): T {
    return this.parser ? this.parser.parse(value) : value;
  }

  // to<Thing>
  toEntity(body: any): [Type | null, ODataEntityAnnotations | null] {
    if (!body) return [null, null];
    let annots = ODataEntityAnnotations.factory(odataAnnotations(body));
    let type = (annots.context && annots.context.type) ? annots.context.type : annots.type;
    if (!Types.isNullOrUndefined(type) && type !== this.type())
      this.applyType(type);
    let attrs = entityAttributes(body);
    return [this.deserialize<Type>(attrs), annots];
  }

  toEntities(body: any): [Type[] | null, ODataEntitiesAnnotations | null] {
    if (!body) return [null, null];
    let annots = ODataEntitiesAnnotations.factory(odataAnnotations(body));
    let type = annots.context && annots.context.type || null;
    if (!Types.isNullOrUndefined(type) && type !== this.type())
      this.applyType(type);
    let value = body[VALUE];
    return [this.deserialize<Type[]>(value), annots];
  }

  toValue(body: any): [Type | null, ODataValueAnnotations | null] {
    if (!body) return [null, null];
    let annots = ODataValueAnnotations.factory(odataAnnotations(body));
    let value = body[VALUE];
    return [this.deserialize<Type>(value), annots];
  }

  toModel<M extends ODataModel<Type>>(body: any): M {
    let [entity, annots] = this.toEntity(body);
    let Model = this.modelForType();
    return new Model(entity, {resource: this, annotations: annots}) as M;
  }

  toCollection<C extends ODataCollection<Type, ODataModel<Type>>>(body: any): C {
    let [entities, annots] = this.toEntities(body);
    let Collection = this.collectionForType();
    return new Collection(entities, {resource: this, annotations: annots}) as C;
  }

  // Debug
  toString(): string {
    let path = this.path();
    let queryString = Object.entries(this.params())
      .map(e => `${e[0]}${ODataQueryOptions.VALUE_SEPARATOR}${e[1]}`)
      .join(ODataQueryOptions.PARAM_SEPARATOR);
    return queryString ? `${path}${ODataResource.QUERY_SEPARATOR}${queryString}` : path
  }

  clone(): ODataResource<Type> {
    let Ctor = <typeof ODataResource>this.constructor;
    return (new Ctor(this.client, this.pathSegments.clone(), this.queryOptions.clone(), this.parser)) as ODataResource<Type>;
  };

  toJSON() {
    let json = <any>{ path: this.pathSegments.toJSON() };
    let type = this.type();
    if (!Types.isNullOrUndefined(type))
      json.type = type;
    let options = this.queryOptions.toJSON();
    if (!Types.isEmpty(options))
      json.query = options;
    return json;
  }

  is(type: string) {
    return this.pathSegments.last().type === type;
  }

  // Query
  custom(opts?: PlainObject) {
    return this.queryOptions.option<PlainObject>(QueryOptionTypes.custom, opts);
  }

  alias(name: string, value?: any) {
    return this.queryOptions.alias(name, value);
  }

  // Base Requests
  protected request(
    method: string,
    options: HttpOptions & {
      body?: any | null,
      etag?: string,
      responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'value' | 'entity' | 'entities',
      withCount?: boolean
    }): Observable<any> {

    let params = options.params;
    if (options.withCount)
      params = this.client.mergeHttpParams(params, { [$COUNT]: 'true' })

    let responseType: 'arraybuffer' | 'blob' | 'json' | 'text' = 
      (options.responseType && ['value', 'entity', 'entities'].indexOf(options.responseType) !== -1) ? 
        'json' : 
        <'arraybuffer' | 'blob' | 'json' | 'text'>options.responseType;

    let res$ = this.client.request(method, this, {
      body: options.body,
      etag: options.etag,
      headers: options.headers,
      observe: 'body',
      params: params,
      responseType: responseType,
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
    switch (options.responseType) {
      case 'entity':
        return res$.pipe(map((body: any) => this.toEntity(body)));
      case 'entities':
        return res$.pipe(map((body: any) => this.toEntities(body)));
      case 'value':
        return res$.pipe(map((body: any) => this.toValue(body)));
      case 'json':
      case 'text':
        return res$.pipe(map((body: any) => this.deserialize(body) as Type));
      default:
        return res$;
    }
  }

  protected get(options: HttpOptions & { 
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'value' | 'entity' | 'entities', 
    withCount?: boolean
  }): Observable<any> {
    return this.request('GET', options);
  }

  protected post(body: any | null, options: HttpOptions & { 
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'value' | 'entity' | 'entities', 
    withCount?: boolean
  }): Observable<any> {
    return this.request('POST', Object.assign(options, { body }));
  }

  protected put(body: any | null, options: HttpOptions & {
    etag?: string, 
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'value' | 'entity' | 'entities', 
    withCount?: boolean 
  }): Observable<any> {
    return this.request('PUT', Object.assign(options, { body }));
  }

  protected patch(body: any | null, options: HttpOptions & {
    etag?: string, 
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'value' | 'entity' | 'entities', 
    withCount?: boolean
  }): Observable<any> {
    return this.request('PATCH', Object.assign(options, { body }));
  }

  protected delete(options: HttpOptions & {
    etag?: string, 
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'value' | 'entity' | 'entities', 
    withCount?: boolean
  }): Observable<any> {
    return this.request('DELETE', options);
  }
}