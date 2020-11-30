import buildQuery, { guid, Alias, alias } from './builder';
import { PlainObject } from './builder';
//import buildQuery from 'odata-query';

import { Types, Dates } from '../utils';

import { OptionHandler } from './query-options';
import { PATH_SEPARATOR } from '../constants';

export enum PathSegmentNames {
  batch = 'batch',
  metadata = 'metadata',
  entitySet = 'entitySet',
  singleton = 'singleton',
  type = 'type',
  property = 'property',
  navigationProperty = 'navigationProperty',
  reference = 'reference',
  value = 'value',
  count = 'count',
  function = 'function',
  action = 'action'
}

export enum SegmentOptionNames {
  key = 'key',
  parameters = 'parameters'
}

export type ODataSegment = {
  name: string;
  path: string;
  type: string;
  options: PlainObject;
}

function pathSegmentsBuilder(segment: ODataSegment): string {
  switch (segment.name) {
    case PathSegmentNames.function:
      let parameters = segment.options[SegmentOptionNames.parameters];
      return (parameters ?
        buildQuery({ func: { [segment.path]: parameters }}) :
        buildQuery({ func: segment.path})
      ).slice(1);
    default:
      let key = segment.options[SegmentOptionNames.key];
      if (typeof (key) === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(key)) {
        key = guid(key);
      }
      return segment.path + (key ? buildQuery({ key }) : "");
  }
}

export class ODataPathSegments {
  protected segments: ODataSegment[];

  constructor(segments?: ODataSegment[]) {
    this.segments = (segments || []).map(({name, path, type, options}) => ({name, path, type, options: options || {}}));
  }

  path(): string {
    let chunks = this.segments
      .map(pathSegmentsBuilder);
    return chunks.join(PATH_SEPARATOR);
  }

  types(): string[] {
    return this.segments.map(s => s.type).filter(t => !Types.isNullOrUndefined(t));
  }

  toString(): string {
    return this.path();
  }

  toJSON() {
    return this.segments.map(segment => {
      let json = <any>{ name: segment.name, path: segment.path, type: segment.type };
      let options = Dates.isoStringToDate(JSON.parse(JSON.stringify(segment.options)));
      if (!Types.isEmpty(options))
        json.options = options;
      return json;
    });
  }

  clone() {
    return new ODataPathSegments(this.toJSON());
  }

  find(name: string, path?: string) {
    // Backward search
    return [...this.segments].reverse().find(s =>
      s.name === name &&
      (Types.isUndefined(path) || s.path === path));
  }

  last() {
    return (this.segments.length > 0) ?
       new SegmentHandler(this.segments[this.segments.length - 1]) : null;
  }

  segment(name: string, path?: string) {
    let segment = this.find(name, path);
    if (!segment && path !== undefined) {
      segment = { name, path, options: {} } as ODataSegment;
      this.segments.push(segment);
    }
    if (segment === undefined)
      throw new Error(`No segment with name: ${name}`)
    return new SegmentHandler(segment);
  }

  has(name: string, path?: string) {
    return !!this.find(name, path);
  }

  remove(name: string, path?: string) {
    let segment = this.find(name, path);
    this.segments = this.segments.filter(s => s !== segment);
  }
}

export class SegmentHandler {
  options: PlainObject
  constructor(private segment: ODataSegment) {
    this.options = this.segment.options;
  }

  get name() {
    return this.segment.name;
  }

  get type() {
    return this.segment.type;
  }

  setType(value: string) {
    this.segment.type = value;
  }

  get path() {
    return this.segment.path;
  }

  setPath(value: string) {
    this.segment.path = value;
  }

  // Option Handler
  option<T>(type: SegmentOptionNames, opts?: T) {
    if (opts !== undefined)
      this.options[type] = opts;
    return new OptionHandler<T>(this.options, type as any);
  }

  // Aliases
  alias(name: string, value?: any): Alias {
    return alias(name, value);
  }
}
