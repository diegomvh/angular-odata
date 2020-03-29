import { ODataResource } from '../resource';
import { EntityKey } from '../../types';
import { ODataEntitiesAnnotations, ODataAnnotations } from '../responses';
import { ODataToEntityResource } from './entity';

export abstract class ODataCallableResource<T> extends ODataResource<T> implements ODataToEntityResource<T> {
  entity(key?: EntityKey<T>, annots?: ODataAnnotations) {
    if (annots instanceof ODataEntitiesAnnotations) {
      return this.client.entitySet(annots.entitySet, this.type()).entity(key);
    }
  }
}