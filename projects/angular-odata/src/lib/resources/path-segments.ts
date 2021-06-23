import { raw, buildPathAndQuery } from './builder';

import { Types, Dates } from '../utils';

import { PATH_SEPARATOR } from '../constants';
import { EntityKey } from './resource';

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
  action = 'action',
}

export type ODataSegment = {
  name: PathSegmentNames;
  path: string;
  type?: string;
  key?: any;
  parameters?: any;
};

function pathSegmentsBuilder(
  segment: ODataSegment
): [string, { [name: string]: any }] {
  if (segment.name === PathSegmentNames.function) {
    let [path, params] = segment.parameters
      ? buildPathAndQuery({ func: { [segment.path]: segment.parameters } })
      : buildPathAndQuery({ func: segment.path });
    if (path.startsWith(PATH_SEPARATOR)) {
      path = path.slice(1);
    }
    return [path, params];
  } else {
    let key = segment.key;
    if (
      typeof key === 'string' &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        key
      )
    ) {
      key = raw(key);
    }
    let [path, params] = key ? buildPathAndQuery({ key }) : ['', {}];
    return [segment.path + path, params];
  }
}

export class ODataPathSegments {
  protected segments: ODataSegment[];

  constructor(segments?: ODataSegment[]) {
    this.segments = segments || [];
  }

  pathAndParams(): [string, { [name: string]: any }] {
    const result = this.segments.reduce(
      (acc, segment) => {
        const [path, params] = pathSegmentsBuilder(segment);
        acc.paths.push(path);
        acc.params = Object.assign(acc.params, params);
        return acc;
      },
      { paths: [] as string[], params: {} as { [name: string]: any } }
    );
    return [result.paths.join(PATH_SEPARATOR), result.params];
  }

  types(): string[] {
    return this.segments
      .map((s) => s.type)
      .filter((t) => t !== undefined) as string[];
  }

  toString(): string {
    const [path, params] = this.pathAndParams();
    return (
      path +
      Object.entries(params)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}=${value}`)
        .join('&')
    );
  }

  toJSON() {
    return this.segments.map((segment) => {
      let json = <any>{ name: segment.name, path: segment.path };
      if (segment.type !== undefined) json.type = segment.type;
      if (segment.key !== undefined)
        json.key = Dates.isoStringToDate(
          JSON.parse(JSON.stringify(segment.key))
        );
      if (segment.parameters !== undefined)
        json.parameters = Dates.isoStringToDate(
          JSON.parse(JSON.stringify(segment.parameters))
        );
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

  last({ key = false }: { key?: boolean } = {}) {
    let segments = [...this.segments];
    if (key)
      segments = segments.filter(
        (s) =>
          [
            PathSegmentNames.entitySet,
            PathSegmentNames.navigationProperty,
            PathSegmentNames.property,
          ].indexOf(s.name) !== -1
      );
    return segments.length > 0
      ? new SegmentHandler(segments[segments.length - 1])
      : undefined;
  }

  add(name: string, path: string) {
    const segment = { name, path } as ODataSegment;
    this.segments.push(segment);
    return new SegmentHandler(segment);
  }

  get(name: string) {
    let segment = this.find((s) => s.name === name);
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
    if (value !== undefined) this.segment.type = value;
    return this.segment.type;
  }
  path(value?: string) {
    if (value !== undefined) this.segment.path = value;
    return this.segment.path;
  }
  key<T>(value?: EntityKey<T>) {
    if (value !== undefined) this.segment.key = value;
    return this.segment.key as EntityKey<T>;
  }
  hasKey() {
    return !Types.isEmpty(this.segment.key);
  }
  parameters<T>(value?: T) {
    if (value !== undefined) this.segment.parameters = value;
    return this.segment.parameters as T;
  }
  hasParameters() {
    return !Types.isEmpty(this.segment.parameters);
  }
}
