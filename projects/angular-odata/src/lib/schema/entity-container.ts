import { ODataEntityContainerConfig } from '../types';
import { ODataSchemaElement } from './element';
import { ODataEntitySet } from './entity-set';
import { ODataSchema } from './schema';
import { ODataSingleton } from './singleton';

export class ODataEntityContainer extends ODataSchemaElement {
  entitySets: ODataEntitySet[];
  singletons: ODataSingleton[];

  constructor(config: ODataEntityContainerConfig, schema: ODataSchema) {
    super(config, schema);
    this.entitySets = (config.entitySets ?? []).map(
      (config) => new ODataEntitySet(config, schema),
    );
    this.singletons = (config.singletons ?? []).map(
      (config) => new ODataSingleton(config, schema),
    );
  }
}
