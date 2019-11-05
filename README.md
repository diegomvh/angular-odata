# angular-odata

A fluent API for querying, creating, updating and deleting OData resources in Angular.
OData service for Angular.

If you are using OData with Angular please check also my other related project, [OData to TypeScript Service Generator](https://github.com/diegomvh/Od2Ts)

## Install:

```bash
npm i angular-odata
```

## Usage:

1) Add module to your project

```typescript
import { NgModule } from '@angular/core';
import { throwError } from 'rxjs';

import { ODataModule } from 'angular-odata';

@NgModule({
  imports: [
    ...
    ODataModule.forRoot({baseUrl: "https://services.odata.org/V4/(S(xeajfggf01nqt3frz54nmwme))/TripPinServiceRW/"})
    ...
  ]
})
export class AppModule {}
```

or build settings through a factory function.

```typescript
import { NgModule } from '@angular/core';
import { throwError } from 'rxjs';

import { ODataSettings } from 'angular-odata';

export function oDataSettingsFactory() {
  return new ODataSettings({
    baseUrl: "https://services.odata.org/V4/(S(xeajfggf01nqt3frz54nmwme))/TripPinServiceRW/",
    errorHandler: (error: HttpErrorResponse) => {
      return throwError(error);
    }
  });
}

@NgModule({
  imports: [
    ...
    ODataModule
  ]
  providers: [
    ...
    { provide: ODataSettings, useFactory: oDataSettingsFactory }
  ],
})
export class AppModule {}
```

If you choose using [OData to TypeScript](https://github.com/diegomvh/Od2Ts), import the config from generated source.

```typescript
import { NgModule } from '@angular/core';
import { throwError } from 'rxjs';

import { ODataContext } from 'angular-odata';
import { TripPinConfig, TripPinModule } from './trippin';

@NgModule({
  imports: [
    ...
    ODataModule.forRoot(Object.assign(TripPinConfig, {baseUrl: 'https://services.odata.org/V4/(S(4m0tuxtnhcfctl4gzem3gr10))/TripPinServiceRW/' })),
    TripPinModule
  ]
  ...
})
export class AppModule {}
```

2) Inject and use the ODataClient

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
  constructor(odata: ODataClient) {
    let airports = this.odata.entitySet<Airport>("Airports");

    // Fetch set
    airports.get().subscribe(console.log);

    // Fetch with count
    airports.get({withCount: true}).subscribe(console.log);

    // Fetch by key
    let airport = airports.entity("CYYZ");
    airport.get().subscribe(console.log);

    // Filter
    airports.filter({Location: {Address: {contains: 'San Francisco'}}});
    airports.get().subscribe(console.log);

    // Change Filter
    airports.filter({Location: {City: {CountryRegion: "United States"}}});
    airports.get().subscribe(console.log);

    // Add filter
    airports.filter().push({Location: {City: {Region: "California"}}});
    airports.get().subscribe(console.log);

    // Remove filter
    airports.filter().clear();

    this.odata.entitySet<Person>("People").get().subscribe(console.log);
    this.odata.entitySet<Person>("People").entity("javieralfred").get().subscribe(console.log);

    let people = this.odata.entitySet<Person>("People");

    // Expand
    people.expand({Friends: {}, Trips: {expand: {PlanItems: {}, Photos: {}}}});
    people.get({withCount: true}).subscribe(console.log);

    people.expand({Trips: {select: ["TripId", "Name"]}});
    people.get().subscribe(console.log);
  }
}
```

3) Or build service for entity

3.1) The entity and schema

```typescript
import { PersonGender } from './persongender.enum';
import { Location, LocationSchema } from './location.entity';
import { Photo, PhotoSchema } from './photo.entity';
import { Trip, TripSchema } from './trip.entity';

export interface Person {
  UserName: string;
  FirstName: string;
  LastName: string;
  Emails: string[];
  AddressInfo: Location[];
  Gender: PersonGender;
  Concurrency: number;
  Friends?: Person[];
  Trips?: Trip[];
  Photo?: Photo
}

export const PersonSchema = {
  UserName: {type: 'string', isKey: true, ref: 'UserName'},
  FirstName: {type: 'string'},
  LastName: {type: 'string'},
  Emails: {type: 'string', isCollection: true},
  AddressInfo: {type: 'Microsoft.OData.SampleService.Models.TripPin.Location', isCollection: true},
  Gender: {type: 'Microsoft.OData.SampleService.Models.TripPin.PersonGender', isFlags: false},
  Concurrency: {type: 'number'},
  Friends: {type: 'Microsoft.OData.SampleService.Models.TripPin.Person', isNullable: true, isCollection: true, isNavigation: true},
  Trips: {type: 'Microsoft.OData.SampleService.Models.TripPin.Trip', isNullable: true, isCollection: true, isNavigation: true},
  Photo: {type: 'Microsoft.OData.SampleService.Models.TripPin.Photo', isNullable: true, isNavigation: true}
};
```

3.2) The service

```typescript
// Service
import { Injectable } from '@angular/core';

import { ODataEntityService } from 'angular-odata';

import { Person, PersonSchema } from './person.entity';

@Injectable()
export class PeopleService extends ODataEntityService<Person> {
  static set: string = 'People';
  static type: string = 'Microsoft.OData.SampleService.Models.TripPin.Person';
  
  // Actions
  
  // Functions
  
  // Navigations
}
```

4) Inject and use the entity service

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
  title = 'TripPinEntity';
  constructor(
    private people: PeopleService
  ) {
    this.fetchPeople();
  }

  fetchPeople() {
    // Fetch all
    this.people.entities().collection().toPromise()
      .then(col => {
        // Change collection size
        return col.size(4).toPromise();
      })
      .then(col => {
        console.log([...col.entities]);
        console.log(col);
        return col.nextPage().toPromise();
      })
      .then(col => {
        console.log([...col.entities]);
        console.log(col);
        return col.nextPage().toPromise();
      })
      .then(col => {
        console.log([...col.entities]);
        console.log(col);
        return col.nextPage().toPromise();
      });
  }
}
```

5) Again, if you using OData to TypeScript import the service from generated source and use.

For a deep query customizations the library use `odata-query` as a builder.

Full examples of the library:

 - [TripPin](https://github.com/diegomvh/TripPin)
 - [TripPinEntity](https://github.com/diegomvh/TripPinEntity)
 - [TripPinModel](https://github.com/diegomvh/TripPinModel)


## Base on implementation of odata-v4-ng
 - [OData service for Angular](https://github.com/riccardomariani/odata-v4-ng)

## Credits
Angular OData is built using the following open source projects:
- [OData service for Angular](https://github.com/riccardomariani/odata-v4-ng)
- [OData v4 query builderMongoDb](https://github.com/techniq/odata-query)
