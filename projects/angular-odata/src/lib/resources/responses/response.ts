import { HttpHeaders, HttpResponse } from '@angular/common/http';
import {
  ODataEntityAnnotations,
  ODataEntitiesAnnotations,
  ODataPropertyAnnotations,
} from './annotations';
import { Types } from '../../utils/types';
import { ODataResource } from '../resource';
import { ODataEntities, ODataEntity, ODataProperty } from './types';
import {
  APPLICATION_JSON,
  ODATA_VERSION_HEADERS,
  CONTENT_TYPE,
  CACHE_CONTROL,
  LOCATION_HEADER,
} from '../../constants';
import { ODataApi } from '../../api';
import { ODataRequest } from '../request';
import { ODataResponseOptions } from './options';
import { Http } from '../../utils/http';

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

  static fromJSON<T>(
    req: ODataRequest<T>,
    json: {
      body: T | null;
      headers: { [name: string]: string | string[] };
      status: number;
      statusText: string;
      url: string | null;
    }
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

  toJSON() {
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

  private _options: ODataResponseOptions | null = null;
  get options(): ODataResponseOptions {
    if (this._options === null) {
      this._options = new ODataResponseOptions(this.api.options);
      const contentType = this.headers.get(CONTENT_TYPE);
      if (contentType && contentType.indexOf(APPLICATION_JSON) !== -1) {
        const features = contentType
          .split(',')
          .find((p) => p.startsWith(APPLICATION_JSON)) as string;
        this._options.setFeatures(features);
      }
      const header = Http.resolveHeaderKey(this.headers, ODATA_VERSION_HEADERS);
      if (header) {
        const version = (this.headers.get(header) || '').replace(/\;/g, '') as
          | '2.0'
          | '3.0'
          | '4.0';
        this._options.setVersion(version);
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

  get payload() {
    const options = this.options;
    return this.body && options.version === '2.0'
      ? (<any>this.body)['d']
      : this.body;
  }

  /**
   * Handle the response body as an entity
   * @returns
   */
  entity(): ODataEntity<T> {
    const options = this.options;
    const payload = this.payload;
    const annots = new ODataEntityAnnotations({
      data: payload || {},
      options: options,
      headers: this.headers,
    });
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
    const annots = new ODataEntitiesAnnotations({
      data: payload || {},
      options: options,
      headers: this.headers,
    });
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
    const annots = new ODataPropertyAnnotations({
      data: payload || {},
      options: options,
      headers: this.headers,
    });
    const data = payload ? (annots.data(payload) as T) : null;
    let property = (
      data !== null && Types.isPlainObject(data)
        ? options.helper.attributes(data, this.api.options.stripMetadata)
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
