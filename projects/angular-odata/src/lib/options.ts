import {
  DEFAULT_FETCH_POLICY,
  DEFAULT_STRIP_METADATA,
  DEFAULT_VERSION,
} from './constants';
import { ODataHelper } from './helper';
import {
  ApiOptions,
  FetchPolicy,
  ODataMetadataType,
  ODataVersion,
  Options,
  OptionsHelper,
  QueryOptionNames,
} from './types';

export class ODataApiOptions implements ApiOptions, OptionsHelper {
  version: ODataVersion;
  stringAsEnum?: boolean;
  stripMetadata: ODataMetadataType;
  fetchPolicy: FetchPolicy;
  streaming?: boolean;
  // Http
  params: { [param: string]: string | string[] };
  headers: { [param: string]: string | string[] };
  withCredentials?: boolean;
  queryBody: QueryOptionNames[];
  accept?: {
    metadata?: ODataMetadataType;
    ieee754Compatible?: boolean;
  };
  etag: {
    //http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part1-protocol/odata-v4.0-errata02-os-part1-protocol-complete.html#_Toc406398229
    ifMatch: boolean;
    //http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part1-protocol/odata-v4.0-errata02-os-part1-protocol-complete.html#_Toc406398230
    ifNoneMatch: boolean;
  } = { ifMatch: true, ifNoneMatch: false };
  prefer?: {
    //http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part1-protocol/odata-v4.0-errata02-os-part1-protocol-complete.html#_Toc406398238
    maxPageSize?: number;
    //http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part1-protocol/odata-v4.0-errata02-os-part1-protocol-complete.html#_Toc406398240
    return?: 'representation' | 'minimal';
    //http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part1-protocol/odata-v4.0-errata02-os-part1-protocol-complete.html#_Toc406398236
    continueOnError?: boolean;
    //http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part1-protocol/odata-v4.0-errata02-os-part1-protocol-complete.html#_Toc406398237
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
    this.queryBody = config.queryBody || [];
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
