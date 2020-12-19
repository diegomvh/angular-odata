# angular-odata

A fluent API for querying, creating, updating and deleting OData resources in Angular.
OData service for Angular.

Please check also my other related project, [OData Angular Generator](https://github.com/diegomvh/ODataApiGen)

## Install:

```bash
npm i angular-odata
```

## Demo:

Full examples of the library:

 - [AngularODataEntity](https://github.com/diegomvh/AngularODataEntity)

## Usage:

### Simple usage: Service Factory

In this mode the services are obtained from a factory and optionally we can use types for entities

1) Add module to your project

```typescript
import { NgModule } from '@angular/core';
import { ODataModule } from 'angular-odata';

@NgModule({
  imports: [
    ...
    ODataModule.forRoot({
      serviceRootUrl: 'https://services.odata.org/V4/(S(4m0tuxtnhcfctl4gzem3gr10))/TripPinServiceRW/'
    })
    ...
  ]
})
export class AppModule {}
```

or build settings through a factory function.

```typescript
import { NgModule } from '@angular/core';

import { ODataModule, ODataSettings } from 'angular-odata';

export function settingsFactory() {
  return new ODataSettings({
    serviceRootUrl: 'https://services.odata.org/V4/(S(4m0tuxtnhcfctl4gzem3gr10))/TripPinServiceRW/'
  });
}

@NgModule({
  imports: [
    ...
    ODataModule
  ]
  providers: [
    ...
    { provide: ODataSettings, useFactory: settingsFactory }
  ],
})
export class AppModule {}
```

2) Inject and use the ODataServiceFactory

```typescript
import { Component } from '@angular/core';
import { ODataClient, ODATA_ETAG } from 'angular-odata';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'TripPin';
  constructor(private factory: ODataServiceFactory) {
    this.queries();
  }

  queries() {
    // Use OData Service Factory
    let airportsService = this.factory.entity<Airport>("Airports", 'Microsoft.OData.SampleService.Models.TripPin.Airport');
    let peopleService = this.factory.entity<Person>("People", 'Microsoft.OData.SampleService.Models.TripPin.Person');

    let airports = airportsService.entities();

    console.log(airportsService.entities());

    // Fetch all airports
    airports
    .all()
    .subscribe(aports => console.log("All: ", aports));

    this.products.entities()
    .get({withCount: true, fetchPolicy: 'cache-only', apiName: 'North3'})
    .subscribe(
      ({entities, meta}) => {console.log(entities)},
      (err) => console.log(err)
    );

    // Fetch airports with count
    airports
    .get({withCount: true})
    .subscribe(({entities, meta}) => console.log("Airports: ", entities, "Annotations: ", meta));

    // Fetch airport with key
    airports
    .entity("CYYZ").get()
    .pipe(switchMap(() => airports.entity("CYYZ").get({fetchPolicy: 'cache-first'}))) // From Cache!
    .subscribe(({entity, meta}) => console.log("Airport: ", entity, "Annotations: ", meta));

    // Filter airports (inmutable resource)
    airports
    .filter({Location: {City: {CountryRegion: "United States"}}})
    .get()
    .subscribe(({entities, meta}) => console.log("Airports of United States: ", entities, "Annotations: ", meta));

    // Add filter (mutable resource)
    airports.query.filter().push({Location: {City: {Region: "California"}}});
    airports
    .get()
    .subscribe(({entities, meta}) => console.log("Airports in California: ", entities, "Annotations: ", meta));

    console.log(airports.toJSON());
    console.log(this.odata.fromJSON(airports.toJSON()));

    // Remove filter (mutable resource)
    airports.query.filter().clear();
    airports
    .get()
    .subscribe(({entities, meta}) => console.log("Airports: ", entities, "Annotations: ", meta));

    let people = peopleService.entities();

    // Expand (inmutable resource)
    people.expand({
      Friends: {
        expand: { Friends: { select: ['AddressInfo']}}
      },
      Trips: { select: ['Name', 'Tags'] },
    })
    .get({withCount: true})
    .subscribe(({entities, meta}) => console.log("People with Friends and Trips: ", entities, "Annotations: ", meta));

    console.log(people.toJSON());
    console.log(this.odata.fromJSON(people.toJSON()));

    this.odata.batch("TripPin").post(batch => {
      airports.get().subscribe(console.log);
      airport.get().subscribe(console.log);
      people.get({withCount: true}).subscribe(console.log);
    }).subscribe();
  }
}
```

### Advanced usage: Create Custom Services

In this mode, services are created using custom definitions and corresponding configuration

1) The entity with configuration

```typescript
import { PersonGender } from './persongender.enum';
import { Location  } from './location.entity';
import { Photo } from './photo.entity';
import { Trip } from './trip.entity';

export interface Person {
  UserName: string;
  FirstName: string;
  LastName: string;
  Emails?: string[];
  AddressInfo?: Location[];
  Gender?: PersonGender;
  Concurrency: number;
  Friends?: Person[];
  Trips?: Trip[];
  Photo?: Photo
}

export const PersonConfig = {
  name: "Person",
  fields: {
    UserName: {type: 'Edm.String', key: true, ref: 'UserName', nullable: false}]},
    FirstName: {type: 'Edm.String', nullable: false},
    LastName: {type: 'Edm.String', nullable: false},
    Emails: {type: 'Edm.String', collection: true},
    AddressInfo: {type: 'Microsoft.OData.SampleService.Models.TripPin.Location', collection: true},
    Gender: {type: 'Microsoft.OData.SampleService.Models.TripPin.PersonGender'},
    Concurrency: {type: 'Edm.Int64', nullable: false},
    Friends: {type: 'Microsoft.OData.SampleService.Models.TripPin.Person', collection: true, navigation: true},
    Trips: {type: 'Microsoft.OData.SampleService.Models.TripPin.Trip', collection: true, navigation: true},
    Photo: {type: 'Microsoft.OData.SampleService.Models.TripPin.Photo', navigation: true}
  }
} as EntityConfig<Person>;
```

2) The api configuration 

```typescript
import ...
import { PersonGenderConfig } from './Microsoft/OData/SampleService/Models/TripPin/persongender.enum.config';
import { LocationConfig } from './Microsoft/OData/SampleService/Models/TripPin/location.entity.config';
import { PhotoConfig } from './Microsoft/OData/SampleService/Models/TripPin/photo.entity.config';
import { PersonConfig } from './Microsoft/OData/SampleService/Models/TripPin/person.entity.config';
import { TripConfig } from './Microsoft/OData/SampleService/Models/TripPin/trip.entity.config';

export const TripPinConfig = {
  serviceRootUrl: 'https://services.odata.org/V4/(S(4m0tuxtnhcfctl4gzem3gr10))/TripPinServiceRW/',
  schemas: [ // Schemas
    {
      namespace: "Microsoft.OData.SampleService.Models.TripPin",
      enums: [
        PersonGenderConfig
      ],
      entities: [
        ...
        LocationConfig,
        PhotoConfig,
        PersonConfig,
        TripConfig
      ]
    }
  ]
}
```

3) The service

```typescript
// Service
import { Injectable } from '@angular/core';
import { ODataEntityService } from 'angular-odata';
import { Person } from './person.entity';

@Injectable()
export class PeopleService extends ODataEntityService<Person> {
  constructor(protected client: ODataClient) {
    super(client, 'People', 'Microsoft.OData.SampleService.Models.TripPin.Person');
  }
}
```

4) Add module to your project

```typescript
import { NgModule } from '@angular/core';
import { ODataModule } from 'angular-odata';
import { TripPinConfig, PeopleService } from './trippin';

@NgModule({
  imports: [
    ...
    ODataModule.forRoot(TripPinConfig)
    ...
  ],
  providers: [
    PeopleService
  ]
})
export class AppModule {}
```

5) Inject and use the entity service

```typescript
import { Component } from '@angular/core';
import { ODataClient } from 'angular-odata';
import { PeopleService, PhotosService } from './trippin';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'AngularODataEntity';
  constructor(private people: PeopleService, private photos: PhotosService) {
    this.show('scottketchum');
  }

  show(name: string) {
    this.people.entity({UserName: name})
    .expand({
      Friends: {}, 
      Trips: { expand: { Photos: {}, PlanItems: {} } }, 
      Photo: {}
    }).fetch()
    .subscribe((person) => {
      this.person = person;
      if (person.Photo) {
        this.photos.entity(person.Photo)
        .media()
        .blob().subscribe(console.log);
      }
    });
  }
}
```

### Advanced usage: OData Generator 

1) If you choose using [OData Angular Generator](https://github.com/diegomvh/ODataApiGen), import the config and the module from generated source.

```typescript
import { NgModule } from '@angular/core';

import { ODataModule } from 'angular-odata';
import { TripPinConfig, TripPinModule } from './trippin';

@NgModule({
  imports: [
    ...
    ODataModule.forRoot(TripPinConfig),
    TripPinModule
  ]
  ...
})
export class AppModule {}
```

## OData V3 and V2

The library works mainly with OData V4, however, it incorporates basic support for versions 3 and 2.

## Queries

For a deep query customizations the library use `odata-query` as a builder.

- [OData v4 query builder](https://github.com/techniq/odata-query)
