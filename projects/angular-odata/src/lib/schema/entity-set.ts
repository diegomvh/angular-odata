import { ODataEntitySetConfig } from '../types';
import { ODataSchemaElement } from './element';
import { ODataSchema } from './schema';

export class ODataEntitySet extends ODataSchemaElement {
  entityType: string;
  service: { new (...params: any[]): any };
  constructor(config: ODataEntitySetConfig, schema: ODataSchema) {
    super(config, schema);
    this.entityType = config.entityType;
    this.service = config.service;
  }
}
