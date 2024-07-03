import { SingletonConfig } from '../types';
import { ODataSchemaElement } from './element';
import { ODataSchema } from './schema';

export class ODataSingleton extends ODataSchemaElement {
  singletonType: string;
  service: { new (...params: any[]): any };
  constructor(config: SingletonConfig, schema: ODataSchema) {
    super(config, schema);
    this.singletonType = config.type;
    this.service = config.service;
  }
}
