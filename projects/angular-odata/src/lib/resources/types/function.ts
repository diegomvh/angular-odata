import { Observable } from 'rxjs';

import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions, QueryOptionNames } from '../query-options';
import { HttpEntityOptions, HttpEntitiesOptions, HttpPropertyOptions, HttpOptions, HttpCallableOptions } from './options';

import { ODataEntity, ODataEntities, ODataProperty, ODataEntityAnnotations, ODataEntitiesAnnotations } from '../responses';
import { ODataApi } from '../../api';
import { map } from 'rxjs/operators';
import { ODataCollection } from '../../models/collection';
import { ODataModel } from '../../models/model';
import { Expand, Filter, OrderBy, Select, Transform } from '../builder';
import { ODataEntitySetResource } from './entity-set';
import { ODataEntityResource } from './entity';
import { ODataStructuredType } from '../../schema';
import { ODataResource } from '../resource';

export class ODataFunctionResource<P, R> extends ODataResource<R> {
  //#region Factory
  static factory<P, R>(api: ODataApi, path: string, type: string | undefined, segments: ODataPathSegments, options: ODataQueryOptions) {
    const segment = segments.add(PathSegmentNames.function, path);
    if (type)
      segment.type(type);
    options.clear();
    return new ODataFunctionResource<P, R>(api, segments, options);
  }

  clone() {
    return new ODataFunctionResource<P, R>(this.api, this.cloneSegments(), this.cloneQuery());
  }
  //#endregion

  asModel<M extends ODataModel<R>>(entity: Partial<R> | {[name: string]: any}, {annots, reset}: { annots?: ODataEntityAnnotations, reset?: boolean} = {}): M {
    let resource: ODataEntityResource<R> | undefined;
    // TODO: Structured Only?
    let schema: ODataStructuredType<R> | undefined;
    let type = annots?.type || this.returnType();
    if (type !== undefined) {
      schema = this.api.findStructuredTypeForType(type);
    }
    let Model = schema?.model || ODataModel;
    let path = annots?.context.entitySet;
    if (path !== undefined) {
      resource = ODataEntitySetResource.factory<R>(this.api, path, type, new ODataPathSegments(), this.cloneQuery())
        .entity(entity as Partial<R>);
    }
    return new Model(entity, {resource, annots, reset}) as M;
  }

  asCollection<M extends ODataModel<R>, C extends ODataCollection<R, M>>(
    entities: Partial<R>[] | {[name: string]: any}[],
    {annots, reset=false}: {annots?: ODataEntitiesAnnotations, reset?: boolean} = {}
  ): C {
    let resource: ODataEntitySetResource<R> | undefined;
    // TODO: Structured Only?
    let schema: ODataStructuredType<R> | undefined;
    let type = annots?.type || this.returnType();
    if (type !== undefined) {
      schema = this.api.findStructuredTypeForType(type);
    }
    let Collection = schema?.collection || ODataCollection;
    let path = annots?.context.entitySet;
    if (path !== undefined) {
      resource = ODataEntitySetResource.factory<R>(this.api, path, type, new ODataPathSegments(), this.cloneQuery());
    }
    return new Collection(entities, {resource, annots, reset}) as C;
  }

  //#region Action Config
  get schema() {
    let type = this.type();
    return (type !== undefined) ?
      this.api.findCallableForType<R>(type) :
      undefined;
  }
  //#endregion

  returnType() {
    return this.schema?.parser.return?.type;
  }

  //#region Mutable Resource
  get segment() {
    const segments = this.pathSegments;
    return {
      entitySet() {
        return segments.get(PathSegmentNames.entitySet);
      },
      singleton() {
        return segments.get(PathSegmentNames.singleton);
      },
      function() {
        return segments.get(PathSegmentNames.function);
      }
    }
  }

  get query() {
    const options = this.queryOptions;
    return {
      select(opts?: Select<R>) {
        return options.option<Select<R>>(QueryOptionNames.select, opts);
      },
      expand(opts?: Expand<R>) {
        return options.option<Expand<R>>(QueryOptionNames.expand, opts);
      },
      transform(opts?: Transform<R>) {
        return options.option<Transform<R>>(QueryOptionNames.transform, opts);
      },
      search(opts?: string) {
        return options.option<string>(QueryOptionNames.search, opts);
      },
      filter(opts?: Filter) {
        return options.option<Filter>(QueryOptionNames.filter, opts);
      },
      orderBy(opts?: OrderBy<R>) {
        return options.option<OrderBy<R>>(QueryOptionNames.orderBy, opts);
      },
      format(opts?: string) {
        return options.option<string>(QueryOptionNames.format, opts);
      },
      top(opts?: number) {
        return options.option<number>(QueryOptionNames.top, opts);
      },
      skip(opts?: number) {
        return options.option<number>(QueryOptionNames.skip, opts);
      },
      skiptoken(opts?: string) {
        return options.option<string>(QueryOptionNames.skiptoken, opts);
      }
    };
  }
  //#endregion


  //#region Inmutable Resource
  parameters(params: P | null, {alias}: {alias?:boolean} = {}) {
    const segments = this.cloneSegments();
    const segment = segments.get(PathSegmentNames.function);
    let parameters =  params !== null ? this.serialize(params) : null;
    if (alias && parameters !== null) {
      parameters = Object.entries(parameters).reduce((acc, [name, param]) => {
        return Object.assign(acc, {[name]: this.createAlias(name, param)});
      }, {});
    }
    segment.parameters(parameters);
    return new ODataFunctionResource<P, R>(this.api, segments, this.cloneQuery());
  }
  //#endregion

  //#region Requests
  get(options?: HttpEntityOptions): Observable<ODataEntity<R>>;
  get(options?: HttpEntitiesOptions): Observable<ODataEntities<R>>;
  get(options?: HttpPropertyOptions): Observable<ODataProperty<R>>;
  get(options?: HttpEntityOptions & HttpEntitiesOptions & HttpPropertyOptions): Observable<any> {
    return super.get(options);
  }
  //#endregion

  //#region Custom
  call(params: P | null, {alias, ...options}: {alias?:boolean} & HttpOptions = {}): Observable<any> {
    return this.parameters(params, {alias}).get(options) as Observable<any>;
  }

  callProperty(params: P | null, {alias, ...options}: {alias?:boolean} & HttpOptions = {}): Observable<R | null> {
    return this.parameters(params, {alias}).get({responseType: 'property', ...options}).pipe(map(({property}) => property));
  }

  callEntity(params: P | null, {alias, ...options}: {alias?:boolean} & HttpOptions = {}): Observable<R | null> {
    return this.parameters(params, {alias}).get({responseType: 'entity', ...options}).pipe(map(({entity}) => entity));
  }

  callModel(params: P | null, {alias, ...options}: {alias?:boolean} & HttpOptions = {}): Observable<ODataModel<R> | null> {
    return this.parameters(params, {alias}).get({responseType: 'entity', ...options}).pipe(map(({entity, annots}) => entity ? this.asModel(entity, {annots, reset: true}) : null));
  }

  callEntities(params: P | null, {alias, ...options}: {alias?:boolean} & HttpOptions = {}): Observable<R[] | null> {
    return this.parameters(params, {alias}).get({responseType: 'entities', ...options}).pipe(map(({entities}) => entities));
  }

  callCollection(params: P | null, {alias, ...options}: {alias?:boolean} & HttpOptions = {}): Observable<ODataCollection<R, ODataModel<R>> | null> {
    return this.parameters(params, {alias}).get({responseType: 'entities', ...options}).pipe(map(({entities, annots}) => entities ? this.asCollection(entities, { annots, reset: true }) : null));
  }
  //#endregion
}
