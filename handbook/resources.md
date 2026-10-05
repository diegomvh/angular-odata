# Resources

A resource describes a URL of the OData service: its path segments and its query options.
You build resources with `ODataClient` (or with a [service](services.html)) and then call
methods that send requests. Every request method returns an `Observable`.

The examples in this chapter use the
[TripPin](https://services.odata.org/V4/TripPinServiceRW/) sample service, as the
[demo application](https://github.com/diegomvh/AngularODataEntity) does.

## Entity sets

```typescript
import { firstValueFrom } from 'rxjs';

const airports = client.entitySet<Airport>('Airports');

// GET Airports
const { entities } = await firstValueFrom(airports.fetch());

// GET Airports?$count=true
const { annots } = await firstValueFrom(airports.fetch({ withCount: true }));
console.log(annots.count);

// GET Airports/$count
const count = await firstValueFrom(airports.count().fetch());

// GET Airports?$top=1
const { entity: first } = await firstValueFrom(airports.fetchOne());

// Fetch pages until there are at least 4 airports
const { entities: four } = await firstValueFrom(airports.fetchMany(4));

// Follow every next link and return all the airports
const { entities: all } = await firstValueFrom(airports.fetchAll());
```

`fetch()` emits `{ entities, annots }`. `annots` holds the annotations of the response:
`count`, `skip` and `skiptoken` (from the next link), `etag`, and so on.

## Changing and copying resources

`query()` changes the resource it is called on. Call `clone()` first to keep the original:

```typescript
const unitedStates = airports
  .clone()
  .query((q) => q.filter(({ e, t }) => e().eq(t.Location.City.CountryRegion, 'United States')));

airports.query((q) => q.filter(({ e, t }) => e().eq(t.Location.City.Region, 'California')));
airports.query((q) => q.filter().clear());
```

## Entities

Pass the key to `entity()`. Use an object for compound keys, or to name the key property:

```typescript
const cyyz = client.entitySet<Airport>('Airports').entity('CYYZ');
const russell = client.entitySet<Person>('People').entity({ UserName: 'russellwhyte' });

cyyz.fetch().subscribe(({ entity, annots }) => console.log(entity, annots.etag));
cyyz.fetchEntity().subscribe((airport) => {});

russell.update(person); // PUT
russell.modify({ FirstName: 'Russell' }); // PATCH
russell.destroy(); // DELETE
```

Send the entity ETag with the `etag` option to use optimistic concurrency:
`russell.modify(changes, { etag: annots.etag })`.

## Navigation properties and properties

```typescript
const trips = russell.navigationProperty<Trip>('Trips');
trips.fetch().subscribe(({ entities }) => {});
trips
  .entity(0)
  .fetch()
  .subscribe(({ entity }) => {});

// $ref
russell.navigationProperty<Person>('Friends').reference();

// Single property value
russell
  .property<string>('FirstName')
  .fetchProperty()
  .subscribe((value) => {});
```

## Media

Media entities, such as TripPin photos, expose their content with `media()`:

```typescript
client
  .entitySet<Photo>('Photos')
  .entity(person.Photo)
  .media()
  .fetchBlob()
  .subscribe((blob) => (image.src = URL.createObjectURL(blob)));
```

## Functions and actions

Unbound callables are built from the client. Bound callables are built from the resource
they are bound to.

```typescript
// Unbound function
client
  .function<{ lat: number; lon: number }, Airport>('GetNearestAirport')
  .callEntity({ lat: 33, lon: -118 })
  .subscribe((airport) => {});

// Function bound to an entity
russell
  .function<{ userName: string }, Trip[]>(
    'Microsoft.OData.SampleService.Models.TripPin.GetFriendsTrips',
  )
  .callEntities({ userName: 'ronaldmundy' })
  .subscribe((trips) => {});

// Unbound action
client.action<null, null>('ResetDataSource').call(null).subscribe();
```

The `call*` helpers choose how the response is read: `callProperty`, `callEntity`,
`callEntities`, `callModel`, `callCollection`, `callArraybuffer` and `callBlob`. Generated
services include typed methods for every callable. See [Code generation](code-generation.html).

## Singletons

```typescript
client
  .singleton<Person>('Me')
  .fetch()
  .subscribe(({ entity }) => {});
```

## Batch requests

`batch().exec()` collects every request created inside its callback and sends them all in a
single `$batch` request. Each inner observable still emits its own response.

```typescript
import { combineLatest } from 'rxjs';

const people = client.entitySet<Person>('People');
client
  .batch()
  .exec(() =>
    combineLatest({
      russell: people.entity('russellwhyte').fetch(),
      scott: people.entity('scottketchum').fetch(),
    }),
  )
  .subscribe(([result$, response]) => result$.subscribe(({ russell, scott }) => {}));
```

## Several APIs

When you register several APIs, use `apiFor()` to build resources for one of them:

```typescript
const northwind = client.apiFor('Northwind');
const orders = await firstValueFrom(northwind.entitySet<Order>('Orders').fetchEntities());
```

## Saving and restoring resources

A resource can be converted to JSON, for example to keep the current query of a page, and
rebuilt later:

```typescript
const json = airports.toJson();
const restored = client.fromJson(json) as ODataEntitySetResource<Airport>;
restored.fetch().subscribe(({ entities }) => {});
```

## Metadata

```typescript
// GET $metadata, parsed into an ODataMetadata object
client
  .metadata()
  .fetch()
  .subscribe((metadata) => console.log(metadata.toConfig()));
```

## Low-level HTTP

`ODataClient` also has `get`, `post`, `put`, `patch`, `delete` and `request` methods that
take a resource or a URL, for cases the resource API does not cover.

## Query options

Every resource has a `query()` method that edits its query options. See
[Query builder](query-builder.html).

```typescript
airports.query((q) => q.top(5));
console.log(airports.toString()); // Airports?$top=5
```
