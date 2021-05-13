export const $ID = '$id';
export const ODATA_ID = '@odata.id';

// SEGMENTS
export const $METADATA = '$metadata';
export const $BATCH = '$batch';
export const $REF = '$ref';
export const $VALUE = '$value';
export const $COUNT = '$count';
export const $INLINECOUNT = '$inlinecount';

// HTTP HEADERS
export const IF_MATCH_HEADER = 'If-Match';
export const IF_NONE_MATCH_HEADER = 'If-None-Match';
export const CONTENT_TYPE = 'Content-Type';
export const CACHE_CONTROL = 'Cache-Control';
export const HTTP11 = 'HTTP/1.1';
export const ODATA_VERSION = 'OData-Version';
export const ACCEPT = 'Accept';
export const PREFER = 'Prefer';
export const ODATA_VERSION_HEADERS = [ODATA_VERSION, ODATA_VERSION.toLowerCase(), 'dataserviceversion'];

// HTTP HEADER VALUES
export const APPLICATION_JSON = 'application/json';
export const APPLICATION_HTTP = 'application/http';
export const TEXT_PLAIN = 'text/plain';
export const MULTIPART_MIXED = 'multipart/mixed';
export const MULTIPART_MIXED_BOUNDARY = 'multipart/mixed;boundary=';
export const CONTENT_TRANSFER_ENCODING = 'Content-Transfer-Encoding';
export const CONTENT_ID = 'Content-ID';
export const MAX_AGE = 'max-age';

// VERSIONS
export const VERSION_4_0 = '4.0';
export const VERSION_3_0 = '3.0';
export const VERSION_2_0 = '2.0';
export const DEFAULT_VERSION = VERSION_4_0;

export const BINARY = 'binary';
export const BOUNDARY_PREFIX_SUFFIX = '--';
export const BATCH_PREFIX = 'batch_';
export const CHANGESET_PREFIX = 'changeset_';
export const DEFAULT_FETCH_POLICY = 'network-only';
export const DEFAULT_TIMEOUT = 60; // Time in seconds
export const CALLABLE_BINDING_PARAMETER = 'bindingParameter';

// URL PARTS
export const QUERY_SEPARATOR = '?';
export const PARAM_SEPARATOR = '&';
export const VALUE_SEPARATOR = '=';
export const PATH_SEPARATOR = '/';
export const ODATA_PARAM_PREFIX = '$';
export const ODATA_ALIAS_PREFIX = '@';

export const NEWLINE = '\r\n';
export const NEWLINE_REGEXP = /\r?\n/;


// Standard vocabularies for annotating OData services

export const COMPUTED = 'Org.OData.Core.V1.Computed';
export const OPTIMISTIC_CONCURRENCY = 'Org.OData.Core.V1.OptimisticConcurrency';
