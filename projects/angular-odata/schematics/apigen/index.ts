import { strings, normalize } from '@angular-devkit/core';
import {
  apply,
  SchematicContext,
  chain,
  Tree,
  Rule,
  move,
  template,
  mergeWith,
  MergeStrategy,
  SchematicsException,
} from '@angular-devkit/schematics';
import { createDefaultPath, getWorkspace } from '@schematics/angular/utility/workspace';
import { parseName } from '@schematics/angular/utility/parse-name';

import { Schema as ApiGenSchema } from './schema';
import { ODataMetadataParser } from './metadata/parser';
import { toTypescriptType } from './utils';
import { Module } from './angular/module';
import { ApiConfig } from './angular/api-config';
import { Enum } from './angular/enum';
import { Base, Callable, Index, Metadata } from './angular/base';
import { Entity } from './angular/entity';
import { Service } from './angular/service';
import { CsdlAction, CsdlFunction } from './metadata/csdl/csdl-function-action';

const utils = {
  toTypescriptType,
};

export function apigen(options: ApiGenSchema) {
  return async (tree: Tree, context: SchematicContext) => {
    const workspace = await getWorkspace(tree);
    if (!options.project) {
      options.project = workspace.projects.keys().next().value;
    }
    const project = workspace.projects.get(options.project);
    if (!project) {
      throw new SchematicsException(`Invalid project name: ${options.project}`);
    }

    if (options.path === undefined) {
      options.path = await createDefaultPath(tree, options.project as string);
    }

    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;

    const modulePath = options.path + '/' + strings.dasherize(options.name);

    return fetch(options.metadata)
      .then((resp) => resp.text())
      .then((data) => new ODataMetadataParser(data).metadata())
      .then((meta) => {
        options.creation = new Date();
        options.serviceRootUrl = options.metadata.substring(0, options.metadata.length - 9);
        options.version = meta.Version;
        const metadata = new Metadata(options, meta);
        const module = new Module(options);
        const config = new ApiConfig(options);
        const index = new Index(options);
        index.addDependency(module);
        index.addDependency(config);
        const sources: Base[] = [metadata, index, module, config];
        for (let s of meta.Schemas) {
          const namespace = s.Namespace;
          // Enum
          for (const enumType of s.EnumType ?? []) {
            const enu = new Enum(options, enumType);
            index.addDependency(enu);
            sources.push(enu);
          }
          // Entity
          for (let entityType of s.EntityType ?? []) {
            const entity = new Entity(options, entityType);
            index.addDependency(entity);
            sources.push(entity);
          }
          // Complex
          for (let complexType of s.ComplexType ?? []) {
            const entity = new Entity(options, complexType);
            index.addDependency(entity);
            sources.push(entity);
          }
          // Container
          for (let entityContainer of s.EntityContainer ?? []) {
            const service = new Service(options, entityContainer);
            module.addService(service);
            index.addDependency(service);
            sources.push(service);
            for (let entitySet of entityContainer.EntitySet ?? []) {
              const service = new Service(options, entitySet);
              module.addService(service);
              index.addDependency(service);
              sources.push(service);
            }
            for (let singleton of entityContainer.Singleton ?? []) {
              const service = new Service(options, singleton);
              module.addService(service);
              index.addDependency(service);
              sources.push(service);
            }
          }
        }

        const functions = meta.functions().reduce((callables: Callable[], f: CsdlFunction) => {
          const callable = callables.find((c) => c.name() == f.Name);
          if (callable !== undefined) {
            callable.addOverload(f);
          } else {
            callables.push(new Callable(f));
          }
          return callables;
        }, [] as Callable[]);
        const actions = meta.actions().reduce((callables: Callable[], a: CsdlAction) => {
          const callable = callables.find((c) => c.name() == a.Name);
          if (callable !== undefined) {
            callable.addOverload(a);
          } else {
            callables.push(new Callable(a));
          }
          return callables;
        }, [] as Callable[]);
        [...sources]
          .filter((s) => s instanceof Service)
          .forEach((s: Service) => {
            s.addCallables(
              functions.filter((f) => f.isBound() && f.bindingParameter()?.Type === s.entityType()),
            );
            s.addCallables(
              actions.filter((f) => f.isBound() && f.bindingParameter()?.Type === s.entityType()),
            );
          });
        [...sources].forEach((s) => {
          for (let t of s.importTypes()) {
            s.addDependencies(sources.filter((s) => s.fullName() === t));
          }
          s.cleanImportedNames();
        });
        return chain(
          sources
            .map((s) =>
              apply(s.template(), [
                template({
                  ...{
                    name: s.name(),
                    fileName: s.fileName(),
                    fullName: s.fullName(),
                    imports: s.imports(),
                  },
                  ...s.variables(),
                  ...strings,
                  ...utils,
                }),
                move(normalize(`${modulePath}/${s.directory()}`)),
              ]),
            )
            .reduce((rules, s) => [...rules, mergeWith(s, MergeStrategy.Overwrite)], [] as Rule[]),
        );
      });
  };
}
