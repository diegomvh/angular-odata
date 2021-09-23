import { ODataStructuredType } from './structured-type';
import { ODataCallable } from './callable';
import { ODataEntityContainer } from './entity-container';
import { ODataEnumType } from './enum-type';
import { ODataApi } from '../api';
import { SchemaConfig, Parser, CallableConfig } from '../types';
import { ODataEntitySet } from './entity-set';
import { ODataAnnotation } from './annotation';
import { CALLABLE_BINDING_PARAMETER } from '../constants';
import { Objects } from '../utils';
import { OData } from '../utils/odata';

export class ODataSchema {
  api: ODataApi;
  namespace: string;
  alias?: string;
  enums: ODataEnumType<any>[];
  entities: ODataStructuredType<any>[];
  callables: ODataCallable<any>[];
  containers: ODataEntityContainer[];
  annotations: ODataAnnotation[];

  constructor(config: SchemaConfig, api: ODataApi) {
    this.api = api;
    this.namespace = config.namespace;
    this.alias = config.alias;
    this.enums = (config.enums || []).map(
      (config) => new ODataEnumType(config, this)
    );
    this.entities = (config.entities || []).map(
      (config) => new ODataStructuredType(config, this)
    );
    this.callables = OData.mergeCallableParameters(config.callables || []).map(
      (config) => new ODataCallable(config, this)
    );
    this.containers = (config.containers || []).map(
      (config) => new ODataEntityContainer(config, this)
    );
    this.annotations = (config.annotations || []).map(
      (config) => new ODataAnnotation(config)
    );
  }

  isNamespaceOf(type: string) {
    return (
      type.startsWith(this.namespace) ||
      (this.alias && type.startsWith(this.alias))
    );
  }

  get entitySets() {
    return this.containers.reduce(
      (acc, container) => [...acc, ...container.entitySets],
      [] as ODataEntitySet[]
    );
  }

  findAnnotation(predicate: (annot: ODataAnnotation) => boolean) {
    return this.annotations.find(predicate);
  }

  //#region Find for Type
  public findEnumTypeForType<T>(type: string) {
    return this.enums.find((e) => e.isTypeOf(type)) as
      | ODataEnumType<T>
      | undefined;
  }

  public findStructuredTypeForType<T>(type: string) {
    return this.entities.find((e) => e.isTypeOf(type)) as
      | ODataStructuredType<T>
      | undefined;
  }

  public findCallableForType<T>(type: string, bindingType?: string) {
    return this.callables.find(
      (c) =>
        c.isTypeOf(type) &&
        (bindingType === undefined || bindingType === c.binding()?.type)
    ) as ODataCallable<T> | undefined;
  }

  public findEntitySetForType(type: string) {
    return this.entitySets.find((e) => e.isTypeOf(type));
  }
  //#endregion

  configure({
    parserForType,
    findOptionsForType,
  }: {
    parserForType: (type: string) => Parser<any>;
    findOptionsForType: (type: string) => any;
  }) {
    // Configure Enums
    this.enums.forEach((enu) => enu.configure());
    // Configure Entities
    this.entities.forEach((config) =>
      config.configure({ parserForType, findOptionsForType })
    );
    // Configure callables
    this.callables.forEach((callable) => callable.configure({ parserForType }));
  }
}
