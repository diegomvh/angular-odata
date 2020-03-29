import { ODataResource } from '../resource';
import { EntityKey } from '../../types';
import { ODataEntitiesAnnotations, ODataAnnotations, ODataEntityAnnotations, ODataPropertyAnnotations } from '../responses';
import { ODataToEntityResource } from './entity';
import { HttpOptions } from '../http-options';
import { Observable } from 'rxjs';

export abstract class ODataCallableResource<T> extends ODataResource<T> implements ODataToEntityResource<T> {
  entity(key?: EntityKey<T>, annots?: ODataAnnotations) {
    if (annots instanceof ODataEntitiesAnnotations) {
      return this.client.entitySet(annots.entitySet, this.type()).entity(key);
    }
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