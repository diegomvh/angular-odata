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
    let airportsService = this.factory.entitySet<Airport>(
      "Airports",
      "Microsoft.OData.SampleService.Models.TripPin.Airport"
    );
    let airports = airportsService.entities();

    // Fetch airports
    airports.fetch().subscribe(({ entities }) => {
      console.log("Airports: ", entities);
    });

    // Fetch airports with count
    airports
      .fetch({ withCount: true })
      .subscribe(({ entities, annots }) =>
        console.log("Airports: ", entities, "Annotations: ", annots)
      );

    // Fetch all airports
    airports
      .fetchAll()
      .subscribe((airports) => console.log("All Airports: ", airports));

    // Fetch airport with key and fetch again from cache
    airports
      .entity("CYYZ")
      .fetch()
      .pipe(
        switchMap(() =>
          // From Cache!
          airports.entity("CYYZ").fetch({ fetchPolicy: "cache-first" })
        )
      )
      .subscribe(({ entity, annots }) =>
        console.log("Airport: ", entity, "Annotations: ", annots)
      );

    // Clone airports resource and filter new resource
    airports
      .clone()
      .query((q) =>
        q.filter({ Location: { City: { CountryRegion: "United States" } } })
      )
      .fetch()
      .subscribe(({ entities, annots }) =>
        console.log(
          "Airports of United States: ",
          entities,
          "Annotations: ",
          annots
        )
      );

    // Change query definition of airports resource and fetch again
    airports.query((q) =>
      q.filter().push({ Location: { City: { Region: "California" } } })
    );
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

    // Store airports resource
    var json = airports.toJSON();
    // Load airports resource
    airports = this.odata.fromJSON(json) as ODataEntitySetResource<Airport>;

    // Change query definition of airports resource and fetch again
    airports.query((q) => q.filter().clear());
    airports
      .fetch()
      .subscribe(({ entities, annots }) =>
        console.log("Airports: ", entities, "Annotations: ", annots)
      );

    let peopleService = this.factory.entitySet<Person>(
      "People",
      "Microsoft.OData.SampleService.Models.TripPin.Person"
    );
    let people = peopleService.entities();

    // Clone people resource and expand and fetch
    people
      .clone()
      .query((q) =>
        q.expand({
          Friends: {
            expand: { Friends: { select: ["AddressInfo"] } },
          },
          Trips: { select: ["Name", "Tags"] },
        })
      )
      .fetch({ withCount: true })
      .subscribe(({ entities, annots }) =>
        console.log(
          "People with Friends and Trips: ",
          entities,
          "Annotations: ",
          annots
        )
      );

    // Clone people resource and filter with expressions
    people
      .clone()
      .query((q) =>
        q.filter(({ e }) =>
          e().eq("Emails", "john@example.com").or(e().eq("UserName", "john"))
        )
      )
      .fetch()
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
      .exec(() =>
        forkJoin({
          airports: airports.fetch(),
          people: people.fetch({ withCount: true }),
        })
      )
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

For a deep query customizations the library use `odata-query` and `odata-filter-builder` as a builders.

- [OData v4 query builder](https://github.com/techniq/odata-query)
- [OData Filter Builder](https://github.com/bodia-uz/odata-filter-builder)

## Documentation

The api documentation is generated using compodoc and can be viewed here: https://diegomvh.github.io/angular-odata/docs/

Library documentation can be viewed on the wiki here: https://github.com/diegomvh/angular-odata/wiki
