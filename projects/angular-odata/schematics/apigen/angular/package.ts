import { Base, Callable, Index, Metadata } from './base';
import { Schema as ApiGenSchema } from '../schema';
import { Module } from './module';
import { ApiConfig } from './api-config';
import { ODataMetadata } from '../metadata';
import { Enum } from './enum';
import { Entity } from './entity';
import { Model } from './model';
import { Collection } from './collection';
import { Service } from './service';
import { CsdlAction, CsdlFunction } from '../metadata/csdl/csdl-function-action';
import { CsdlEnumMember } from '../metadata/csdl/csdl-annotation';
import { CsdlEnumType } from '../metadata/csdl/csdl-enum-type';
import { CsdlComplexType, CsdlEntityType } from '../metadata/csdl/csdl-structured-type';
import { CsdlEntitySet } from '../metadata/csdl/csdl-entity-set';

export class Package {
  metadata: Metadata;
  module: Module;
  config: ApiConfig;
  index: Index;
  enums: Enum[] = [];
  entities: Entity[] = [];
  services: Service[] = [];
  models: Model[] = [];
  collections: Collection[] = [];
  functions: Callable[] = [];
  actions: Callable[] = [];

  constructor(
    protected options: ApiGenSchema,
    meta: ODataMetadata,
  ) {
    this.metadata = new Metadata(this, options, meta);
    this.module = new Module(this, options);
    this.config = new ApiConfig(this, options);
    this.index = new Index(this, options);

    this.index.addDependency(this.module);
    this.index.addDependency(this.config);
    for (let s of meta.Schemas) {
      const namespace = s.Namespace;
      // Enum
      for (const enumType of s.EnumType ?? []) {
        const enu = new Enum(this, options, enumType);
        this.enums.push(enu);
        this.index.addDependency(enu);
      }
      // Entity
      for (let entityType of s.EntityType ?? []) {
        const entity = new Entity(this, options, entityType);
        this.entities.push(entity);
        this.index.addDependency(entity);
        if (options.models) {
          const model = new Model(this, options, entityType, entity);
          this.index.addDependency(model);
          this.models.push(model);
          const collection = new Collection(this, options, entityType, entity, model);
          this.index.addDependency(collection);
          this.collections.push(collection);
        }
      }
      // Complex
      for (let complexType of s.ComplexType ?? []) {
        const entity = new Entity(this, options, complexType);
        this.index.addDependency(entity);
        this.entities.push(entity);
        if (options.models) {
          const model = new Model(this, options, complexType, entity);
          this.index.addDependency(model);
          this.models.push(model);
          const collection = new Collection(this, options, complexType, entity, model);
          this.index.addDependency(collection);
          this.collections.push(collection);
        }
      }
      // Container
      for (let entityContainer of s.EntityContainer ?? []) {
        const service = new Service(this, options, entityContainer);
        this.module.addService(service);
        this.index.addDependency(service);
        this.services.push(service);
        for (let entitySet of entityContainer.EntitySet ?? []) {
          const service = new Service(this, options, entitySet);
          this.module.addService(service);
          this.index.addDependency(service);
          this.services.push(service);
        }
        for (let singleton of entityContainer.Singleton ?? []) {
          const service = new Service(this, options, singleton);
          this.module.addService(service);
          this.index.addDependency(service);
          this.services.push(service);
        }
      }
    }

    this.functions = meta.functions().reduce((callables: Callable[], f: CsdlFunction) => {
      const callable = callables.find((c) => c.name() == f.Name);
      if (callable !== undefined) {
        callable.addOverload(f);
      } else {
        callables.push(new Callable(f));
      }
      return callables;
    }, [] as Callable[]);
    this.actions = meta.actions().reduce((callables: Callable[], a: CsdlAction) => {
      const callable = callables.find((c) => c.name() == a.Name);
      if (callable !== undefined) {
        callable.addOverload(a);
      } else {
        callables.push(new Callable(a));
      }
      return callables;
    }, [] as Callable[]);

    this.services.forEach((s: Service) => {
      s.addCallables(
        this.functions.filter((f) => f.isBound() && f.bindingParameter()?.Type === s.entityType()),
      );
      s.addCallables(
        this.actions.filter((f) => f.isBound() && f.bindingParameter()?.Type === s.entityType()),
      );
    });
    this.models.forEach((m: Model) => {
      m.addCallables(
        this.functions.filter((f) => f.isBound() && f.bindingParameter()?.Type === m.entityType()),
      );
      m.addCallables(
        this.actions.filter((f) => f.isBound() && f.bindingParameter()?.Type === m.entityType()),
      );
    });
    this.collections.forEach((c: Collection) => {
      c.addCallables(
        this.functions.filter((f) => f.isBound() && f.bindingParameter()?.Type === c.entityType()),
      );
      c.addCallables(
        this.actions.filter((f) => f.isBound() && f.bindingParameter()?.Type === c.entityType()),
      );
    });
  }

  resolveImports() {
    const sources = this.sources();
    sources.forEach((s) => {
      for (let t of s.importTypes()) {
        s.addDependencies(sources.filter((s) => s.fullName() === t));
      }
      s.cleanImportedNames();
    });
  }

  sources(): Base[] {
    const sources: Base[] = [
      this.metadata,
      this.index,
      this.module,
      this.config,
      ...this.enums,
      ...this.entities,
      ...this.models,
      ...this.collections,
      ...this.services,
    ];
    return sources;
  }

  findEnum(fullName: string): Enum | undefined {
    return this.enums.find((e) => e.fullName() === fullName);
  }

  findEnumType(fullName: string): CsdlEnumType | undefined {
    return this.metadata.findEnumType(fullName);
  }

  findEntity(fullName: string): Entity | undefined {
    return this.entities.find((e) => e.fullName() === fullName);
  }

  findEntityType(fullName: string): CsdlEntityType | undefined {
    return this.metadata.findEntityType(fullName);
  }

  findEntitySet(fullName: string): CsdlEntitySet | undefined {
    return this.metadata.findEntitySet(fullName);
  }

  findComplexType(fullName: string): CsdlComplexType | undefined {
    return this.metadata.findComplexType(fullName);
  }

  findModel(fullName: string): Model | undefined {
    return this.models.find((m) => m.entityType() === fullName);
  }

  findCollection(fullName: string): Collection | undefined {
    return this.collections.find((c) => c.entityType() === fullName);
  }
}
