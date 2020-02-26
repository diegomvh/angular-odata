import { ODataSegments, Segments } from '../segments';
import { ODataOptions, Options } from '../options';
import { ODataClient } from '../../client';
import { PlainObject } from '../../types';
import { Parser } from '../../models';
import { ODataCallableResource } from './callable';

export class ODataFunctionResource<T> extends ODataCallableResource<T> {

  // Factory
  static factory<R>(name: string, service: ODataClient, opts?: {
      segments?: ODataSegments, 
      options?: ODataOptions,
      parser?: Parser<R>}
  ) {
    let segments = opts && opts.segments || new ODataSegments();
    let options = opts && opts.options || new ODataOptions();
    let parser = opts && opts.parser || null;

    segments.segment(Segments.functionCall, name);
    options.keep(Options.format);
    return new ODataFunctionResource<R>(service, segments, options, parser);
  }

  // Parameters
  parameters(opts?: PlainObject) {
    return this.segments.last().option(Options.parameters, opts);
  }
}
