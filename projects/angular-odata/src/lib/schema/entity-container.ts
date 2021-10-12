import { EntityContainerConfig } from '../types';
import { ODataAnnotation } from './annotation';
import { ODataEntitySet } from './entity-set';
import { ODataSchema } from './schema';

export class ODataEntityContainer {
  schema: ODataSchema;
  name: string;
  annotations: ODataAnnotation[];
  entitySets: ODataEntitySet[];

  constructor(config: EntityContainerConfig, schema: ODataSchema) {
    this.schema = schema;
    this.name = config.name;
    this.entitySets = (config.entitySets || []).map(
      (config) => new ODataEntitySet(config, schema)
    );
    this.annotations = (config.annotations || []).map(
      (annot) => new ODataAnnotation(annot)
    );
  }

  get api() {
    return this.schema.api;
  }

  /**
   * Find an annotation inside the entity container.
   * @param predicate Function that returns true if the annotation match.
   * @returns The annotation that matches the predicate.
   */
  findAnnotation(predicate: (annot: ODataAnnotation) => boolean) {
    return this.annotations.find(predicate);
  }
}
