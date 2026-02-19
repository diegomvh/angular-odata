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
  SchematicsException,
  forEach,
  FileEntry,
  MergeStrategy,
} from '@angular-devkit/schematics';
import { createDefaultPath, getWorkspace } from '@schematics/angular/utility/workspace';
import { parseName } from '@schematics/angular/utility/parse-name';

import { Schema as ApiGenSchema } from './schema';
import { ODataMetadataParser } from './metadata/parser';
import { toTypescriptType } from './utils';
import { Package } from './angular/package';

const utils = {
  toTypescriptType,
};

function replaceBefore(s: string, subString: string, replacement: string, index: number): string {
  const head = s.substring(0, index);
  const tail = s.substring(index);
  return head + tail.replace(subString, replacement); 
}

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
            .map((b) => {
              const imports = b.imports();
              return apply(b.template(), [
                template({
                  ...{
                    name: b.name(),
                    fileName: b.fileName(),
                    fullName: b.fullName(),
                    imports: imports,
                  },
                  ...b.variables(imports),
                  ...strings,
                  ...utils,
                }),
                move(normalize(`${modulePath}/${b.directory()}`)),
                forEach((fileEntry: FileEntry) => {
                // Example: Overwrite existing files if needed
                if (tree.exists(fileEntry.path)) {
                  let oldContent = tree.read(fileEntry.path)?.toString() ?? '';
                  let newContent = fileEntry.content.toString();
                  if (oldContent === newContent) {
                    return fileEntry; // No changes, skip overwrite
                  }
                  // Find and replace al sections between // #region Custom and // #endregion Custom
                  const customSectionRegex = /\/\/ #region Custom[\s\S]*?\/\/ #endregion Custom/g;
                  const oldCustomSections = oldContent.matchAll(customSectionRegex);
                  const newCustomSections = newContent.matchAll(customSectionRegex);
                  let oldCustomSectionsArray = [...oldCustomSections];
                  let newCustomSectionsArray = [...newCustomSections];
                  if (oldCustomSectionsArray.length !== newCustomSectionsArray.length) {
                    console.warn(`Warning: The number of custom sections in the old and new content does not match for file ${fileEntry.path}. Custom sections will not be preserved.`);
                  } else {
                    for (let i = oldCustomSectionsArray.length - 1; i >= 0; i--) {
                      const oldSection = oldCustomSectionsArray[i];
                      const newSection = newCustomSectionsArray[i];
                      if (oldSection && newSection) {
                        newContent = replaceBefore(newContent, newSection[0], oldSection[0], newSection.index ?? 0);
                      }
                    }
                  }
                  tree.overwrite(fileEntry.path, newContent);
                  return null; 
                }
                
                // Return the fileEntry to be added to the destination tree
                return fileEntry;
              })
              ]);
            })
            .reduce((rules, s) => [...rules, mergeWith(s, MergeStrategy.Overwrite)], [] as Rule[]),
        );
      })
      .then((rules) => {
        for (const rule in rules) {
          console.log(`Generated rule for ${rule}`);
        }
        return rules; 
      });
  };
}
