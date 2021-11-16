import { EntitySetConfig } from '../types';
import { ODataAnnotatable } from './base';
import { ODataSchema } from './schema';

export class ODataEntitySet extends ODataAnnotatable {
  schema: ODataSchema;
  name: string;
  entityType: string;
  service: { new (...params: any[]): any };
  constructor(config: EntitySetConfig, schema: ODataSchema) {
    super(config);
    this.schema = schema;
    this.name = config.name;
    this.entityType = config.entityType;
    this.service = config.service;
  }

  /**
   * Create a nicer looking title.
   * Titleize is meant for creating pretty output.
   * @param term The term of the annotation to find.
   * @returns The titleized string.
   */
  titelize(term: string | RegExp): string {
    return this.annotatedValue(term) || this.name;
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
}
