import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { ODataEntityMeta, ODataEntitiesMeta, ODataPropertyMeta } from './meta';
import { Parser } from '../../types';
import { Types } from '../../utils/types';
import { ODataResource } from '../resource';
import { ODataStructuredTypeParser } from '../../parsers/structured-type';
import { ODataEntities, ODataEntity, ODataProperty } from './types';
import { APPLICATION_JSON, ODATA_VERSION_HEADERS, CONTENT_TYPE, CACHE_CONTROL, MAX_AGE } from '../../constants';
import { ODataApi } from '../../api';
import { ODataRequest } from '../request';
import { ODataResponseOptions } from './options';

export class ODataResponse<T> extends HttpResponse<T> {
  readonly api: ODataApi;
  readonly resource: ODataResource<T>;

  constructor(init: {
      api: ODataApi,
      resource: ODataResource<T>,
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

  static fromJSON<T>(req: ODataRequest<T>, json: {
      body: T | null;
      headers: {[name: string]: string | string[]};
      status: number;
      statusText: string;
      url: string | null;
  }) {
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
      headers: this.headers.keys()
        .map(name => ({[name]: this.headers.getAll(name) || []}))
        .reduce((acc, header) => Object.assign(acc, header), {}),
      status: this.status,
      statusText: this.statusText,
      url: this.url
    }
  }

  private _options: ODataResponseOptions | null = null;
  get options(): ODataResponseOptions {
    if (this._options === null) {
      this._options = new ODataResponseOptions(this.api.options);
      const contentType = this.headers.get(CONTENT_TYPE);
      if (contentType && contentType.indexOf(APPLICATION_JSON) !== -1) {
        const features = contentType.split(",").find(p => p.startsWith(APPLICATION_JSON)) as string;
        this._options.setFeatures(features);
      }
      const key = this.headers.keys().find(k => ODATA_VERSION_HEADERS.indexOf(k) !== -1);
      if (key) {
        const version = (this.headers.get(key) || "").replace(/\;/g, "") as '2.0' | '3.0' | '4.0';
        this._options.setVersion(version);
      }
      const cacheControl = this.headers.get(CACHE_CONTROL);
      if (cacheControl) {
        this._options.setCache(cacheControl);
      }
    }
    return this._options;
  }

  private parse(parser: Parser<T>, value: any): any {
    const type = Types.isObject(value) ? this.options.helper.type(value) : undefined;
    if (type !== undefined && parser instanceof ODataStructuredTypeParser) {
      parser = parser.findParser(c => c.isTypeOf(type));
    }
    return parser.deserialize(value, this.options);
  }

  private deserialize(type: string, value: any): any {
    const parser = this.api.findParserForType<T>(type);
    if (parser !== undefined)
      return Array.isArray(value) ?
        value.map(v => this.parse(parser, v)) :
        this.parse(parser, value);
    return value;
  }

  entity(): ODataEntity<T> {
    const payload = this.body && this.options.version === "2.0" ? (<any>this.body)["d"] : this.body;
    const meta = new ODataEntityMeta({data: payload || {}, options: this.options, headers: this.headers});
    let entity = payload ? meta.data(payload) as T : null;
    const type = this.resource.type();
    if (entity !== null && type !== undefined)
      entity = this.deserialize(type, entity) as T;
    return { entity, meta };
  }

  entities(): ODataEntities<T> {
    const payload = this.options.version === "2.0" ? (<any>this.body)["d"] : this.body;
    const meta = new ODataEntitiesMeta({data: payload || {}, options: this.options, headers: this.headers});
    let entities = payload ? meta.data(payload) as T[] : null;
    const type = this.resource.type();
    if (entities !== null && type !== undefined)
      entities = this.deserialize(type, entities) as T[];
    return { entities, meta };
  }

  property(): ODataProperty<T> {
    const payload = this.options.version === "2.0" ? (<any>this.body)["d"] : this.body;
    const meta = new ODataPropertyMeta({data: payload || {}, options: this.options, headers: this.headers});
    let property = payload ? meta.data(payload) as T : null;
    const type = this.resource.type();
    if (property !== null && type !== undefined)
      property = this.deserialize(type, property) as T;
    return { property, meta };
  }

  value(): T | null {
    const payload = this.body && this.options.version === "2.0" ? this.body : this.body;
    const type = this.resource.type();
    return payload ?
      (type !== undefined ? this.deserialize(type, payload) : payload) as T:
      null;
  }
}
