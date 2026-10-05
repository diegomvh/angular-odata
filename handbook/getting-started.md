# Getting started

## Register the client

### Standalone applications

Register the client with `provideODataClient()` in your application config:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideODataClient } from 'angular-odata';

export const appConfig: ApplicationConfig = {
  providers: [
    provideODataClient({
      config: {
        serviceRootUrl:
          'https://services.odata.org/V4/(S(4m0tuxtnhcfctl4gzem3gr10))/TripPinServiceRW/',
      },
    }),
  ],
};
```

`provideODataClient()` registers `ODataClient`, `ODataServiceFactory` and an app initializer
that loads the configuration (and the metadata, when needed) before the application starts.
If you do not pass a `loader`, it also calls `provideHttpClient()` and uses `HttpClient` to
send requests.

### NgModule applications

```typescript
import { NgModule } from '@angular/core';
import { ODataModule } from 'angular-odata';

@NgModule({
  imports: [
    ODataModule.forRoot({
      config: {
        serviceRootUrl:
          'https://services.odata.org/V4/(S(4m0tuxtnhcfctl4gzem3gr10))/TripPinServiceRW/',
      },
    }),
  ],
})
export class AppModule {}
```

### Several APIs

`config` also accepts an array. Give each API a `name` and mark one as the `default`:

```typescript
provideODataClient({
  config: [
    { name: 'trippin', default: true, serviceRootUrl: 'https://example.com/trippin/' },
    { name: 'northwind', serviceRootUrl: 'https://example.com/northwind/' },
  ],
});
```

Methods that build resources take an optional API name, for example
`client.entitySet<Product>('Products', 'northwind')`.

## Your first request

Inject `ODataClient`, build a resource and fetch it:

```typescript
import { Component, inject } from '@angular/core';
import { ODataClient } from 'angular-odata';

interface Person {
  UserName: string;
  FirstName: string;
  LastName: string;
}

@Component({ selector: 'app-people', template: '' })
export class PeopleComponent {
  private client = inject(ODataClient);

  ngOnInit() {
    const people = this.client.entitySet<Person>('People');
    people.query((q) => {
      q.select(['UserName', 'FirstName', 'LastName']);
      q.top(10);
    });
    people.fetch({ withCount: true }).subscribe(({ entities, annots }) => {
      console.log(annots.count, entities);
    });
  }
}
```

## Using a generated API

The [code generator](code-generation.html) writes interfaces, services, models and a
configuration from the `$metadata` of your service. This is how the
[demo application](https://github.com/diegomvh/AngularODataEntity) works:

```bash
ng generate angular-odata:apigen --models=true --name=TripPin --metadata='https://services.odata.org/V4/TripPinServiceRW/$metadata'
```

```typescript
import { TripPinConfig } from './trip-pin';

export const appConfig: ApplicationConfig = {
  providers: [provideODataClient({ config: TripPinConfig })],
};
```

```typescript
import { PeopleService } from './trip-pin';

export class PeopleComponent {
  private peopleService = inject(PeopleService);

  ngOnInit() {
    this.peopleService
      .entities()
      .query((q) => q.top(10))
      .fetch({ withCount: true })
      .subscribe(({ entities, annots }) => console.log(annots.count, entities));
  }
}
```

Next, read [Resources](resources.html) and the [Query builder](query-builder.html) chapters. To
get typed services and models for your API, see [Code generation](code-generation.html).
