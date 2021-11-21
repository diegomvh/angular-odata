import { EntityContainerConfig } from '../types';
import { Strings } from '../utils/strings';
import { ODataAnnotatable } from './base';
import { ODataEntitySet } from './entity-set';
import { ODataSchema } from './schema';

export class ODataEntityContainer extends ODataAnnotatable {
  schema: ODataSchema;
  name: string;
  entitySets: ODataEntitySet[];

  constructor(config: EntityContainerConfig, schema: ODataSchema) {
    super(config);
    this.schema = schema;
    this.name = config.name;
    this.entitySets = (config.entitySets || []).map(
      (config) => new ODataEntitySet(config, schema)
    );
  }

  get api() {
    return this.schema.api;
  }

  /**
   * Create a nicer looking title.
   * Titleize is meant for creating pretty output.
   * @param term The term of the annotation to find.
   * @returns The titleized string.
   */
  titleize(term?: string | RegExp): string {
    return (term && this.annotatedValue(term)) || Strings.titleCase(this.name);
  }
}
