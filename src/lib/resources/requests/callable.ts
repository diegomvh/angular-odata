import { ODataResource } from '../resource';
import { EntityKey } from '../../types';
import { ODataCollectionAnnotations, ODataAnnotations } from '../responses';

export class ODataCallableResource<T> extends ODataResource<T> {
  // Segments
  entity(key?: EntityKey<T>, annots?: ODataAnnotations) {
    if (annots instanceof ODataCollectionAnnotations) {
      return this.client.entitySet(annots.entitySet, this.type()).entity(key);
    }
  }
}