import { HttpHeaders } from '@angular/common/http';
import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataPropertyAnnotations } from './annotations';
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

  private deserialize<T>(value: any): Partial<T> | Partial<T>[] {
    //TODO
    //const type = annots.context && annots.context.type || null; 
    let parser = this.config.parserForType<T>(this.resource.type());
    if (!Types.isUndefined(parser) && 'deserialize' in parser)
      return Array.isArray(value) ? 
        value.map(v => parser.deserialize(v, {stringAsEnum: this.config.stringAsEnum, ieee754Compatible: this.config.ieee754Compatible})) as Partial<T>[]: 
        parser.deserialize(value, {stringAsEnum: this.config.stringAsEnum, ieee754Compatible: this.config.ieee754Compatible}) as Partial<T>;
    return value;
  }

  entity(): [T | null, ODataEntityAnnotations | null] {
    if (!this.body) return [null, null];
    const annots = ODataEntityAnnotations.factory(odataAnnotations(this.body));
    
    const entity = this.deserialize<T>(entityAttributes(this.body)) as T;
    return [entity, annots];
  }

  entities(): [T[] | null, ODataEntitiesAnnotations | null] {
    if (!this.body) return [null, null];
    const annots = ODataEntitiesAnnotations.factory(odataAnnotations(this.body));

    const entities = this.deserialize<T>(this.body[VALUE]) as T[];
    return [entities, annots];
  }

  property(): [T | null, ODataPropertyAnnotations | null] {
    if (!this.body) return [null, null];
    const annots = ODataPropertyAnnotations.factory(odataAnnotations(this.body));

    const property = this.deserialize<T>(this.body[VALUE]) as T;
    return [property, annots];
  }

  value(): T {
    if (!this.body) return null;
    return this.deserialize<T>(this.body) as T;
  }
}