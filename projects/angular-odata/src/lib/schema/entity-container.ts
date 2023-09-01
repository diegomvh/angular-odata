import { EntityContainerConfig } from '../types';
import { ODataSchemaElement } from './element';
import { ODataEntitySet } from './entity-set';
import { ODataSchema } from './schema';

export class ODataEntityContainer extends ODataSchemaElement {
  entitySets: ODataEntitySet[];

  constructor(config: EntityContainerConfig, schema: ODataSchema) {
    super(config, schema);
    this.entitySets = (config.entitySets || []).map(
      (config) => new ODataEntitySet(config, schema),
    );
  }
}
