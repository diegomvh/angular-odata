import { ODataSchema } from './schema';
import { EntityContainerConfig } from '../types';
import { ODataEntitySet } from './entity-set';
import { ODataAnnotation } from './annotation';

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

  findAnnotation(predicate: (annot: ODataAnnotation) => boolean) {
    return this.annotations.find(predicate);
  }
}
