import { ODataApi } from '../api';
import { ParserOptions, SchemaConfig, StructuredTypeConfig } from '../types';
import { OData } from '../utils/odata';
import { ODataAnnotatable } from './annotation';
import { ODataCallable } from './callable';
import { ODataEntityContainer } from './entity-container';
import { ODataEntitySet } from './entity-set';
import { ODataEnumType } from './enum-type';
import { ODataStructuredType } from './structured-type';

export class ODataSchema extends ODataAnnotatable {
  api: ODataApi;
  namespace: string;
  alias?: string;
  enums: ODataEnumType<any>[];
  entities: ODataStructuredType<any>[];
  callables: ODataCallable<any>[];
  containers: ODataEntityContainer[];

  constructor(config: SchemaConfig, api: ODataApi) {
    super(config);
    this.api = api;
    this.namespace = config.namespace;
    this.alias = config.alias;
    this.enums = (config.enums || []).map(
      (config) => new ODataEnumType(config, this),
    );
    this.entities = (config.entities || []).map(
      (config) => new ODataStructuredType(config, this),
    );
    this.callables = OData.mergeCallableParameters(config.callables || []).map(
      (config) => new ODataCallable(config, this),
    );
    this.containers = (config.containers || []).map(
      (config) => new ODataEntityContainer(config, this),
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
      [] as ODataEntitySet[],
    );
  }

  //#region Find for Type
  public findEnumTypeForType<T>(type: string) {
    return this.enums.find((e) => e.isTypeOf(type)) as
      | ODataEnumType<T>
      | undefined;
  }

  public createStructuredType<T>(config: StructuredTypeConfig<T>) {
    const entity = new ODataStructuredType<T>(config, this);
    entity.configure({ options: this.api.options.parserOptions });
    this.entities.push(entity);
    return entity;
  }

  public findStructuredTypeForType<T>(type: string) {
    return this.entities.find((e) => e.isTypeOf(type)) as
      | ODataStructuredType<T>
      | undefined;
  }

  public findCallableForType<T>(type: string, bindingType?: string) {
    const bindingStructuredType =
      bindingType !== undefined
        ? this.api.findStructuredTypeForType<any>(bindingType)
        : undefined;
    return this.callables.find((c) => {
      const isCallableType = c.isTypeOf(type);
      const callableBindingType = c.binding()?.type;
      const callableBindingStructuredType =
        callableBindingType !== undefined
          ? this.api.findStructuredTypeForType(callableBindingType)
          : undefined;
      return (
        isCallableType &&
        (!bindingStructuredType ||
          (callableBindingStructuredType &&
            bindingStructuredType.isSubtypeOf(callableBindingStructuredType)))
      );
    }) as ODataCallable<T> | undefined;
  }

  public findEntitySetForType(type: string) {
    return this.entitySets.find((e) => e.isTypeOf(type));
  }
  //#endregion

  configure({
    options,
  }: {
    options: ParserOptions;
  }) {
    // Configure Enums
    this.enums.forEach((enu) =>
      enu.configure({ options }),
    );
    // Configure Entities
    this.entities.forEach((structured) =>
      structured.configure({ options }),
    );
    // Configure callables
    this.callables.forEach((callable) =>
      callable.configure({ options }),
    );
  }
}
