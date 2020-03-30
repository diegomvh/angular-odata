import { ODataResource } from '../resource';
import { EntityKey } from '../../types';
import { ODataEntitiesAnnotations, ODataAnnotations, ODataEntityAnnotations, ODataPropertyAnnotations } from '../responses';
import { ODataToEntityResource } from './entity';
import { HttpOptions } from '../http-options';
import { Observable } from 'rxjs';
import { SegmentTypes } from '../path-segments';
import { Types } from '../../utils';

export abstract class ODataCallableResource<T> extends ODataResource<T> implements ODataToEntityResource<T> {
  entity(key?: EntityKey<T>, annots?: ODataAnnotations) {
    if (annots instanceof ODataEntitiesAnnotations) {
      return this.client.entitySet(annots.entitySet, this.type()).entity(key);
    }
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
    responseType: 'property' | 'entity' | 'entities', 
    options?: HttpOptions
  ): Observable<any>;
}