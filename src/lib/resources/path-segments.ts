import buildQuery from 'odata-query';

import { Types, isoStringToDate } from '../utils/index';
import { PlainObject } from '../types';

import { OptionHandler } from './query-options';

export enum SegmentTypes {
  batch = 'batch',
  metadata = 'metadata',
  entitySet = 'entitySet',
  singleton = 'singleton',
  typeName = 'typeName',
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

export type ODataSegment = {
  type: string;
  name: string;
  options: PlainObject;
}

const pathSegmentsBuilder = (segment: ODataSegment): string => {
  switch (segment.type) {
    case SegmentTypes.functionCall:
      let parameters = segment.options[SegmentOptionTypes.parameters];
      return (parameters ?
        buildQuery({ func: { [segment.name]: parameters } }) :
        buildQuery({ func: segment.name })
      ).slice(1);
    default:
      let key = segment.options[SegmentOptionTypes.key];
      if (typeof (key) === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(key)) {
        key = `${key}`;
      } else if (typeof (key) === 'string' && !(key.charAt(0) === key.charAt(key.length - 1) && ['"', "'"].indexOf(key.charAt(0)) !== -1)) {
        key = `'${key}'`;
      }
      return segment.name + (key ? buildQuery({ key }) : "");
  }
}

export class ODataPathSegments {
  public static readonly PATHSEP = '/';

  protected segments: ODataSegment[];

  constructor(segments?: ODataSegment[]) {
    this.segments = (segments || []).map(({type, name, options}) => ({type, name, options: options || {}}));
  }

  path(): string {
    let pathChunks = this.segments
      .map(pathSegmentsBuilder);
    return pathChunks.join(ODataPathSegments.PATHSEP);
  }

  toJSON() {
    return this.segments.map(segment => { 
      let json = <any>{ type: segment.type, name: segment.name };
      let options = isoStringToDate(JSON.parse(JSON.stringify(segment.options)));
      if (!Types.isEmpty(options))
        json.options = options;
      return json; 
    });
  }

  clone() {
    return new ODataPathSegments(this.toJSON());
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
    if (segment)
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

export class SegmentHandler {
  options?: PlainObject
  constructor(private segment: ODataSegment) {
    this.options = this.segment.options;
  }

  get type() {
    return this.segment.type;
  }

  get name() {
    return this.segment.name;
  }

  set name(value: string) {
    this.segment.name = value;
  }

  // Option Handler
  option<T>(type: SegmentOptionTypes, opts?: T) {
    if (!Types.isUndefined(opts))
      this.options[type] = opts;
    return new OptionHandler<T>(this.options, type as any);
  }
}
