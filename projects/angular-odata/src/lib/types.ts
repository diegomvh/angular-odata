import { InjectionToken } from '@angular/core';

export type EntityKey<T> = {
  readonly [P in keyof T]?: T[P];
} | string | number;

// ANNOTATIONS
export const ODATA_ANNOTATION_PREFIX = '@odata';
export const ODATA_FUNCTION_PREFIX = '#';
//odata.context: the context URL for a collection, entity, primitive value, or service document.
export const ODATA_CONTEXT = '@odata.context';
//odata.count: the total count of a collection of entities or collection of entity references, if requested.
export const ODATA_COUNT = '@odata.count';
//odata.nextLink: the next link of a collection with partial results
export const ODATA_NEXTLINK = '@odata.nextLink';
//odata.deltaLink: the delta link for obtaining changes to the result, if requested
export const ODATA_DELTALINK = '@odata.deltaLink';
//odata.id: the ID of the entity
export const ODATA_ID = '@odata.id';
//odata.etag: the ETag of the entity
export const ODATA_ETAG = '@odata.etag';
//odata.readLink: the link used to read the entity, if the edit link cannot be used to read the entity
export const ODATA_READLINK = '@odata.readLink';
//odata.editLink: the link used to edit/update the entity, if the entity is updatable and the odata.id does not represent a URL that can be used to edit the entity
export const ODATA_EDITLINK = '@odata.editLink';
export const ODATA_METADATAETAG = '@odata.metadataEtag';
//odata.associationLink: the link used to describe the relationship between this entity and related entities
export const ODATA_ASSOCIATIONLINK = '@odata.associationLink';
//odata.type: the type of the containing object or targeted property if the type of the object or targeted property cannot be heuristically determined
export const ODATA_TYPE = '@odata.type';
//odata.navigationLink: the link used to retrieve the values of a navigation property
export const ODATA_NAVIGATIONLINK = '@odata.navigationLink';
//Media entities and stream properties may in addition contain the following annotations:
//odata.mediaReadLink: the link used to read the stream
export const ODATA_MEDIA_READLINK = '@odata.mediaReadLink';
//odata.mediaEditLink: the link used to edit/update the stream
export const ODATA_MEDIA_EDITLINK = '@odata.mediaEditLink';
//odata.mediaEtag: the ETag of the stream, as appropriate
export const ODATA_MEDIA_ETAG = '@odata.mediaEtag';
//odata.mediaContentType: the content type of the stream
export const ODATA_MEDIA_CONTENTTYPE = '@odata.mediaContentType';

export const $ID = '$id';

// SEGMENTS
export const $METADATA = '$metadata';
export const $BATCH = '$batch';
export const $REF = '$ref';
export const $VALUE = '$value';
export const $COUNT = '$count';

// HTTP HEADERS
export const IF_MATCH_HEADER = 'If-Match';
export const CONTENT_TYPE = 'Content-Type';
export const HTTP11 = 'HTTP/1.1';
export const ODATA_VERSION = 'OData-Version';
export const ACCEPT = 'Accept';

// HTTP HEADER VALUES
export const APPLICATION_JSON = 'application/json';
export const APPLICATION_HTTP = 'application/http';
export const TEXT_PLAIN = 'text/plain';
export const VERSION_4_0 = '4.0';
export const MULTIPART_MIXED = 'multipart/mixed';
export const MULTIPART_MIXED_BOUNDARY = 'multipart/mixed;boundary=';
export const CONTENT_TRANSFER_ENCODING = 'Content-Transfer-Encoding';
export const CONTENT_ID = 'Content-ID';

export const BINARY = 'binary';
export const BOUNDARY_PREFIX_SUFFIX = '--';
export const BATCH_PREFIX = 'batch_';
export const CHANGESET_PREFIX = 'changeset_';

// URL PARTS
export const QUERY_SEPARATOR = '?';
export const PARAM_SEPARATOR = '&';
export const VALUE_SEPARATOR = '=';
export const PATH_SEPARATOR = '/';
export const ODATA_PARAM_PREFIX = '$';
export const ODATA_ALIAS_PREFIX = '@';

export const NEWLINE = '\r\n';
export const VALUE = 'value';
export const COLLECTION = /Collection\(([\w\.]+)\)/;

//#region Extract odata annotations
export const odataAnnotations = (value: Object) => Object.keys(value)
  .filter(key => key.indexOf(ODATA_ANNOTATION_PREFIX) !== -1 || key.startsWith(ODATA_FUNCTION_PREFIX))
  .reduce((acc, key) => Object.assign(acc, {[key]: value[key]}), {});

export const entityAttributes = (value: Object) => Object.keys(value)
  .filter(key => key.indexOf(ODATA_ANNOTATION_PREFIX) === -1 && !key.startsWith(ODATA_FUNCTION_PREFIX))
  .reduce((acc, key) => Object.assign(acc, {[key]: value[key]}), {});

export const odataType = (value: Object) => {
  if (ODATA_TYPE in value) {
    const type = value[ODATA_TYPE].substr(1) as string;
    const matches = COLLECTION.exec(type);
    if (matches)
      return matches[1].indexOf('.') === -1 ? `Edm.${matches[1]}` : matches[1]; 
    return type;
  }
}

export type ODataContext = {
  metadata?: string;
  singleton?: string;
  entitySet?: string;
  property?: string;
  entity?: string;
}

export const odataContext = (value: Object) => {
  if (ODATA_CONTEXT in value) {
    let ctx: ODataContext = {};
    const str = value[ODATA_CONTEXT] as string;
    const index = str.lastIndexOf("#");
    ctx.metadata = str.substr(0, index);
    const parts = str.substr(index + 1).split("/");
    ctx.entitySet = parts[0];
    if (parts[parts.length - 1] === '$entity') {
      ctx.entity = parts[1];
    } else if (parts.length > 1) {
      ctx.property = parts[1];
    }
    return ctx;
  }
}
//#endregion
export const parseQuery  = (query: string) => query.split(PARAM_SEPARATOR)
  .reduce((acc, param: string) => {
    let index = param.indexOf(VALUE_SEPARATOR);
    if (index !== -1)
      Object.assign(acc, {[param.substr(0, index)]: param.substr(index + 1)});
    return acc;
  }, {});

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
export type Field = {
  type: string;
  default?: any;
  maxLength?: number;
  key?: boolean;
  collection?: boolean;
  nullable?: boolean;
  navigation?: boolean;
  field?: string;
  ref?: string;
}

export type ParseOptions = {
  stringAsEnum?: boolean;
  ieee754Compatible?: boolean;
}

export type Parser<T> = {
  deserialize(value: any, options: ParseOptions): T;
  serialize(value: T, options: ParseOptions): any;
}

export type Configuration = {
  serviceRootUrl: string,
  name?: string,
  params?: { [param: string]: string | string[] };
  headers?: { [param: string]: string | string[] };
  withCredentials?: boolean,
  acceptMetadata?: 'minimal' | 'full' | 'none';
  stringAsEnum?: boolean,
  ieee754Compatible?: boolean,
  creation?: Date,
  parsers?: {[type: string]: Parser<any>};
  schemas?: Array<Schema>,
}

export const ODATA_CONFIGURATIONS = new InjectionToken<Configuration>('odata.configuraions');

export type Schema = {
  namespace: string;
  annotations?: Array<any>;
  enums?: Array<EnumConfig<any>>;
  entities?: Array<EntityConfig<any>>;
  callables?: Array<CallableConfig>;
  containers?: Array<Container>
}

export type Container = {
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