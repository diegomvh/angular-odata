import type { ODataContext, ODataVersionHelper } from './helper';

import type { ODataMetadataType } from './types';

export abstract class ODataAnnotations<T> {
  constructor(
    public helper: ODataVersionHelper,
    protected annotations: Map<string, any> = new Map<string, any>(),
    protected context?: ODataContext,
  ) {}

  attributes(data: { [name: string]: any }, metadata: ODataMetadataType): Partial<T> {
    return this.helper.attributes(data, metadata) as Partial<T>;
  }

  update(data: { [name: string]: any }) {
    this.annotations = new Map<string, any>([
      ...this.annotations,
      ...this.helper.annotations(data),
    ]);
  }

  get entitySet() {
    return this.context?.entitySet;
  }

  get type() {
    return this.helper.type(this.annotations) || this.context?.type;
  }

  // Method
  abstract union(other: ODataAnnotations<any>): ODataAnnotations<any>;
  abstract clone(): ODataAnnotations<any>;
  abstract data(data: { [name: string]: any }): { [name: string]: any };
}

export class ODataPropertyAnnotations<T> extends ODataAnnotations<T> {
  union(other: ODataPropertyAnnotations<any>): ODataPropertyAnnotations<any> {
    return new ODataPropertyAnnotations<any>(
      this.helper,
      new Map<string, any>([...this.annotations, ...other.annotations]),
      Object.assign({}, this.context, other.context),
    );
  }

  clone(): ODataPropertyAnnotations<any> {
    return new ODataPropertyAnnotations<any>(this.helper, new Map(this.annotations), this.context);
  }

  data(data: { [name: string]: any }) {
    return this.helper.property(data);
  }
}

export class ODataEntityAnnotations<T> extends ODataAnnotations<T> {
  union(other: ODataEntityAnnotations<any>): ODataEntityAnnotations<any> {
    return new ODataEntityAnnotations<any>(
      this.helper,
      new Map<string, any>([...this.annotations, ...other.annotations]),
      Object.assign({}, this.context, other.context),
    );
  }

  clone(): ODataEntityAnnotations<any> {
    return new ODataEntityAnnotations<any>(this.helper, new Map(this.annotations), this.context);
  }

  data(data: { [name: string]: any }) {
    return this.helper.entity(data);
  }

  get id() {
    return this.helper.id(this.annotations);
  }

  get etag() {
    return this.helper.etag(this.annotations);
  }

  get mediaEtag() {
    const mediaEtag = this.helper.mediaEtag(this.annotations);
    try {
      return mediaEtag && decodeURIComponent(mediaEtag);
    } catch {
      return mediaEtag;
    }
  }

  get metadataEtag() {
    const metadataEtag = this.helper.metadataEtag(this.annotations);
    try {
      return metadataEtag && decodeURIComponent(metadataEtag);
    } catch {
      return metadataEtag;
    }
  }

  get readLink() {
    const readLink = this.helper.readLink(this.annotations);
    try {
      return readLink && decodeURIComponent(readLink);
    } catch {
      return readLink;
    }
  }

  get editLink() {
    const editLink = this.helper.editLink(this.annotations);
    try {
      return editLink && decodeURIComponent(editLink);
    } catch {
      return editLink;
    }
  }

  get mediaReadLink() {
    const mediaReadLink = this.helper.mediaReadLink(this.annotations);
    try {
      return mediaReadLink && decodeURIComponent(mediaReadLink);
    } catch {
      return mediaReadLink;
    }
  }

  get mediaEditLink() {
    const mediaEditLink = this.helper.mediaEditLink(this.annotations);
    try {
      return mediaEditLink && decodeURIComponent(mediaEditLink);
    } catch {
      return mediaEditLink;
    }
  }

  get mediaContentType() {
    const mediaContentType = this.helper.mediaContentType(this.annotations);
    try {
      return mediaContentType && decodeURIComponent(mediaContentType);
    } catch {
      return mediaContentType;
    }
  }

  private _properties?: Map<keyof T, Map<string, any>>;
  get properties() {
    if (this._properties === undefined) {
      this._properties = this.helper.properties<T>(this.annotations);
    }
    return this._properties;
  }

  property<F>(name: keyof T, type: 'collection'): ODataEntitiesAnnotations<F>;
  property<F>(name: keyof T, type: 'single'): ODataEntityAnnotations<F>;
  property<F>(
    name: keyof T,
    type: 'single' | 'collection',
  ): ODataEntityAnnotations<F> | ODataEntitiesAnnotations<F> {
    const props = this.properties.get(name);
    return type === 'collection'
      ? new ODataEntitiesAnnotations<F>(this.helper, props)
      : new ODataEntityAnnotations<F>(this.helper, props);
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

export class ODataEntitiesAnnotations<T> extends ODataAnnotations<T> {
  union(other: ODataEntitiesAnnotations<any>): ODataEntitiesAnnotations<any> {
    return new ODataEntitiesAnnotations<any>(
      this.helper,
      new Map<string, any>([...this.annotations, ...other.annotations]),
      Object.assign({}, this.context, other.context),
    );
  }

  clone(): ODataEntitiesAnnotations<any> {
    return new ODataEntitiesAnnotations<any>(this.helper, new Map(this.annotations), this.context);
  }

  data(data: { [name: string]: any }) {
    return this.helper.entities(data);
  }

  get readLink() {
    const readLink = this.helper.readLink(this.annotations);
    try {
      return readLink && decodeURIComponent(readLink);
    } catch {
      return readLink;
    }
  }

  get count() {
    return this.helper.count(this.annotations);
  }

  get nextLink() {
    const nextLink = this.helper.nextLink(this.annotations);
    try {
      return nextLink && decodeURIComponent(nextLink);
    } catch {
      return nextLink;
    }
  }

  get deltaLink() {
    const deltaLink = this.helper.deltaLink(this.annotations);
    try {
      return deltaLink && decodeURIComponent(deltaLink);
    } catch {
      return deltaLink;
    }
  }

  get top() {
    let match = (this.nextLink ?? '').match(/[?&](?:\$|%24)top=(\d+)/i);
    return match !== null ? Number(match[1]) : undefined;
  }

  get skip() {
    let match = (this.nextLink ?? '').match(/[?&](?:\$|%24)skip=(\d+)/i);
    return match !== null ? Number(match[1]) : undefined;
  }

  get skiptoken() {
    const nextLink = this.helper.nextLink(this.annotations);
    let match = (nextLink ?? '').match(/[?&](?:\$|%24)skiptoken=([^&#]*)/i);
    if (match === null) return undefined;
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
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

  entity(): ODataEntityAnnotations<T> {
    return new ODataEntityAnnotations<T>(this.helper, this.annotations);
  }
}
