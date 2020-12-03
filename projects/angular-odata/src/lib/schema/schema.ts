import { ODataStructuredType } from './structured-type';
import { ODataCallable } from './callable';
import { ODataEntityContainer } from './entity-container';
import { ODataEnumType } from './enum-type';
import { ODataApi } from '../api';
import { SchemaConfig, Parser, CallableConfig } from '../types';
import { ODataEntitySet } from './entity-set';

export class ODataSchema {
  api: ODataApi;
  namespace: string;
  alias?: string;
  enums: ODataEnumType<any>[];
  entities: ODataStructuredType<any>[];
  callables: ODataCallable<any>[];
  containers: ODataEntityContainer[];

  constructor(schema: SchemaConfig, api: ODataApi) {
    this.api = api;
    this.namespace = schema.namespace;
    this.alias = schema.alias;
    this.enums = (schema.enums || []).map(config => new ODataEnumType(config, this));
    this.entities = (schema.entities || []).map(config => new ODataStructuredType(config, this));
    // Merge callables
    let configs = (schema.callables || []);
    configs = configs.reduce((acc: CallableConfig[], config) => {
      if (acc.every(c => c.name !== config.name)) {
        config = configs.filter(c => c.name === config.name).reduce((acc, c) => {
          acc.parameters = Object.assign(acc.parameters || {}, c.parameters || {});
          return acc;
        }, config);
        return [...acc, config];
      }
      return acc;
    }, []);
    this.callables = configs.map(config => new ODataCallable(config, this));
    this.containers = (schema.containers || []).map(container => new ODataEntityContainer(container, this));
  }

  isNamespaceOf(type: string) {
    return type.startsWith(this.namespace) || (this.alias && type.startsWith(this.alias));
  }

  get options() {
    return this.api.options;
  }

  get entitySets() {
    return this.containers
      .reduce(
        (acc, container) => [...acc, ...container.entitySets], [] as ODataEntitySet[]);
  }

  //#region Find for Type
  public findEnumTypeForType(type: string) {
    return this.enums.find(e => e.isTypeOf(type));
  }

  public findStructuredTypeForType(type: string) {
    return this.entities.find(e => e.isTypeOf(type));
  }

  public findCallableForType(type: string) {
    return this.callables.find(e => e.isTypeOf(type));
  }

  public findEntitySetForType(type: string) {
      return this.entitySets.find(e => e.isTypeOf(type));
  }
  //#endregion

  configure(settings: { findParserForType: (type: string) => Parser<any> | undefined }) {
    // Configure Entities
    this.entities
      .forEach(config => config.configure(settings));
    // Configure callables
    this.callables
      .forEach(callable => callable.configure(settings));
  }
}
