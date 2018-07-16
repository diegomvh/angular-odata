# angular-odata

A fluent API for querying, creating, updating and deleting OData resources in Angular.
OData service for Angular.

If you are using OData with Angular please check also my other related project, [OData to TypeScript Service Generator](https://github.com/diegomvh/Od2Ts)

## Install:

```bash
npm i angular-odata
```

## Usage:

```typescript
import { NgModule } from '@angular/core';

import { ODataModule } from 'angular-odata';

@NgModule({
  imports: [
    ODataModule.forRoot({
      serviceRoot: "http://localhost:54872/odata/",
      withCredentials: true
    }),
  ]
})
export class AppModule {}
```