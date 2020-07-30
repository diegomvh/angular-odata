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
  ODATA_ANNOTATION_PREFIX,
  odataAnnotations,
  odataType
} from '../../types';

export class ODataAnnotations {
  constructor(protected value: { [name: string]: any }) { }

  static factory(data: any) {
    return new ODataAnnotations(odataAnnotations(data));
  }

  // Context
  private _context: any;
  get context(): { set: string, type: string | null } {
    if (!this._context) {
      this._context = {};
      if (ODATA_CONTEXT in this.value) {
        let value = this.value[ODATA_CONTEXT];
        let index = value.lastIndexOf("#");
        let parts = value.substr(index + 1).split("/");
        let set = parts[0];
        let type = parts.length > 3 ? parts[1] : null;
        this._context = { set, type };
      }
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
    return ODataPropertyAnnotations.factory(this.properties[name]);
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

  static factory(data: any) {
    return new ODataPropertyAnnotations(odataAnnotations(data));
  }

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

  static factory(data: any) {
    return new ODataEntityAnnotations(odataAnnotations(data));
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
    let match = (this.nextLink || "").match(/\$top=(\d+)/);
    if (match) return Number(match[1]);
  }

  get skip(): number {
    let match = (this.nextLink || "").match(/\$skip=(\d+)/);
    if (match) return Number(match[1]);
  }

  get skiptoken(): string {
    let match = (this.nextLink || "").match(/\$skiptoken=([\d\w\s]+)/);
    if (match) return match[1];
  }

  static factory(data: any) {
    return new ODataEntitiesAnnotations(odataAnnotations(data));
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