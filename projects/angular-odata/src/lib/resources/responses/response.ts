import { HttpHeaders } from '@angular/common/http';
import { ODataEntityMeta, ODataEntitiesMeta, ODataPropertyMeta, ODataMeta } from './meta';
import { VALUE, Parser, odataType, ParseOptions, APPLICATION_JSON, ODATA_NEXTLINK } from '../../types';
import { Types } from '../../utils/types';
import { ODataApiConfig } from '../../config';
import { ODataResource } from '../resource';
import { ODataEntityParser } from '../../parsers/entity';
import { ODataEntities, ODataEntity, ODataProperty, ResponseOptions } from './types';

export class ODataResponse<T> {
  readonly body: any|null;
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

  options(): ResponseOptions {
    let options = this.config.options() as ResponseOptions;
    let appJson = this.headers.get("content-type").split(",").find(p => p.startsWith(APPLICATION_JSON)) as string;
    if (appJson) {
      appJson.split(";").forEach(o => {
        let [k, v] = o.split("=");
        switch(k) {
          case 'odata.metadata':
            options.metadata = v as 'full' | 'minimal' | 'none';
            break;
          case 'odata.streaming':
            options.streaming = v == "true";
            break;
          case 'IEEE754Compatible':
            options.ieee754Compatible = v == "true";
            break;
        }
      });
    }
    let version = this.headers.get("odata-version") ||
      this.headers.get("OData-Version") ||
      this.headers.get("dataserviceversion");
    if (version)
      options.version = version.split(";")[0];
    let etag = this.headers.get("ETag");
    if (etag)
      options.etag = etag;
    return options;
  }

  private parse(parser: Parser<T>, value: any): any {
    const type = Types.isObject(value) ? odataType(value) : undefined;
    if (!Types.isUndefined(type) && parser instanceof ODataEntityParser && parser.type !== type) {
      parser = parser.findParser(c => c.type === type);
    }
    return parser.deserialize(value, this.config.options());
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
      const meta = opts.version === "2.0"? 
        new ODataEntityMeta(this.body["d"]["__metadata"], opts) : 
        new ODataEntityMeta(this.body, opts);
      const payload = opts.version === "2.0"? 
        this.body["d"] : 
        this.body;  
      const entity = this.deserialize(this.resource.type(), payload) as T;
      return { entity, meta };
    }
  }

  entities(): ODataEntities<T> { 
    let opts = this.options();
    if (this.body) {
      const meta = opts.version === "2.0"? 
        new ODataEntitiesMeta(this.body["d"], opts) : 
        new ODataEntitiesMeta(this.body, opts);
      const payload = opts.version === "2.0"? 
        this.body["d"]["results"] : 
        this.body[VALUE];
      const entities = this.deserialize(this.resource.type(), payload) as T[];
      return { entities, meta };
    }
  }

  property(): ODataProperty<T> {
    let opts = this.options();
    if (this.body) {
      const meta = opts.version === "2.0"? 
        new ODataPropertyMeta(this.body["d"], opts) :
        new ODataPropertyMeta(this.body, opts);
      const payload = opts.version === "2.0"? 
        (('results' in this.body["d"])? this.body['d']['results'] : Object.entries(this.body['d'])[0][1] as any):
        ((VALUE in this.body)? this.body[VALUE] : this.body);
      const property = this.deserialize(this.resource.type(), payload) as T;
      return { property, meta };
    } 
  }

  value(): T {
    let opts = this.options();
    if (this.body) {
      const payload = opts.version === "2.0"? 
        this.body :
        this.body; 
      return this.deserialize(this.resource.type(), payload) as T;
    } 
  }
}