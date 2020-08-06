import { ODataContext } from '../../types';
import { HttpHeaders } from '@angular/common/http';
import { ODataOptions } from '../../configs';

export abstract class ODataMeta {
  annotations: Object;
  options?: ODataOptions;
  protected get odv() {
    if (!this.options)
      throw Error("No helper");
    return this.options.helper;
  }

  constructor(data: Object, opt: { 
    options?: ODataOptions, 
    headers?: HttpHeaders
  } = {}) {
    this.options = opt.options;
    this.annotations = (this.options ? this.odv.annotations(data) : data) || {};
    if (opt.headers) {
      const etag = opt.headers.get("ETag");
      if (etag)
        this.odv.setEtag(this.annotations, etag);
    }
  }

  // Context
  private _context: any;
  get context(): ODataContext {
    if (!this._context) {
      this._context = this.odv.context(this.annotations) || {};
    }
    return this._context;
  }

  private _properties: any;
  get properties() {
    if (!this._properties) {
      this._properties = this.odv.properties(this.annotations) || {};
    }
    return this._properties;
  }

  property(name: string) {
    return this.properties[name];
  }

  // Method
  abstract clone();
  abstract data(data: Object);
}

export class ODataPropertyMeta extends ODataMeta {
  clone(): ODataPropertyMeta {
    return new ODataPropertyMeta(this.annotations, {options: this.options});
  }

  data(data: Object) {
    return this.odv.property(data, this.context);
  }

  get type(): string {
    return this.odv.type(this.annotations);
  }
}

export class ODataEntityMeta extends ODataMeta {
  clone(): ODataEntityMeta {
    return new ODataEntityMeta(this.annotations, {options: this.options});
  }

  data(data: Object) {
    return this.odv.entity(data, this.context);
  }

  get type(): string {
    return this.odv.type(this.annotations);
  }

  get id() {
    return this.odv.id(this.annotations);
  }

  get etag() {
    return this.odv.etag(this.annotations)
  }

  get mediaEtag(): string {
    return this.odv.mediaEtag(this.annotations)
  }

  get metadataEtag() {
    return this.odv.metadataEtag(this.annotations)
  }

  get readLink(): string {
    return this.odv.readLink(this.annotations)
  }

  get editLink(): string {
    return this.odv.editLink(this.annotations)
  }

  get mediaReadLink(): string {
    return this.odv.mediaReadLink(this.annotations)
  }

  get mediaEditLink(): string {
    return this.odv.mediaEditLink(this.annotations)
  }

  get mediaContentType(): string {
    return this.odv.mediaContentType(this.annotations)
  }

  private _functions: any;
  get functions() {
    if (!this._functions) {
      this._functions = this.odv.functions(this.annotations) || {};
    }
    return this._functions;
  }

  function(name: string) {
    return this.functions[name];
  }
}

export class ODataEntitiesMeta extends ODataMeta {
  clone(): ODataEntitiesMeta {
    return new ODataEntitiesMeta(this.annotations, {options: this.options});
  }

  data(data: Object) {
    return this.odv.entities(data, this.context);
  }

  get readLink(): string {
    return this.odv.readLink(this.annotations);
  }

  get count(): number {
    return this.odv.count(this.annotations);
  }

  get nextLink(): string {
    return this.odv.nextLink(this.annotations);
  }

  get deltaLink(): string {
    return this.odv.deltaLink(this.annotations);
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
    let match = (this.nextLink || "").match(/[&?]{1}\$skiptoken=([\d\w\s']+)/);
    if (match) return match[1];
  }

  private _functions: any;
  get functions() {
    if (!this._functions) {
      this._functions = this.odv.functions(this.annotations);
    }
    return this._functions;
  }

  function(name: string) {
    return this.functions[name];
  }
}