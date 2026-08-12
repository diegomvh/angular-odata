# AGENTS.md — angular-odata

## Project Overview

Angular OData client library (v0.151.0) for Angular 21+. Provides typed models, query builders, entity services, metadata parsing, caching, and schematics for code generation from OData `$metadata`.

## Tech Stack

- **Framework:** Angular 21+ (`@angular/core`, `@angular/common`, etc.)
- **Language:** TypeScript ~5.9 (strict mode)
- **Build:** `@angular/build:ng-packagr`
- **Test:** Vitest via `@angular/build:unit-test` — run with `ng test --watch=false`
- **Format:** Prettier (single quotes, printWidth 100)
- **Package manager:** npm 11.6+

## Code Conventions

### Style
- Class-based architecture (PascalCase, `OData` prefix for public API classes)
- Methods/properties: camelCase
- Private members: underscore prefix (`_connector`, `_negated`)
- Files: kebab-case matching export name (`client.ts`, `filter.ts`)
- Organized imports with blank-line grouping
- JSDoc on all public methods
- `//#region` / `//#endregion` for collapsible sections in larger files

### Patterns
- Heavy use of generics and method overloading (e.g., `get()`, `post()`, `request()` with 10+ overloads)
- Fluent builder/factory pattern for expressions (`FilterExpression.factory<T>(...)`)
- Standalone DI (`provideODataClient()`) + NgModule (`ODataModule.forRoot()`)
- `type` imports for type-only dependencies (`import type { ... }`)

### Testing
- Vitest with `describe`/`it` blocks
- Top-level describe names the class/service
- `it('should ...')` phrasing
- Spec files adjacent to source (`client.spec.ts` next to `client.ts`)
- `TestBed` for DI-dependent tests

## Project Structure

```
projects/angular-odata/src/lib/
  index.ts              # Barrel — re-exports all submodules
  types.ts, settings.ts, annotations.ts, api.ts, client.ts, module.ts
  utils/                # strings, durations, http, enums, objects, urls, etc.
  services/             # base, entity-set, singleton, factory
  schema/               # schema, parsers (edm, enum-type, structured-type, callable)
  models/               # model, collection
  resources/            # query (builder, expressions, handlers), path, request, response, types
  cache/                # memory, storage, indexeddb
  metadata/             # metadata parser

projects/angular-odata/schematics/
  collection.json       # ng-add, apigen schematics
  apigen/               # Code generation from $metadata
    angular/            # Angular template generators
    metadata/csdl/      # CSDL XML parsing
    files/              # __fileName__ template files
```

## Key Scripts

| Command | Description |
|---|---|
| `npm run build` | Build library (production) |
| `npm test` | Run tests |
| `npm run trippin` | Generate TripPin API client from OData sample |
| `npm run schematics` | Build schematics separately |
| `npm run release` | Build + docs + publish |
| `npm run versioning` | Sync version in root + lib package.json |
