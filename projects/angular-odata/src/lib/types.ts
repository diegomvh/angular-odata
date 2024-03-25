import { Observable } from 'rxjs';

export type ODataVersion = '2.0' | '3.0' | '4.0';
export type FetchPolicy =
  | 'cache-first'
  | 'cache-and-network'
  | 'network-only'
  | 'no-cache'
  | 'cache-only';
export type ODataMetadataType = 'minimal' | 'full' | 'none';
export type CacheCacheability = 'public' | 'private' | 'no-cache' | 'no-store';

export enum PathSegment {
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

export enum QueryOption {
  select = 'select',
  expand = 'expand',
  compute = 'compute',
  apply = 'apply',
  filter = 'filter',
  search = 'search',
  transform = 'transform',
  orderBy = 'orderBy',
  top = 'top',
  skip = 'skip',
  skiptoken = 'skiptoken',
  format = 'format',
  levels = 'levels',
  count = 'count',
}
export enum EdmType {
  //Edm.Guid 16-byte (128-bit) unique identifier
  Guid = 'Edm.Guid',
  //Edm.Int16 Signed 16-bit integer
  Int16 = 'Edm.Int16',
  //Edm.String Sequence of UTF-8 characters
  String = 'Edm.String',
  //Edm.Boolean Binary-valued logic
  Boolean = 'Edm.Boolean',
  //Edm.Byte Unsigned 8-bit integer
  Byte = 'Edm.Byte',
  //Edm.SByte Signed 8-bit integer
  SByte = 'Edm.SByte',
  //Edm.Int32 Signed 16-bit integer
  Int32 = 'Edm.Int32',
  //Edm.Int64 Signed 16-bit integer
  Int64 = 'Edm.Int64',
  //Edm.Date Date without a time-zone offset
  Date = 'Edm.Date',
  //Edm.TimeOfDay Clock time 00:00-23:59:59.999999999999
  TimeOfDay = 'Edm.TimeOfDay',
  //Edm.DateTimeOffset Date and time with a time-zone offset, no leap seconds
  DateTimeOffset = 'Edm.DateTimeOffset',
  //Edm.Duration Signed duration in days, hours, minutes, and (sub)seconds
  Duration = 'Edm.Duration',
  //Edm.Decimal Numeric values with fixed precision and scale
  Decimal = 'Edm.Decimal',
  //Edm.Double IEEE 754 binary64 floating-point number (15-17 decimal digits)
  Double = 'Edm.Double',
  //Edm.Single IEEE 754 binary32 floating-point number (6-9 decimal digits)
  Single = 'Edm.Single',
  //Edm.Binary Binary data
  Binary = 'Edm.Binary',
  //Edm.Stream Binary data stream
  Stream = 'Edm.Stream',
  //Edm.Geography Abstract base type for all Geography types
  Geography = 'Edm.Geography',
  //Edm.GeographyPoint A point in a round-earth coordinate system
  GeographyPoint = 'Edm.GeographyPoint',
  //Edm.GeographyLineString Line string in a round-earth coordinate system
  GeographyLineString = 'Edm.GeographyLineString',
  //Edm.GeographyPolygon Polygon in a round-earth coordinate system
  GeographyPolygon = 'Edm.GeographyPolygon',
  //Edm.GeographyMultiPoint Collection of points in a round-earth coordinate system
  GeographyMultiPoint = 'Edm.GeographyMultiPoint',
  //Edm.GeographyMultiLineString Collection of line strings in a round-earth coordinate system
  GeographyMultiLineString = 'Edm.GeographyMultiLineString',
  //Edm.GeographyMultiPolygon Collection of polygons in a round-earth coordinate system
  GeographyMultiPolygon = 'Edm.GeographyMultiPolygon',
  //Edm.GeographyCollection Collection of arbitrary Geography values
  GeographyCollection = 'Edm.GeographyCollection',
  //Edm.Geometry Abstract base type for all Geometry types
  Geometry = 'Edm.Geometry',
  //Edm.GeometryPoint Point in a flat-earth coordinate system
  GeometryPoint = 'Edm.GeometryPoint',
  //Edm.GeometryLineString Line string in a flat-earth coordinate system
  GeometryLineString = 'Edm.GeometryLineString',
  //Edm.GeometryPolygon Polygon in a flat-earth coordinate system
  GeometryPolygon = 'Edm.GeometryPolygon',
  //Edm.GeometryMultiPoint Collection of points in a flat-earth coordinate system
  GeometryMultiPoint = 'Edm.GeometryMultiPoint',
  //Edm.GeometryMultiLineString Collection of line strings in a flat-earth coordinate system
  GeometryMultiLineString = 'Edm.GeometryMultiLineString',
  //Edm.GeometryMultiPolygon Collection of polygons in a flat-earth coordinate system
  GeometryMultiPolygon = 'Edm.GeometryMultiPolygon',
  //Edm.GeometryCollection Collection of arbitrary Geometry values
  GeometryCollection = 'Edm.GeometryCollection',
}

export enum JsonType {
  string = 'string',
  number = 'number',
  integer = 'integer',
  object = 'object',
  array = 'array',
  boolean = 'boolean',
  null = 'null'
}

export interface ApiOptions {
  version?: ODataVersion;
  params?: { [param: string]: string | string[] };
  headers?: { [param: string]: string | string[] };
  withCredentials?: boolean;
  //Headers
  accept?: {
    exponentialDecimals?: boolean;
    metadata?: ODataMetadataType;
    ieee754Compatible?: boolean;
    streaming?: boolean;
  };
  etag?: {
    ifMatch?: boolean;
    ifNoneMatch?: boolean;
  };
  prefer?: {
    maxPageSize?: number;
    return?: 'representation' | 'minimal';
    continueOnError?: boolean;
    includeAnnotations?: string;
  };
  stripMetadata?: ODataMetadataType;
  fetchPolicy?: FetchPolicy;
  bodyQueryOptions?: QueryOption[];
  stringAsEnum?: boolean;
  //https://github.com/OData/WebApi/issues/1974
  //https://github.com/OData/WebApi/issues/1647
  deleteRefBy?: 'path' | 'id';
  //https://github.com/OData/AspNetCoreOData/issues/171
  nonParenthesisForEmptyParameterFunction?: boolean;
  jsonBatchFormat?: boolean;
  relativeUrls?: boolean;
}

export interface ParserOptions {
  version?: ODataVersion;
  exponentialDecimals?: boolean;
  metadata?: ODataMetadataType;
  ieee754Compatible?: boolean;
  streaming?: boolean;
  stringAsEnum?: boolean;
  deleteRefBy?: 'path' | 'id';
  nonParenthesisForEmptyParameterFunction?: boolean;
}

export interface ResponseOptions extends ParserOptions {
  cacheability?: CacheCacheability;
  maxAge?: number;
}

export interface StructuredTypeFieldOptions extends ParserOptions {
  field: StructuredTypeFieldConfig;
}

export interface Parser<T> {
  // Deserialize value/s from request body.
  deserialize(
    value: any,
    options?: ParserOptions | StructuredTypeFieldOptions
  ): T;
  // Serialize value/s for request body.
  serialize(
    value: any,
    options?: ParserOptions | StructuredTypeFieldOptions
  ): any;
  //Encode value/s for URL parameter or query-string.
  encode(value: any, options?: ParserOptions | StructuredTypeFieldOptions): any;
}

export interface FieldParser<T> extends Parser<T> {
  nullable?: boolean;
  default?: any;
  maxLength?: number;
  precision?: number;
  scale?: number | 'variable';
}

export const NONE_PARSER = {
  deserialize: (value: any) => value,
  serialize: (value: any) => value,
  encode: (value: any) => value,
} as Parser<any>;

export interface Cache {
  put<T>(key: string, payload: T, ...opts: any[]): void;
  get<T>(key: string, ...opts: any[]): T | undefined;
}

//#region Configs
export type ApiConfig = {
  serviceRootUrl: string;
  name?: string;
  version?: ODataVersion;
  default?: boolean;
  creation?: Date;
  cache?: Cache;
  errorHandler?: (error: any, caught: Observable<any>) => Observable<never>;
  options?: ApiOptions;
  parsers?: { [type: string]: Parser<any> };
  schemas?: SchemaConfig[];
};
export type AnnotationConfig = {
  term: string;
  string?: string;
  bool?: boolean;
  int?: number;
  permissions?: string[];
  properties?: string[];
};
export type SchemaConfig = {
  namespace: string;
  alias?: string;
  annotations?: AnnotationConfig[];
  enums?: EnumTypeConfig<any>[];
  entities?: StructuredTypeConfig<any>[];
  callables?: CallableConfig[];
  containers?: EntityContainerConfig[];
};

export type EntityContainerConfig = {
  name: string;
  annotations?: AnnotationConfig[];
  entitySets?: EntitySetConfig[];
};

export type EnumTypeFieldConfig<E> = {
  value: E;
  annotations?: AnnotationConfig[];
};

export type EnumTypeConfig<E> = {
  name: string;
  flags?: boolean;
  annotations?: AnnotationConfig[];
  members: { [name: string]: E } | { [value: number]: string };
  fields: { [member: string]: EnumTypeFieldConfig<E> };
};

export type StructuredTypeFieldConfig = {
  type: string;
  default?: any;
  maxLength?: number;
  key?: boolean;
  collection?: boolean;
  nullable?: boolean;
  navigation?: boolean;
  precision?: number;
  annotations?: AnnotationConfig[];
  scale?: number | 'variable';
  referentials?: { property: string; referencedProperty: string }[];
  referential?: string;
  referenced?: string;
};

export type StructuredTypeConfig<T> = {
  name: string;
  base?: string;
  open?: boolean;
  model?: { new (...params: any[]): any };
  collection?: { new (...params: any[]): any };
  annotations?: AnnotationConfig[];
  keys?: { name: string; alias?: string }[];
  fields: { [P in keyof T]?: StructuredTypeFieldConfig };
};

export type Parameter = {
  type: string;
  nullable?: boolean;
  collection?: boolean;
};

export type CallableConfig = {
  name: string;
  entitySetPath?: string;
  bound?: boolean;
  composable?: boolean;
  parameters?: { [name: string]: Parameter };
  return?: { type: string; collection?: boolean };
};
export type EntitySetConfig = {
  name: string;
  entityType: string;
  service: { new (...params: any[]): any };
  annotations?: AnnotationConfig[];
};
//#endregion
