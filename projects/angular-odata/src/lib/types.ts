import { Observable } from 'rxjs';
import { ODataVersionHelper } from './helper';

export type ODataVersion = '2.0' | '3.0' | '4.0';
export type FetchPolicy =
  | 'cache-first'
  | 'cache-and-network'
  | 'network-only'
  | 'no-cache'
  | 'cache-only';
export type ODataMetadataType = 'minimal' | 'full' | 'none';
export type CacheCacheability = 'public' | 'private' | 'no-cache' | 'no-store';

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

export enum QueryOptionNames {
  select = 'select',
  expand = 'expand',
  compute = 'compute',
  filter = 'filter',
  search = 'search',
  transform = 'transform',
  orderBy = 'orderBy',
  top = 'top',
  skip = 'skip',
  skiptoken = 'skiptoken',
  format = 'format',
  count = 'count',
}

export interface Options {
  version?: ODataVersion;
  stringAsEnum?: boolean;
}

export interface ApiOptions extends Options {
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
  bodyQueryOptions?: QueryOptionNames[];
}

export interface OptionsHelper extends Options {
  helper: ODataVersionHelper;
  exponentialDecimals?: boolean;
  metadata?: ODataMetadataType;
  ieee754Compatible?: boolean;
  streaming?: boolean;
}

export interface ResponseOptions extends OptionsHelper {
  cacheability?: CacheCacheability;
  maxAge?: number;
}

export interface StructuredTypeFieldOptions extends OptionsHelper {
  field: StructuredTypeFieldConfig;
}

export interface Parser<T> {
  // Deserialize value/s from request body.
  deserialize(
    value: any,
    options?: OptionsHelper | StructuredTypeFieldOptions
  ): T;
  // Serialize value/s for request body.
  serialize(
    value: any,
    options?: OptionsHelper | StructuredTypeFieldOptions
  ): any;
  //Encode value/s for URL parameter or query-string.
  encode(value: any, options?: OptionsHelper | StructuredTypeFieldOptions): any;
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

export type EnumTypeFieldConfig = {
  value: number;
  annotations?: AnnotationConfig[];
};

export type EnumTypeConfig<T> = {
  name: string;
  flags?: boolean;
  annotations?: AnnotationConfig[];
  members: { [name: string]: number } | { [value: number]: string };
  fields: { [member: string]: EnumTypeFieldConfig };
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
  scale?: number;
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
