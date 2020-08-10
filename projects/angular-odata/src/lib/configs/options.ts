import { DEFAULT_VERSION, VERSION_2_0, VERSION_3_0, VERSION_4_0 } from '../constants';
import { ApiConfig, Options, Field, FieldOptions } from '../types';
import { ODataHelper } from '../helpers';

export class ODataOptions implements Options {
  version: "2.0" | "3.0" | "4.0";
  metadata?: "minimal" | "full" | "none";
  streaming?: boolean;
  stringAsEnum?: boolean;
  ieee754Compatible?: boolean;

  constructor(config: ApiConfig | Options) {
    this.version = config.version || DEFAULT_VERSION;
    this.metadata = config.metadata;
    this.stringAsEnum = config.stringAsEnum;
    this.ieee754Compatible = config.ieee754Compatible;
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
      switch (k) {
        case 'odata.metadata':
          this.metadata = v as 'full' | 'minimal' | 'none';
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
      this.version = value as '2.0' | '3.0' | '4.0';
  }
}