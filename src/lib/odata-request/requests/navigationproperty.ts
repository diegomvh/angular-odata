import { ODataRequest } from '../request';
import { Segments } from '../types';

import { ODataRefRequest } from './ref';
import { ODataSingleRequest } from './single';
import { ODataCollectionRequest } from './collection';
import { ODataOptions } from '../options';
import { ODataSegments } from '../segments';
import { ODataService } from '../../odata-service';

export class ODataNavigationPropertyRequest<T> extends ODataRequest {

  static factory<T>(name: string, service: ODataService, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.navigationProperty, name);
    return new ODataNavigationPropertyRequest<T>(service, segments, options);
  }

  ref() {
    return ODataRefRequest.factory(
      this.service, 
      this.segments.clone(),
      this.options.clone()
    );
  }

  single() {
    return new ODataSingleRequest<T>(
      this.service, 
      this.segments.clone(), 
      this.options.clone()
    );
  }

  collection() {
    return new ODataCollectionRequest<T>(
      this.service, 
      this.segments.clone(), 
      this.options.clone()
    );
  }
}
