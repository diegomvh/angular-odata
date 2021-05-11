import { DEFAULT_FETCH_POLICY, DEFAULT_VERSION } from './constants';
import { ODataHelper } from './helpers';
import { ApiOptions, FetchPolicy, ODataMetadataType, ODataVersion, OptionsHelper } from './types';

export class ODataApiOptions implements ApiOptions, OptionsHelper {
  version: ODataVersion;
  metadata?: ODataMetadataType;
  stringAsEnum?: boolean;
  ieee754Compatible?: boolean;
  fetchPolicy: FetchPolicy;
  streaming?: boolean;
  // Http
  params: { [param: string]: string | string[] };
  headers: { [param: string]: string | string[] };
  withCredentials?: boolean;
  etag: {
    //http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part1-protocol/odata-v4.0-errata02-os-part1-protocol-complete.html#_Toc406398229
    ifMatch: boolean;
    //http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part1-protocol/odata-v4.0-errata02-os-part1-protocol-complete.html#_Toc406398230
    ifNoneMatch: boolean;
  } = {ifMatch: true, ifNoneMatch: false};
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
    this.metadata = config.metadata;
    this.stringAsEnum = config.stringAsEnum;
    this.ieee754Compatible = config.ieee754Compatible;
    this.params = config.params || {};
    this.headers = config.headers || {};
    this.withCredentials = config.withCredentials;
    this.fetchPolicy = config.fetchPolicy || DEFAULT_FETCH_POLICY;
    this.prefer = config.prefer;
    Object.assign(this.etag, config.etag || {});
  }

  get helper() {
    return ODataHelper[this.version];
  }
}

