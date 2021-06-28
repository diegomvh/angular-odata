import { HttpHeaders } from '@angular/common/http';
import { DEFAULT_VERSION, ETAG_HEADER, ETAG_HEADERS, ODATA_ENTITYID, ODATA_ENTITYID_HEADERS } from '../../constants';
import { ODataContext, ODataHelper } from '../../helper';
import { OptionsHelper } from '../../types';
import { Http } from '../../utils/http';

export abstract class ODataAnnotations {
  annotations: { [annot: string]: any };
  options?: OptionsHelper;
  protected get odv() {
    return this.options?.helper || ODataHelper[DEFAULT_VERSION];
  }
  constructor({
    data = {},
    options,
    headers,
  }: {
    data?: { [name: string]: any };
    options?: OptionsHelper;
    headers?: HttpHeaders;
  } = {}) {
    this.options = options;
    this.annotations = this.options ? this.odv.annotations(data) : data;
    if (headers) {
      let header = Http.resolveHeaderKey(headers, ETAG_HEADERS);
      if (header) {
        const etag = headers.get(header);
        if (etag) this.odv.etag(this.annotations, etag);
      }
      header = Http.resolveHeaderKey(headers, ODATA_ENTITYID_HEADERS);
      if (header) {
        const entityId = headers.get(header);
        if (entityId) this.odv.id(this.annotations, entityId);
      }
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

  attributes<T>(data: Object): T {
    let attrs = this.odv.attributes(data);
    // TODO: Is Optional by Settings ? Update Etag
    this.odv.etag(attrs, this.odv.etag(this.annotations));
    return attrs as T;
  }

  // Method
  abstract clone(): ODataAnnotations;
  abstract data(data: Object): Object;
}

export class ODataPropertyAnnotations extends ODataAnnotations {
  clone(): ODataPropertyAnnotations {
    return new ODataPropertyAnnotations({
      data: Object.assign({}, this.annotations),
      options: this.options,
    });
  }

  data(data: Object) {
    return this.odv.property(data, this.context)
  }

  get type() {
    return this.odv.type(this.annotations) || this.context.type;
  }
}

export class ODataEntityAnnotations extends ODataAnnotations {
  clone(): ODataEntityAnnotations {
    return new ODataEntityAnnotations({
      data: Object.assign({}, this.annotations),
      options: this.options,
    });
  }

  data(data: Object) {
    return this.odv.entity(data, this.context);
  }

  get type() {
    return this.odv.type(this.annotations) || this.context.type;
  }

  get id() {
    return this.odv.id(this.annotations);
  }

  get etag() {
    return this.odv.etag(this.annotations);
  }

  get mediaEtag() {
    return this.odv.mediaEtag(this.annotations);
  }

  get metadataEtag() {
    return this.odv.metadataEtag(this.annotations);
  }

  get readLink() {
    return this.odv.readLink(this.annotations);
  }

  get editLink() {
    return this.odv.editLink(this.annotations);
  }

  get mediaReadLink() {
    return this.odv.mediaReadLink(this.annotations);
  }

  get mediaEditLink() {
    return this.odv.mediaEditLink(this.annotations);
  }

  get mediaContentType() {
    return this.odv.mediaContentType(this.annotations);
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

export class ODataEntitiesAnnotations extends ODataAnnotations {
  clone(): ODataEntitiesAnnotations {
    return new ODataEntitiesAnnotations({
      data: Object.assign({}, this.annotations),
      options: this.options,
    });
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
    let match = (this.nextLink || '').match(/[&?]{1}\$top=(\d+)/);
    return match !== null ? Number(match[1]) : undefined;
  }

  get skip() {
    let match = (this.nextLink || '').match(/[&?]{1}\$skip=(\d+)/);
    return match !== null ? Number(match[1]) : undefined;
  }

  get skiptoken() {
    let match = (this.nextLink || '').match(/[&?]{1}\$skiptoken=([\d\w\s']+)/);
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
