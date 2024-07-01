import { strings, normalize } from '@angular-devkit/core';
import { apply, SchematicContext, chain, Tree, url, move, template, mergeWith, MergeStrategy } from '@angular-devkit/schematics';

import { Schema as ApiGenSchema } from './schema';
import { ODataMetadataParser } from './metadata/parser';
import { toTypescriptType } from './utils';
import { CsdlEnumType } from './metadata/csdl/csdl-enum-type';
import { CsdlComplexType, CsdlEntityType } from './metadata/csdl/csdl-structured-type';
import { CsdlEntitySet } from './metadata/csdl/csdl-entity-set';
import { CsdlSingleton } from './metadata/csdl/csdl-singleton';

const functions = {
    toTypescriptType,
};

export function apigen(options: ApiGenSchema) {
  return (tree: Tree, context: SchematicContext) => {
    const configSourceTemplate = url("./files/config");
    const moduleSourceTemplate = url("./files/module");
    const apiSourceTemplate = url("./files/api");
    const enumSourceTemplate = url("./files/enum");
    const entitySourceTemplate = url("./files/entity");
    const complexSourceTemplate = url("./files/complex");
    const serviceSourceTemplate = url("./files/service");
    const basePath = "/" + (options.output ? options.output + "/" + strings.dasherize(options.name) : strings.dasherize(options.name));
    return fetch(options.metadata)
      .then(resp => resp.text())
      .then(data => (new ODataMetadataParser(data)).metadata())
      .then(meta => {
        let rules = [];
        let enumTypes: CsdlEnumType[] = [];
        let structuredTypes: (CsdlEntityType | CsdlComplexType)[] = [];
        let entitySets: CsdlEntitySet[] = [];
        let singletons: CsdlSingleton[] = [];
        for (let s of meta.schemas) {
          const namespace = s.namespace;
          const path = namespace.replace(/\./g, "/");
          // Enum
          for (const enumType of (s.enumTypes ?? [])) {
            enumType.setNamespace(namespace);
            enumTypes = [...enumTypes, enumType];
            const enumTemplate = apply(enumSourceTemplate, [
              template({
                ...enumType,
                ...strings,
                ...functions
              }),
              move(normalize(`${basePath}/${path}`))]);
            rules.push(mergeWith(enumTemplate, MergeStrategy.Overwrite));
          }
          // Entity
          for (let entityType of (s.entityTypes ?? [])) {
            entityType.setNamespace(namespace);
            structuredTypes = [...structuredTypes, entityType];
            const entityTemplate = apply(entitySourceTemplate, [
              template({
                ...entityType,
                ...strings,
                ...functions
              }),
              move(normalize(`${basePath}/${path}`))]);
            rules.push(mergeWith(entityTemplate, MergeStrategy.Overwrite));
          }
          // Complex
          for (let complexType of (s.complexTypes ?? [])) {
            complexType.setNamespace(namespace);
            structuredTypes = [...structuredTypes, complexType];
            const complexTemplate = apply(complexSourceTemplate, [
              template({
                ...complexType,
                ...strings,
                ...functions
              }),
              move(normalize(`${basePath}/${path}`))]);
            rules.push(mergeWith(complexTemplate, MergeStrategy.Overwrite));
          }
          // Container
          for (let entityContainer of (s.entityContainers ?? [])) {
            for (let entitySet of (entityContainer.entitySets ?? [])) {
              entitySet.setNamespace(namespace);
              entitySets = [...entitySets, entitySet];
              const serviceTemplate = apply(serviceSourceTemplate, [
                template({
                  ...entitySet,
                  ...strings,
                  ...functions
                }),
                move(normalize(`${basePath}/${path}`))]);
              rules.push(mergeWith(serviceTemplate, MergeStrategy.Overwrite));
            }
            for (let singleton of (entityContainer.singletons ?? [])) {
              singletons = [...singletons, singleton];
              const serviceTemplate = apply(serviceSourceTemplate, [
                template({
                  ...singleton,
                  ...strings,
                  ...functions
                }),
                move(normalize(`${basePath}/${path}`))]);
              rules.push(mergeWith(serviceTemplate, MergeStrategy.Overwrite));
            }
          }
        }
        const apiTemplate = apply(apiSourceTemplate, [
          template({
            name: options.name,
            enumTypes,
            structuredTypes,
            entitySets,
            singletons,
            ...strings,
            ...functions
          }),
          move(normalize(`${basePath}`))]);
        rules.push(mergeWith(apiTemplate, MergeStrategy.Overwrite));
        return chain(rules);
      });
  };
}