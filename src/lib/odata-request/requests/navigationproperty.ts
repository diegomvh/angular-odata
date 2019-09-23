import { ODataRefRequest } from './ref';
import { ODataSingleRequest } from './single';
import { ODataCollectionRequest } from './collection';
import { ODataRequest } from '../request';
import { Segments } from '../types';

export class ODataNavigationPropertyRequest<T> extends ODataRequest {
  ref() {
    let segments = this.segments.clone();
    segments.segment(Segments.ref, ODataRefRequest.$REF);
    return new ODataRefRequest(this.service, segments);
  }

  single() {
    return new ODataSingleRequest<T>(this.service, 
      this.segments.clone(), 
      this.options.clone());
  }

  collection() {
    return new ODataCollectionRequest<T>(this.service, 
      this.segments.clone(), 
      this.options.clone());
  }
}
