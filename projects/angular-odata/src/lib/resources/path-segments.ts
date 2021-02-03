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
  key?: any;
  parameters?: any;
}

function pathSegmentsBuilder(segment: ODataSegment): string {
  switch (segment.name) {
    case PathSegmentNames.function:
      const parameters = segment.parameters;
      return (parameters ?
        buildQuery({ func: { [segment.path]: parameters }}) :
        buildQuery({ func: segment.path})
      ).slice(1);
    default:
      let key = segment.key;
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
      if (segment.key !== undefined)
        json.key = Dates.isoStringToDate(JSON.parse(JSON.stringify(segment.key)));
      if (segment.parameters !== undefined)
        json.parameters = Dates.isoStringToDate(JSON.parse(JSON.stringify(segment.parameters)));
      return json;
    });
  }

  clone() {
    return new ODataPathSegments(this.toJSON());
  }

  find(predicate: (segment: ODataSegment) => boolean) {
    //Backward Find
    return [...this.segments].reverse().find(predicate);
  }

  last() {
    return (this.segments.length > 0) ?
       new SegmentHandler(this.segments[this.segments.length - 1]) : undefined;
  }

  add(name: string, path: string) {
    const segment = { name, path } as ODataSegment;
    this.segments.push(segment);
    return new SegmentHandler(segment);
  }

  get(name: string) {
    let segment = this.find(s => s.name === name);
    if (segment === undefined)
      throw Error(`No Segment for name ${name} was found`);
    return new SegmentHandler(segment);
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
      this.segment.key = value;
    return this.segment.key as T;
  }

  hasKey() {
    return !Types.isEmpty(this.segment.key);
  }

  parameters<T>(value?: T) {
    if (value !== undefined)
      this.segment.parameters = value;
    return this.segment.parameters as T;
  }

  hasParameters() {
    return !Types.isEmpty(this.segment.parameters);
  }

  // Aliases
  alias(name: string, value?: any): Alias {
    return alias(name, value);
  }
}
