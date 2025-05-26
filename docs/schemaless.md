# Schemaless

Import ODataModule into your application module definition and setup the module for the `serviceRootUrl`.

```typescript
import { NgModule } from '@angular/core';
import { ODataModule } from 'angular-odata';

@NgModule({
  imports: [
    ...
    ODataModule.forRoot({
      config: {
        serviceRootUrl: 'https://services.odata.org/V4/(S(4m0tuxtnhcfctl4gzem3gr10))/TripPinServiceRW/'
      }
    })
    ...
  ]
})
export class AppModule {}
```

## Usage

Inject and use the ODataServiceFactory

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
    let airportsService = this.factory.entitySet<Airport>('Airports');
    let airports = airportsService.entities();

    // Fetch airports
    airports.fetch().subscribe(({ entities }) => {
      console.log('Airports: ', entities);
    });

    // Fetch airports with count
    airports
      .fetch({ withCount: true })
      .subscribe(({ entities, annots }) =>
        console.log('Airports: ', entities, 'Annotations: ', annots)
      );

    // Fetch all airports
    airports
      .fetchAll()
      .subscribe((airports) => console.log('All Airports: ', airports));

    // Fetch airport with key and fetch again from cache
    airports
      .entity('CYYZ')
      .fetch()
      .pipe(
        switchMap(() =>
          // From Cache!
          airports.entity('CYYZ').fetch({ fetchPolicy: 'cache-first' })
        )
      )
      .subscribe(({ entity, annots }) =>
        console.log('Airport: ', entity, 'Annotations: ', annots)
      );

    // Clone airports resource and filter new resource
    airports
      .clone()
      .query((q) =>
        q.filter(({e, t}) => e().eq(t.Location.City.CountryRegion, 'United States'))
      )
      .fetch()
      .subscribe(({ entities, annots }) =>
        console.log(
          'Airports of United States: ',
          entities,
          'Annotations: ',
          annots
        )
      );

    // Change query definition of airports resource and fetch again
    airports.query((q) =>
      q.filter(({e, t}) => e().eq(t.Location.City.Region, 'California'))
    );
    airports
      .fetch()
      .subscribe(({ entities, annots }) =>
        console.log(
          'Airports in California: ',
          entities,
          'Annotations: ',
          annots
        )
      );

    // Store airports resource
    var json = airports.toJson();
    // Load airports resource
    airports = this.odata.fromJson(json) as ODataEntitySetResource<Airport>;

    // Change query definition of airports resource and fetch again
    airports.query((q) => q.filter().clear());
    airports
      .fetch()
      .subscribe(({ entities, annots }) =>
        console.log('Airports: ', entities, 'Annotations: ', annots)
      );

    let peopleService = this.factory.entitySet<Person>(
      'People',
      'Microsoft.OData.SampleService.Models.TripPin.Person'
    );
    let people = peopleService.entities();

    // Clone people resource and expand and fetch
    people
      .clone()
      .query((q) =>
        q.expand(({e, t}) => 
          e()
            .field(t.Friends, (f) => {
              f.expand(({e, t}) => e().field(t.Friends));
            })
            .field(t.Trips, (f) => {
              f.select(({e, t}) => e().fields('Name', 'Tags'));
            })
      ))
      .fetch({ withCount: true })
      .subscribe(({ entities, annots }) =>
        console.log(
          'People with Friends and Trips: ',
          entities,
          'Annotations: ',
          annots
        )
      );

    // Clone people resource and filter with expressions
    people
      .clone()
      .query((q) =>
        q.filter(({ e, t }) =>
          e()
            .contains(t.Emails, 'john@example.com').or(
              e().eq(t.UserName, 'john')
            )
        )
      )
      .fetch()
      .subscribe(({ entities, annots }) =>
        console.log(
          'People with Friends and Trips: ',
          entities,
          'Annotations: ',
          annots
        )
      );

    this.odata
      .batch('TripPin')
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
