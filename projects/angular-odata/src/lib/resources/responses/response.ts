import { HttpHeaders } from '@angular/common/http';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataPropertyAnnotations } from './annotations';
import { odataAnnotations, VALUE } from '../../types';
import { Types } from '../../utils';
import { ODataConfig } from '../../models';
import { ODataResource } from '../resource';

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

  entity(): ODataEntity<T> {
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

  entities(): ODataEntities<T> { 
    if (this.body) {
      const annotations = ODataEntitiesAnnotations.factory(odataAnnotations(this.body))
      const type = this.resource.type();
      let entities = this.body[VALUE];
      if (type) {
        const parser = this.config.parserForType<T>(type);
        if (!Types.isUndefined(parser) && 'deserialize' in parser)
          entities = entities.map(entity => parser.deserialize(entity, {
            stringAsEnum: this.config.stringAsEnum, 
            ieee754Compatible: this.config.ieee754Compatible})) as T[];
      }
      return { entities, annotations };
    }
  }

  property(): ODataProperty<T> {
    if (this.body) {
      const annotations = ODataPropertyAnnotations.factory(odataAnnotations(this.body))
      const type = annotations.type || this.resource.type();
      let property = this.body[VALUE];
      if (type) {
        const parser = this.config.parserForType<T>(type);
        if (!Types.isUndefined(parser) && 'deserialize' in parser)
          property = Array.isArray(property) ? 
            property.map(p => parser.deserialize(p, {
              stringAsEnum: this.config.stringAsEnum, 
              ieee754Compatible: this.config.ieee754Compatible})) : 
            parser.deserialize(property, {
              stringAsEnum: this.config.stringAsEnum, 
              ieee754Compatible: this.config.ieee754Compatible});
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
          value = Array.isArray(value) ? 
            value.map(v => parser.deserialize(v, {
              stringAsEnum: this.config.stringAsEnum, 
              ieee754Compatible: this.config.ieee754Compatible})) : 
            parser.deserialize(value, {
              stringAsEnum: this.config.stringAsEnum, 
              ieee754Compatible: this.config.ieee754Compatible});
      }
      return value; 
    } 
  }
}