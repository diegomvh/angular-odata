import { Segments, Options } from '../types';
import { ODataClient } from '../../client';
import { ODataSegments } from '../segments';
import { ODataOptions } from '../options';
import { ODataRequest } from '../request';

export class ODataSingletonRequest<T> extends ODataRequest {

  // Factory
  static factory<T>(name: string, service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.singleton, name);
    options.keep(Options.format);
    return new ODataSingletonRequest<T>(service, segments, options);
  }
}
