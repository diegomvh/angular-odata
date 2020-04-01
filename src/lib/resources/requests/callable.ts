import { ODataResource } from '../resource';
import { ODataEntitiesAnnotations, ODataAnnotations, ODataEntityAnnotations, ODataPropertyAnnotations } from '../responses';
import { HttpOptions } from '../http-options';
import { Observable } from 'rxjs';
import { SegmentTypes } from '../path-segments';
import { Types } from '../../utils';
import { ODataModel } from '../../models/model';
import { ODATA_CONTEXT, odataContext } from '../../types';

export abstract class ODataCallableResource<T> extends ODataResource<T> {
  toModel<M extends ODataModel<T>>(body: any): M {
    if (ODATA_CONTEXT in body) {
      let context = odataContext(body[ODATA_CONTEXT]);
      return this.client.entitySet<T>(context.set, context.type || this.type()).toModel(body);
    }
    return super.toModel(body);
  }

  // EntitySet
  entitySet(name?: string) {
    let segment = this.pathSegments.segment(SegmentTypes.entitySet);
    if (!segment)
      throw new Error(`EntityResourse dosn't have segment for entitySet`);
    if (!Types.isUndefined(name))
      segment.name = name;
    return segment.name;
  }

  abstract call(
    args: any | null, 
    responseType: 'property', 
    options?: HttpOptions
  ): Observable<[T, ODataPropertyAnnotations]>;

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
    responseType: 'json' | 'property' | 'entity' | 'entities', 
    options?: HttpOptions
  ): Observable<any>;
}