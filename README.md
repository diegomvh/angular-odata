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
    ODataModule.forContext({
      baseUrl: "http://localhost/odata/",
      withCredentials: true,
      errorHandler: (error: HttpErrorResponse) => {
        // Custom error processing
        return throwError(error);
      }
    }),
  ]
})
export class AppModule {}
```

If you choose using [OData to TypeScript](https://github.com/diegomvh/Od2Ts), import the config from generated source and build context through a factory function.

```typescript
import { NgModule } from '@angular/core';
import { throwError } from 'rxjs';

import { ODataContext } from 'angular-odata';
import { MyApiModule, MyApiConfig } from './myapi';

export function oDataContextFactory() {
  return new ODataContext(Object.assign(MyApiConfig, {
    baseUrl: "http://localhost/odata/",
    withCredentials: true,
    errorHandler: (error: HttpErrorResponse) => {
      return throwError(error);
    }
  }));
}

@NgModule({
  imports: [
    ...
    MyApiModule
  ]
  providers: [
    ...
    { provide: ODataContext, useFactory: oDataContextFactory }
  ],
})
export class AppModule {}
```

2) Inject and use the ODataService

```typescript
import { Component } from '@angular/core';
import { ODataService, ODataQuery } from 'angular-odata';
import { Song } from './Song';

@Component({
  selector: 'audio-player',
  template: '',
  styles: ['']
})
export class AudioPlayerComponent {
  songs: Songs[]
  song: Song; 

  constructor(private odata: ODataService) { 
    // Immutable query
    let collectionQuery = this.odata
      .query()
      .entitySet("Songs");
    this.odata.get(collectionQuery).subscribe(resp => this.songs = resp.toEntitySet<Song>().getEntities())
    let entityQuery = this.odata
      .query()
      .entitySet("Songs")
      .entityKey(1);
    this.odata.get(entityQuery).subscribe(resp => this.song = resp.toEntity<Song>())

    // Mutable query
    let collectionQuery = this.odata.queryBuilder();
    collectionQuery.entitySet("Songs");
    // Set top and skip
    collectionQuery.top(10);
    collectionQuery.skip(10);
    // Set filter
    collectionQuery.filter({Name: {contains: 'foo'});
    // Update filter and set Artist FirstName
    collectionQuery.filter().set("Artist", { FirstName: { startswith: 'bar' }});
    // Update filter and add raw condition
    collectionQuery.filter().push("year(Year) eq 1980");
    // Set expand 
    collectionQuery.expand({Artist: {select: ["FirstName", "LastName"]}});
    // Set OrderBy
    collectionQuery.orderBy("Year");
    // Update orderBy and add Artist LastName
    collectionQuery.orderBy().push("Artist/LastName");
    // Go!
    this.odata.get(collectionQuery).subscribe(resp => this.songs = resp.toEntitySet<Song>().getEntities())
  }

}
```

3) Or build service for entity

```typescript
import { Injectable } from '@angular/core';
import { ODataEntityService, ODataService } from 'angular-odata';
import { Song } from './Song';

@Injectable()
export class SongsODataService extends ODataEntityService<Song> {
  constructor(
    protected http: HttpClient,
    protected context: ODataContext
  ) {
    super(http, context, 'Songs');
  } 
}
```

4) And inject and use the entity service

```typescript
import { Component } from '@angular/core';
import { Song } from './Song';
import { SongODataService } from './songs.service';

@Component({
  selector: 'audio-player',
  template: '',
  styles: ['']
})
export class AudioPlayerComponent {
  songs: Songs[]
  song: Song; 
  
  constructor(private songsService: SongsODataService) {
    this.songsService.fetch({id: 1}).subscribe(song => this.song = song)
    this.songsService.all().subscribe(songs => this.songs = songs)
  }
}
```

5) Again, if you using OData to TypeScript import the service from generated source and use... but not abuse :). 

For a deep query customizations the library use `odata-query` as a builder, use the `queryBuilder` method in the ODataService or `entityQueryBuilder` and `entitySetQueryBuilder` in your custom entity service.

## Base on implementation of odata-v4-ng
 - [OData service for Angular](https://github.com/riccardomariani/odata-v4-ng)

## Credits
Angular OData is built using the following open source projects:
- [OData service for Angular](https://github.com/riccardomariani/odata-v4-ng)
- [OData v4 query builderMongoDb](https://github.com/techniq/odata-query)