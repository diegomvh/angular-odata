import buildQuery from 'odata-query';

import { Types } from '../utils/types';
import { SegmentHandler, ODataSegment, Segments, Options } from './types';
import { ODataOptions } from './options';

export class ODataSegments {
  public static readonly PATHSEP = '/';

  protected segments: ODataSegment[];

  constructor(segments?: ODataSegment[]) {
    this.segments = segments || [];
  }

  path(): string {
    let segments = this.segments
      .map(segment => {
        switch (segment.type) {
          case Segments.functionCall:
            let parameters = segment.options[Options.parameters];
            return (parameters ? 
              buildQuery({ func: { [segment.name]: parameters } }) : 
              buildQuery(segment.name)
            ).slice(1);
          default:
            let key = segment.options[Options.key];
            if (typeof(key) === 'string' && !(key.charAt(0) === key.charAt(key.length-1) && ['"', "'"].indexOf(key.charAt(0)) !== -1)) key = `'${key}'`;
            return segment.name + (key ? buildQuery({key}) : "");
          }
      });
    return segments.join(ODataSegments.PATHSEP);
  }

  toJSON() {
    return this.segments.map(segment => ({ type: segment.type, name: segment.name, options: Object.assign({}, segment.options) }));
  }

  clone() {
    return new ODataSegments(this.toJSON());
  }

  find(type: string, name?: string) {
    return this.segments.find(s => 
      s.type === type && 
      (Types.isUndefined(name) || s.name === name));
  }

  last(): SegmentHandler {
    if (this.segments.length > 0)
      return new SegmentHandler(this.segments[this.segments.length - 1]);
  }

  segment(type: string, name?: string): SegmentHandler {
    let segment = this.find(type, name);
    if (!segment && !Types.isUndefined(name)) {
      segment = { type, name, options: {} } as ODataSegment;
      this.segments.push(segment);
    }
    return new SegmentHandler(segment);
  }

  has(type: string, name?: string) {
    return !!this.find(type, name);
  }

  remove(type: string, name?: string) {
    let segment = this.find(type, name);
    this.segments = this.segments.filter(s => s !== segment);
  }

}