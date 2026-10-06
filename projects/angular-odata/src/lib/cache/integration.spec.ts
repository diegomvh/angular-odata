import { HttpEventType, HttpHeaderResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defer, firstValueFrom, lastValueFrom, of, Subject, throwError, toArray } from 'rxjs';

import { ODataApi } from '../api';
import { ODataPathSegments } from '../resources/path/segments';
import { ODataRequest } from '../resources/request';
import { ODataResource } from '../resources/resource';
import { ODataBatchResource } from '../resources/types/batch';
import type { ODataOptions } from '../resources/types/options';
import { PathSegment, QueryOption } from '../types';
import type { ODataCache } from '../types';

import { ODataInMemoryCache } from './memory';
import { ODataInStorageCache } from './storage';

function fixture(
  cache: ODataCache = new ODataInMemoryCache(),
  serviceRootUrl = 'https://example.test/odata/',
) {
  const api = new ODataApi({ serviceRootUrl, cache });
  const resource = new ODataResource(api, {
    segments: new ODataPathSegments([{ name: PathSegment.entitySet, path: 'People' }]),
  });
  const get = (
    options: ODataOptions & {
      responseType?: 'json' | 'text' | 'entity';
      observe?: 'body' | 'events' | 'response';
      bodyQueryOptions?: QueryOption[];
    } = {},
  ) => api.request('GET', resource, { responseType: 'json', ...options });
  return { api, resource, cache, get };
}

describe('ODataApi caching', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each(['network-only', 'cache-and-network'] as const)(
    'should replace an existing response during a %s refresh',
    async (fetchPolicy) => {
      const { api, get } = fixture();
      let body = 'old';
      api.requester = () => defer(() => of(new HttpResponse({ body })));
      await firstValueFrom(get());
      body = 'new';
      const values = await firstValueFrom(get({ fetchPolicy }).pipe(toArray()));
      expect(values).toEqual(fetchPolicy === 'network-only' ? ['new'] : ['old', 'new']);
      expect(await firstValueFrom(get({ fetchPolicy: 'cache-only' }))).toBe('new');
    },
  );

  it.each(['cache-first', 'cache-only'] as const)(
    'should reuse a %s hit without a request or a TTL reset',
    async (fetchPolicy) => {
      vi.useFakeTimers();
      const cache = new ODataInMemoryCache({ maxAge: 1 });
      const { api, get } = fixture(cache);
      api.requester = vi.fn(() => of(new HttpResponse({ body: 'cached' })));
      await firstValueFrom(get());
      vi.advanceTimersByTime(999);
      expect(await firstValueFrom(get({ fetchPolicy }))).toBe('cached');
      expect(api.requester).toHaveBeenCalledOnce();
      vi.advanceTimersByTime(1);
      await expect(firstValueFrom(get({ fetchPolicy: 'cache-only' }))).rejects.toThrow('No Cached');
    },
  );

  it.each(['cache-first', 'cache-and-network', 'network-only'] as const)(
    'should store the network response on a %s miss',
    async (fetchPolicy) => {
      const { api, get } = fixture();
      api.requester = () => of(new HttpResponse({ body: 'new' }));
      expect(await firstValueFrom(get({ fetchPolicy }))).toBe('new');
      expect(await firstValueFrom(get({ fetchPolicy: 'cache-only' }))).toBe('new');
    },
  );

  it('should forward HTTP events and cache only the final response', async () => {
    const { api, cache, get } = fixture();
    const put = vi.spyOn(cache, 'putResponse');
    api.requester = () =>
      of(
        { type: HttpEventType.Sent },
        new HttpHeaderResponse(),
        { type: HttpEventType.DownloadProgress, loaded: 1, total: 2 },
        new HttpResponse({ body: 'final' }),
      );
    const events = await firstValueFrom(get({ observe: 'events' }).pipe(toArray()));
    expect(events.map((event) => event.type)).toEqual([
      HttpEventType.Sent,
      HttpEventType.ResponseHeader,
      HttpEventType.DownloadProgress,
      HttpEventType.Response,
    ]);
    expect(put).toHaveBeenCalledOnce();
    expect(await firstValueFrom(get({ fetchPolicy: 'cache-only' }))).toBe('final');
  });

  it.each(['no-cache', 'network-only'] as const)(
    'should not read the cache for %s',
    async (fetchPolicy) => {
      const { api, cache, get } = fixture();
      const read = vi.spyOn(cache, 'getResponse').mockImplementation(() => {
        throw new Error('Cache reads unavailable');
      });
      const put = vi.spyOn(cache, 'putResponse');
      api.requester = () => of(new HttpResponse({ body: 'network' }));
      expect(await firstValueFrom(get({ fetchPolicy }))).toBe('network');
      expect(read).not.toHaveBeenCalled();
      expect(put).toHaveBeenCalledTimes(fetchPolicy === 'no-cache' ? 0 : 1);
    },
  );

  it('should evaluate a prepared cache-only request when subscribed', async () => {
    const { api, get } = fixture();
    const prepared = get({ fetchPolicy: 'cache-only' });
    api.requester = () => of(new HttpResponse({ body: 'stored' }));
    await firstValueFrom(get());
    expect(await firstValueFrom(prepared)).toBe('stored');
  });

  it('should not retain a captured cache hit across a flush', async () => {
    const { api, cache, get } = fixture();
    let body = 'old';
    api.requester = () => defer(() => of(new HttpResponse({ body })));
    await firstValueFrom(get());
    const prepared = get({ fetchPolicy: 'cache-first' });
    cache.flush();
    body = 'new';
    expect(await firstValueFrom(prepared)).toBe('new');
  });

  it('should reevaluate the cache on every subscription', async () => {
    const { api, cache, get } = fixture();
    let body = 'one';
    api.requester = () => defer(() => of(new HttpResponse({ body })));
    const prepared = get({ fetchPolicy: 'cache-first' });
    expect(await firstValueFrom(prepared)).toBe('one');
    cache.flush();
    body = 'two';
    expect(await firstValueFrom(prepared)).toBe('two');
  });

  it('should cancel a cache-and-network refresh when unsubscribed after the cached result', async () => {
    const { api, get } = fixture();
    api.requester = vi.fn(() => of(new HttpResponse({ body: 'cached' })));
    await firstValueFrom(get());
    await firstValueFrom(get({ fetchPolicy: 'cache-and-network' }));
    expect(api.requester).toHaveBeenCalledOnce();
  });

  it('should preserve an existing entry when a refresh fails', async () => {
    const { api, get } = fixture();
    api.requester = () => of(new HttpResponse({ body: 'cached' }));
    await firstValueFrom(get());
    api.requester = () => throwError(() => new Error('offline'));
    await expect(lastValueFrom(get({ fetchPolicy: 'cache-and-network' }))).rejects.toThrow(
      'offline',
    );
    expect(await firstValueFrom(get({ fetchPolicy: 'cache-only' }))).toBe('cached');
  });

  it('should route cache lookup errors through the API error handler', async () => {
    const { api, cache, get } = fixture();
    vi.spyOn(cache, 'getResponse').mockImplementation(() => {
      throw new Error('cache read');
    });
    api.errorHandler = vi.fn(() => throwError(() => new Error('handled')));
    const prepared = get({ fetchPolicy: 'cache-only' });
    expect(api.errorHandler).not.toHaveBeenCalled();
    await expect(firstValueFrom(prepared)).rejects.toThrow('handled');
    expect(api.errorHandler).toHaveBeenCalledOnce();
  });

  it('should wait for optional readiness only for cache-dependent policies', async () => {
    let resolveReady!: () => void;
    const pending = new Promise<void>((resolve) => (resolveReady = resolve));
    const cache = Object.assign(new ODataInMemoryCache(), { ready: vi.fn(() => pending) });
    const { api, get } = fixture(cache);
    api.requester = vi.fn(() => of(new HttpResponse({ body: 'ready' })));
    const result = firstValueFrom(get({ fetchPolicy: 'cache-first' }));
    expect(api.requester).not.toHaveBeenCalled();
    expect(cache.ready).toHaveBeenCalledOnce();
    await firstValueFrom(get({ fetchPolicy: 'no-cache' }));
    const networkOnly = firstValueFrom(get({ fetchPolicy: 'network-only' }));
    expect(api.requester).toHaveBeenCalledTimes(2);
    resolveReady();
    await networkOnly;
    expect(await result).toBe('ready');
  });

  it('should not wait for persistence before delivering network responses', async () => {
    const cache = Object.assign(new ODataInMemoryCache(), {
      ready: vi.fn(() => new Promise<void>(() => {})),
    });
    const { api, resource, get } = fixture(cache);
    api.requester = () => of(new HttpResponse({ body: 'network' }));
    expect(await firstValueFrom(get({ fetchPolicy: 'network-only' }))).toBe('network');
    expect(await firstValueFrom(api.request('PATCH', resource, { body: {} }))).toBe('network');
    expect(cache.ready).not.toHaveBeenCalled();
  });

  it('should preserve network behavior when no cache is configured', async () => {
    const { api, get } = fixture();
    api.cache = undefined;
    api.requester = vi.fn(() => of(new HttpResponse({ body: 'network' })));
    expect(await firstValueFrom(get({ fetchPolicy: 'cache-only' }))).toBe('network');
  });

  it.each(['no-store', 'public, no-store', 'no-cache', 'private, no-cache'] as const)(
    'should remove an old reusable entry when a refresh returns %s',
    async (directive) => {
      const { api, cache, get } = fixture();
      api.requester = () => of(new HttpResponse({ body: 'old' }));
      await firstValueFrom(get());
      api.requester = () =>
        of(
          new HttpResponse({
            body: 'new',
            headers: new HttpHeaders({ 'Cache-Control': directive }),
          }),
        );
      expect(await firstValueFrom(get())).toBe('new');
      expect(cache.size()).toBe(0);
      await expect(firstValueFrom(get({ fetchPolicy: 'cache-only' }))).rejects.toThrow('No Cached');
    },
  );

  it.each(['*', 'Authorization', 'X-Custom-Representation'])(
    'should not reuse responses with an unsupported Vary: %s',
    async (vary) => {
      const { api, cache, get } = fixture();
      api.requester = () =>
        of(new HttpResponse({ body: 'new', headers: new HttpHeaders({ Vary: vary }) }));
      await firstValueFrom(get());
      expect(cache.size()).toBe(0);
    },
  );

  it('should preserve request TTL precedence and exact expiration', async () => {
    vi.useFakeTimers();
    const { api, get } = fixture();
    api.requester = () =>
      of(
        new HttpResponse({
          body: 'fresh',
          headers: new HttpHeaders({ 'Cache-Control': 'max-age=1' }),
        }),
      );
    await firstValueFrom(get({ maxAge: 2 }));
    vi.advanceTimersByTime(1999);
    expect(await firstValueFrom(get({ fetchPolicy: 'cache-only' }))).toBe('fresh');
    vi.advanceTimersByTime(1);
    await expect(firstValueFrom(get({ fetchPolicy: 'cache-only' }))).rejects.toThrow('No Cached');
  });

  describe('cache configuration overrides', () => {
    it.each(['memory', 'storage'])(
      'should ignore all Cache-Control directives only when enabled with %s',
      async (backend) => {
        vi.useFakeTimers();
        const cache =
          backend === 'memory'
            ? new ODataInMemoryCache({ maxAge: 10 })
            : new ODataInStorageCache({ prefix: 'ignore-control-test', maxAge: 10 });
        cache.flush();
        const { api, get } = fixture(cache);
        expect(api.options.ignoreCacheControl).toBe(false);
        api.requester = () =>
          of(
            new HttpResponse({
              body: 'stored',
              headers: new HttpHeaders({ 'Cache-Control': 'no-store, no-cache, max-age=0' }),
            }),
          );
        await firstValueFrom(get());
        expect(cache.size()).toBe(0);
        api.options.ignoreCacheControl = true;
        await firstValueFrom(get());
        vi.advanceTimersByTime(1000);
        expect(await firstValueFrom(get({ fetchPolicy: 'cache-only' }))).toBe('stored');
        await expect(
          firstValueFrom(
            get({
              ignoreCacheControl: false,
              fetchPolicy: 'cache-only',
            }),
          ),
        ).rejects.toThrow('No Cached');
        api.options.ignoreCacheControl = false;
        expect(
          await firstValueFrom(
            get({
              ignoreCacheControl: true,
              fetchPolicy: 'cache-only',
            }),
          ),
        ).toBe('stored');
        await firstValueFrom(get({ ignoreCacheControl: true, maxAge: 0 }));
        await expect(
          firstValueFrom(
            get({
              ignoreCacheControl: true,
              fetchPolicy: 'cache-only',
            }),
          ),
        ).rejects.toThrow('No Cached');
        cache.flush();
      },
    );

    it('should still enforce Vary and no-cache fetch policy when ignoring Cache-Control', async () => {
      const { api, cache, get } = fixture();
      api.options.ignoreCacheControl = true;
      api.requester = () =>
        of(
          new HttpResponse({
            body: 1,
            headers: new HttpHeaders({ Vary: '*' }),
          }),
        );
      await firstValueFrom(get());
      expect(cache.size()).toBe(0);
      api.requester = () => of(new HttpResponse({ body: 1 }));
      await firstValueFrom(get({ fetchPolicy: 'no-cache' }));
      expect(cache.size()).toBe(0);
    });

    it.each([
      ['entity-set', undefined, true],
      ['api', 'entity-set', true],
      ['entity-set', 'api', false],
      ['api', undefined, false],
    ] as const)(
      'should use global %s and request %s invalidation',
      async (global, override, retained) => {
        const { api, resource, get } = fixture();
        expect(api.options.cacheInvalidation).toBe('entity-set');
        api.options.cacheInvalidation = global;
        const unrelated = new ODataResource(api, {
          segments: new ODataPathSegments([{ name: PathSegment.entitySet, path: 'Trips' }]),
        });
        api.requester = () => of(new HttpResponse({ body: 'cached' }));
        await firstValueFrom(get());
        await firstValueFrom(api.request('GET', unrelated, {}));
        await firstValueFrom(
          api.request('PATCH', resource, {
            body: {},
            cacheInvalidation: override,
          }),
        );
        await expect(firstValueFrom(get({ fetchPolicy: 'cache-only' }))).rejects.toThrow(
          'No Cached',
        );
        const result = firstValueFrom(api.request('GET', unrelated, { fetchPolicy: 'cache-only' }));
        if (retained) expect(await result).toBe('cached');
        else await expect(result).rejects.toThrow('No Cached');
      },
    );
  });

  describe('response identity', () => {
    it('should build a readable delimited response key', () => {
      const { api, resource } = fixture();
      const req = ODataRequest.factory(api, 'GET', resource, { observe: 'response' });
      expect(req.cacheKey).toBe(
        'v2|https://example.test/odata/|null|People||json|false|false|null|null|null',
      );
    });

    it('should distinguish delimiters, escapes, and multiple header values', () => {
      const { api, resource } = fixture();
      const values = ['en|de', 'en%7Cde', 'en%de', 'en%25de', 'en,de', ['en', 'de']];
      const keys = values.map(
        (value) =>
          ODataRequest.factory(api, 'GET', resource, {
            observe: 'response',
            headers: { 'Accept-Language': value },
          }).cacheKey,
      );
      expect(new Set(keys).size).toBe(values.length);
      expect(keys.every((key) => key.split('|').length === 11)).toBe(true);
      expect(keys[0]).toContain('["en%7Cde"]');
      expect(keys[1]).toContain('["en%257Cde"]');
    });

    it('should isolate API partitions in a shared cache', async () => {
      const cache = new ODataInMemoryCache();
      const first = fixture(cache, 'https://first.test/');
      const second = fixture(cache, 'https://second.test/');
      first.api.requester = () => of(new HttpResponse({ body: 'first' }));
      second.api.requester = () => of(new HttpResponse({ body: 'second' }));
      await firstValueFrom(first.get());
      expect(await firstValueFrom(second.get({ fetchPolicy: 'cache-first' }))).toBe('second');
    });

    it('should distinguish JSON and text responses', async () => {
      const { api, get } = fixture();
      api.requester = (req) =>
        of(new HttpResponse({ body: req.responseType === 'text' ? '{"value":1}' : { value: 1 } }));
      await firstValueFrom(get());
      expect(await firstValueFrom(get({ responseType: 'text', fetchPolicy: 'cache-first' }))).toBe(
        '{"value":1}',
      );
    });

    it.each(['Accept', 'Accept-Language', 'Prefer'])(
      'should distinguish representation changes in %s',
      async (header) => {
        const { api, get } = fixture();
        api.requester = (req) => of(new HttpResponse({ body: req.headers.get(header) }));
        await firstValueFrom(get({ headers: { [header]: 'one' } }));
        expect(
          await firstValueFrom(get({ headers: { [header]: 'two' }, fetchPolicy: 'cache-first' })),
        ).toBe('two');
      },
    );

    it('should use the current resource parser when a JSON response is reused', async () => {
      const { api, get } = fixture();
      api.requester = () => of(new HttpResponse({ body: { value: 1 } }));
      await firstValueFrom(get());
      const typed = new ODataResource(api, {
        segments: new ODataPathSegments([{ name: PathSegment.entitySet, path: 'People' }]),
      });
      vi.spyOn(typed, 'deserialize').mockReturnValue({ value: 1, parsed: true });
      const result = await firstValueFrom(
        api.request('GET', typed, { responseType: 'entity', fetchPolicy: 'cache-first' }),
      );
      expect(result.entity).toEqual({ value: 1, parsed: true });
    });

    it('should keep logical GET identity when query options move into the body', () => {
      const { api, resource } = fixture();
      const options = { observe: 'response' as const, params: { $filter: 'value eq 1' } };
      const get = ODataRequest.factory(api, 'GET', resource, options);
      const query = ODataRequest.factory(api, 'GET', resource, {
        ...options,
        bodyQueryOptions: [QueryOption.filter],
      });
      expect(query.method).toBe('POST');
      expect(query.isFetch()).toBe(true);
      expect(query.cacheKey).toBe(get.cacheKey);
    });

    it('should ignore old response keys while preserving manual payloads', async () => {
      const { api, cache, get } = fixture();
      cache.put('People', 'legacy', { scope: ['request', 'People'] });
      cache.put('manual', 1);
      api.requester = () => of(new HttpResponse({ body: 'network' }));
      expect(await firstValueFrom(get({ fetchPolicy: 'cache-first' }))).toBe('network');
      expect(cache.get('manual')).toBe(1);
    });
  });

  describe('mutations', () => {
    it.each([
      ['People'],
      ['request', 'People'],
      ['custom', 'request', 'People'],
      ['custom', 'deep', 'request', 'People'],
    ])('should reject stale fills with custom scope %j', async (...scope) => {
      const cache = new ODataInMemoryCache();
      vi.spyOn(cache, 'scope').mockReturnValue(scope);
      const { api, resource, get } = fixture(cache);
      const response = new Subject<HttpResponse<string>>();
      api.requester = (req) => (req.isMutate() ? of(new HttpResponse({ body: 'new' })) : response);
      const pending = firstValueFrom(get());
      await firstValueFrom(api.request('PATCH', resource, { body: {} }));
      response.next(new HttpResponse({ body: 'old' }));
      expect(await pending).toBe('old');
      await expect(firstValueFrom(get({ fetchPolicy: 'cache-only' }))).rejects.toThrow('No Cached');
    });

    it('should reject stale fills after another API instance sharing the cache writes', async () => {
      const cache = new ODataInMemoryCache();
      const reader = fixture(cache);
      const writer = fixture(cache);
      const response = new Subject<HttpResponse<string>>();
      reader.api.requester = () => response;
      writer.api.requester = () => of(new HttpResponse({ body: 'new' }));
      const pending = firstValueFrom(reader.get());
      await firstValueFrom(writer.api.request('PATCH', writer.resource, { body: {} }));
      response.next(new HttpResponse({ body: 'old' }));
      expect(await pending).toBe('old');
      await expect(firstValueFrom(reader.get({ fetchPolicy: 'cache-only' }))).rejects.toThrow(
        'No Cached',
      );
    });

    it('should not invalidate for an unsubscribed or failed mutation', async () => {
      const { api, resource, get } = fixture();
      api.requester = (req) =>
        req.isMutate()
          ? throwError(() => new Error('write failed'))
          : of(new HttpResponse({ body: 'old' }));
      await firstValueFrom(get());
      const mutation = api.request('PATCH', resource, { body: { value: 'new' } });
      expect(await firstValueFrom(get({ fetchPolicy: 'cache-only' }))).toBe('old');
      await expect(firstValueFrom(mutation)).rejects.toThrow('write failed');
      expect(await firstValueFrom(get({ fetchPolicy: 'cache-only' }))).toBe('old');
    });

    it('should invalidate all API responses but preserve another API and manual entries', async () => {
      const cache = new ODataInMemoryCache();
      const { api, resource, get } = fixture(cache);
      api.options.cacheInvalidation = 'api';
      const other = fixture(cache, 'https://other.test/');
      api.requester = other.api.requester = () => of(new HttpResponse({ body: 'old' }));
      const navigation = new ODataResource(api, {
        segments: new ODataPathSegments([
          { name: PathSegment.entitySet, path: 'Trips', key: 1 },
          { name: PathSegment.navigationProperty, path: 'Owner' },
        ]),
      });
      await firstValueFrom(get());
      await firstValueFrom(api.request('GET', navigation, { responseType: 'json' }));
      await firstValueFrom(other.get());
      cache.put('manual', 1);
      await firstValueFrom(api.request('PATCH', resource, { body: {} }));
      await expect(
        firstValueFrom(api.request('GET', navigation, { fetchPolicy: 'cache-only' })),
      ).rejects.toThrow('No Cached');
      await expect(firstValueFrom(get({ fetchPolicy: 'cache-only' }))).rejects.toThrow('No Cached');
      expect(await firstValueFrom(other.get({ fetchPolicy: 'cache-only' }))).toBe('old');
      expect(cache.get('manual')).toBe(1);
    });

    it.each([true, false])(
      'should reject stale GET fills when the GET completes before mutation success: %s',
      async (fetchFirst) => {
        const { api, resource, get } = fixture();
        const fetch = new Subject<HttpResponse<string>>();
        const mutation = new Subject<HttpResponse<string>>();
        api.requester = (req) => (req.isMutate() ? mutation : fetch);
        const pendingFetch = firstValueFrom(get());
        const pendingMutation = firstValueFrom(api.request('PATCH', resource, { body: {} }));
        if (fetchFirst) fetch.next(new HttpResponse({ body: 'old' }));
        mutation.next(new HttpResponse({ body: 'new' }));
        if (!fetchFirst) fetch.next(new HttpResponse({ body: 'old' }));
        await Promise.all([pendingFetch, pendingMutation]);
        await expect(firstValueFrom(get({ fetchPolicy: 'cache-only' }))).rejects.toThrow(
          'No Cached',
        );
      },
    );

    it('should retain an unrelated in-flight fill after targeted invalidation', async () => {
      const { api, resource } = fixture();
      const other = new ODataResource(api, {
        segments: new ODataPathSegments([{ name: PathSegment.entitySet, path: 'Trips' }]),
      });
      const response = new Subject<HttpResponse<string>>();
      api.requester = (req) =>
        req.isMutate() ? of(new HttpResponse({ body: 'updated' })) : response;
      const read = firstValueFrom(api.request('GET', other, {}));
      await firstValueFrom(api.request('PATCH', resource, { body: {} }));
      response.next(new HttpResponse({ body: 'unrelated' }));
      await read;
      expect(await firstValueFrom(api.request('GET', other, { fetchPolicy: 'cache-only' }))).toBe(
        'unrelated',
      );
    });
  });

  describe('batch integration', () => {
    it('should keep a cache-only miss local and still send the other requests', async () => {
      const { api, resource, get } = fixture();
      api.options.jsonBatchFormat = true;
      api.requester = vi.fn((req) =>
        of(
          new HttpResponse({
            body: {
              responses: req.body.requests.map((item: { id: string }) => ({
                id: item.id,
                status: 204,
              })),
            },
          }),
        ),
      );
      const batch = ODataBatchResource.factory(api);
      const miss = vi.fn();
      const patch = vi.fn();
      batch.add(() => {
        get({ fetchPolicy: 'cache-only' }).subscribe({ error: miss });
        api.request('PATCH', resource, { body: {} }).subscribe({ next: patch });
      });
      expect((await firstValueFrom(batch.send())).status).toBe(200);
      expect(miss).toHaveBeenCalledWith(expect.objectContaining({ message: 'No Cached' }));
      expect(patch).toHaveBeenCalledOnce();
      expect(api.requester).toHaveBeenCalledOnce();
    });

    it.each([true, false])(
      'should invalidate every successful mutation despite an earlier cache error (JSON: %s)',
      async (jsonBatchFormat) => {
        const { api, resource, get } = fixture();
        api.options.jsonBatchFormat = jsonBatchFormat;
        const trips = new ODataResource(api, {
          segments: new ODataPathSegments([{ name: PathSegment.entitySet, path: 'Trips' }]),
        });
        api.requester = () => of(new HttpResponse({ body: { value: 'old' } }));
        await firstValueFrom(get());
        await firstValueFrom(api.request('GET', trips, {}));
        const batch = ODataBatchResource.factory(api);
        batch.add(() => {
          get({ maxAge: -1 });
          api.request('PATCH', resource, { body: {} });
          api.request('PATCH', trips, { body: {} });
        });
        api.requester = (req) =>
          of(
            jsonBatchFormat
              ? new HttpResponse({
                  body: {
                    responses: req.body.requests.map((item: { id: string }, index: number) => ({
                      id: item.id,
                      status: index === 0 ? 200 : 204,
                      body: index === 0 ? { value: 'new' } : undefined,
                    })),
                  },
                })
              : new HttpResponse({
                  body:
                    [200, 204, 204]
                      .map(
                        (status) =>
                          `--response\r\nContent-Type: application/http\r\n\r\nHTTP/1.1 ${status} OK\r\nContent-Type: application/json\r\n\r\n${status === 200 ? '{"value":"new"}' : ''}\r\n`,
                      )
                      .join('') + '--response--',
                  headers: new HttpHeaders({
                    'Content-Type': 'multipart/mixed; boundary=response',
                  }),
                }),
          );
        await expect(firstValueFrom(batch.send())).rejects.toThrow(RangeError);
        await expect(firstValueFrom(get({ fetchPolicy: 'cache-only' }))).rejects.toThrow(
          'No Cached',
        );
        await expect(
          firstValueFrom(api.request('GET', trips, { fetchPolicy: 'cache-only' })),
        ).rejects.toThrow('No Cached');
      },
    );

    it('should propagate synchronous cache failures before sending the batch', async () => {
      const { api, cache, get } = fixture();
      vi.spyOn(cache, 'getResponse').mockImplementation(() => {
        throw new Error('cache failed');
      });
      const handled = new Error('handled');
      api.errorHandler = vi.fn(() => throwError(() => handled));
      api.requester = vi.fn(() => of(new HttpResponse({ body: {} })));
      const batch = ODataBatchResource.factory(api);
      batch.add(() => get({ fetchPolicy: 'cache-first' }));
      await expect(firstValueFrom(batch.send())).rejects.toBe(handled);
      expect(api.errorHandler).toHaveBeenCalledOnce();
      expect(api.requester).not.toHaveBeenCalled();
    });

    it('should terminate inner subscribers when readiness throws synchronously', async () => {
      const failure = new Error('readiness failed');
      const cache = Object.assign(new ODataInMemoryCache(), {
        ready: () => {
          throw failure;
        },
      });
      const { api, get } = fixture(cache);
      api.requester = vi.fn(() => of(new HttpResponse({ body: {} })));
      const batch = ODataBatchResource.factory(api);
      const error = vi.fn();
      const inner = batch.add(() => get({ fetchPolicy: 'cache-only' })).subscribe({ error });
      await expect(firstValueFrom(batch.send())).rejects.toBe(failure);
      expect(error).toHaveBeenCalledWith(failure);
      expect(inner.closed).toBe(true);
      expect(api.requester).not.toHaveBeenCalled();
    });

    it('should keep unsuccessful HTTP subresponses local to their inner requests', async () => {
      const { api, resource } = fixture();
      api.options.jsonBatchFormat = true;
      const handled = new Error('handled conflict');
      api.errorHandler = vi.fn(() => throwError(() => handled));
      api.requester = (req) =>
        of(
          new HttpResponse({
            body: { responses: [{ id: req.body.requests[0].id, status: 409, body: 'conflict' }] },
          }),
        );
      const batch = ODataBatchResource.factory(api);
      const error = vi.fn();
      batch.add(() => api.request('PATCH', resource, { body: {} })).subscribe({ error });
      expect((await firstValueFrom(batch.send())).status).toBe(200);
      expect(error).toHaveBeenCalledWith(handled);
      expect(api.errorHandler).toHaveBeenCalledOnce();
    });

    it('should forward handled outer transport failures without handling them twice', async () => {
      const { api, get } = fixture();
      const handled = new Error('handled transport failure');
      api.errorHandler = vi.fn(() => throwError(() => handled));
      api.requester = () => throwError(() => new Error('offline'));
      const batch = ODataBatchResource.factory(api);
      batch.add(() => get());
      await expect(firstValueFrom(batch.send())).rejects.toBe(handled);
      expect(api.errorHandler).toHaveBeenCalledOnce();
    });

    it.each([true, false])(
      'should invalidate successful JSON-format=%s mutations without inner subscriptions',
      async (jsonBatchFormat) => {
        const { api, resource, get } = fixture();
        api.options.jsonBatchFormat = jsonBatchFormat;
        api.requester = () => of(new HttpResponse({ body: 'old' }));
        await firstValueFrom(get());
        const batch = ODataBatchResource.factory(api);
        batch.add(() => api.request('PATCH', resource, { body: {} }));
        expect(batch.requests()).toHaveLength(1);
        expect(await firstValueFrom(get({ fetchPolicy: 'cache-only' }))).toBe('old');
        api.requester = (req) =>
          of(
            jsonBatchFormat
              ? new HttpResponse({
                  body: {
                    responses: req.body.requests.map((item: { id: string }) => ({
                      id: item.id,
                      status: 204,
                    })),
                  },
                })
              : new HttpResponse({
                  body: '--response\r\nContent-Type: application/http\r\n\r\nHTTP/1.1 204 No Content\r\nContent-Type: application/json\r\n\r\n\r\n--response--',
                  headers: new HttpHeaders({
                    'Content-Type': 'multipart/mixed; boundary=response',
                  }),
                }),
          );
        await firstValueFrom(batch.send());
        await expect(firstValueFrom(get({ fetchPolicy: 'cache-only' }))).rejects.toThrow(
          'No Cached',
        );
      },
    );

    it('should keep the cache when every batch mutation fails', async () => {
      const { api, resource, get } = fixture();
      api.options.jsonBatchFormat = true;
      api.requester = () => of(new HttpResponse({ body: 'old' }));
      await firstValueFrom(get());
      const batch = ODataBatchResource.factory(api);
      batch.add(() => api.request('PATCH', resource, { body: {} }));
      api.requester = (req) =>
        of(
          new HttpResponse({
            body: {
              responses: req.body.requests.map((item: { id: string }) => ({
                id: item.id,
                status: 409,
                body: 'conflict',
              })),
            },
          }),
        );
      await firstValueFrom(batch.send());
      expect(await firstValueFrom(get({ fetchPolicy: 'cache-only' }))).toBe('old');
    });

    it.each([true, false])(
      'should match reordered JSON subresponses by ID when mutation success is %s',
      async (succeeds) => {
        const { api, resource, get } = fixture();
        api.options.jsonBatchFormat = true;
        api.requester = () => of(new HttpResponse({ body: 'old' }));
        await firstValueFrom(get());
        const batch = ODataBatchResource.factory(api);
        batch.add(() => {
          api.request('PATCH', resource, { body: {} });
          get();
        });
        api.requester = (req) =>
          of(
            new HttpResponse({
              body: {
                responses: [
                  { id: req.body.requests[1].id, status: 200, body: { value: 'read' } },
                  { id: req.body.requests[0].id, status: succeeds ? 204 : 409 },
                ],
              },
            }),
          );
        await firstValueFrom(batch.send());
        if (succeeds) {
          await expect(firstValueFrom(get({ fetchPolicy: 'cache-only' }))).rejects.toThrow(
            'No Cached',
          );
        } else {
          expect(await firstValueFrom(get({ fetchPolicy: 'cache-only' }))).toEqual({
            value: 'read',
          });
        }
      },
    );

    it('should not interpret a missing mutation subresponse as a successful write', async () => {
      const { api, resource, get } = fixture();
      api.options.jsonBatchFormat = true;
      api.requester = () => of(new HttpResponse({ body: 'old' }));
      await firstValueFrom(get());
      const batch = ODataBatchResource.factory(api);
      batch.add(() => api.request('PATCH', resource, { body: {} }));
      api.requester = () =>
        of(
          new HttpResponse({
            body: { responses: [{ id: 'unknown', status: 204 }] },
          }),
        );
      await firstValueFrom(batch.send());
      expect(await firstValueFrom(get({ fetchPolicy: 'cache-only' }))).toBe('old');
    });

    it('should wait for persistent-cache readiness before choosing batch cache hits', async () => {
      const cache = Object.assign(new ODataInMemoryCache(), { ready: vi.fn(async () => {}) });
      const { api, get } = fixture(cache);
      api.options.jsonBatchFormat = true;
      api.requester = () => of(new HttpResponse({ body: 'cached' }));
      await firstValueFrom(get());
      const batch = ODataBatchResource.factory(api);
      const result = firstValueFrom(batch.add(() => get({ fetchPolicy: 'cache-only' })));
      cache.ready.mockClear();
      api.requester = (req) => {
        expect(req.body.requests).toEqual([]);
        return of(new HttpResponse({ body: { responses: [] } }));
      };
      await firstValueFrom(batch.send());
      expect(await result).toBe('cached');
      expect(cache.ready).toHaveBeenCalledOnce();
    });

    it('should evaluate cached batch reads at send time and omit them from the network body', async () => {
      const { api, get } = fixture();
      api.options.jsonBatchFormat = true;
      api.requester = () => of(new HttpResponse({ body: 'cached' }));
      await firstValueFrom(get());
      const batch = ODataBatchResource.factory(api);
      const cached = batch.add(() => get({ fetchPolicy: 'cache-first' }));
      const result = firstValueFrom(cached);
      api.requester = (req) => {
        expect(req.body.requests).toEqual([]);
        return of(new HttpResponse({ body: { responses: [] } }));
      };
      await firstValueFrom(batch.send());
      expect(await result).toBe('cached');
    });

    it('should restore request capture when the batch callback throws', async () => {
      const { api, get } = fixture();
      api.requester = () => of(new HttpResponse({ body: 'network' }));
      const batch = ODataBatchResource.factory(api);
      expect(() =>
        batch.add(() => {
          throw new Error('callback failed');
        }),
      ).toThrow('callback failed');
      expect(await firstValueFrom(get())).toBe('network');
      expect(batch.requests()).toHaveLength(0);
    });
  });
});
