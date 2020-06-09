import buildQuery, { guid, Alias, alias } from './builder';
import { PlainObject } from './builder';
//import buildQuery from 'odata-query';

import { Types, isoStringToDate } from '../utils/index';

import { OptionHandler } from './query-options';
import { PATH_SEPARATOR } from '../types';

export enum SegmentTypes {
  batch = 'batch',
  metadata = 'metadata',
  entitySet = 'entitySet',
  singleton = 'singleton',
  type = 'type',
  property = 'property',
  navigationProperty = 'navigationProperty',
  ref = 'ref',
  value = 'value',
  count = 'count',
  functionCall = 'functionCall',
  actionCall = 'actionCall'
}

export enum SegmentOptionTypes {
  key = 'key',
  parameters = 'parameters'
}

type ODataSegment = {
  type: string;
  path: string;
  parse: string;
  options: PlainObject;
}

const pathSegmentsBuilder = (segment: ODataSegment): string => {
  switch (segment.type) {
    case SegmentTypes.functionCall:
      let parameters = segment.options[SegmentOptionTypes.parameters];
      return (parameters ?
        buildQuery({ func: { [segment.path]: parameters }}) :
        buildQuery({ func: segment.path})
      ).slice(1);
    default:
      let key = segment.options[SegmentOptionTypes.key];
      if (typeof (key) === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(key)) {
        key = guid(key);
      }
      return segment.path + (key ? buildQuery({ key }) : "");
  }
}

export class ODataPathSegments {
  protected segments: ODataSegment[];

  constructor(segments?: ODataSegment[]) {
    this.segments = (segments || []).map(({type, path, parse, options}) => ({type, path, parse, options: options || {}}));
  }

  path(): string {
    let chunks = this.segments
      .map(pathSegmentsBuilder);
    return chunks.join(PATH_SEPARATOR);
  }

  toJSON() {
    return this.segments.map(segment => { 
      let json = <any>{ type: segment.type, path: segment.path, parse: segment.parse };
      let options = isoStringToDate(JSON.parse(JSON.stringify(segment.options)));
      if (!Types.isEmpty(options))
        json.options = options;
      return json; 
    });
  }

  clone() {
    return new ODataPathSegments(this.toJSON());
  }

  find(type: string, path?: string) {
    // Backward search
    return [...this.segments].reverse().find(s =>
      s.type === type &&
      (Types.isUndefined(path) || s.path === path));
  }

  first(): SegmentHandler {
    if (this.segments.length > 0)
      return new SegmentHandler(this.segments[0]);
  }

  last(): SegmentHandler {
    if (this.segments.length > 0)
      return new SegmentHandler(this.segments[this.segments.length - 1]);
  }

  segment(type: string, path?: string): SegmentHandler {
    let segment = this.find(type, path);
    if (!segment && !Types.isUndefined(path)) {
      segment = { type, path: path, options: {} } as ODataSegment;
      this.segments.push(segment);
    }
    if (segment)
      return new SegmentHandler(segment);
  }

  has(type: string, path?: string) {
    return !!this.find(type, path);
  }

  remove(type: string, path?: string) {
    let segment = this.find(type, path);
    this.segments = this.segments.filter(s => s !== segment);
  }
}

class SegmentHandler {
  options?: PlainObject
  constructor(private segment: ODataSegment) {
    this.options = this.segment.options;
  }

  get type() {
    return this.segment.type;
  }

  get parse() {
    return this.segment.parse;
  }

  setParse(value: string) {
    this.segment.parse = value;
  }

  get path() {
    return this.segment.path;
  }

  setPath(value: string) {
    this.segment.path = value;
  }

  // Option Handler
  option<T>(type: SegmentOptionTypes, opts?: T) {
    if (!Types.isUndefined(opts))
      this.options[type] = opts;
    return new OptionHandler<T>(this.options, type as any);
  }

  // Aliases
  alias(name: string, value?: any): Alias {
    return alias(name, value);
  }
}
