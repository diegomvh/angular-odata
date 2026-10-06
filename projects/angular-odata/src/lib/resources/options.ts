import type {
  CacheCacheability,
  ODataMetadataType,
  ODataVersion,
  ParserOptions,
  ResponseOptions,
} from '../types';
import { DEFAULT_VERSION, MAX_AGE, VERSION_2_0, VERSION_3_0, VERSION_4_0 } from '../constants';

import { ODataHelper } from '../helper';

export class ODataResponseOptions implements ResponseOptions {
  version: ODataVersion;
  streaming?: boolean;
  // OData
  metadata?: ODataMetadataType;
  ieee754Compatible?: boolean;
  // Location
  location?: string;
  // Cache
  cacheability?: 'public' | 'private' | 'no-cache' | 'no-store';
  maxAge?: number;

  constructor(config: ParserOptions) {
    this.version = config.version || DEFAULT_VERSION;
  }

  get helper() {
    return ODataHelper[this.version];
  }

  clone() {
    return new ODataResponseOptions(this);
  }

  setFeatures(features: string) {
    features.split(';').forEach((o) => {
      let [k, v] = o.split('=');
      switch (k.trim()) {
        case 'odata.metadata':
          this.metadata = v as ODataMetadataType;
          break;
        case 'odata.streaming':
          this.streaming = v == 'true';
          break;
        case 'IEEE754Compatible':
          this.ieee754Compatible = v == 'true';
          break;
      }
    });
  }

  setVersion(version: string) {
    const value = version.replace(/\;/g, '').trim();
    if ([VERSION_2_0, VERSION_3_0, VERSION_4_0].indexOf(value) !== -1)
      this.version = value as ODataVersion;
  }

  setLocation(location: string) {
    // TODO: resolve location?
    this.location = location;
  }

  setPreferenceApplied(preference: string) {
    preference.split(',').forEach((prefer) => {
      // TODO: resolve preference
    });
  }

  setCache(cacheControl: string) {
    const precedence: CacheCacheability[] = ['public', 'private', 'no-cache', 'no-store'];
    this.cacheability = undefined;
    this.maxAge = undefined;
    for (const directive of cacheControl.split(',')) {
      const separator = directive.indexOf('=');
      const name = (separator < 0 ? directive : directive.slice(0, separator)).trim().toLowerCase();
      const value =
        separator < 0
          ? ''
          : directive
              .slice(separator + 1)
              .trim()
              .replace(/^"(.*)"$/, '$1');
      if (name === MAX_AGE) {
        const maxAge = /^\d+$/.test(value) ? Number(value) : NaN;
        const seconds = Number.isFinite(maxAge * 1000) ? maxAge : 0;
        this.maxAge = Math.min(this.maxAge ?? Infinity, seconds);
      }
      const cacheability = precedence.find((candidate) => candidate === name);
      if (
        cacheability !== undefined &&
        (this.cacheability === undefined ||
          precedence.indexOf(cacheability) > precedence.indexOf(this.cacheability))
      ) {
        this.cacheability = cacheability;
      }
    }
  }
}
