import { DEFAULT_FETCH_POLICY, DEFAULT_VERSION, VERSION_2_0, VERSION_3_0, VERSION_4_0 } from './constants';
import { FetchPolicy, ODataMetadataType, ODataVersion, Options } from './types';
import { ODataHelper } from './helpers/index';

export class ODataOptions implements Options {
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

  constructor(config: Options) {
    this.version = config.version || DEFAULT_VERSION;
    this.metadata = config.metadata;
    this.stringAsEnum = config.stringAsEnum;
    this.ieee754Compatible = config.ieee754Compatible;
    this.params = config.params || {};
    this.headers = config.headers || {};
    this.withCredentials = config.withCredentials;
    this.fetchPolicy = config.fetchPolicy || DEFAULT_FETCH_POLICY;
  }

  get helper() {
    return ODataHelper[this.version];
  }

  clone() {
    return new ODataOptions(this);
  }

  setFeatures(features: string) {
    features.split(";").forEach(o => {
      let [k, v] = o.split("=");
      switch (k.trim()) {
        case 'odata.metadata':
          this.metadata = v as ODataMetadataType;
          break;
        case 'odata.streaming':
          this.streaming = v == "true";
          break;
        case 'IEEE754Compatible':
          this.ieee754Compatible = v == "true";
          break;
      }
    });
  }

  setVersion(version: string) {
    const value = version.replace(/\;/g, "").trim();
    if ([VERSION_2_0, VERSION_3_0, VERSION_4_0].indexOf(value) !== -1)
      this.version = value as ODataVersion;
  }
}
