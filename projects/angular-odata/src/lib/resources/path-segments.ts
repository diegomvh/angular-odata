import buildQuery, { guid, Alias, alias } from './builder';
import { PlainObject } from './builder';
//import buildQuery from 'odata-query';

import { Types, Dates } from '../utils';

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

export type ODataSegment = {
  name: string;
  path: string;
  type?: string;
  args?: any;
}

function pathSegmentsBuilder(segment: ODataSegment): string {
  switch (segment.name) {
    case PathSegmentNames.function:
      let parameters = segment.args;
      return (parameters ?
        buildQuery({ func: { [segment.path]: parameters }}) :
        buildQuery({ func: segment.path})
      ).slice(1);
    default:
      let key = segment.args;
      if (typeof (key) === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(key)) {
        key = guid(key);
      }
      return segment.path + (key ? buildQuery({ key }) : "");
  }
}

export class ODataPathSegments {
  protected segments: ODataSegment[];

  constructor(segments?: ODataSegment[]) {
    this.segments = segments || [];
  }

  path(): string {
    let chunks = this.segments
      .map(pathSegmentsBuilder);
    return chunks.join(PATH_SEPARATOR);
  }

  types(): string[] {
    return this.segments.map(s => s.type).filter(t => t !== undefined) as string[];
  }

  toString(): string {
    return this.path();
  }

  toJSON() {
    return this.segments.map(segment => {
      let json = <any>{ name: segment.name, path: segment.path };
      if (segment.type !== undefined)
        json.type = segment.type;
      if (segment.args !== undefined)
        json.args = Dates.isoStringToDate(JSON.parse(JSON.stringify(segment.args)));
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
      (path === undefined || s.path === path));
  }

  last() {
    return (this.segments.length > 0) ?
       new SegmentHandler(this.segments[this.segments.length - 1]) : undefined;
  }

  segment(name: string, path?: string) {
    let segment = this.find(name, path);
    if (!segment && path !== undefined) {
      segment = { name, path } as ODataSegment;
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
  constructor(private segment: ODataSegment) {}

  get name() {
    return this.segment.name;
  }

  type(value?: string) {
    if (value !== undefined)
      this.segment.type = value;
    return this.segment.type;
  }

  path(value?: string) {
    if (value !== undefined)
      this.segment.path = value;
    return this.segment.path;
  }

  key<T>(value?: T) {
    if (value !== undefined)
      this.segment.args = value;
    return this.segment.args as T;
  }

  hasKey() {
    return !Types.isEmpty(this.segment.args);
  }

  parameters<T>(value?: T) {
    if (value !== undefined)
      this.segment.args = value;
    return this.segment.args as T;
  }

  hasParameters() {
    return !Types.isEmpty(this.segment.args);
  }

  // Aliases
  alias(name: string, value?: any): Alias {
    return alias(name, value);
  }
}
