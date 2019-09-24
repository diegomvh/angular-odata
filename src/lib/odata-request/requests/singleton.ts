import { ODataSingleRequest } from './single';
import { Segments, PlainObject, ODataSegment } from '../types';
import { ODataService } from '../../odata-service/service';
import { ODataSegments } from '../segments';

export class ODataSingletonRequest<T> extends ODataSingleRequest<T> {
  static factory<T>(service: ODataService, name: string) {
    let segments = new ODataSegments();
    segments.segment(Segments.singleton, name);
    return new ODataSingletonRequest<T>(service, segments);
  }
}
