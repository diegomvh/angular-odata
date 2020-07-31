import { HttpHeaders } from '@angular/common/http';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataPropertyAnnotations } from '../models/annotations';
import { VALUE, Parser, odataType } from '../types';
import { Types } from '../utils';
import { ODataConfig } from '../models';
import { ODataResource } from './resource';
import { ODataEntityParser } from '../parsers';

export type ODataEntity<T> = {entity: T, annotations: ODataEntityAnnotations};
export type ODataEntities<T> = {entities: T[], annotations: ODataEntitiesAnnotations};
export type ODataProperty<T> = {property: T, annotations: ODataPropertyAnnotations};

export class ODataResponse<T> {
  readonly body: any|null;
  readonly config: ODataConfig;
  readonly headers: HttpHeaders;
  readonly status: number;
  readonly statusText: string;
  readonly resource: ODataResource<T>;

  constructor(init: { 
    body?: any | null;
    config?: ODataConfig;
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

  private parse(parser: Parser<T>, value: any): any {
    const type = Types.isObject(value) ? odataType(value) : undefined;
    if (!Types.isUndefined(type) && parser instanceof ODataEntityParser && parser.type !== type) {
      parser = parser.children.find(c => c.type === type);
    }
    return parser.deserialize(value, {
      stringAsEnum: this.config.stringAsEnum, 
      ieee754Compatible: this.config.ieee754Compatible});
  }
  
  private deserialize(type: string, value: any): any {
    const parser = this.config.parserForType<T>(type);
    if (!Types.isUndefined(parser) && 'deserialize' in parser)
      return Array.isArray(value) ? 
        value.map(v => this.parse(parser, v)) : 
        this.parse(parser, value);
    return value;
  }

  entity(): ODataEntity<T> {
    if (this.body) {
      const annotations = new ODataEntityAnnotations(this.body)
      const entity = this.deserialize(this.resource.type(), this.body) as T;
      return { entity, annotations };
    }
  }

  entities(): ODataEntities<T> { 
    if (this.body) {
      const annotations = new ODataEntitiesAnnotations(this.body)
      const entities = this.deserialize(this.resource.type(), this.body[VALUE]) as T[];
      return { entities, annotations };
    }
  }

  property(): ODataProperty<T> {
    if (this.body) {
      const annotations = new ODataPropertyAnnotations(this.body)
      const property = this.deserialize(
        this.resource.type(), 
        VALUE in this.body? this.body[VALUE] : this.body) as T;
      return { property, annotations };
    } 
  }

  value(): T {
    if (this.body) {
      return this.deserialize(this.resource.type(), this.body) as T;
    } 
  }
}