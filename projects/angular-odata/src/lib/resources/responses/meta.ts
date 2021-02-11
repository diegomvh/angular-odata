import { HttpHeaders } from '@angular/common/http';
import { ODataContext, OptionsHelper } from '../../types';

export abstract class ODataMeta {
  annotations: Object;
  options?: OptionsHelper;
  protected get odv() {
    if (!this.options)
      throw Error("No helper");
    return this.options.helper;
  }

  constructor(data: Object, opt: {
    options?: OptionsHelper,
    headers?: HttpHeaders
  } = {}) {
    //TODO: Default options
    this.options = opt.options;
    this.annotations = (this.options ? this.odv.annotations(data) : data) || {};
    if (opt.headers) {
      const etag = opt.headers.get("ETag");
      if (etag)
        this.odv.etag(this.annotations, etag);
    }
  }

  // Context
  private _context?: ODataContext;
  get context(): ODataContext {
    if (this._context === undefined) {
      this._context = this.odv.context(this.annotations);
    }
    return this._context;
  }

  private _properties?: { [name: string]: any };
  get properties() {
    if (this._properties === undefined) {
      this._properties = this.odv.properties(this.annotations);
    }
    return this._properties;
  }

  property(name: string) {
    return this.properties[name];
  }

  // Method
  abstract clone(): ODataMeta;
  abstract data(data: Object): Object;
}

export class ODataPropertyMeta extends ODataMeta {
  clone(): ODataPropertyMeta {
    return new ODataPropertyMeta(this.annotations, { options: this.options });
  }

  data(data: Object) {
    return this.odv.property(data, this.context);
  }

  get type() {
    return this.odv.type(this.annotations) || this.context.type;
  }
}

export class ODataEntityMeta extends ODataMeta {
  clone(): ODataEntityMeta {
    return new ODataEntityMeta(this.annotations, { options: this.options });
  }

  data(data: Object) {
    return this.odv.entity(data, this.context);
  }

  attributes<T>(data: Object): T {
    return this.odv.attributes(data) as T;
  }

  get type() {
    return this.odv.type(this.annotations) || this.context.type;
  }

  get id() {
    return this.odv.id(this.annotations);
  }

  get etag() {
    return this.odv.etag(this.annotations)
  }

  get mediaEtag() {
    return this.odv.mediaEtag(this.annotations)
  }

  get metadataEtag() {
    return this.odv.metadataEtag(this.annotations)
  }

  get readLink() {
    return this.odv.readLink(this.annotations)
  }

  get editLink() {
    return this.odv.editLink(this.annotations)
  }

  get mediaReadLink() {
    return this.odv.mediaReadLink(this.annotations)
  }

  get mediaEditLink() {
    return this.odv.mediaEditLink(this.annotations)
  }

  get mediaContentType() {
    return this.odv.mediaContentType(this.annotations)
  }

  private _functions?: { [name: string]: any };
  get functions() {
    if (this._functions === undefined) {
      this._functions = this.odv.functions(this.annotations);
    }
    return this._functions;
  }

  function(name: string) {
    return this.functions[name];
  }
}

export class ODataEntitiesMeta extends ODataMeta {
  clone(): ODataEntitiesMeta {
    return new ODataEntitiesMeta(this.annotations, { options: this.options });
  }

  data(data: Object) {
    return this.odv.entities(data, this.context);
  }
  get type() {
    return this.context.type;
  }

  get readLink() {
    return this.odv.readLink(this.annotations);
  }

  get count() {
    return this.odv.count(this.annotations);
  }

  get nextLink() {
    return this.odv.nextLink(this.annotations);
  }

  get deltaLink() {
    return this.odv.deltaLink(this.annotations);
  }

  get top() {
    let match = (this.nextLink || "").match(/[&?]{1}\$top=(\d+)/);
    return match !== null ? Number(match[1]) : undefined;
  }

  get skip() {
    let match = (this.nextLink || "").match(/[&?]{1}\$skip=(\d+)/);
    return match !== null ? Number(match[1]) : undefined;
  }

  get skiptoken() {
    let match = (this.nextLink || "").match(/[&?]{1}\$skiptoken=([\d\w\s']+)/);
    return match !== null ? match[1] : undefined;
  }

  private _functions?: { [name: string]: any };
  get functions() {
    if (this._functions === undefined) {
      this._functions = this.odv.functions(this.annotations);
    }
    return this._functions;
  }

  function(name: string) {
    return this.functions[name];
  }
}
