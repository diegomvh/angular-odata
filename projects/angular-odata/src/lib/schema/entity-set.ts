import { EntitySetConfig } from '../types';
import { ODataAnnotation } from './annotation';
import { ODataSchema } from './schema';

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

  /**
   * Returns a boolean indicating if the entity set is of the given type.
   * @param type String representation of the type
   * @returns True if the callable is type of the given type
   */
  isTypeOf(type: string) {
    var names = [`${this.schema.namespace}.${this.name}`];
    if (this.schema.alias) names.push(`${this.schema.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  get api() {
    return this.schema.api;
  }

  /**
   * Find an annotation inside the entity set.
   * @param predicate Function that returns true if the annotation match.
   * @returns The annotation that matches the predicate.
   */
  findAnnotation(predicate: (annot: ODataAnnotation) => boolean) {
    return this.annotations.find(predicate);
  }
}
