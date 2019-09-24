import { Segments } from '../types';
import { ODataService } from '../../odata-service/service';
import { ODataSegments } from '../segments';

import { ODataSingleRequest } from './single';

export class ODataSingletonRequest<T> extends ODataSingleRequest<T> {
  static factory<T>(service: ODataService, name: string) {
    let segments = new ODataSegments();
    segments.segment(Segments.singleton, name);
    return new ODataSingletonRequest<T>(service, segments);
  }
}
