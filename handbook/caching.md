# Caching

Responses are cached only when the API configuration has a `cache`. Each request then
follows a **fetch policy**.

## Caches

| Class                 | Storage                                                            |
| --------------------- | ------------------------------------------------------------------ |
| `ODataInMemoryCache`  | A `Map` in memory. Lost when the page reloads.                     |
| `ODataInStorageCache` | `sessionStorage` (default) or `localStorage`. Requires a `prefix`. |
| `ODataIndexedDBCache` | An IndexedDB database.                                             |

All caches take a `maxAge` in seconds. The default is 60.

Each API has its own cache. The demo application keeps Northwind in memory and TripPin in
IndexedDB:

```typescript
import { ODataIndexedDBCache, ODataInMemoryCache } from 'angular-odata';

provideODataClient({
  config: [
    { ...NorthwindConfig, cache: new ODataInMemoryCache({ maxAge: 60 }) },
    {
      ...TripPinConfig,
      default: true,
      cache: new ODataIndexedDBCache({ name: 'TripPinCache', version: 1, maxAge: 60 }),
    },
  ],
});
```

`ODataInStorageCache` takes a `prefix` and a `storage`:
`new ODataInStorageCache({ prefix: 'odata', storage: localStorage, maxAge: 300 })`.

## Fetch policies

| Policy              | Behavior                                                                       |
| ------------------- | ------------------------------------------------------------------------------ |
| `network-only`      | Always request the server and store the response. This is the default.         |
| `cache-first`       | Return the cached response when there is one; otherwise request the server.    |
| `cache-and-network` | Return the cached response, then request the server and emit its response too. |
| `cache-only`        | Return the cached response; fail when there is none.                           |
| `no-cache`          | Always request the server and do not store the response.                       |

Set the policy for an API in `options.fetchPolicy`, or for one request. This sequence, from
the demo application, shows how each policy behaves:

```typescript
const airports = client.entitySet<Airport>('Airports');
const cache = client.apiFor('TripPin').cache!;
cache.flush();

// Requests the server and stores the response
await firstValueFrom(airports.entity('CYYZ').fetch({ fetchPolicy: 'network-only' }));

// Reads the stored response; no request is sent
await firstValueFrom(airports.entity('CYYZ').fetch({ fetchPolicy: 'cache-only' }));

cache.flush();
// Fails, because the cache is empty
await firstValueFrom(airports.entity('CYYZ').fetch({ fetchPolicy: 'cache-only' }));

// Requests the server, because the cache is empty, and stores the response
await firstValueFrom(airports.entity('CYYZ').fetch({ fetchPolicy: 'cache-first' }));

cache.flush();
// Requests the server and does not store the response
await firstValueFrom(airports.entity('CYYZ').fetch({ fetchPolicy: 'no-cache' }));
console.log(cache.size()); // 0
```

`cache-and-network` is useful for lists: the user sees the stored rows at once, and the
fresh rows replace them when the server answers. The observable emits once or twice:

```typescript
people
  .fetch({ withCount: true, fetchPolicy: 'cache-and-network' })
  .subscribe(({ entities, annots }) => this.rows.set(entities ?? []));
```

`maxAge` can also be set per request: `fetch({ fetchPolicy: 'cache-first', maxAge: 30 })`.

## Invalidation

Requests that change data (`POST`, `PUT`, `PATCH`, `DELETE`) remove the cached entries of
the affected resources. To clear the cache yourself, call `flush()` on the cache instance,
or `forget()` with a `name`, `scope` or `tags`.
