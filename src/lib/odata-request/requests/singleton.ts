import { ODataSingleRequest } from './single';
import { Segments, PlainObject, ODataSegment } from '../types';
import { ODataService } from '../../odata-service/odata.service';

export class ODataSingletonRequest<T> extends ODataSingleRequest<T> {
  constructor(
    name: string,
    service: ODataService,
    segments?: ODataSegment[],
    options?: PlainObject
  ) {
    super(service, segments, options);
    this.segments.segment(Segments.singleton, name);
  }
}
