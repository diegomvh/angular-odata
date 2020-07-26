import { ODataResource } from '../resource';
import { ODataEntitiesAnnotations, ODataAnnotations, ODataEntityAnnotations, ODataValueAnnotations } from '../responses';
import { HttpOptions } from '../http-options';
import { Observable } from 'rxjs';
import { PathSegmentNames, SegmentOptionNames } from '../path-segments';
import { Types } from '../../utils';
import { ODataModel } from '../../models/model';
import { ODATA_CONTEXT, EntityKey } from '../../types';
import { ODataEntityParser } from '../../parsers';
import { Select, OrderBy, Transform, Expand, Filter, PlainObject } from '../builder';
import { QueryOptionNames } from '../query-options';

export abstract class ODataCallableResource<T> extends ODataResource<T> {
  toModel<M extends ODataModel<T>>(body: any): M {
    if (ODATA_CONTEXT in body) {
      let annots = ODataAnnotations.factory(body);
      return this.client.entitySet<T>(annots.context.set, annots.context.type || this.type()).toModel(body);
    }
    return super.toModel(body);
  }

  //#region Mutable Resource
  get segment() {
    const res = this;
    const client = this.client;
    const segments = this.pathSegments;
    return {
      entitySet(name?: string) {
        let segment = segments.segment(PathSegmentNames.entitySet);
        if (!segment)
          throw new Error(`CallableResource dosn't have segment for entitySet`);
        if (!Types.isUndefined(name))
          segment.setPath(name);
        return segment.path;
      },
      key(key?: EntityKey<T>) {
        let segment = segments.segment(PathSegmentNames.entitySet);
        if (!segment)
          throw new Error(`CallableResource dosn't have segment for key`);
        if (!Types.isUndefined(key)) {
          let parser = client.parserFor<T>(res);
          if (parser instanceof ODataEntityParser && Types.isObject(key))
            key = parser.resolveKey(key);
          segment.option(SegmentOptionNames.key, key);
        }
        return segment.option(SegmentOptionNames.key).value();
      }
    }
  }

  get query() {
    const options = this.queryOptions;
    return {
      select(opts?: Select<T>) {
        return options.option<Select<T>>(QueryOptionNames.select, opts);
      },
      expand(opts?: Expand<T>) {
        return options.option<Expand<T>>(QueryOptionNames.expand, opts);
      },
      transform(opts?: Transform<T>) {
        return options.option<Transform<T>>(QueryOptionNames.transform, opts);
      },
      search(opts?: string) {
        return options.option<string>(QueryOptionNames.search, opts);
      },
      filter(opts?: Filter) {
        return options.option<Filter>(QueryOptionNames.filter, opts);
      },
      orderBy(opts?: OrderBy<T>) {
        return options.option<OrderBy<T>>(QueryOptionNames.orderBy, opts);
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
      },
      custom(opts?: PlainObject) {
        return options.option<PlainObject>(QueryOptionNames.custom, opts);
      }
    }
  }
  //#endregion

  //#region Custom abstract calls
  abstract call(
    args: any | null, 
    responseType: 'property', 
    options?: HttpOptions
  ): Observable<[T, ODataValueAnnotations]>;

  abstract call(
    args: any | null, 
    responseType: 'entity', 
    options?: HttpOptions
  ): Observable<[T, ODataEntityAnnotations]>;

  abstract call(
    args: any | null, 
    responseType: 'entities', 
    options?: HttpOptions
  ): Observable<[T[], ODataEntitiesAnnotations]>;

  abstract call(
    args: any | null, 
    responseType: 'value' | 'property' | 'entity' | 'entities', 
    options?: HttpOptions
  ): Observable<any>;
  //#endregion
}