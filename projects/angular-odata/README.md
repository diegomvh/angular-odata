# Angular OData

[![build](https://github.com/diegomvh/angular-odata/workflows/Node.js%20CI/badge.svg)](https://github.com/diegomvh/angular-odata/actions?query=workflow%3A%22Node.js+CI%22)
[![npm version](https://badge.fury.io/js/angular-odata.svg)](http://badge.fury.io/js/angular-odata)

A fluent API for querying, creating, updating and deleting OData resources in Angular.
OData service for Angular.

Please check also my other related project, [OData Angular Generator](https://github.com/diegomvh/ODataApiGen)

## Demo:

Full examples of the library:

- [AngularODataEntity](https://github.com/diegomvh/AngularODataEntity)

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
- [Generator](#generator)
- [OData Version](#odata-version)
- [Query Builder](#query-builder)
- [Documentation](#documentation)

## Installation

Install from npm:

```bash
npm i angular-odata
```

## Usage

1. Add module to your project

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

2. Inject and use the ODataServiceFactory

```typescript
import { Component } from "@angular/core";
import { ODataClient, ODATA_ETAG } from "angular-odata";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  title = "TripPin";
  constructor(private factory: ODataServiceFactory) {
    this.queries();
  }

  queries() {
    // Use OData Service Factory
    let airportsService = this.factory.entity<Airport>("Airports");
    let peopleService = this.factory.entity<Person>("People");

    let airports = airportsService.entities();

    // Fetch airports with count
    airports
      .fetch({ withCount: true })
      .subscribe(({ entities, annots }) =>
        console.log("Airports: ", entities, "Annotations: ", annots)
      );

    // Fetch all airports
    airports.fetchAll().subscribe((aports) => console.log("All: ", aports));

    // Fetch airport with key
    airports
      .entity("CYYZ")
      .fetch()
      .pipe(
        switchMap(() =>
          airports.entity("CYYZ").get({ fetchPolicy: "cache-first" })
        )
      ) // From Cache!
      .subscribe(({ entity, annots }) =>
        console.log("Airport: ", entity, "Annotations: ", annots)
      );

    // Filter airports (inmutable resource)
    airports
      .filter({ Location: { City: { CountryRegion: "United States" } } })
      .fetch()
      .subscribe(({ entities, annots }) =>
        console.log(
          "Airports of United States: ",
          entities,
          "Annotations: ",
          annots
        )
      );

    // Add filter (mutable resource)
    airports.query
      .filter()
      .push({ Location: { City: { Region: "California" } } });
    airports
      .fetch()
      .subscribe(({ entities, annots }) =>
        console.log(
          "Airports in California: ",
          entities,
          "Annotations: ",
          annots
        )
      );

    // Resource to JSON
    const json = airports.toJSON();
    console.log(json);
    // JSON to Resource
    const query = this.odata.fromJSON(json);
    console.log(query);

    // Remove filter (mutable resource)
    airports.query.filter().clear();
    airports
      .fetch()
      .subscribe(({ entities, annots }) =>
        console.log("Airports: ", entities, "Annotations: ", annots)
      );

    let people = peopleService.entities();

    // Expand (inmutable resource)
    people
      .expand({
        Friends: {
          expand: { Friends: { select: ["AddressInfo"] } },
        },
        Trips: { select: ["Name", "Tags"] },
      })
      .fetch({ withCount: true })
      .subscribe(({ entities, annots }) =>
        console.log(
          "People with Friends and Trips: ",
          entities,
          "Annotations: ",
          annots
        )
      );

    this.odata
      .batch("TripPin")
      .post((batch) => {
        airports.fetch().subscribe(console.log);
        airport.fetch().subscribe(console.log);
        people.fetch({ withCount: true }).subscribe(console.log);
      })
      .subscribe();
  }
}
```

## Generator

If you use [OData Angular Generator](https://github.com/diegomvh/ODataApiGen), import the config and the module from generated source.

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

## OData Version

The library works mainly with OData Version 4, however, it incorporates basic support for versions 3 and 2.

## Query Builder

For a deep query customizations the library use `odata-query` as a builder.

- [OData v4 query builder](https://github.com/techniq/odata-query)

## Documentation

The api documentation is generated using compodoc and can be viewed here: https://diegomvh.github.io/angular-odata/docs/

Library documentation can be viewed on the wiki here: https://github.com/diegomvh/angular-odata/wiki
