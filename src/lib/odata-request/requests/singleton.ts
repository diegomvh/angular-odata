import { Segments } from '../types';
import { ODataService } from '../../odata-service/service';
import { ODataSegments } from '../segments';
import { ODataOptions } from '../options';

import { ODataSingleRequest } from './single';

export class ODataSingletonRequest<T> extends ODataSingleRequest<T> {

  static factory<T>(name: string, service: ODataService, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.singleton, name);
    return new ODataSingletonRequest<T>(service, segments, options);
  }
}
