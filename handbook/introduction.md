# Introduction

**angular-odata** is a client-side OData library for Angular. It offers a fluent, typed API
for querying, creating, updating and deleting OData resources.

The library works mainly with OData Version 4 and has basic support for versions 3 and 2.

## Features

- **Resources**: typed builders for entity sets, entities, navigation properties, functions,
  actions, singletons and `$batch` requests.
- **Query builder**: `$select`, `$expand`, `$filter`, `$orderby`, `$search`, `$compute`,
  `$apply`, paging and counting, with typed expression factories.
- **Services**: injectable entity set and singleton services.
- **Models and collections**: rich objects with change tracking, validation and
  persistence.
- **Metadata**: schemas can be loaded from `$metadata` or declared statically.
- **Caching**: in-memory, Web Storage and IndexedDB caches with fetch policies.
- **Code generation**: the `apigen` schematic builds a typed API from a `$metadata`
  document.

## Installation

```bash
npm i angular-odata
```

## How this handbook is organized

1. [Getting started](getting-started.html): register the client and send your first request.
2. [Configuration](configuration.html): every option of `ODataApiConfig`.
3. [Resources](resources.html): the resource API, the core of the library.
4. [Query builder](query-builder.html): building query options.
5. [Services](services.html): entity set and singleton services.
6. [Models and collections](models-and-collections.html): working with `ODataModel` and `ODataCollection`.
7. [Caching](caching.html): caches and fetch policies.
8. [Code generation](code-generation.html): generating a typed API with the schematics.

For the signature of a class or method, see the API reference generated from the source
code, which is part of this site.

## Demo application

Most examples in this handbook come from the
[AngularODataEntity](https://github.com/diegomvh/AngularODataEntity) demo. It uses APIs
generated from the public [TripPin](https://services.odata.org/V4/TripPinServiceRW/) and
[Northwind](https://services.odata.org/V4/Northwind/Northwind.svc/) sample services, and
shows the library in data tables, dialogs and standalone example scripts.
