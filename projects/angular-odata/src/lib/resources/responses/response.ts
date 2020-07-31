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

  private deserialize(type: string, value: any): any {
    let parser = this.config.parserForType<T>(type);
    if (!Types.isUndefined(parser) && 'deserialize' in parser)
      value = Array.isArray(value) ? 
        value.map(v => parser.deserialize(v, {
          stringAsEnum: this.config.stringAsEnum, 
          ieee754Compatible: this.config.ieee754Compatible})) : 
        parser.deserialize(value, {
          stringAsEnum: this.config.stringAsEnum, 
          ieee754Compatible: this.config.ieee754Compatible});
    return value;
  }

  entity(): ODataEntity<T> {
    if (this.body) {
      const annotations = ODataEntityAnnotations.factory(this.body)
      const type = annotations.type || this.resource.type();
      let entity = this.body;
      if (type) {
        entity = this.deserialize(type, entity) as T;
      }
      return { entity, annotations };
    }
  }

  entities(): ODataEntities<T> { 
    if (this.body) {
      const annotations = ODataEntitiesAnnotations.factory(this.body)
      const type = this.resource.type();
      let entities = this.body[VALUE];
      if (type) {
        entities = this.deserialize(type, entities) as T[];
      }
      return { entities, annotations };
    }
  }

  property(): ODataProperty<T> {
    if (this.body) {
      const annotations = ODataPropertyAnnotations.factory(this.body)
      const type = annotations.type || this.resource.type();
      let property = this.body[VALUE];
      if (type) {
        property = this.deserialize(type, property) as T;
      }
      return { property, annotations };
    } 
  }

  value(): T {
    if (this.body) {
      const type = this.resource.type();
      let value = this.body;
      if (type) {
        value = this.deserialize(type, value) as T;
      }
      return value; 
    } 
  }
}