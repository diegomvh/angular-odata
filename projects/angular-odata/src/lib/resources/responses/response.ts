import { HttpHeaders } from '@angular/common/http';
import { ODataEntityMeta, ODataEntitiesMeta, ODataPropertyMeta } from './meta';
import { Parser } from '../../types';
import { Types } from '../../utils/types';
import { ODataResource } from '../resource';
import { ODataEntityParser } from '../../parsers/entity';
import { ODataEntities, ODataEntity, ODataProperty } from './types';
import { APPLICATION_JSON, ODATA_VERSION_HEADERS, CONTENT_TYPE } from '../../constants';
import { ODataOptions } from '../../configs/options';
import { ODataApiConfig } from '../../configs/api';

export class ODataResponse<T> {
  readonly body: any | null;
  readonly config: ODataApiConfig;
  readonly headers: HttpHeaders;
  readonly status: number;
  readonly statusText: string;
  readonly resource: ODataResource<T>;

  constructor(init: {
    body?: any | null;
    config?: ODataApiConfig;
    headers?: HttpHeaders;
    status?: number;
    statusText?: string;
    resource?: ODataResource<T>;
  }) {
    this.body = init.body;
    this.config = init.config;
    this.headers = init.headers;
    this.status = init.status;
    this.statusText = init.statusText;
    this.resource = init.resource;
  }

  _options: ODataOptions
  options(): ODataOptions {
    if (!this._options) {
      this._options = this.config.options.clone();
      const contentType = this.headers.get(CONTENT_TYPE);
      if (contentType) {
        const features = contentType.split(",").find(p => p.startsWith(APPLICATION_JSON)) as string;
        this._options.setFeatures(features);
      }
      const key = this.headers.keys().find(k => ODATA_VERSION_HEADERS.indexOf(k) !== -1);
      if (key) {
        const version = this.headers.get(key).replace(/\;/g, "") as '2.0' | '3.0' | '4.0';
        this._options.setVersion(version);
      }
    }
    return this._options;
  }

  private parse(parser: Parser<T>, value: any): any {
    const opts = this.options();
    const type = Types.isObject(value) ? opts.helper.type(value) : undefined;
    if (!Types.isUndefined(type) && parser instanceof ODataEntityParser) {
      parser = parser.findParser(c => c.isTypeOf(type));
    }
    return parser.deserialize(value, this.config.options);
  }

  private deserialize(type: string, value: any): any {
    const parser = !Types.isNullOrUndefined(type) ? this.config.parserForType<T>(type) : undefined;
    if (!Types.isUndefined(parser) && 'deserialize' in parser)
      return Array.isArray(value) ?
        value.map(v => this.parse(parser, v)) :
        this.parse(parser, value);
    return value;
  }

  entity(): ODataEntity<T> {
    let opts = this.options();
    if (this.body) {
      const payload = opts.version === "2.0" ? this.body["d"] : this.body;
      const meta = new ODataEntityMeta(payload, {options: opts, headers: this.headers});
      const data = meta.data(payload);
      const entity = this.deserialize(this.resource.type(), data) as T;
      return { entity, meta };
    }
  }

  entities(): ODataEntities<T> {
    let opts = this.options();
    if (this.body) {
      const payload = opts.version === "2.0" ? this.body["d"] : this.body;
      const meta = new ODataEntitiesMeta(payload, {options: opts, headers: this.headers});
      const data = meta.data(payload);
      /*
      const payentitiesload = opts.version === "2.0" ?
        this.body["d"]["results"] :
        this.body[VALUE];
        */
      const entities = this.deserialize(this.resource.type(), data) as T[];
      return { entities, meta };
    }
  }

  property(): ODataProperty<T> {
    let opts = this.options();
    if (this.body) {
      const payload = opts.version === "2.0" ? this.body["d"] : this.body;
      const meta = new ODataPropertyMeta(payload, {options: opts, headers: this.headers});
      const data = meta.data(payload);
      /*
      const payload = opts.version === "2.0" ?
        (('results' in this.body["d"]) ? this.body['d']['results'] : Object.entries(this.body['d'])[0][1] as any) :
        ((VALUE in this.body) ? this.body[VALUE] : this.body);
        */
      const property = this.deserialize(this.resource.type(), data) as T;
      return { property, meta };
    }
  }

  value(): T {
    let opts = this.options();
    if (this.body) {
      const payload = opts.version === "2.0" ? this.body : this.body;
      return this.deserialize(this.resource.type(), payload) as T;
    }
  }
}