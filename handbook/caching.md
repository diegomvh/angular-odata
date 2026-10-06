# Caching

Responses are cached only when the API configuration has a `cache`. Each request then
follows a **fetch policy**.

## Caches

| Class                 | Storage                                                            |
| --------------------- | ------------------------------------------------------------------ |
| `ODataInMemoryCache`  | A `Map` in memory. Lost when the page reloads.                     |
| `ODataInStorageCache` | `sessionStorage` (default) or `localStorage`. Requires a `prefix`. |
| `ODataIndexedDBCache` | An IndexedDB database.                                             |

All caches take a finite, non-negative `maxAge` in seconds. The default is 60.
An entry expires exactly at its deadline; `maxAge: 0` makes it immediately stale.
Expired entries are removed during cache activity, and `size()` counts unexpired entries.

Configure a cache for each API. A shared built-in cache partitions responses by service
root and API name. The demo application keeps Northwind in memory and TripPin in IndexedDB:

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

Web Storage persists JSON and text responses. Blob and ArrayBuffer responses remain in
that cache instance's memory rather than being converted to lossy JSON, so they do not
survive a reload. IndexedDB supports persistent binary responses.

### Persistent-cache readiness and errors

IndexedDB loads existing entries asynchronously. Cache-reading fetch policies wait for
this automatically. For direct cache access, await readiness first:

```typescript
const cache = new ODataIndexedDBCache({ name: 'TripPinCache' });
await cache.ready();
console.log(cache.size());
```

`put()`, `get()`, `forget()`, `flush()`, and `size()` remain synchronous. Local writes are
visible immediately, including before IndexedDB finishes loading. Startup writes,
invalidations, and flushes are applied in order, without resurrecting older entries.
`ready()` also waits for queued persistence work to settle; it is not a durability
guarantee when the cache has fallen back to memory.

Cache errors are not logged by default. Synchronous cache operations throw; asynchronous
IndexedDB failures reject `ready()`. During an API request, these failures use the
observable error channel and the API's optional `errorHandler`, like other request errors.
Responses are not delayed by persistence: an asynchronous persistence failure surfaces
on the next request that uses the cache.

Both persistent caches accept `onError: (error: Error) => void` to opt into recovery.
If supplied, this callback handles storage access, quota, and database errors while the
instance continues in memory-only mode. Without `onError`, failures propagate rather than
silently falling back. After a fallback, `flush()` and `forget()` still remove persisted
entries.

Malformed persisted entries are discarded and treated as cache misses. They are reported
to `onError` when supplied.

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
The stored lifetime uses the request's `maxAge`, then the response's `max-age`, then the
cache default. A cache hit does not renew the lifetime.

Cache decisions are made when the observable is subscribed to, not when it is created.
`network-only` does not read the cache, but replaces an existing entry with the fresh
response. `no-cache` does not access the cache at all. Event/progress requests pass through
their HTTP events; only successful final responses are stored.

Unsubscribing from `cache-and-network` after the cached emission can cancel the network
refresh. In particular, `firstValueFrom()` returns the first emission and unsubscribes;
use a subscription or `lastValueFrom()` when the refresh must complete.

By default, server cache restrictions take precedence over a requested lifetime. Responses with
`Cache-Control: no-store` are not cached. Server `no-cache` requires validation; because
the client does not implement conditional cache revalidation, it fetches again instead
of reusing those responses. A restrictive refresh also removes the older reusable entry.

Set `options.ignoreCacheControl: true` in the API configuration, or
`fetch({ ignoreCacheControl: true })` for a request, to ignore response Cache-Control
directives, including `no-store`, `no-cache`, and `max-age`. The default is `false`; an
explicit per-request `false` overrides a global `true`. With this opt-in, lifetime comes
from the request's `maxAge` or the cache default. Fetch policies and `Vary` restrictions
still apply. Only enable this when your application can safely disregard the server's
caching requirements.

### Response identity and isolation

Response keys include the API partition, resource path and query, transport response
type, credentials mode, `ignoreCacheControl`, and the `Accept`, `Accept-Language`, and
`Prefer` request headers.
Keys use `|`-delimited components, escaping literal `%` and `|` within each component.
Header values retain their JSON array representation to distinguish multiple values
from a single value containing commas.
Moving query parameters into a POST `$query` body preserves the logical GET identity.
Responses whose `Vary` includes other headers or `*` are not reused.

The response-key format is versioned. Returned response bodies are detached snapshots
and use the current request's resource/parser.

This is not automatic authentication isolation. Use separate cache instances and
persistent namespaces, or clear the cache when the signed-in user or tenant changes.
Authorization/cookie values are not placed in response keys, and headers added only
by HTTP interceptors are not visible when the OData request key is built.

## Invalidation

Successful requests that change data (`POST`, `PUT`, `PATCH`, `DELETE`) invalidate the
matching entity set by default, including its cached lists, entities, and child paths.
Singleton writes invalidate that singleton. Other sets, API partitions, and manually
stored payloads are retained. Operations with no identifiable set or singleton, such as
unbound actions, fall back to invalidating the API's responses.

**Expanded and navigation responses rooted in other entity sets may remain stale.**
Clear them manually, or configure `options.cacheInvalidation: 'api'` to invalidate all
response entries for that API after a successful write.

`cacheInvalidation` accepts `'entity-set'` (the default) or `'api'` globally and per
request. A request overrides the API setting, so a write with broader side effects can
use `{ cacheInvalidation: 'api' }`, while an isolated write can explicitly use
`{ cacheInvalidation: 'entity-set' }`. Related-resource lists are not inferred or supported.

Creating an observable without subscribing, or receiving an unsuccessful mutation,
does not invalidate entries. GET requests started before a successful mutation may
still deliver their results to their subscribers, but cannot refill the invalidated
cache with those older results.

Batch requests are collected synchronously by `add()`. Their cache policies are evaluated
when `send()` is subscribed to; cache hits are omitted from the network subrequest list.
Successful mutating subresponses invalidate the cache even when no consumer subscribes
to an individual inner response. An outer batch HTTP success alone does not invalidate
entries if all mutations failed.
All returned subresponses are dispatched before a synchronous cache-processing error
terminates the batch.

Cache readiness failures and synchronous cache errors terminate the outer batch through
its error channel and optional API `errorHandler`, even without inner subscribers.
Readiness failure terminates all collected inner requests as well. Unsuccessful HTTP
subresponses and `cache-only` misses remain individual request errors.

To clear an entire cache instance, including manually stored payloads, call `flush()`.
`forget({ name, scope, tags })` matches an exact name within its scope, a scope and its
descendants, or any matching tag. Scope matching respects segment boundaries and does
not modify the supplied arrays. `forget({})` removes expired entries.

Custom synchronous caches remain supported. They may optionally implement `ready()`.
Custom response scopes should start with `request.cacheScope` to participate in API-wide
invalidation; other custom scope conventions use scoped invalidation.
