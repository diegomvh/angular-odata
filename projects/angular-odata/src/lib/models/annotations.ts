import { 
  ODATA_ETAG, 
  ODATA_COUNT, 
  ODATA_NEXTLINK, 
  ODATA_TYPE, 
  ODATA_DELTALINK, 
  ODATA_METADATAETAG, 
  ODATA_MEDIA_EDITLINK, 
  ODATA_MEDIA_ETAG, 
  ODATA_MEDIA_READLINK, 
  ODATA_MEDIA_CONTENTTYPE, 
  ODATA_CONTEXT, 
  ODATA_ID, 
  ODATA_READLINK, 
  ODATA_EDITLINK, 
  ODATA_FUNCTION_PREFIX, 
  ODATA_ANNOTATION_PREFIX
} from '../types';

export const COLLECTION = /Collection\(([\w\.]+)\)/;

//#region Extract odata annotations
export const odataAnnotations = (value: any) => Object.keys(value)
  .filter(key => key.indexOf(ODATA_ANNOTATION_PREFIX) !== -1 || key.startsWith(ODATA_FUNCTION_PREFIX))
  .reduce((acc, key) => Object.assign(acc, {[key]: value[key]}), {});

export const odataType = (value: any) => {
  if (ODATA_TYPE in value) {
    const type = value[ODATA_TYPE].substr(1) as string;
    const matches = COLLECTION.exec(type);
    if (matches)
      return matches[1].indexOf('.') === -1 ? `Edm.${matches[1]}` : matches[1]; 
    return type;
  }
}

export type ODataContext = {
  metadata?: string;
  singleton?: string;
  entitySet?: string;
  entity?: string;
}
export const odataContext = (value: any) => {
  if (ODATA_CONTEXT in value) {
    let ctx: ODataContext = {};
    const str = value[ODATA_CONTEXT] as string;
    const index = str.lastIndexOf("#");
    ctx.metadata = str.substr(0, index);
    const parts = str.substr(index + 1).split("/");
    ctx.entitySet = parts[0];
    if (parts[parts.length - 1] === '$entity')
      ctx.entity = parts[1];
    return ctx;
  }
}

export class ODataAnnotations {
  value: {[name: string]: any}
  constructor(data: { [name: string]: any }) {
    this.value = odataAnnotations(data);
  }

  // Context
  private _context: any;
  get context(): ODataContext {
    if (!this._context) {
      this._context = odataContext(this.value) || {};
    }
    return this._context;
  }

  private _properties: any;
  get properties() {
    if (!this._properties) {
      this._properties = Object.keys(this.value)
        .filter(k => k.indexOf(ODATA_ANNOTATION_PREFIX) > 0)
        .reduce((acc, key) => {
          let name = key.substr(0, key.indexOf(ODATA_ANNOTATION_PREFIX));
          if (!(name in acc)) {
            acc[name] = {};
          }
          Object.assign(acc[name], { [key.substr(key.indexOf(ODATA_ANNOTATION_PREFIX))]: this.value[key] });
          return acc;
        }, {});
    }
    return this._properties;
  }

  property(name: string) {
    return new ODataPropertyAnnotations(this.properties[name]);
  }

  // Method
  clone(): ODataAnnotations {
    return new ODataAnnotations(this.value);
  };
}

export class ODataPropertyAnnotations extends ODataAnnotations {
  clone(): ODataPropertyAnnotations {
    return new ODataPropertyAnnotations(this.value);
  };

  get type(): string {
    return odataType(this.value);
  }

  get collection(): boolean {
    return (ODATA_TYPE in this.value && this.value[ODATA_TYPE].substr(1).startsWith(`Collection`));
  }
}

export class ODataEntityAnnotations extends ODataAnnotations {
  clone(): ODataEntityAnnotations {
    return new ODataEntityAnnotations(this.value);
  };

  get type(): string {
    return odataType(this.value);
  }

  get id() {
    if (ODATA_ID in this.value)
      return this.value[ODATA_ID] as string;
  }

  get etag() {
    if (ODATA_ETAG in this.value)
      return this.value[ODATA_ETAG] as string;
  }

  get mediaEtag(): string {
    if (ODATA_MEDIA_ETAG in this.value)
      return decodeURIComponent(this.value[ODATA_MEDIA_ETAG] as string);
  }

  get metadataEtag() {
    if (ODATA_METADATAETAG in this.value)
      return this.value[ODATA_METADATAETAG] as string;
  }

  get readLink(): string {
    if (ODATA_READLINK in this.value)
      return decodeURIComponent(this.value[ODATA_READLINK] as string);
  }

  get editLink(): string {
    if (ODATA_EDITLINK in this.value)
      return decodeURIComponent(this.value[ODATA_EDITLINK] as string);
  }

  get mediaReadLink(): string {
    if (ODATA_MEDIA_READLINK in this.value)
      return decodeURIComponent(this.value[ODATA_MEDIA_READLINK] as string);
  }

  get mediaEditLink(): string {
    if (ODATA_MEDIA_EDITLINK in this.value)
      return decodeURIComponent(this.value[ODATA_MEDIA_EDITLINK] as string);
  }

  get mediaContentType(): string {
    if (ODATA_MEDIA_CONTENTTYPE in this.value)
      return this.value[ODATA_MEDIA_CONTENTTYPE] as string;
  }

  private _functions: any;
  get functions() {
    if (!this._functions) {
      this._functions = Object.keys(this.value)
        .filter(k => k.startsWith(ODATA_FUNCTION_PREFIX))
        .reduce((acc, key) => Object.assign(acc, { [key.substr(1)]: this.value[key] }), {});
    }
    return this._functions;
  }

  function(name: string) {
    return this.functions[name];
  }
}

export class ODataEntitiesAnnotations extends ODataAnnotations {
  clone(): ODataEntitiesAnnotations {
    return new ODataEntitiesAnnotations(this.value);
  };

  get readLink(): string {
    if (ODATA_READLINK in this.value)
      return decodeURIComponent(this.value[ODATA_READLINK] as string);
  }

  get count(): number {
    if (ODATA_COUNT in this.value)
      return this.value[ODATA_COUNT] as number;
  }

  get nextLink(): string {
    if (ODATA_NEXTLINK in this.value)
      return decodeURIComponent(this.value[ODATA_NEXTLINK] as string);
  }

  get deltaLink(): string {
    if (ODATA_DELTALINK in this.value)
      return decodeURIComponent(this.value[ODATA_DELTALINK] as string);
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
      this._functions = Object.keys(this.value)
        .filter(k => k.startsWith(ODATA_FUNCTION_PREFIX))
        .reduce((acc, key) => Object.assign(acc, { [key.substr(1)]: this.value[key] }), {});
    }
    return this._functions;
  }

  function(name: string) {
    return this.functions[name];
  }
}