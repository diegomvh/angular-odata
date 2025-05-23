import {
  ODataApiConfigOptions,
  FetchPolicy,
  ODataMetadataType,
  ODataVersion,
  ParserOptions,
  QueryOption,
} from './types';
import {
  DEFAULT_FETCH_POLICY,
  DEFAULT_STRIP_METADATA,
  DEFAULT_VERSION,
} from './constants';

import { ODataHelper } from './helper';

export class ODataApiOptions implements ODataApiConfigOptions {
  /**
   * Default OData version
   */
  version: ODataVersion;
  /**
   * Send enum as string in the request
   */
  stringAsEnum: boolean;
  /**
   * Delete reference by path or by id
   */
  deleteRefBy: 'path' | 'id';
  /**
   * No use parenthesis for empty parameters functions
   */
  nonParenthesisForEmptyParameterFunction: boolean;
  /**
   * Strip metadata from the response
   */
  stripMetadata: ODataMetadataType;
  /**
   * Use JSON Batch Format
   */
  jsonBatchFormat: boolean;
  /**
   * Relative urls
   * http://docs.oasis-open.org/odata/odata-json-format/v4.0/cs01/odata-json-format-v4.0-cs01.html#_Toc365464682
   */
  relativeUrls: boolean;
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
  bodyQueryOptions: QueryOption[];
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
    /**
     * @link https://devblogs.microsoft.com/odata/extension-omit-null-value-properties-in-asp-net-core-odata/
     */
    omitNullValues?: boolean;
  };

  constructor(config: ODataApiConfigOptions) {
    this.version = config.version || DEFAULT_VERSION;
    this.stringAsEnum = config.stringAsEnum || false;
    this.params = config.params || {};
    this.headers = config.headers || {};
    this.withCredentials = config.withCredentials;
    this.stripMetadata = config.stripMetadata || DEFAULT_STRIP_METADATA;
    this.fetchPolicy = config.fetchPolicy || DEFAULT_FETCH_POLICY;
    this.bodyQueryOptions = config.bodyQueryOptions || [];
    this.accept = config.accept;
    Object.assign(this.etag, config.etag || {});
    this.prefer = config.prefer;
    this.deleteRefBy = config.deleteRefBy ?? 'path';
    this.nonParenthesisForEmptyParameterFunction =
      config.nonParenthesisForEmptyParameterFunction ?? false;
    this.jsonBatchFormat = config.jsonBatchFormat ?? false;
    this.relativeUrls = config.relativeUrls ?? true;
  }

  get parserOptions(): ParserOptions {
    return {
      version: this.version,
      stringAsEnum: this.stringAsEnum,
      deleteRefBy: this.deleteRefBy,
      nonParenthesisForEmptyParameterFunction:
        this.nonParenthesisForEmptyParameterFunction,
      ...this.accept,
    };
  }

  get helper() {
    return ODataHelper[this.version];
  }
}
