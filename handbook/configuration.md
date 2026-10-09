# Configuration

Each API is described by an `ODataApiConfig` object.

## `ODataApiConfig`

| Property                | Description                                                                      |
| ----------------------- | -------------------------------------------------------------------------------- |
| `serviceRootUrl`        | Root URL of the OData service. Required.                                         |
| `metadataUrl`           | URL of the `$metadata` document. Defaults to `serviceRootUrl` + `$metadata`.     |
| `name`                  | Name of the API, needed when you register several APIs.                          |
| `default`               | Marks the API used when no name is given.                                        |
| `version`               | OData version: `'4.0'` (default), `'3.0'` or `'2.0'`.                            |
| `cache`                 | An `ODataCache` instance. See [Caching](caching.html).                           |
| `errorHandler`          | `(error, caught) => Observable<never>` called when a request fails.              |
| `options`               | Request and parsing options, described below.                                    |
| `parsers`               | Custom parsers keyed by EDM type name.                                           |
| `populateFromMetadata`  | Fetch `$metadata` at startup and build the schemas from it. Defaults to `false`. |
| `schemas`               | Static schema declarations (enums, entities, callables and containers).          |
| `references`            | Referenced schemas (`edmx:Reference`).                                           |
| `models`, `collections` | Model and collection classes keyed by type name.                                 |

## `options`

| Option                                    | Description                                                                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `params`, `headers`                       | Default query parameters and headers for every request.                                                                                |
| `withCredentials`                         | Send credentials with cross-site requests.                                                                                             |
| `accept`                                  | Values for the `Accept` header: `metadata` (`'minimal'`, `'full'`, `'none'`), `ieee754Compatible`, `exponentialDecimals`, `streaming`. |
| `etag`                                    | Send `If-Match` (`ifMatch`) and `If-None-Match` (`ifNoneMatch`) headers.                                                               |
| `prefer`                                  | Values for the `Prefer` header: `maxPageSize`, `return` (`'representation'` or `'minimal'`), `continueOnError`, `includeAnnotations`.  |
| `stripMetadata`                           | Remove annotations from responses down to the given metadata level.                                                                    |
| `fetchPolicy`                             | Default fetch policy. Defaults to `'network-only'`. See [Caching](caching.html).                                                       |
| `ignoreCacheControl`                      | Ignore response Cache-Control directives. Defaults to `false`; overridable per request.                                                |
| `cacheInvalidation`                       | Successful-write invalidation: `'entity-set'` (default) or `'api'`. Overridable per request. Related expanded/navigation responses may need manual clearing. |
| `bodyQueryOptions`                        | Query options sent in the request body (`GET /$query`) instead of the URL.                                                             |
| `stringAsEnum`                            | Serialize enum values as plain strings.                                                                                                |
| `deleteRefBy`                             | Delete references by `'path'` or by `'id'`.                                                                                            |
| `nonParenthesisForEmptyParameterFunction` | Call functions with no parameters without `()`.                                                                                        |
| `jsonBatchFormat`                         | Send `$batch` requests in JSON format.                                                                                                 |
| `relativeUrls`                            | Use relative URLs inside `$batch` requests.                                                                                            |

## Example

Generated configurations can be extended with your own settings. The demo application
combines three APIs:

```typescript
provideODataClient({
  config: [
    // Schemas loaded from $metadata at startup
    {
      name: 'MicrosoftGraph',
      serviceRootUrl: 'https://graph.microsoft.com/v1.0/',
      populateFromMetadata: true,
      options: { stringAsEnum: true },
    },
    // Generated configuration, with a cache and decimals sent as strings
    {
      ...NorthwindConfig,
      cache: new ODataInMemoryCache({ maxAge: 60 }),
      options: { accept: { ieee754Compatible: true } },
    },
    // Generated configuration, used when no API name is given
    {
      ...TripPinConfig,
      default: true,
      options: {
        stringAsEnum: true,
        stripMetadata: 'minimal',
        accept: { metadata: 'minimal' },
        prefer: { return: 'representation' },
      },
    },
  ],
});
```

## Loaders

A loader provides the API configurations and the function that sends requests. By default
the client uses `ODataSyncLoader` with the `config` you pass and `HttpClient`. To load the
configuration in another way, pass your own `ODataLoader` provider as `loader`:

| Loader                | Use                                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ODataSyncLoader`     | Configurations known at build time (the default).                                                                                        |
| `ODataAsyncLoader`    | Configurations that come from one or more observables, for example a remote JSON file.                                                   |
| `ODataMetadataLoader` | Configurations built from `$metadata` documents, for example the `metadata.json` produced by the [code generator](code-generation.html). |

This loader, from the demo application, downloads the TripPin `$metadata` at startup,
builds a configuration from it, and adds the static configurations passed in `config`:

```typescript
import { HttpClient } from '@angular/common/http';
import {
  ODATA_CONFIG,
  ODataApiConfig,
  ODataAsyncLoader,
  ODataLoader,
  ODataMetadataParser,
  ODataRequest,
  provideODataClient,
} from 'angular-odata';
import { map } from 'rxjs';

export function createMixedLoader(
  staticConfigs: ODataApiConfig | ODataApiConfig[],
  http: HttpClient,
) {
  const serviceRootUrl = 'https://services.odata.org/V4/TripPinServiceRW';
  const configs$ = http
    .get(`${serviceRootUrl}/$metadata`, { responseType: 'text' })
    .pipe(
      map((xml) => [
        new ODataMetadataParser(xml).metadata().toConfig({ serviceRootUrl, name: 'TripPinAsync' }),
        ...(Array.isArray(staticConfigs) ? staticConfigs : [staticConfigs]),
      ]),
    );
  return new ODataAsyncLoader(configs$, (req: ODataRequest<any>) =>
    http.request(req.method, `${req.url}`, {
      body: req.body,
      context: req.context,
      headers: req.headers,
      observe: req.observe,
      params: req.params,
      reportProgress: req.reportProgress,
      responseType: req.responseType,
      withCredentials: req.withCredentials,
    }),
  );
}

provideODataClient({
  config: [NorthwindConfig, TripPinConfig],
  loader: { provide: ODataLoader, useFactory: createMixedLoader, deps: [ODATA_CONFIG, HttpClient] },
});
```

To build the configurations only from `$metadata` documents, use `ODataMetadataLoader`,
which takes an observable of the XML documents, the base configurations and the request
function.

When you pass a `loader`, the client does not call `provideHttpClient()`, so register it
yourself.
