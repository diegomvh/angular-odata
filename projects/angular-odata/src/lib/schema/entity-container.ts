import { ODataSchema } from './schema';
import { EntityContainerConfig } from '../types';
import { ODataEntitySet } from './entity-set';

export class ODataEntityContainer {
  schema: ODataSchema;
  name: string;
  annotations: any[];
  entitySets: ODataEntitySet[];
  constructor(config: EntityContainerConfig, schema: ODataSchema) {
    this.schema = schema;
    this.name = config.name;
    this.annotations = (config.annotations || []);
    this.entitySets = (config.entitySets || []).map(config => new ODataEntitySet(config, schema));
  }

  get options() {
    return this.schema.options;
  }
}
