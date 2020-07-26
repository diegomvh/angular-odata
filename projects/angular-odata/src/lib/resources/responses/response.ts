import { HttpHeaders } from '@angular/common/http';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataValueAnnotations } from './annotations';
import { odataAnnotations, entityAttributes, VALUE, Parser } from '../../types';
import { Types } from '../../utils';
import { ODataModel, ODataCollection, ODataConfig } from '../../models';
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

  entity(): [T | null, ODataEntityAnnotations | null] {
    if (!this.body) return [null, null];
    const annots = ODataEntityAnnotations.factory(odataAnnotations(this.body));
    const type = annots.context && annots.context.type || null; 
    
    //TODO: ieee754 from header
    const entity = this.config.deserialize<T>(type || this.resource.type(), entityAttributes(this.body)) as T;
    return [entity, annots];
  }

  entities(): [T[] | null, ODataEntitiesAnnotations | null] {
    if (!this.body) return [null, null];
    const annots = ODataEntitiesAnnotations.factory(odataAnnotations(this.body));
    const type = annots.context && annots.context.type || null;

    //TODO: ieee754 from header
    const entities = this.config.deserialize<T>(type || this.resource.type(), this.body[VALUE]) as T[];
    return [entities, annots];
  }

  property(): [T | null, ODataValueAnnotations | null] {
    if (!this.body) return [null, null];
    const annots = ODataValueAnnotations.factory(odataAnnotations(this.body));
    const type = annots.context && annots.context.type || null;

    //TODO: ieee754 from header
    const property = this.config.deserialize<T>(type || this.resource.type(), this.body[VALUE]) as T;
    return [property, annots];
  }

  value(): T {
    if (!this.body) return null;
    return this.config.deserialize<T>(this.resource.type(), this.body) as T;
  }
}