import {
  SchematicContext,
  Tree,
  SchematicsException,
} from '@angular-devkit/schematics';
import { Schema as ApiGenSchema } from './schema';
import { createDefaultPath, getWorkspace } from '@schematics/angular/utility/workspace';
import { parseName } from '@schematics/angular/utility/parse-name';
import { normalize } from '@angular-devkit/core';
import { ODataMetadataParser } from './parser';

export function metadata(options: ApiGenSchema) {
  return async (tree: Tree, context: SchematicContext) => {
    const workspace = await getWorkspace(tree);
    const name = workspace.projects.keys().next().value ?? '';
    const project = workspace.projects.get(name);
    if (!project) {
      throw new SchematicsException(`Invalid project name: ${project}`);
    }

    if (options.path === undefined) {
      options.path = await createDefaultPath(tree, name);
    }

    const metadataPath = parseName(options.path, options.format === "json" ? "metadata.json" : "metadata.xml");
    return fetch(options.url)
    .then((resp) => resp.text())
    .then((data) => {
      const filePath = normalize(metadataPath.path) + '/' + metadataPath.name;
      const content = (options.format === 'json') ?  JSON.stringify(new ODataMetadataParser(data).metadata().toJson()) : data;
      tree.create(filePath, content);
      return tree;
    });
  };
  }
