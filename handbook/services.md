# Services

Services wrap the resources of one entity set or singleton in an injectable class.

## Entity set services

Extend `ODataEntitySetService` and pass the entity set path and the entity type to the
constructor:

```typescript
import { Injectable } from '@angular/core';
import { ODataClient, ODataEntitySetService } from 'angular-odata';

@Injectable({ providedIn: 'root' })
export class PeopleService extends ODataEntitySetService<Person> {
  constructor(client: ODataClient) {
    super(client, 'People', 'Microsoft.OData.SampleService.Models.TripPin.Person');
  }
}
```

The service gives you resources and shortcuts:

| Method                                       | Description                                                                                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `entities()`                                 | A new `ODataEntitySetResource` for the entity set.                                                                                      |
| `entity(key)`                                | A new `ODataEntityResource` for one entity.                                                                                             |
| `fetchAll()`, `fetchMany(top)`, `fetchOne()` | Shortcuts for the same methods of the entity set resource.                                                                              |
| `create(attrs)`                              | Creates an entity.                                                                                                                      |
| `update(key, attrs)`, `modify(key, attrs)`   | Replace (PUT) or update (PATCH) an entity.                                                                                              |
| `destroy(key)`                               | Deletes an entity.                                                                                                                      |
| `fetchOrCreate(key, attrs)`                  | Fetches an entity and creates it when the server answers 404.                                                                           |
| `save(attrs)`                                | Creates or updates the entity, depending on whether `attrs` contains the key. Entities with compound keys require an explicit `method`. |
| `model(attrs)`, `collection(entities)`       | Create a [model or collection](models-and-collections.html) bound to the entity set.                                                    |

This component, adapted from the demo application, loads one person with its photo, trips
and friends, then downloads the photo through another service:

```typescript
@Component({
  selector: 'trip-person',
  template: `<pre>{{ person() | json }}</pre>`,
  imports: [JsonPipe],
})
export class PersonComponent {
  private peopleService = inject(PeopleService);
  private photosService = inject(PhotosService);
  person = signal<Person | null>(null);

  show(userName: string) {
    this.peopleService
      .entity({ UserName: userName })
      .query((q) =>
        q.expand(({ e, t }) =>
          e()
            .field(t.Photo)
            .field(t.Trips)
            .field(t.Friends, (f) => f.levels(2)),
        ),
      )
      .fetch()
      .subscribe(({ entity }) => {
        this.person.set(entity);
        if (entity?.Photo) {
          this.photosService.entity(entity.Photo).media().fetchBlob().subscribe(console.log);
        }
      });
  }
}
```

## Reading the schema

`structuredTypeSchema` gives access to the schema of the entity type, for example to build
the columns of a table from the metadata:

```typescript
const schema = this.peopleService.structuredTypeSchema;
const columns = (schema?.fields({ include_parents: true, include_navigation: false }) ?? []).map(
  (field) => ({
    field: field.name,
    sortable: !field.collection,
    filterable: field.type === EdmType.String,
  }),
);
```

## Singleton services

`ODataSingletonService` works the same way for singletons. It has `entity()`, `model()` and
`attach()`.

## Services without a class

`ODataServiceFactory` creates services at runtime:

```typescript
const factory = inject(ODataServiceFactory);
const airportsService = factory.entitySet<Airport>('Airports');
const airports = airportsService.entities();
airports.fetchAll().subscribe(({ entities }) => {});

const people = factory.entitySet<Person>(
  'People',
  'Microsoft.OData.SampleService.Models.TripPin.Person',
);
const me = factory.singleton<Person>('Me');
```

The second argument is an API name or an entity type, and the service uses it to find the API. When it is omitted, the service uses the default API.

Both methods accept an optional `Model` (and, for entity sets, `Collection`) class.

## Generated services

The [code generator](code-generation.html) creates one service for each entity set and
singleton, with typed methods for the bound functions and actions, and helpers that return
the generated model and collection classes:

```typescript
@Injectable({ providedIn: 'root' })
export class PeopleService extends ODataEntitySetService<Person> {
  constructor(client: ODataClient) {
    super(client, 'People', 'Microsoft.OData.SampleService.Models.TripPin.Person');
  }
  personModel(entity?: Partial<Person>) {
    return this.model<PersonModel<Person>>(entity);
  }
  personCollection(entities?: Partial<Person>[]) {
    return this.collection<PersonModel<Person>, PersonCollection<Person, PersonModel<Person>>>(
      entities,
    );
  }
}
```
