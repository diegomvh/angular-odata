import buildQuery from 'odata-query';

import { Utils } from '../utils/utils';
import { SegmentHandler, ODataSegment, Segments } from './types';

export class ODataSegments {
  public static readonly PATHSEP = '/';

  protected segments: ODataSegment[];

  constructor(segments?: ODataSegment[]) {
    this.segments = segments || [];
  }

  path(): string {
    let segments = this.segments
      .map(segment => {
        if (segment.type == Segments.functionCall)
          return buildQuery({ func: { [segment.name]: segment.options } }).slice(1);
        return segment.name + buildQuery(segment.options);
      });
    return segments.join(ODataSegments.PATHSEP);
  }

  toJSON() {
    return this.segments.map(segment => ({ type: segment.type, name: segment.name, options: Object.assign({}, segment.options) }));
  }

  clone() {
    return new ODataSegments(this.toJSON());
  }

  // Handlersk
  protected findSegment(type: string, name?: string) {
    return this.segments.find(s => 
      s.type === type && 
      (Utils.isUndefined(name) || s.name === name));
  }

  protected wrapSegment(type: string, name?: string) {
    let segment = this.findSegment(type, name);
    if (!segment && !Utils.isUndefined(name)) {
      segment = { type, name, options: {} } as ODataSegment;
      this.segments.push(segment);
    }
    return new SegmentHandler(segment);
  }

  protected removeSegment(type: string, name?: string) {
    let segment = this.findSegment(type, name);
    this.segments = this.segments.filter(s => s !== segment);
  }

  last(): SegmentHandler {
    if (this.segments.length > 0)
      return new SegmentHandler(this.segments[this.segments.length - 1]);
  }

  segment(type: string, name?: string): SegmentHandler {
    return this.wrapSegment(type, name);
  }

  has(type: string, name?: string) {
    return !!this.findSegment(type, name);
  }
}