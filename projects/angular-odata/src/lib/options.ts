import {
  ApiOptions,
  FetchPolicy,
  ODataMetadataType,
  ODataVersion,
  Options,
  OptionsHelper,
  QueryOptionNames,
} from './types';
import {
  DEFAULT_FETCH_POLICY,
  DEFAULT_STRIP_METADATA,
  DEFAULT_VERSION,
} from './constants';

import { ODataHelper } from './helper';

export class ODataApiOptions implements ApiOptions, OptionsHelper {
  /**
   * Default OData version
   */
  version: ODataVersion;
  /**
   * Send enum as string in the request
   */
  stringAsEnum?: boolean;
  /**
   * Strip metadata from the response
   */
  stripMetadata: ODataMetadataType;
  /**
   * Cache fetch policy
   */
  fetchPolicy: FetchPolicy;
  /**
   * Extra params to be sent in the request
   */
  params: { [param: string]: string | string[] };
  /**
   * Extra headers to be sent in the request
   */
  headers: { [param: string]: string | string[] };
  /**
   * Http request with credentials
   */
  withCredentials?: boolean;
  /**
   * Send query options in the request body
   */
  bodyQueryOptions: QueryOptionNames[];
  /**
   * Customize accept header with OData options
   * @link http://docs.oasis-open.org/odata/odata-json-format/v4.01/odata-json-format-v4.01.html#sec_RequestingtheJSONFormat
   */
  accept?: {
    exponentialDecimals?: boolean;
    ieee754Compatible?: boolean;
    metadata?: ODataMetadataType;
    streaming?: boolean;
  };
  etag: {
    /**
     * @link http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part1-protocol/odata-v4.0-errata02-os-part1-protocol-complete.html#_Toc406398229
     */
    ifMatch: boolean;
    /**
     * @link http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part1-protocol/odata-v4.0-errata02-os-part1-protocol-complete.html#_Toc406398230
     */
    ifNoneMatch: boolean;
  } = { ifMatch: true, ifNoneMatch: false };
  prefer?: {
    /**
     * @link http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part1-protocol/odata-v4.0-errata02-os-part1-protocol-complete.html#_Toc406398238
     */
    maxPageSize?: number;
    /**
     * @link http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part1-protocol/odata-v4.0-errata02-os-part1-protocol-complete.html#_Toc406398240
     */
    return?: 'representation' | 'minimal';
    /**
     * @link http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part1-protocol/odata-v4.0-errata02-os-part1-protocol-complete.html#_Toc406398236
     */
    continueOnError?: boolean;
    /**
     * @link http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part1-protocol/odata-v4.0-errata02-os-part1-protocol-complete.html#_Toc406398237
     */
    includeAnnotations?: string;
  };

  constructor(config: ApiOptions) {
    this.version = config.version || DEFAULT_VERSION;
    this.stringAsEnum = config.stringAsEnum;
    this.params = config.params || {};
    this.headers = config.headers || {};
    this.withCredentials = config.withCredentials;
    this.stripMetadata = config.stripMetadata || DEFAULT_STRIP_METADATA;
    this.fetchPolicy = config.fetchPolicy || DEFAULT_FETCH_POLICY;
    this.bodyQueryOptions = config.bodyQueryOptions || [];
    this.accept = config.accept;
    Object.assign(this.etag, config.etag || {});
    this.prefer = config.prefer;
  }

  get helper() {
    return ODataHelper[this.version];
  }
}

export class ODataParserOptions implements OptionsHelper {
  version: ODataVersion;
  stringAsEnum?: boolean;

  constructor(config: Options) {
    this.version = config.version || DEFAULT_VERSION;
    this.stringAsEnum = config.stringAsEnum;
  }

  get helper() {
    return ODataHelper[this.version];
  }
}
