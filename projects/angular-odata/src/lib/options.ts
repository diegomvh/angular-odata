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
  prefer?: {
    maxPageSize?: number;
    return?: 'representation' | 'minimal';
  }

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
  }

  get helper() {
    return ODataHelper[this.version];
  }
}

