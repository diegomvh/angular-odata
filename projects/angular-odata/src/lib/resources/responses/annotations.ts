import { HttpHeaders } from '@angular/common/http';
import { DEFAULT_VERSION, ETAG_HEADERS, ODATA_ENTITYID_HEADERS } from '../../constants';
import { ODataContext, ODataHelper } from '../../helper';
import { OptionsHelper } from '../../types';
import { Http } from '../../utils/http';

export abstract class ODataAnnotations {
  annotations: { [annot: string]: any };
  options?: OptionsHelper;
  protected get helper() {
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
    this.annotations = this.options ? this.helper.annotations(data) : data;
    if (headers) {
      let header = Http.resolveHeaderKey(headers, ETAG_HEADERS);
      if (header) {
        const etag = headers.get(header);
        if (etag) this.helper.etag(this.annotations, etag);
      }
      header = Http.resolveHeaderKey(headers, ODATA_ENTITYID_HEADERS);
      if (header) {
        const entityId = headers.get(header);
        if (entityId) this.helper.id(this.annotations, entityId);
      }
    }
  }

  // Context
  private _context?: ODataContext;
  get context(): ODataContext {
    if (this._context === undefined) {
      this._context = this.helper.context(this.annotations);
    }
    return this._context;
  }
  private _properties?: { [name: string]: any };
  get properties() {
    if (this._properties === undefined) {
      this._properties = this.helper.properties(this.annotations);
    }
    return this._properties;
  }

  property(name: string) {
    return this.properties[name];
  }

  attributes<T>(data: Object): T {
    return this.helper.attributes(data) as T;
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
    return this.helper.property(data, this.context)
  }

  get type() {
    return this.helper.type(this.annotations) || this.context.type;
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
    return this.helper.entity(data, this.context);
  }

  get type() {
    return this.helper.type(this.annotations) || this.context.type;
  }

  get id() {
    return this.helper.id(this.annotations);
  }

  get etag() {
    return this.helper.etag(this.annotations);
  }

  get mediaEtag() {
    return this.helper.mediaEtag(this.annotations);
  }

  get metadataEtag() {
    return this.helper.metadataEtag(this.annotations);
  }

  get readLink() {
    return this.helper.readLink(this.annotations);
  }

  get editLink() {
    return this.helper.editLink(this.annotations);
  }

  get mediaReadLink() {
    return this.helper.mediaReadLink(this.annotations);
  }

  get mediaEditLink() {
    return this.helper.mediaEditLink(this.annotations);
  }

  get mediaContentType() {
    return this.helper.mediaContentType(this.annotations);
  }

  private _functions?: { [name: string]: any };
  get functions() {
    if (this._functions === undefined) {
      this._functions = this.helper.functions(this.annotations);
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
    return this.helper.entities(data, this.context);
  }
  get type() {
    return this.context.type;
  }

  get readLink() {
    return this.helper.readLink(this.annotations);
  }

  get count() {
    return this.helper.count(this.annotations);
  }

  get nextLink() {
    return this.helper.nextLink(this.annotations);
  }

  get deltaLink() {
    return this.helper.deltaLink(this.annotations);
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
      this._functions = this.helper.functions(this.annotations);
    }
    return this._functions;
  }
  function(name: string) {
    return this.functions[name];
  }
}
