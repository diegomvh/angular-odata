<h1 align="center">Angular OData</h1>

<p align="center">
  <em>A typed, fluent client for OData services in Angular.</em>
  <br>
</p>

<p align="center">
  <a href="https://diegomvh.github.io/angular-odata/docs/api/additional-documentation/introduction.html">Handbook</a>
  ·
  <a href="https://diegomvh.github.io/angular-odata/docs/api/index.html">API reference</a>
  ·
  <a href="https://github.com/diegomvh/AngularODataEntity">Demo</a>
  ·
  <a href="https://github.com/diegomvh/angular-odata/blob/main/CONTRIBUTING.md">Contributing</a>
  <br>
  <br>
</p>

<p align="center">
  <a href="https://github.com/diegomvh/angular-odata/actions?query=workflow%3A%22Node.js+CI%22">
    <img src="https://github.com/diegomvh/angular-odata/workflows/Node.js%20CI/badge.svg" alt="CI status" />
  </a>&nbsp;
  <a href="http://badge.fury.io/js/angular-odata">
    <img src="https://badge.fury.io/js/angular-odata.svg" alt="Angular OData on npm" />
  </a>
</p>

<hr>

[OData](https://www.odata.org/) is a standard for REST APIs: every service describes its
data in a `$metadata` document and accepts the same query options (`$filter`, `$select`,
`$expand`, `$orderby`, …). **angular-odata** lets your Angular application talk to any OData
service without writing URLs by hand: you build requests with typed TypeScript code and get
back typed results.

```typescript
// GET People?$select=UserName,FirstName&$filter=contains(UserName, 'russell')&$top=10
client
  .entitySet<Person>('People')
  .query((q) => {
    q.filter(({ e, t }) => e().contains(t.UserName, 'russell'));
    q.select(['UserName', 'FirstName']);
    q.top(10);
  })
  .fetch()
  .subscribe(({ entities }) => console.log(entities));
```

## Features

- **Typed query builder**: `$filter`, `$select`, `$expand`, `$orderby`, `$search`,
  `$compute`, `$apply` and paging, with field names checked by the compiler.
- **Complete OData API**: entity sets, entities, navigation properties, functions,
  actions, singletons, media and `$batch` requests.
- **Code generation**: one command creates interfaces, services and models from your
  service's `$metadata`.
- **Models and collections**: change tracking, validation and `save()` / `destroy()`.
- **Caching**: in-memory, Web Storage or IndexedDB, with fetch policies such as
  `cache-first` and `cache-and-network`.
- **Several APIs** in the same application, each with its own configuration.

## Quick start

### 1. Install

```bash
npm i angular-odata
```

### 2. Register the client

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideODataClient } from 'angular-odata';

export const appConfig: ApplicationConfig = {
  providers: [
    provideODataClient({
      config: { serviceRootUrl: 'https://services.odata.org/V4/TripPinServiceRW/' },
    }),
  ],
};
```

Applications that use NgModules can import `ODataModule.forRoot({ config })` instead.

### 3. Query your service

```typescript
import { Component, inject, signal } from '@angular/core';
import { ODataClient } from 'angular-odata';

interface Person {
  UserName: string;
  FirstName: string;
  LastName: string;
}

@Component({
  selector: 'app-people',
  template: `
    @for (person of people(); track person.UserName) {
      <p>{{ person.FirstName }} {{ person.LastName }}</p>
    }
  `,
})
export class PeopleComponent {
  private client = inject(ODataClient);
  people = signal<Person[]>([]);

  ngOnInit() {
    this.client
      .entitySet<Person>('People')
      .query((q) => {
        q.orderBy('LastName');
        q.top(10);
      })
      .fetch()
      .subscribe(({ entities }) => this.people.set(entities ?? []));
  }
}
```

### 4. Optional: generate a typed API

Instead of writing interfaces and services by hand, generate them from the `$metadata` of
your service:

```bash
ng generate angular-odata:apigen --name=TripPin --metadata='https://services.odata.org/V4/TripPinServiceRW/$metadata'
```

```typescript
import { PeopleService, TripPinConfig } from './trip-pin';

// app.config.ts
provideODataClient({ config: TripPinConfig });

// Any component or service
const people = inject(PeopleService);
people
  .entity('russellwhyte')
  .fetch()
  .subscribe(({ entity }) => console.log(entity));
```

## A few more examples

```typescript
const people = client.entitySet<Person>('People');

// Create, update and delete
people.create({ UserName: 'jdoe', FirstName: 'John', LastName: 'Doe' }).subscribe();
people.entity('jdoe').modify({ FirstName: 'Johnny' }).subscribe();
people.entity('jdoe').destroy().subscribe();

// Expand related entities: $expand=Trips($select=Name,Budget)
people
  .entity('russellwhyte')
  .query((q) =>
    q.expand(({ e, t }) =>
      e().field(t.Trips, (f) => f.select(({ e, t }) => e().field(t.Name).field(t.Budget))),
    ),
  )
  .fetch()
  .subscribe(({ entity }) => console.log(entity?.Trips));

// Follow the server's next links and get every entity
people.fetchAll().subscribe(({ entities }) => console.log(entities.length));
```

## Documentation

- **[Handbook](https://diegomvh.github.io/angular-odata/docs/api/additional-documentation/introduction.html)**:
  guides for configuration, resources, the query builder, services, models, caching and code
  generation.
- **[API reference](https://diegomvh.github.io/angular-odata/docs/api/index.html)**: every
  class and method, generated from the source code.
- **[Demo application](https://github.com/diegomvh/AngularODataEntity)**: a complete Angular
  application that uses the TripPin and Northwind sample services.

## Compatibility

- **Angular**: 20 or later.
- **OData**: version 4 is fully supported; versions 3 and 2 have basic support.

## Contributing

Bug reports and pull requests are welcome. Read the
[contributing guide](https://github.com/diegomvh/angular-odata/blob/main/CONTRIBUTING.md)
to get started.

## License

[MIT](https://github.com/diegomvh/angular-odata/blob/main/LICENSE)
