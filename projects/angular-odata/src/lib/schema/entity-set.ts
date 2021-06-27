import { ODataSchema } from './schema';
import { EntitySetConfig } from '../types';
import { ODataAnnotation } from './annotation';
export class ODataEntitySet {
  schema: ODataSchema;
  name: string;
  entityType: string;
  service: { new (...params: any[]): any };
  annotations: ODataAnnotation[];
  constructor(config: EntitySetConfig, schema: ODataSchema) {
    this.schema = schema;
    this.name = config.name;
    this.entityType = config.entityType;
    this.service = config.service;
    this.annotations = (config.annotations || []).map(
      (annot) => new ODataAnnotation(annot)
    );
  }

  isTypeOf(type: string) {
    var names = [`${this.schema.namespace}.${this.name}`];
    if (this.schema.alias) names.push(`${this.schema.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  get api() {
    return this.schema.api;
  }

  findAnnotation(predicate: (annot: ODataAnnotation) => boolean) {
    return this.annotations.find(predicate);
  }
}
