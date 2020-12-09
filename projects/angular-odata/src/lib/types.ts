export type EntityKey<T> = {
  readonly [P in keyof T]?: T[P];
} | string | number;

export type ODataContext = {
  metadata?: string;
  singleton?: string;
  entitySet?: string;
  property?: string;
  entity?: string;
}

// JSON SCHEMA
type JsonSchemaSelect<T> = Array<keyof T>;
type JsonSchemaOrder<T> = Array<keyof T>;
type JsonSchemaExpand<T> = {[P in keyof T]?: JsonSchemaConfig<T[P]> };

export type JsonSchemaExpandOptions<T> = {
  select?: JsonSchemaSelect<T>;
  order?: JsonSchemaOrder<T>;
  expand?: JsonSchemaExpand<T>;
}

export type JsonSchemaConfig<T> = JsonSchemaExpandOptions<T>;

export interface Annotation {
  type: string;
  string?: string;
  bool?: boolean;
  int?: number;
  permissions?: string[];
}
export interface StructuredTypeField {
  type: string;
  default?: any;
  maxLength?: number;
  key?: boolean;
  collection?: boolean;
  nullable?: boolean;
  navigation?: boolean;
  field?: string;
  precision?: number;
  annotations?: Annotation[];
  scale?: number;
  ref?: string;
}

export interface EnumTypeField {
  value: number;
  annotations?: Annotation[];
}

/* Api Options
  version:
  metadata:
  params:
  headers:
  stringAsEnum:
  ieee754Compatible:
  fetchPolicy:
    note: from Apollo https://medium.com/@galen.corey/understanding-apollo-fetch-policies-705b5ad71980
    cache-first:
      1 You query for some data. Client checks the cache for the data.
        If all of the data is present in the cache, skip directly to step 4.
      2 If the cache is missing some of the data you asked for,
        Client will make a network request to your API.
      3 The API responds with the data, Client uses it to update the cache.
      4 The requested data is returned.
    cache-and-network:
      1 You query for some data. Client checks the cache for the data.
      2 If the data is in the cache, return that cached data.
      3 Regardless of whether any data was found in step two,
        pass the query along to the API to get the most up-to-date data.
      4 Update the cache with any new data from the API.
      5 Return the updated API data.
    network-only:
      1 Client makes a network request for your data without checking the cache.
      2 The server responds with your data and the cache is updated.
      3 The data is returned.
    no-cache:
      1 Client makes a network request for your data without checking the cache.
      2 The server responds and the data is returned without updating the cache.
    cache-only:
      1 Client checks the cache for queried data.
      2 If all the data is present in the cache, it is returned (otherwise, an error is thrown).
*/
export type ODataVersion = '2.0' | '3.0' | '4.0';
export type FetchPolicy = 'cache-first' | 'cache-and-network' | 'network-only' | 'no-cache' | 'cache-only';
export type ODataMetadataType = 'minimal' | 'full' | 'none';
export interface Options {
  version?: ODataVersion;
  metadata?: ODataMetadataType;
  params?: { [param: string]: string | string[] };
  headers?: { [param: string]: string | string[] };
  withCredentials?: boolean;
  stringAsEnum?: boolean;
  ieee754Compatible?: boolean;
  fetchPolicy?: FetchPolicy;
}

export interface StructuredTypeFieldOptions extends Options {
  field: StructuredTypeField
}

export interface Parser<T> {
  deserialize(value: any, options: Options): T;
  serialize(value: T, options: Options): any;
}

export interface CacheStorage {
  put(key: any, value: any): any;
  remove(options: {maxAge: number}): any;
  get(key: any, options: {maxAge: number}): any;
}

//#region Configs
export type ApiConfig = {
  serviceRootUrl: string;
  name?: string;
  version?: ODataVersion;
  default?: boolean;
  creation?: Date;
  cache?: CacheConfig;
  options?: Options;
  parsers?: {[type: string]: Parser<any>};
  schemas?: SchemaConfig[];
}

export type CacheConfig = {
  defaultMaxAge?: number;
  storage?: CacheStorage;
}
export type AnnotationConfig = {
  type: string;
  string?: string;
  bool?: boolean;
  int?: number;
  permissions?: string[];
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

export type EnumTypeConfig<T> = {
  name: string;
  flags?: boolean;
  annotations?: AnnotationConfig[];
  members: {[name: string]: number} | {[value: number]: string};
  fields: { [member: string]: EnumTypeField };
}

export type StructuredTypeConfig<T> = {
  name: string;
  base?: string;
  open?: boolean;
  model?: { new(...params: any[]): any };
  collection?: { new(...params: any[]): any };
  annotations?: AnnotationConfig[];
  fields: { [P in keyof T]?: StructuredTypeField };
}

export type Parameter = {
  type: string;
  nullable?: boolean;
  collection?: boolean;
}

export type CallableConfig = {
  name: string;
  path?: string;
  bound?: boolean;
  composable?: boolean;
  parameters?: { [name: string]: Parameter };
  return?: string;
}
export type EntitySetConfig = {
  name: string;
  annotations?: AnnotationConfig[];
}
//#endregion
