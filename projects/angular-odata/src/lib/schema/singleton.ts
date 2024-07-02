import { SingletonConfig } from '../types';
import { ODataSchemaElement } from './element';
import { ODataSchema } from './schema';

export class ODataSingleton extends ODataSchemaElement {
  service: { new (...params: any[]): any };
  constructor(config: SingletonConfig, schema: ODataSchema) {
    super(config, schema);
    this.service = config.service;
  }
}
