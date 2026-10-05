# Models and collections

`ODataModel` and `ODataCollection` are rich wrappers around entities. They keep track of
changes, validate values with the schema, emit events and know how to save themselves.

## Declaring a model

```typescript
import { Model, ModelField, ODataCollection, ODataModel } from 'angular-odata';

@Model()
export class PersonModel<E extends Person> extends ODataModel<E> {
  @ModelField()
  declare UserName: string;
  @ModelField()
  declare FirstName: string;
  @ModelField()
  declare LastName: string;
  @ModelField()
  declare Friends: ODataCollection<Person, PersonModel<Person>>;
}

export class PersonCollection<E extends Person, M extends PersonModel<E>> extends ODataCollection<
  E,
  M
> {}
```

Register the classes in the API configuration so that the client uses them for the type:

```typescript
const config: ODataApiConfig = {
  serviceRootUrl: '...',
  models: { 'Microsoft.OData.SampleService.Models.TripPin.Person': PersonModel },
  collections: { 'Microsoft.OData.SampleService.Models.TripPin.Person': PersonCollection },
};
```

`@ModelField()` accepts `name` (the server property name, when it differs from the class
property), `default`, `required`, `concurrency` and validation rules (`minLength`,
`maxLength`, `min`, `max`, `pattern`). The
[code generator](code-generation.html) writes these classes for you.

## Using models

These examples come from the demo application, which uses the generated TripPin API:

```typescript
import { firstValueFrom } from 'rxjs';

const peopleService = inject(PeopleService);

// Fetch, change and save
const scott = peopleService.personModel({ UserName: 'scottketchum' });
await firstValueFrom(scott.fetch());
scott.Gender = PersonGender.Female;
scott.hasChanged(); // true
await firstValueFrom(scott.save()); // PUT or PATCH; POST when the model is new

// Delete
await firstValueFrom(scott.destroy());
```

A model has its own query options. Expanded navigation properties become models and
collections:

```typescript
const scott = peopleService.personModel({ UserName: 'scottketchum' });
scott.query((q) => q.expand(({ e, t }) => e().field(t.Friends)));
await firstValueFrom(scott.fetch());
scott.Friends?.forEach((friend) => console.log(friend.FirstName));
```

### Models reached through another model

A model loaded through a navigation property keeps the path it was loaded from: the friends
of Scott are addressed through `People('scottketchum')/Friends`. `asEntity()` runs a callback
in which the model is bound to its own entity set instead:

```typescript
const friend = scott.Friends?.first();
if (friend) {
  friend.Gender = PersonGender.Female;
  console.log(friend.resource()?.toString()); // A path through People('scottketchum')/Friends
  await firstValueFrom(friend.asEntity((f) => f.save())); // Saved through the People entity set
}
```

Other useful methods:

| Method                                                   | Description                                           |
| -------------------------------------------------------- | ----------------------------------------------------- |
| `isNew()`                                                | `true` when the model has no key.                     |
| `isValid()`, `validate()`                                | Validate the values against the schema.               |
| `toEntity()`, `toJson()`                                 | Convert the model to a plain object.                  |
| `assign(values)`, `reset()`, `clear()`                   | Change or reset the values.                           |
| `query((q) => ...)`                                      | Change the query options used by `fetch()`.           |
| `fetchNavigationProperty(name, 'model' \| 'collection')` | Fetch a navigation property as a model or collection. |
| `clone()`                                                | Copy the model.                                       |

## Using collections

```typescript
const airports = inject(AirportsService).collection();
airports.query((q) => q.orderBy('Name'));
await firstValueFrom(airports.fetch({ withCount: true }));
console.log(airports.models());
airports.forEach((airport) => console.log(airport.Name));
```

Collections have array-like methods (`map`, `filter`, `find`, `reduce`, `some`, `every`,
`forEach`, `first`, `last`), change methods (`add`, `remove`, `create`, `set`, `reset`), and
the fetch methods `fetch`, `fetchAll`, `fetchMany` and `fetchOne`.

## Generated accessors

For each field, the [code generator](code-generation.html) adds helper methods to the model
class. For a field named `Friends`:

| Method               | Returns                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `$$Friends()`        | The resource of the property or navigation property.                   |
| `$Friends()`         | The current value, as a model or collection for navigation properties. |
| `Friends$(options?)` | An observable that fetches the value from the server.                  |
| `Friends$$(model)`   | Sets the reference (`$ref`) of a navigation property.                  |

```typescript
scott.Friends$().subscribe((friends) => console.log(friends?.models()));
```

## Events

Models and collections emit events through `events$`:

```typescript
import { ODataModelEventType } from 'angular-odata';

russell.events$.subscribe((event) => {
  if (event.type === ODataModelEventType.Change) {
    console.log(event.value, event.previous);
  }
});
```

The event types are `change`, `reset`, `update`, `sort`, `destroy`, `add`, `remove`,
`invalid`, `request`, `sync` and `attach`.
