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

import { ODataModule } from 'angular-odata';

@NgModule({
  imports: [
    ODataModule.forRoot({
      serviceRoot: "http://localhost:54872/odata/",
      withCredentials: true
    }),
  ]
})
export class AppModule {}
```

2) Inject and use the ODataService

```typescript
import { Component } from '@angular/core';
import { ODataService, ODataQuery } from 'angular-odata';

@Component({
  selector: 'audio-player',
  template: '',
  styles: ['']
})
export class AudioPlayerComponent {
  
  constructor(private odataService: ODataService) { }

}
```

3) Build services for entites

```typescript
import { Song } from './Song';
import { Injectable } from '@angular/core';
import { ODataEntityService, ODataService } from 'angular-odata';

@Injectable()
export class SongsODataService extends ODataEntityService<Song> {
  constructor(
    protected odata: ODataService
  ) {
    super(odata, 'Songs');
  } 
}
```

4) Inject and use the entity service

```typescript
import { Component } from '@angular/core';
import { SongODataService } from './songs.service';

@Component({
  selector: 'audio-player',
  template: '',
  styles: ['']
})
export class AudioPlayerComponent {
  
  constructor(private songsService: SongsODataService) { }

}
```

## Base on implementation of odata-v4-ng
 - [OData service for Angular](https://github.com/riccardomariani/odata-v4-ng)

## Credits
Angular OData is built using the following open source projects:
- [OData service for Angular](https://github.com/riccardomariani/odata-v4-ng)
- [OData v4 query builderMongoDb](https://github.com/techniq/odata-query)