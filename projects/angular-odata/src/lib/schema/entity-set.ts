import { ODataSchema } from './schema';
import { Annotation, EntitySetConfig } from '../types';
import { ODataAnnotation } from './annotation';
export class ODataEntitySet {
  schema: ODataSchema
  name: string;
  service?: { new(...params: any[]): any };
  annotations: ODataAnnotation[];
  constructor(config: EntitySetConfig, schema: ODataSchema) {
    this.schema = schema;
    this.name = config.name;
    this.annotations = (config.annotations || []).map(annot => new ODataAnnotation(annot));
  }

  isTypeOf(type: string) {
    var names = [`${this.schema.namespace}.${this.name}`];
    if (this.schema.alias)
      names.push(`${this.schema.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  get options() {
    return this.schema.options;
  }

  findAnnotation(predicate: (annot: Annotation) => boolean) {
    return this.annotations.find(predicate);
  }
}
