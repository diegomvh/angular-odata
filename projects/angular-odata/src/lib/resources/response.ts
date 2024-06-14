import { HttpHeaders, HttpResponse } from '@angular/common/http';
import {
  ODataEntityAnnotations,
  ODataEntitiesAnnotations,
  ODataPropertyAnnotations,
} from '../annotations';
import { Types } from '../utils/types';
import { ODataResource } from './resource';
import {
  APPLICATION_JSON,
  ODATA_VERSION_HEADERS,
  CONTENT_TYPE,
  CACHE_CONTROL,
  LOCATION_HEADER,
  ETAG_HEADERS,
  ODATA_ENTITYID_HEADERS,
  PREFERENCE_APPLIED,
} from '../constants';
import { ODataApi } from '../api';
import { ODataRequest } from './request';
import { Http } from '../utils/http';
import { ODataContext } from '../helper';
import { ODataResponseOptions } from './options';

export type ODataEntity<T> = {
  entity: T | null;
  annots: ODataEntityAnnotations<T>;
};

export type ODataEntities<T> = {
  entities: T[] | null;
  annots: ODataEntitiesAnnotations<T>;
};

export type ODataProperty<T> = {
  property: T | null;
  annots: ODataPropertyAnnotations<T>;
};

/**
 * OData Response
 */
export class ODataResponse<T> extends HttpResponse<T> {
  readonly api: ODataApi;
  readonly resource: ODataResource<T>;

  constructor(init: {
    api: ODataApi;
    resource: ODataResource<T>;
    body: T | null;
    headers: HttpHeaders;
    status: number;
    statusText: string;
    url?: string;
  }) {
    super(init);
    this.api = init.api;
    this.resource = init.resource;
  }

  static fromHttpResponse<T>(req: ODataRequest<T>, res: HttpResponse<T>) {
    return new ODataResponse<T>({
      api: req.api,
      resource: req.resource,
      body: res.body,
      headers: res.headers,
      status: res.status,
      statusText: res.statusText,
      url: res.url || undefined,
    });
  }

  static fromJson<T>(
    req: ODataRequest<T>,
    json: {
      body: T | null;
      headers: { [name: string]: string | string[] };
      status: number;
      statusText: string;
      url: string | null;
    },
  ) {
    return new ODataResponse<T>({
      api: req.api,
      resource: req.resource,
      body: json.body,
      headers: new HttpHeaders(json.headers),
      status: json.status,
      statusText: json.statusText,
      url: json.url || undefined,
    });
  }

  toJson() {
    return {
      body: this.body,
      headers: this.headers
        .keys()
        .map((name) => ({ [name]: this.headers.getAll(name) || [] }))
        .reduce((acc, header) => Object.assign(acc, header), {}),
      status: this.status,
      statusText: this.statusText,
      url: this.url,
    };
  }

  private _options?: ODataResponseOptions;
  get options(): ODataResponseOptions {
    if (this._options === undefined) {
      this._options = new ODataResponseOptions(this.api.options.parserOptions);
      const contentType = this.headers.get(CONTENT_TYPE);
      if (contentType && contentType.includes(APPLICATION_JSON)) {
        const features = contentType
          .split(',')
          .find((p) => p.startsWith(APPLICATION_JSON)) as string;
        this._options.setFeatures(features);
      }
      const headerKey = Http.resolveHeaderKey(
        this.headers,
        ODATA_VERSION_HEADERS,
      );
      if (headerKey) {
        const version = (this.headers.get(headerKey) || '').replace(
          /\;/g,
          '',
        ) as '2.0' | '3.0' | '4.0';
        this._options.setVersion(version);
      }

      const preferenceApplied = this.headers.get(PREFERENCE_APPLIED);
      if (preferenceApplied) {
        this._options.setPreferenceApplied(preferenceApplied);
      }

      const location = this.headers.get(LOCATION_HEADER);
      if (location) {
        this._options.setLocation(location);
      }

      const cacheControl = this.headers.get(CACHE_CONTROL);
      if (cacheControl) {
        this._options.setCache(cacheControl);
      }
    }
    return this._options;
  }

  private _payload?: any;
  get payload() {
    if (this._payload === undefined) {
      this._payload =
        this.body && this.options.version === '2.0'
          ? (<any>this.body)['d']
          : this.body;
    }
    return this._payload;
  }

  private _context?: any;
  get context(): ODataContext {
    if (this._context === undefined) {
      this._context = this.options.helper.context(
        Types.isPlainObject(this.payload) ? this.payload : {},
      );
    }
    return this._context;
  }

  private _annotations?: Map<string, any>;
  get annotations(): Map<string, any> {
    if (this._annotations === undefined) {
      const options = this.options;
      this._annotations = options.helper.annotations(this.payload || {});
      let key = Http.resolveHeaderKey(this.headers, ETAG_HEADERS);
      if (key) {
        const etag = this.headers.get(key);
        if (etag) this._annotations.set(options.helper.ODATA_ETAG, etag);
      }
      key = Http.resolveHeaderKey(this.headers, ODATA_ENTITYID_HEADERS);
      if (key) {
        const entityId = this.headers.get(key);
        if (entityId) this._annotations.set(options.helper.ODATA_ID, entityId);
      }
    }
    return this._annotations;
  }

  /**
   * Handle the response body as an entity
   * @returns
   */
  entity(): ODataEntity<T> {
    const options = this.options;
    const payload = this.payload;
    const annots = new ODataEntityAnnotations<T>(
      options.helper,
      this.annotations,
      this.context,
    );
    const data = payload ? annots.data(payload) : null;
    let entity = (
      data !== null && Types.isPlainObject(data)
        ? options.helper.attributes(data, this.api.options.stripMetadata)
        : data
    ) as T | null;

    if (entity !== null)
      entity = this.resource.deserialize(entity, options) as T;
    return { entity, annots };
  }

  /**
   * Handle the response body as entities
   * @returns
   */
  entities(): ODataEntities<T> {
    const options = this.options;
    const payload = this.payload;
    const annots = new ODataEntitiesAnnotations<T>(
      options.helper,
      this.annotations,
      this.context,
    );
    let entities = payload ? annots.data(payload) : null;
    if (entities !== null)
      entities = this.resource.deserialize(entities, options) as T[];
    return { entities, annots };
  }

  /**
   * Handle the response body as a property
   * @returns
   */
  property(): ODataProperty<T> {
    const options = this.options;
    const payload = this.payload;
    const annots = new ODataPropertyAnnotations<T>(
      options.helper,
      this.annotations,
      this.context,
    );
    const data = payload ? (annots.data(payload) as T) : null;
    let property = (
      data !== null && Types.isPlainObject(data)
        ? options.helper.attributes(
            data as { [name: string]: any },
            this.api.options.stripMetadata,
          )
        : data
    ) as T | null;

    if (property !== null)
      property = this.resource.deserialize(property, options) as T;
    return { property, annots };
  }

  /**
   * Handle the response body as a value
   * @returns
   */
  value(): T | null {
    const options = this.options;
    const payload = this.payload;
    let value = (
      payload !== null && Types.isPlainObject(payload)
        ? options.helper.attributes(payload, this.api.options.stripMetadata)
        : payload
    ) as T | null;

    if (value !== null) value = this.resource.deserialize(value, options) as T;
    return value;
  }
}
