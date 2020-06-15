import { ODataResource } from '../resource';
import { ODataEntitiesAnnotations, ODataAnnotations, ODataEntityAnnotations, ODataValueAnnotations } from '../responses';
import { HttpOptions } from '../http-options';
import { Observable } from 'rxjs';
import { PathSegmentNames } from '../path-segments';
import { Types } from '../../utils';
import { ODataModel } from '../../models/model';
import { ODATA_CONTEXT } from '../../types';

export abstract class ODataCallableResource<T> extends ODataResource<T> {
  toModel<M extends ODataModel<T>>(body: any): M {
    if (ODATA_CONTEXT in body) {
      let annots = ODataAnnotations.factory(body);
      return this.client.entitySet<T>(annots.context.set, annots.context.type || this.type()).toModel(body);
    }
    return super.toModel(body);
  }

  // EntitySet
  entitySet(name?: string) {
    let segment = this.pathSegments.segment(PathSegmentNames.entitySet);
    if (!segment)
      throw new Error(`EntityResourse dosn't have segment for entitySet`);
    if (!Types.isUndefined(name))
      segment.setPath(name);
    return segment.path;
  }

  abstract call(
    args: any | null, 
    responseType: 'value', 
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
    responseType: 'json' | 'value' | 'entity' | 'entities', 
    options?: HttpOptions
  ): Observable<any>;
}