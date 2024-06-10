import { PATH_SEPARATOR } from '../../constants';
import { Parser, ParserOptions, PathSegment } from '../../types';
import { Objects } from '../../utils';
import { buildPathAndQuery, raw } from '../query';
import { EntityKey } from '../resource';
import { SegmentHandler } from './handlers';

export type ODataSegment = {
  name: PathSegment;
  path: string;
  outgoingType?: string;
  incomingType?: string;
  key?: any;
  parameters?: any;
};

function pathSegmentsBuilder(
  segment: ODataSegment,
  escape: boolean = false,
  parser?: Parser<any>,
  options?: ParserOptions
): [string, { [name: string]: any }] {
  if (segment.name === PathSegment.function) {
    let [path, params] = segment.parameters
      ? buildPathAndQuery({
          func: { [segment.path]: segment.parameters },
          escape,
        })
      : buildPathAndQuery({ func: segment.path, escape });
    if (path.startsWith(PATH_SEPARATOR)) {
      path = path.slice(1);
    }
    // HACK: Remove parenthesis
    if (
      path.endsWith('()') &&
      options?.nonParenthesisForEmptyParameterFunction
    ) {
      path = path.substring(0, path.length - 2);
    }

    return [path, params];
  } else {
    //TODO: Parser key
    let key = segment.key;
    // HACK: Check guid string
    if (
      typeof key === 'string' &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        key
      )
    ) {
      key = raw(key);
    }
    let [path, params] = key ? buildPathAndQuery({ key, escape }) : ['', {}];
    return [segment.path + path, params];
  }
}

export const pathAndParamsFromSegments = (
  segments: ODataSegment[],
  {
    escape,
    parser,
    options,
  }: {
    escape?: boolean;
    parser?: Parser<any>;
    options?: ParserOptions;
  } = {}
): [string, { [name: string]: any }] => {
  const result = segments.reduce(
    (acc, segment) => {
      const [path, params] = pathSegmentsBuilder(
        segment,
        escape,
        parser,
        options
      );
      acc.paths.push(path);
      acc.params = Object.assign(acc.params, params);
      return acc;
    },
    { paths: [] as string[], params: {} as { [name: string]: any } }
  );
  return [result.paths.join(PATH_SEPARATOR), result.params];
};

export class ODataPathSegments {
  private _segments: ODataSegment[];

  constructor(segments?: ODataSegment[]) {
    this._segments = segments || [];
  }

  pathAndParams({
    escape,
    parser,
    options,
  }: {
    escape?: boolean;
    parser?: Parser<any>;
    options?: ParserOptions;
  } = {}): [string, { [name: string]: any }] {
    return pathAndParamsFromSegments(this._segments, {
      escape,
      parser,
      options,
    });
  }

  types({ key = false }: { key?: boolean } = {}): string[] {
    return this.segments({ key })
      .map((s) => s.outgoingType())
      .filter((t) => t !== undefined) as string[];
  }

  keys(values?: (EntityKey<any> | undefined)[]) {
    const segments = this.segments({ key: true });
    if (values !== undefined) {
      segments.forEach((segment, index) => {
        const key = values[index];
        if (key === undefined) {
          segment.clearKey();
        } else {
          segment.key(key);
        }
      });
    }
    return segments.map((s) => s.key() as EntityKey<any> | undefined);
  }

  toString({ escape }: { escape?: boolean } = {}): string {
    const [path, params] = this.pathAndParams({ escape });
    return (
      path +
      Object.entries(params)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}=${value}`)
        .join('&')
    );
  }

  toJson() {
    return this._segments.map((s) => {
      let json = {
        name: s.name as string,
        path: s.path,
      } as any;
      if (s.incomingType !== undefined) json.incomingType = s.incomingType;
      if (s.outgoingType !== undefined) json.outgoingType = s.outgoingType;
      if (s.key !== undefined) json.key = s.key;
      if (s.parameters !== undefined) json.parameters = s.parameters;
      return json;
    });
  }

  static fromJson(json: { [name: string]: any }[]): ODataPathSegments {
    return new ODataPathSegments(
      json.map((s: any) => ({
        name: s.name,
        path: s.path,
        type: s.type,
        key: s.key,
        parameters: s.parameters,
      }))
    );
  }

  clone() {
    const segments = Objects.clone(this._segments);
    return new ODataPathSegments(segments);
  }

  find(predicate: (segment: ODataSegment) => boolean) {
    //Backward Find
    return [...this._segments].reverse().find(predicate);
  }

  segments({ key = false }: { key?: boolean } = {}) {
    let segments = [...this._segments];
    if (key)
      segments = segments.filter(
        (s) =>
          [
            PathSegment.entitySet,
            PathSegment.navigationProperty,
            PathSegment.property,
          ].indexOf(s.name) !== -1
      );
    return segments.map((s) => new SegmentHandler(s));
  }

  first({ key = false }: { key?: boolean } = {}) {
    const segments = this.segments({ key });
    return segments.length > 0 ? segments[0] : undefined;
  }

  last({ key = false }: { key?: boolean } = {}) {
    const segments = this.segments({ key });
    return segments.length > 0 ? segments[segments.length - 1] : undefined;
  }

  add(name: string, path: string) {
    const segment = { name, path } as ODataSegment;
    this._segments.push(segment);
    return new SegmentHandler(segment);
  }

  get(name: string) {
    let segment = this.find((s) => s.name === name);
    if (segment === undefined)
      throw Error(`No Segment for name ${name} was found`);
    return new SegmentHandler(segment);
  }
}
