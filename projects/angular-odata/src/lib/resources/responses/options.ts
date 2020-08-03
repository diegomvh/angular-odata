import { HttpHeaders } from '@angular/common/http';
import { 
  ODATA_COUNT, 
  ODATA_NEXTLINK, 
  ODATA_TYPE, 
  ODATA_DELTALINK, 
  ODATA_METADATAETAG, 
  ODATA_MEDIA_EDITLINK, 
  ODATA_MEDIA_ETAG, 
  ODATA_MEDIA_READLINK, 
  ODATA_MEDIA_CONTENTTYPE, 
  ODATA_ID, 
  ODATA_READLINK, 
  ODATA_EDITLINK, 
  ODATA_FUNCTION_PREFIX, 
  ODATA_ANNOTATION_PREFIX,
  odataAnnotations,
  odataContext,
  ODataContext,
  odataType,
  odataEtag
} from '../../types';

export class ODataOptions {
  annotations: {[name: string]: any};
  headers: HttpHeaders;
  constructor(data: { [name: string]: any }, headers?: HttpHeaders) {
    this.annotations = odataAnnotations(data);
    this.headers = headers;
    console.log(this.headers.getAll('OData-Version'));
    console.log(this.headers.getAll('ETag'));
    console.log(this.headers.getAll('Content-Type'));
  }

  // Context
  private _context: any;
  get context(): ODataContext {
    if (!this._context) {
      this._context = odataContext(this.annotations) || {};
    }
    return this._context;
  }

  private _properties: any;
  get properties() {
    if (!this._properties) {
      this._properties = Object.keys(this.annotations)
        .filter(k => k.indexOf(ODATA_ANNOTATION_PREFIX) > 0)
        .reduce((acc, key) => {
          let name = key.substr(0, key.indexOf(ODATA_ANNOTATION_PREFIX));
          if (!(name in acc)) {
            acc[name] = {};
          }
          Object.assign(acc[name], { [key.substr(key.indexOf(ODATA_ANNOTATION_PREFIX))]: this.annotations[key] });
          return acc;
        }, {});
    }
    return this._properties;
  }

  property(name: string) {
    return this.properties[name];
  }

  // Method
  clone(): ODataOptions {
    return new ODataOptions(this.annotations);
  };
}

export class ODataPropertyOptions extends ODataOptions {
  clone(): ODataPropertyOptions {
    return new ODataPropertyOptions(this.annotations);
  };

  get type(): string {
    return odataType(this.annotations);
  }

  get collection(): boolean {
    return (ODATA_TYPE in this.annotations && this.annotations[ODATA_TYPE].substr(1).startsWith(`Collection`));
  }
}

export class ODataEntityOptions extends ODataOptions {
  clone(): ODataEntityOptions {
    return new ODataEntityOptions(this.annotations);
  };

  get type(): string {
    return odataType(this.annotations);
  }

  get id() {
    if (ODATA_ID in this.annotations)
      return this.annotations[ODATA_ID] as string;
  }

  get etag() {
    return odataEtag(this.annotations)
  }

  get mediaEtag(): string {
    if (ODATA_MEDIA_ETAG in this.annotations)
      return decodeURIComponent(this.annotations[ODATA_MEDIA_ETAG] as string);
  }

  get metadataEtag() {
    if (ODATA_METADATAETAG in this.annotations)
      return this.annotations[ODATA_METADATAETAG] as string;
  }

  get readLink(): string {
    if (ODATA_READLINK in this.annotations)
      return decodeURIComponent(this.annotations[ODATA_READLINK] as string);
  }

  get editLink(): string {
    if (ODATA_EDITLINK in this.annotations)
      return decodeURIComponent(this.annotations[ODATA_EDITLINK] as string);
  }

  get mediaReadLink(): string {
    if (ODATA_MEDIA_READLINK in this.annotations)
      return decodeURIComponent(this.annotations[ODATA_MEDIA_READLINK] as string);
  }

  get mediaEditLink(): string {
    if (ODATA_MEDIA_EDITLINK in this.annotations)
      return decodeURIComponent(this.annotations[ODATA_MEDIA_EDITLINK] as string);
  }

  get mediaContentType(): string {
    if (ODATA_MEDIA_CONTENTTYPE in this.annotations)
      return this.annotations[ODATA_MEDIA_CONTENTTYPE] as string;
  }

  private _functions: any;
  get functions() {
    if (!this._functions) {
      this._functions = Object.keys(this.annotations)
        .filter(k => k.startsWith(ODATA_FUNCTION_PREFIX))
        .reduce((acc, key) => Object.assign(acc, { [key.substr(1)]: this.annotations[key] }), {});
    }
    return this._functions;
  }

  function(name: string) {
    return this.functions[name];
  }
}

export class ODataEntitiesOptions extends ODataOptions {
  clone(): ODataEntitiesOptions {
    return new ODataEntitiesOptions(this.annotations);
  };

  get readLink(): string {
    if (ODATA_READLINK in this.annotations)
      return decodeURIComponent(this.annotations[ODATA_READLINK] as string);
  }

  get count(): number {
    if (ODATA_COUNT in this.annotations)
      return Number(this.annotations[ODATA_COUNT]);
  }

  get nextLink(): string {
    if (ODATA_NEXTLINK in this.annotations)
      return decodeURIComponent(this.annotations[ODATA_NEXTLINK] as string);
  }

  get deltaLink(): string {
    if (ODATA_DELTALINK in this.annotations)
      return decodeURIComponent(this.annotations[ODATA_DELTALINK] as string);
  }

  get top(): number {
    let match = (this.nextLink || "").match(/[&?]{1}\$top=(\d+)/);
    if (match) return Number(match[1]);
  }

  get skip(): number {
    let match = (this.nextLink || "").match(/[&?]{1}\$skip=(\d+)/);
    if (match) return Number(match[1]);
  }

  get skiptoken(): string {
    let match = (this.nextLink || "").match(/[&?]{1}\$skiptoken=([\d\w\s]+)/);
    if (match) return match[1];
  }

  private _functions: any;
  get functions() {
    if (!this._functions) {
      this._functions = Object.keys(this.annotations)
        .filter(k => k.startsWith(ODATA_FUNCTION_PREFIX))
        .reduce((acc, key) => Object.assign(acc, { [key.substr(1)]: this.annotations[key] }), {});
    }
    return this._functions;
  }

  function(name: string) {
    return this.functions[name];
  }
}