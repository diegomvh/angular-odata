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
    ODataModule.forRoot({
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

or build context through a factory function.

```typescript
import { NgModule } from '@angular/core';
import { throwError } from 'rxjs';

import { ODataSettings } from 'angular-odata';

export function oDataSettingsFactory() {
  return new ODataSettings({
    baseUrl: "http://localhost/odata/",
    withCredentials: true,
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

If you choose using [OData to TypeScript](https://github.com/diegomvh/Od2Ts), import the config from generated source and build context through a factory function.

```typescript
import { NgModule } from '@angular/core';
import { throwError } from 'rxjs';

import { ODataContext } from 'angular-odata';
import { MyApiModule, MyApiConfig } from './myapi';

@NgModule({
  imports: [
    ...
    ODataModule.forRoot(MyApiConfig),
    MyApiModule
  ]
  ...
})
export class AppModule {}
```

2) Inject and use the ODataClient

```typescript
import { Component } from '@angular/core';
import { ODataClient, ODataQuery } from 'angular-odata';
import { Song } from './Song';

@Component({
  selector: 'audio-player',
  template: '',
  styles: ['']
})
export class AudioPlayerComponent {
  songs: Songs[]
  song: Song; 

  constructor(private odata: ODataClient) { 
    this.odata.entitySet<Song>("Songs");
      .get()
      .subscribe(entityset => this.songs = entityset.value);

    this.odata.entitySet("Songs")
      .entity(1)
      .get().subscribe(entity => this.song = entity)

    // Mutable query
    let collection = this.odata.entitySet<Song>("Songs");
    // Set top and skip
    collection.top(10);
    collection.skip(10);
    // Set filter
    collection.filter({Name: {contains: 'foo'});
    // Update filter and set Artist FirstName
    collection.filter().set("Artist", { FirstName: { startswith: 'bar' }});
    // Update filter and add raw condition
    collection.filter().add("year(Year) eq 1980");
    // Set expand 
    collection.expand({Artist: {select: ["FirstName", "LastName"]}});
    // Set OrderBy
    collection.orderBy("Year");
    // Update orderBy and add Artist LastName
    collection.orderBy().add("Artist/LastName");
    // Go!
    collection.get().subscribe(entityset => this.songs = entityset.value)
  }

}
```

3) Or build service for entity

```typescript
import { Injectable } from '@angular/core';
import { ODataEntityService, ODataClient } from 'angular-odata';
import { Song } from './Song';

@Injectable()
export class SongsService extends ODataEntityService<Song> {
  static set: string = 'Songs';

  constructor(
    protected odata: OdataClient
  ) {
  } 
}
```

4) Inject and use the entity service

```typescript
import { Component } from '@angular/core';
import { Song } from './Song';
import { SongService } from './songs.service';

@Component({
  selector: 'audio-player',
  template: '',
  styles: ['']
})
export class AudioPlayerComponent {
  songs: Songs[]
  song: Song; 
  
  constructor(private songsService: SongsService) {
    this.songsService.fetchOne({id: 1}).subscribe(song => this.song = song)
    this.songsService.fetchPage().subscribe(page => this.songs = page.entities)
    this.songsService.fetchAll().subscribe(all => this.songs = all)
  }
}
```

5) Again, if you using OData to TypeScript import the service from generated source and use... but not abuse :). 

For a deep query customizations the library use `odata-query` as a builder.

## Base on implementation of odata-v4-ng
 - [OData service for Angular](https://github.com/riccardomariani/odata-v4-ng)

## Credits
Angular OData is built using the following open source projects:
- [OData service for Angular](https://github.com/riccardomariani/odata-v4-ng)
- [OData v4 query builderMongoDb](https://github.com/techniq/odata-query)