# Schema

Use [OData Angular Generator](https://github.com/diegomvh/ODataApiGen) for generate the \<Api\>Config and the \<Api\>Module definition.

Import ODataModule, \<Api\>Config and \<Api\>Module into your application module.
Setup ODataModule with \<Api\>Config and import it along with \<Api\>Module.

```typescript
import { NgModule } from '@angular/core';

import { ODataModule } from 'angular-odata';
import { TripPinConfig, TripPinModule } from './trippin';

@NgModule({
  imports: [
    ...
    ODataModule.forRoot({ config: TripPinConfig }),
    TripPinModule
  ]
  ...
})
export class AppModule {}
```
