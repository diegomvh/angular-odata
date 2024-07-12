import { strings, normalize } from '@angular-devkit/core';
import { apply, SchematicContext, chain, Tree, Rule, move, template, mergeWith, MergeStrategy } from '@angular-devkit/schematics';

import { Schema as ApiGenSchema } from './schema';
import { ODataMetadataParser } from './metadata/parser';
import { toTypescriptType } from './utils';
import { Module } from './angular/module';
import { ApiConfig } from './angular/api-config';
import { Enum } from './angular/enum';
import { Base, Index } from './angular/base';
import { Entity } from './angular/entity';
import { Service } from './angular/service';

const functions = {
  toTypescriptType,
};

export function apigen(options: ApiGenSchema) {
  return (tree: Tree, context: SchematicContext) => {
    const basePath = "/" + (options.output ? options.output + "/" + strings.dasherize(options.name) : strings.dasherize(options.name));
    return fetch(options.metadata)
      .then(resp => resp.text())
      .then(data => (new ODataMetadataParser(data)).metadata())
      .then(meta => {
        options.creation = new Date();
        options.serviceRootUrl = options.metadata.substring(0, options.metadata.length - 9);
        options.version = meta.Version;
        const module = new Module(options);
        const config = new ApiConfig(options);
        const index = new Index(options);
        index.addDependency(module);
        index.addDependency(config);
        const sources: Base[] = [index, module, config];
        for (let s of meta.Schemas) {
          const namespace = s.Namespace;
          // Enum
          for (const enumType of (s.EnumType ?? [])) {
            const enu = new Enum(options, enumType);
            index.addDependency(enu);
            sources.push(enu);
          }
          // Entity
          for (let entityType of (s.EntityType ?? [])) {
            const entity = new Entity(options, entityType);
            index.addDependency(entity);
            sources.push(entity);
          }
          // Complex
          for (let complexType of (s.ComplexType ?? [])) {
            const entity = new Entity(options, complexType);
            index.addDependency(entity);
            sources.push(entity);
          }
          // Container
          for (let entityContainer of (s.EntityContainer ?? [])) {
            const service = new Service(options, entityContainer);
            module.addService(service);
            index.addDependency(service);
            sources.push(service);
            for (let entitySet of (entityContainer.EntitySet ?? [])) {
              const service = new Service(options, entitySet);
              module.addService(service);
              index.addDependency(service);
              sources.push(service);
            }
            for (let singleton of (entityContainer.Singleton ?? [])) {
              const service = new Service(options, singleton);
              module.addService(service);
              index.addDependency(service);
              sources.push(service);
            }
          }
        }

        [...sources].forEach(s => {
          for (let t of s.importTypes()) {
            s.addDependencies(sources.filter(s => s.fullName() === t));
          }
          s.cleanImportedNames(); 
        });
        return chain(sources.map(s => apply(s.template(), [
          template({
            ...{ name: s.name(), fileName: s.fileName(), fullName: s.fullName(), imports: s.imports() },
            ...s.variables(),
            ...strings,
            ...functions
          }),
          move(normalize(`${basePath}/${s.directory()}`))]
        )).reduce((rules, s) => [...rules, mergeWith(s, MergeStrategy.Overwrite)], [] as Rule[]));
      });
  };
}
