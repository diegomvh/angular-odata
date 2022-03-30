import { ODataContext, ODataVersionHelper } from '../../helper';

import { ODataMetadataType } from '../../types';

export abstract class ODataAnnotations {
  constructor(
    public helper: ODataVersionHelper,
    protected annotations: Map<string, any> = new Map<string, any>(), 
    protected context?: ODataContext
  ) {}

  attributes<T>(data: { [key: string]: any }, metadata: ODataMetadataType): T {
    return this.helper.attributes(data, metadata) as T;
  }

  get entitySet() {
    return this.context?.entitySet;
  }

  get type() {
    return this.helper.type(this.annotations) || this.context?.type;
  }

  // Method
  abstract clone(): ODataAnnotations;
  abstract data(data: { [key: string]: any }): { [key: string]: any };
}

export class ODataPropertyAnnotations extends ODataAnnotations {
  clone(): ODataPropertyAnnotations {
    return new ODataPropertyAnnotations(
      this.helper,
      new Map(this.annotations),
      this.context
    );
  }

  data(data: { [key: string]: any }) {
    return this.helper.property(data);
  }
}

export class ODataEntityAnnotations extends ODataAnnotations {
  clone(): ODataEntityAnnotations {
    return new ODataEntityAnnotations(
      this.helper,
      new Map(this.annotations),
      this.context
    );
  }

  data(data: { [key: string]: any }) {
    return this.helper.entity(data);
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

  private _properties?: Map<string, Map<string, any>>;
  get properties() {
    if (this._properties === undefined) {
      this._properties = this.helper.properties(this.annotations);
    }
    return this._properties;
  }

  property(name: string) {
    return this.properties.get(name);
  }

  private _functions?: { [key: string]: any };
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
    return new ODataEntitiesAnnotations(
      this.helper,
      new Map(this.annotations),
      this.context
    );
  }

  data(data: { [key: string]: any }) {
    return this.helper.entities(data);
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

  private _functions?: { [key: string]: any };
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
