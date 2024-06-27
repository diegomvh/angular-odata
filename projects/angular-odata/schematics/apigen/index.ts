import { strings, normalize } from '@angular-devkit/core';
import { apply, SchematicContext, chain, Tree, url, move, template, mergeWith, MergeStrategy } from '@angular-devkit/schematics';

import { Schema as ApiGenSchema } from './schema';
import { ODataMetadataParser } from './metadata/parser';

export function apigen(options: ApiGenSchema) {
  return (tree: Tree, context: SchematicContext) => {
    const schemaSourceTemplate = url("./files/schema");
    const configSourceTemplate = url("./files/config");
    const moduleSourceTemplate = url("./files/module");
    const enumSourceTemplate = url("./files/enum");
    const entitySourceTemplate = url("./files/entity");
    const complexSourceTemplate = url("./files/complex");
    const basePath = "/" + (options.output ? options.output + "/" + strings.dasherize(options.name) : strings.dasherize(options.name));
    return fetch(options.metadata)
      .then(resp => resp.text())
      .then(data => (new ODataMetadataParser(data)).metadata())
      .then(meta => {
        let rules = [];
        for (let s of meta.schemas) {
          const namespace = s.namespace;
          const path = namespace.replace(/\./g, "/");
          for (let e of (s.enumTypes ?? [])) {
            let enumTemplate = apply(enumSourceTemplate, [
              template({
                ...e,
                ...strings
              }),
              move(normalize(`${basePath}/${path}`))]);
            rules.push(mergeWith(enumTemplate, MergeStrategy.Overwrite));
          }
          for (let e of (s.entityTypes ?? [])) {
            let entityTemplate = apply(entitySourceTemplate, [
              template({
                ...e,
                ...strings
              }),
              move(normalize(`${basePath}/${path}`))]);
            rules.push(mergeWith(entityTemplate, MergeStrategy.Overwrite));
          }
          for (let c of (s.complexTypes ?? [])) {
            let complexTemplate = apply(complexSourceTemplate, [
              template({
                ...c,
                ...strings
              }),
              move(normalize(`${basePath}/${path}`))]);
            rules.push(mergeWith(complexTemplate, MergeStrategy.Overwrite));
          }
        }
        return chain(rules);
      });
  };
}