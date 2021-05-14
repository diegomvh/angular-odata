import { Observable } from 'rxjs';
import { ODataVersionHelper } from './helpers';
export type EntityKey<T> = {
  readonly [P in keyof T]?: T[P];
} | string | number;

export type ODataVersion = '2.0' | '3.0' | '4.0';
export type FetchPolicy = 'cache-first' | 'cache-and-network' | 'network-only' | 'no-cache' | 'cache-only';
export type ODataMetadataType = 'minimal' | 'full' | 'none';
export type CacheCacheability = 'public' | 'private' | 'no-cache' | 'no-store';

export interface Options {
  version?: ODataVersion;
  metadata?: ODataMetadataType;
  stringAsEnum?: boolean;
  ieee754Compatible?: boolean;
  streaming?: boolean;
}

export interface OptionsHelper extends Options {
  helper: ODataVersionHelper;
}

export interface ApiOptions extends Options {
  params?: { [param: string]: string | string[] };
  headers?: { [param: string]: string | string[] };
  withCredentials?: boolean;
  //Headers
  etag?: {
    ifMatch?: boolean,
    ifNoneMatch?:boolean
  };
  prefer?: {
    maxPageSize?: number;
    return?: 'representation' | 'minimal';
    continueOnError?: boolean;
    includeAnnotations?: string;
  };
  fetchPolicy?: FetchPolicy;
}

export interface ResponseOptions extends Options {
  cacheability?: CacheCacheability;
  maxAge?: number;
}

export interface StructuredTypeFieldOptions extends OptionsHelper {
  field: StructuredTypeFieldConfig
}

export interface Parser<T> {
  deserialize(value: any, options: OptionsHelper): T;
  serialize(value: T, options: OptionsHelper): any;
}

export const NONE_PARSER = {
  deserialize: (value: any, options: OptionsHelper) => value,
  serialize: (value: any, options: OptionsHelper) => value,
} as Parser<any>;

export interface Cache<T> {
  put(key: string, payload: T, ...opts: any[]): void;
  get(key: string): T | undefined;
}

//#region Configs
export type ApiConfig = {
  serviceRootUrl: string;
  name?: string;
  version?: ODataVersion;
  default?: boolean;
  creation?: Date;
  cache?: Cache<any>;
  errorHandler?: (error: any, caught: Observable<any>) => Observable<never>;
  options?: ApiOptions;
  parsers?: {[type: string]: Parser<any>};
  schemas?: SchemaConfig[];
}
export type AnnotationConfig = {
  type: string;
  string?: string;
  bool?: boolean;
  int?: number;
  permissions?: string[];
  properties?: string[];
}
export type SchemaConfig = {
  namespace: string;
  alias?: string;
  annotations?: AnnotationConfig[];
  enums?: EnumTypeConfig<any>[];
  entities?: StructuredTypeConfig<any>[];
  callables?: CallableConfig[];
  containers?: EntityContainerConfig[]
}

export type EntityContainerConfig = {
  name: string;
  annotations?: AnnotationConfig[];
  entitySets?: EntitySetConfig[];
}

export type EnumTypeFieldConfig = {
  value: number;
  annotations?: AnnotationConfig[];
}

export type EnumTypeConfig<T> = {
  name: string;
  flags?: boolean;
  annotations?: AnnotationConfig[];
  members: {[name: string]: number} | {[value: number]: string};
  fields: { [member: string]: EnumTypeFieldConfig };
}

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
  referential?: string;
  referenced?: string;
}

export type StructuredTypeConfig<T> = {
  name: string;
  base?: string;
  open?: boolean;
  model?: { new(...params: any[]): any };
  collection?: { new(...params: any[]): any };
  annotations?: AnnotationConfig[];
  keys?: {ref: string, alias?: string}[],
  fields: { [P in keyof T]?: StructuredTypeFieldConfig };
}

export type Parameter = {
  type: string;
  nullable?: boolean;
  collection?: boolean;
}

export type CallableConfig = {
  name: string;
  entitySetPath?: string;
  bound?: boolean;
  composable?: boolean;
  parameters?: { [name: string]: Parameter };
  return?: {type: string, collection?: boolean};
}
export type EntitySetConfig = {
  name: string;
  entityType: string;
  service: { new(...params: any[]): any };
  annotations?: AnnotationConfig[];
}
//#endregion
