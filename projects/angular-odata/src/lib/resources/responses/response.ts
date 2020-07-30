import { HttpHeaders } from '@angular/common/http';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataPropertyAnnotations } from './annotations';
import { odataAnnotations, entityAttributes, VALUE, Parser } from '../../types';
import { Types } from '../../utils';
import { ODataConfig } from '../../models';
import { ODataResource } from '../resource';

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

  entity(): {entity: T, annotations: ODataEntityAnnotations} {
    if (this.body) {
      const annotations = ODataEntityAnnotations.factory(odataAnnotations(this.body))
      const type = annotations.type || this.resource.type();
      let entity = this.body;
      if (type) {
        const parser = this.config.parserForType<T>(type);
        if (!Types.isUndefined(parser) && 'deserialize' in parser)
          entity = parser.deserialize(entity, {
            stringAsEnum: this.config.stringAsEnum, 
            ieee754Compatible: this.config.ieee754Compatible}) as T;
      }
      return { entity, annotations };
    }
  }

  entities(): {entities: T[], annotations: ODataEntitiesAnnotations} {
    if (this.body) {
      const annotations = ODataEntitiesAnnotations.factory(odataAnnotations(this.body))
      const type = this.resource.type();
      let entities = this.body[VALUE];
      if (type) {
        const parser = this.config.parserForType<T>(type);
        if (!Types.isUndefined(parser) && 'deserialize' in parser)
          entities = entities.map(entity => parser.deserialize(entity, {
            stringAsEnum: this.config.stringAsEnum, ieee754Compatible: this.config.ieee754Compatible})) as T[];
      }
      return { entities, annotations };
    }
  }

  property(): {property: T, annotations: ODataPropertyAnnotations} {
    if (this.body) {
      const annotations = ODataPropertyAnnotations.factory(odataAnnotations(this.body))
      const type = annotations.type || this.resource.type();
      let property = this.body[VALUE];
      if (type) {
        const parser = this.config.parserForType<T>(type);
        if (!Types.isUndefined(parser) && 'deserialize' in parser)
          property = parser.deserialize(property, {
            stringAsEnum: this.config.stringAsEnum, 
            ieee754Compatible: this.config.ieee754Compatible}) as T;
      }
      return { property, annotations };
    } 
  }

  value(): T {
    if (this.body) {
      const type = this.resource.type();
      let value = this.body;
      if (type) {
        const parser = this.config.parserForType<T>(type);
        if (!Types.isUndefined(parser) && 'deserialize' in parser)
          value = parser.deserialize(value, {
            stringAsEnum: this.config.stringAsEnum, 
            ieee754Compatible: this.config.ieee754Compatible}) as T;
      }
      return value; 
    } 
  }
}