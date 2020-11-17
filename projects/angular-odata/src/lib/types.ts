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

// SETTINGS AND PARSERS
export interface Field {
  type: string;
  default?: any;
  maxLength?: number;
  key?: boolean;
  collection?: boolean;
  nullable?: boolean;
  navigation?: boolean;
  field?: string;
  precision?: number;
  scale?: number;
  ref?: string;
}

export interface Options {
  version: '2.0' | '3.0' | '4.0';
  metadata?: 'minimal' | 'full' | 'none';
  stringAsEnum?: boolean;
  ieee754Compatible?: boolean;
}

export interface FieldOptions extends Options {
  field: Field
}

export interface Parser<T> {
  deserialize(value: any, options: Options): T;
  serialize(value: T, options: Options): any;
}

//#region Configs
export type ApiConfig = {
  serviceRootUrl: string,
  name?: string,
  default?: boolean,
  cache?: CacheConfig, 
  version?: '2.0' | '3.0' | '4.0',
  params?: { [param: string]: string | string[] };
  headers?: { [param: string]: string | string[] };
  withCredentials?: boolean,
  metadata?: 'minimal' | 'full' | 'none';
  stringAsEnum?: boolean,
  ieee754Compatible?: boolean,
  creation?: Date,
  parsers?: {[type: string]: Parser<any>};
  schemas?: Array<SchemaConfig>,
}

export type CacheConfig = {}

export type SchemaConfig = {
  namespace: string;
  alias?: string;
  annotations?: Array<any>;
  enums?: Array<EnumConfig<any>>;
  entities?: Array<EntityConfig<any>>;
  callables?: Array<CallableConfig>;
  containers?: Array<ContainerConfig>
}

export type ContainerConfig = {
  name: string;
  annotations?: Array<any>;
  services?: Array<ServiceConfig>;
}

export type EnumConfig<T> = {
  name: string;
  flags?: boolean;
  members: {[name: string]: number} | {[value: number]: string};
}

export type EntityConfig<T> = {
  name: string;
  base?: string;
  open?: boolean;
  model?: { new(...any): any };
  collection?: { new(...any): any };
  annotations?: any[];
  fields: { [P in keyof T]?: Field };
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

export type ServiceConfig = {
  name: string;
  annotations?: any[];
}
//#endregion