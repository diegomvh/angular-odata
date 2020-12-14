import { DEFAULT_VERSION, MAX_AGE, VERSION_2_0, VERSION_3_0, VERSION_4_0 } from '../../constants';
import { ODataHelper } from '../../helpers/odata';
import { CacheCacheability, ODataMetadataType, ODataVersion, Options, OptionsHelper, ResponseOptions } from '../../types';

export class ODataResponseOptions implements ResponseOptions, OptionsHelper {
  version: ODataVersion;
  streaming?: boolean;
  // OData
  metadata?: ODataMetadataType;
  stringAsEnum?: boolean;
  ieee754Compatible?: boolean;
  // Cache
  cacheability?: 'public' | 'private' | 'no-cache' | 'no-store';
  maxAge?: number;

  constructor(config: Options) {
    this.version = config.version || DEFAULT_VERSION;
    this.metadata = config.metadata;
    this.stringAsEnum = config.stringAsEnum;
    this.ieee754Compatible = config.ieee754Compatible;
  }

  get helper() {
    return ODataHelper[this.version];
  }

  clone() {
    return new ODataResponseOptions(this);
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

  setCache(cacheControl: string) {
    cacheControl.split(",").forEach(directive => {
      if (directive.startsWith(MAX_AGE)) {
        let maxAge = Number(directive.split("=")[1]);
        if (!Number.isNaN(maxAge))
          this.maxAge = maxAge;
      }
      if (['public', 'private', 'no-cache', 'no-store'].indexOf(directive) !== -1) {
        this.cacheability = directive as CacheCacheability;
      }
    });
  }
}
