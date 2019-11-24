import { ODATA_ETAG, ODATA_COUNT, ODATA_NEXTLINK, ODATA_ANNOTATION_PREFIX } from '../../types';

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
  constructor(body: any) {
    Object.keys(body)
      .filter(key => key.startsWith(ODATA_ANNOTATION_PREFIX))
      .forEach(key => {
        this[key] = body[key];
      });
  }

  get etag(): string {
    return this[ODATA_ETAG] as string;
  }

  get count(): number {
    return this[ODATA_COUNT] as number;
  }

  get nextLink(): string {
    return decodeURIComponent(this[ODATA_NEXTLINK]) as string;
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