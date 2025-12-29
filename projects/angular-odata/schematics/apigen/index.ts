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
import { Collection } from './angular/collection';
import { Model } from './angular/model';
import { CsdlAction, CsdlFunction } from './metadata/csdl/csdl-function-action';
import { Package } from './angular/package';

const utils = {
  toTypescriptType,
};

export function apigen(options: ApiGenSchema) {
  return async (tree: Tree, context: SchematicContext) => {
    const workspace = await getWorkspace(tree);
    if (!options.project) {
      options.project = workspace.projects.keys().next().value ?? '';
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
        const pkg = new Package(options, meta);
        pkg.resolveImports();
        return chain(
          pkg
            .sources()
            .map((s) => {
              const imports = s.imports();
              return apply(s.template(), [
                template({
                  ...{
                    name: s.name(),
                    fileName: s.fileName(),
                    fullName: s.fullName(),
                    imports: imports,
                  },
                  ...s.variables(imports),
                  ...strings,
                  ...utils,
                }),
                move(normalize(`${modulePath}/${s.directory()}`)),
              ]);
            })
            .reduce((rules, s) => [...rules, mergeWith(s, MergeStrategy.Overwrite)], [] as Rule[]),
        );
      });
  };
}
