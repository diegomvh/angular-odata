import { ODataOptions } from '../options';
import { PlainObject, ODataSegment, Segments } from '../types';
import { ODataSegments } from '../segments';
import { ODataService } from '../../odata-service/odata.service';
import { ODataRefRequest } from './ref';
import { ODataSingleRequest } from './single';
import { ODataCollectionRequest } from './collection';

export class ODataNavigationPropertyRequest<T> {
  protected service: ODataService;
  protected segments: ODataSegments;
  protected options: ODataOptions;

  constructor(
    name: string,
    service: ODataService,
    segments?: ODataSegment[],
    options?: PlainObject
  ) {
    this.service = service;
    this.segments = new ODataSegments(segments || []);
    this.segments.segment(Segments.navigationProperty, name);
    this.options = new ODataOptions(options || {});
  }

  ref() {
    return new ODataRefRequest(this.service, 
      this.segments.toObject(), 
      this.options.toObject());
  }

  single() {
    return new ODataSingleRequest<T>(this.service, 
      this.segments.toObject(), 
      this.options.toObject());
  }

  collection() {
    return new ODataCollectionRequest<T>(this.service, 
      this.segments.toObject(), 
      this.options.toObject());
  }
}
