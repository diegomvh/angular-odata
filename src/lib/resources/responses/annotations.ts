import { ODATA_ETAG, ODATA_COUNT, ODATA_NEXTLINK, ODATA_ANNOTATION_PREFIX, ODATA_TYPE, ODATA_DELTALINK, ODATA_METADATAETAG, ODATA_MEDIA_EDITLINK, ODATA_MEDIA_ETAG, ODATA_MEDIA_READLINK, ODATA_MEDIA_CONTENTTYPE, ODATA_CONTEXT, ODATA_ID, ODATA_READLINK, ODATA_EDITLINK, ODATA_ASSOCIATIONLINK, ODATA_NAVIGATIONLINK, odataAnnotations } from '../../types';

/*
  _newResourceForContext(resource: ODataResource<any>, attrs: any) {
    if (resource instanceof ODataEntitySetResource)
      return resource.entity(attrs);
    if (resource instanceof ODataFunctionResource || resource instanceof ODataActionResource) {
      // It depends on the defined return scheme and context
      let ctx = attrs[ODATA_CONTEXT] as string;
      ctx = ctx.substr(ctx.indexOf("#") + 1);
      if (ctx.startsWith("Collection(") && ctx.endsWith(")")) {
        let type = ctx.substr(11, ctx.length - 12);
        let schema = type ? this.parserForType<any>(type) as ODataSchema<any> : null;
        return ODataEntityResource.factory<any>(this, {parser: schema});
      } else if (ctx.endsWith("$entity")) {
        let type = (ODATA_TYPE in attrs)? 
          (attrs[ODATA_TYPE] as string).substr(1) :
          resource.type();
        let eset = ctx.split(/(\w+)/)[1];
        return this.entitySet(eset, type).entity(attrs);
      }
    }
    return resource.clone<any>();
  }
  */

export class ODataAnnotations {
  constructor(protected value: {[name: string]: string | number}) { }

  static factory(data: any) {
    let annotations = odataAnnotations(data);
    return new ODataAnnotations(annotations);
  }

  get context(): string {
    return this.value[ODATA_CONTEXT] as string;
  }

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
    return new ODataPropertyAnnotations(annotations);
  }
}

export class ODataRelatedAnnotations extends ODataAnnotations {
  get associationLink(): string {
    return decodeURIComponent(this.value[ODATA_ASSOCIATIONLINK] as string);
  }

  get navigationLink(): string {
    return decodeURIComponent(this.value[ODATA_NAVIGATIONLINK] as string);
  }
}

export class ODataPropertyAnnotations extends ODataAnnotations {
  static factory(data: any) {
    let annotations = odataAnnotations(data);
    return new ODataPropertyAnnotations(annotations);
  }

  get type(): string {
    return this.value[ODATA_TYPE] as string;
  }
}

export class ODataEntityAnnotations extends ODataAnnotations {
  static factory(data: any) {
    let annotations = odataAnnotations(data);
    return new ODataEntityAnnotations(annotations);
  }

  get type(): string {
    return this.value[ODATA_TYPE] as string;
  }

  get id(): string {
    return this.value[ODATA_ID] as string;
  }

  get etag(): string {
    return this.value[ODATA_ETAG] as string;
  }

  get mediaEtag(): string {
    return decodeURIComponent(this.value[ODATA_MEDIA_ETAG] as string);
  }

  get metadataEtag(): string {
    return this.value[ODATA_METADATAETAG] as string;
  }

  get readLink(): string {
    return decodeURIComponent(this.value[ODATA_READLINK] as string);
  }

  get editLink(): string {
    return decodeURIComponent(this.value[ODATA_EDITLINK] as string);
  }

  get mediaReadLink(): string {
    return decodeURIComponent(this.value[ODATA_MEDIA_READLINK] as string);
  }

  get mediaEditLink(): string {
    return decodeURIComponent(this.value[ODATA_MEDIA_EDITLINK] as string);
  }

  get mediaContentType(): string {
    return this.value[ODATA_MEDIA_CONTENTTYPE] as string;
  }
}

export class ODataCollectionAnnotations extends ODataAnnotations {
  static factory(data: any) {
    let annotations = odataAnnotations(data);
    return new ODataCollectionAnnotations(annotations);
  }

  get readLink(): string {
    return decodeURIComponent(this.value[ODATA_READLINK] as string);
  }

  get count(): number {
    return this.value[ODATA_COUNT] as number;
  }

  get nextLink(): string {
    return decodeURIComponent(this.value[ODATA_NEXTLINK] as string);
  }

  get deltaLink(): string {
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
}