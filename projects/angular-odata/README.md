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
 - [AngularODataModel](https://github.com/diegomvh/AngularODataModel)

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
    let airportsService = this.factory.createEntityService<Airport>("Airports");
    let peopleService = this.factory.createEntityService<Person>("People");

    let airports = airportsService.entities();

    // Fetch set
    airports.all()
      .subscribe(aports => console.log("All: ", aports));

    // Fetch with count
    airports.get({withCount: true})
      .subscribe(([aports, annots]) => console.log("Airports: ", aports, "Annotations: ", annots));

    // Fetch by key
    let airport = airports.entity("CYYZ");
    airport.get()
      .subscribe(([aport, annots]) => console.log("Airport: ", aport, "Annotations: ", annots));

    // Filter
    airports.filter({Location: {City: {CountryRegion: "United States"}}});
    airports.get()
      .subscribe(([aports, annots]) => console.log("Airports of United States: ", aports, "Annotations: ", annots));

    // Add filter
    airports.filter().push({Location: {City: {Region: "California"}}});
    airports.get()
      .subscribe(([aports, annots]) => console.log("Airports in California: ", aports, "Annotations: ", annots));

    // Remove filter
    airports.filter().clear();
    airports.get()
      .subscribe(([aports, annots]) => console.log("Airports: ", aports, "Annotations: ", annots));

    let people = peopleService.entities();

    // Expand
    people.expand({
      Friends: { 
        expand: { Friends: { select: ['AddressInfo']}} 
      }, 
      Trips: { select: ['Name', 'Tags'] },
    });
    people.get({withCount: true})
      .subscribe(([peop, annots]) => console.log("People with Friends and Trips: ", peop, "Annotations: ", annots));

    // Remove Expand
    people.expand().clear();

    // Batch
    let batch = odata.batch();
    batch.post(() => {
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
  static path: string = 'People';
  static type: string = 'Microsoft.OData.SampleService.Models.TripPin.People';
  static entity: string = 'Microsoft.OData.SampleService.Models.TripPin.Person';
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
import { PeopleService } from './trippin';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'AngularODataEntity';
  constructor(private people: PeopleService) {
    this.show('scottketchum');
  }

  show(name: string) {
    let person = this.people.entity({UserName: name});
    person.expand({
      Friends: {}, 
      Trips: {
        expand: {
          Photos: {}, 
          PlanItems: {}
        }
      }, 
      Photo: {}
    });
    person.get()
      .subscribe(([person, ]) => {
        this.person = person;
        if (person.Photo) {
          let media = this.photos.entity(person.Photo).media();
          media.blob().subscribe(console.log);
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

For a deep query customizations the library use `odata-query` as a builder.

## Credits
Angular OData is built using the following open source projects:
- [OData v4 query builder](https://github.com/techniq/odata-query)
