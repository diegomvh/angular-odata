import { ODATA_ETAG, ODATA_COUNT, ODATA_NEXTLINK, ODATA_TYPE, ODATA_DELTALINK, ODATA_METADATAETAG, ODATA_MEDIA_EDITLINK, ODATA_MEDIA_ETAG, ODATA_MEDIA_READLINK, ODATA_MEDIA_CONTENTTYPE, ODATA_CONTEXT, ODATA_ID, ODATA_READLINK, ODATA_EDITLINK, ODATA_ASSOCIATIONLINK, ODATA_NAVIGATIONLINK, odataAnnotations, odataContext } from '../../types';

export class ODataAnnotations {
  constructor(protected value: {[name: string]: any }) { }

  static factory(data: any) {
    return new ODataAnnotations(odataAnnotations(data));
  }

  // Context
  get context(): {set: string, type: string | null} {
    if (ODATA_CONTEXT in this.value)
      return odataContext(this.value[ODATA_CONTEXT]);
  }

  // Methods
  clone(): ODataAnnotations {
    return new ODataAnnotations(this.value);
  };

  related(name: string) {
    let annotations = Object.keys(this.value)
      .filter(k => k.startsWith(name))
      .reduce((acc, key) => Object.assign(acc, {[key.substr(name.length)]: this.value[key]}), {});
    return new ODataRelatedAnnotations(annotations);
  }

  property(name: string) {
    let annotations = Object.keys(this.value)
      .filter(k => k.startsWith(name))
      .reduce((acc, key) => Object.assign(acc, {[key.substr(name.length)]: this.value[key]}), {});
    return new ODataValueAnnotations(annotations);
  }

}

export class ODataRelatedAnnotations extends ODataAnnotations {
  clone(): ODataRelatedAnnotations {
    return new ODataRelatedAnnotations(this.value);
  };

  get associationLink(): string {
    if (ODATA_ASSOCIATIONLINK in this.value)
      return decodeURIComponent(this.value[ODATA_ASSOCIATIONLINK] as string);
  }

  get navigationLink(): string {
    if (ODATA_NAVIGATIONLINK in this.value)
      return decodeURIComponent(this.value[ODATA_NAVIGATIONLINK] as string);
  }
}

export class ODataValueAnnotations extends ODataAnnotations {
  clone(): ODataValueAnnotations {
    return new ODataValueAnnotations(this.value);
  };

  get type(): string {
    if (ODATA_TYPE in this.value)
      return this.value[ODATA_TYPE] as string;
  }

  static factory(data: any) {
    return new ODataValueAnnotations(odataAnnotations(data));
  }
}

export class ODataEntityAnnotations extends ODataAnnotations {
  clone(): ODataEntityAnnotations {
    return new ODataEntityAnnotations(this.value);
  };

  get type(): string {
    if (ODATA_TYPE in this.value)
      return this.value[ODATA_TYPE] as string;
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

  get skip(): number {
    let match = (this.nextLink || "").match(/\$skip=(\d+)/);
    if (match) return Number(match[1]);
    match = (this.nextLink || "").match(/\$skiptoken=(\d+)/);
    if (match) return Number(match[1]);
  }

  get skiptoken(): string {
    let match = (this.nextLink || "").match(/\$skiptoken=([\d\w\s]+)/);
    if (match) return match[1];
  }

  static factory(data: any) {
    return new ODataEntitiesAnnotations(odataAnnotations(data));
  }
}