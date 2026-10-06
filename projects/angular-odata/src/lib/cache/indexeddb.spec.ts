import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { IDBDatabase as FakeDatabase, IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';

import { ODataApi } from '../api';
import { ODataRequest } from '../resources/request';
import { ODataResource } from '../resources/resource';
import { ODataResponse } from '../resources/response';
import { ODataBatchResource } from '../resources/types/batch';
import { ODataIndexedDBCache } from './indexeddb';

const open = (version = 1) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('test', version);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('cache')) {
        request.result.createObjectStore('cache');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const seed = async (entries: [string, unknown][]) => {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('cache', 'readwrite');
      const store = transaction.objectStore('cache');
      entries.forEach(([key, value]) => store.put(value, key));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
};

const entry = (payload: unknown) => ({
  payload,
  date: Date.now(),
  maxAge: 60_000,
  tags: ['People'],
});

describe('ODataIndexedDBCache', () => {
  beforeEach(() => vi.stubGlobal('indexedDB', new IDBFactory()));
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should load persisted entries before readiness resolves', async () => {
    await seed([['item', entry('persisted')]]);
    const cache = new ODataIndexedDBCache({ name: 'test' });
    expect(cache.get('item')).toBeUndefined();
    await cache.ready();
    expect(cache.get('item')).toBe('persisted');
  });

  it('should preserve a put made before hydration and persist the newer value', async () => {
    await seed([['item', entry('persisted')]]);
    const cache = new ODataIndexedDBCache({ name: 'test' });
    expect(cache.put('item', 'new')).toBeUndefined();
    expect(cache.get('item')).toBe('new');
    await cache.ready();
    expect(cache.get('item')).toBe('new');
    const reloaded = new ODataIndexedDBCache({ name: 'test' });
    await reloaded.ready();
    expect(reloaded.get('item')).toBe('new');
  });

  it('should not resurrect entries after an early flush', async () => {
    await seed([['item', entry('persisted')]]);
    const cache = new ODataIndexedDBCache({ name: 'test' });
    cache.flush();
    await cache.ready();
    expect(cache.size()).toBe(0);
    const reloaded = new ODataIndexedDBCache({ name: 'test' });
    await reloaded.ready();
    expect(reloaded.size()).toBe(0);
  });

  it('should apply early forget filters to entries not yet hydrated', async () => {
    await seed([['item', entry('persisted')]]);
    const cache = new ODataIndexedDBCache({ name: 'test' });
    const tags = ['People'];
    cache.forget({ tags });
    tags[0] = 'changed';
    await cache.ready();
    expect(cache.size()).toBe(0);
    const reloaded = new ODataIndexedDBCache({ name: 'test' });
    await reloaded.ready();
    expect(reloaded.size()).toBe(0);
  });

  it('should replay early operations in invocation order', async () => {
    await seed([['persisted', entry(1)]]);
    const cache = new ODataIndexedDBCache({ name: 'test' });
    cache.put('before', 2);
    cache.flush();
    cache.put('after', 3);
    cache.put('removed', 4, { scope: ['People'] });
    cache.forget({ scope: ['People'] });
    await cache.ready();
    expect(cache.size()).toBe(1);
    expect(cache.get('after')).toBe(3);
    const reloaded = new ODataIndexedDBCache({ name: 'test' });
    await reloaded.ready();
    expect(reloaded.size()).toBe(1);
    expect(reloaded.get('after')).toBe(3);
  });

  it('should respect name and scope boundaries without mutating inputs', async () => {
    const cache = new ODataIndexedDBCache({ name: 'test' });
    await cache.ready();
    const scope = ['People'];
    cache.put('one', 1, { scope });
    cache.put('one-more', 2, { scope });
    cache.put('two', 3, { scope: ['PeopleArchive'] });
    cache.forget({ name: 'one', scope });
    expect(scope).toEqual(['People']);
    expect(cache.get('one-more', { scope })).toBe(2);
    cache.forget({ scope });
    await cache.ready();
    expect(cache.get('two', { scope: ['PeopleArchive'] })).toBe(3);
    expect(cache.size()).toBe(1);
  });

  it('should discard expired and malformed persisted entries', async () => {
    await seed([
      ['expired', { ...entry(1), date: 0, maxAge: 0 }],
      ['invalid', { payload: 2 }],
      ['valid', entry(3)],
    ]);
    const onError = vi.fn();
    const cache = new ODataIndexedDBCache({ name: 'test', onError });
    await cache.ready();
    expect(cache.size()).toBe(1);
    expect(cache.get('valid')).toBe(3);
    expect(onError).toHaveBeenCalledOnce();
    const reloaded = new ODataIndexedDBCache({ name: 'test', onError });
    await reloaded.ready();
    expect(reloaded.size()).toBe(1);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('should remove entries at the exact expiration deadline from both stores', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const cache = new ODataIndexedDBCache({ name: 'test' });
    await cache.ready();
    cache.put('item', 1, { maxAge: 1 });
    await cache.ready();
    now.mockReturnValue(1999);
    expect(cache.get('item')).toBe(1);
    now.mockReturnValue(2000);
    expect(cache.get('item')).toBeUndefined();
    await cache.ready();
    const reloaded = new ODataIndexedDBCache({ name: 'test' });
    await reloaded.ready();
    expect(reloaded.size()).toBe(0);
  });

  it('should report unavailable IndexedDB and continue with synchronous memory operations', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const onError = vi.fn();
    const cache = new ODataIndexedDBCache({ onError });
    cache.put('item', 1);
    await cache.ready();
    expect(cache.get('item')).toBe(1);
    cache.forget({ name: 'item' });
    expect(cache.size()).toBe(0);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('should reject readiness without logging when no error handler is supplied', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cache = new ODataIndexedDBCache();
    await expect(cache.ready()).rejects.toThrow('persistence failed');
    expect(() => cache.get('item')).toThrow('persistence failed');
    expect(log).not.toHaveBeenCalled();
  });

  it('should deliver responses before persistence and fail the next request after a write error', async () => {
    const cache = new ODataIndexedDBCache({ name: 'test' });
    await cache.ready();
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    const errorHandler = vi.fn(() => throwError(() => new Error('handled')));
    const api = new ODataApi({ serviceRootUrl: 'https://example.test/', cache, errorHandler });
    api.requester = () => of(new HttpResponse({ body: 1 }));
    expect(await firstValueFrom(api.request('GET', new ODataResource(api), {}))).toBe(1);
    expect(errorHandler).not.toHaveBeenCalled();
    await expect(cache.ready()).rejects.toThrow('persistence failed');
    await expect(firstValueFrom(api.request('GET', new ODataResource(api), {}))).rejects.toThrow(
      'handled',
    );
    expect(errorHandler).toHaveBeenCalledOnce();
  });

  it('should keep the cache usable after discarding a malformed entry without onError', async () => {
    await seed([
      ['invalid', { payload: 1 }],
      ['valid', entry(2)],
    ]);
    const cache = new ODataIndexedDBCache({ name: 'test' });
    await cache.ready();
    expect(cache.get('valid')).toBe(2);
    expect(cache.size()).toBe(1);
  });

  it('should clear persisted entries on flush after falling back to memory', async () => {
    const onError = vi.fn();
    const cache = new ODataIndexedDBCache({ name: 'test', onError });
    await cache.ready();
    cache.put('persisted', 1);
    await cache.ready();
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    cache.put('failed', 2);
    await cache.ready();
    expect(onError).toHaveBeenCalledOnce();
    cache.flush();
    await cache.ready();
    const reloaded = new ODataIndexedDBCache({ name: 'test' });
    await reloaded.ready();
    expect(reloaded.size()).toBe(0);
  });

  it('should deliver batch results after asynchronous persistence completes', async () => {
    const cache = new ODataIndexedDBCache({ name: 'test' });
    const api = new ODataApi({
      serviceRootUrl: 'https://example.test/',
      cache,
      options: { jsonBatchFormat: true },
    });
    const resource = new ODataResource(api);
    api.requester = (req) =>
      of(
        new HttpResponse({
          body: {
            responses: req.body.requests.map((item: { id: string }) => ({
              id: item.id,
              status: 200,
              body: { value: 1 },
            })),
          },
        }),
      );
    const batch = ODataBatchResource.factory(api);
    const inner = firstValueFrom(
      batch.add(() =>
        api.request('GET', resource, {
          responseType: 'json',
        }),
      ),
    );
    await firstValueFrom(batch.send());
    expect(await inner).toEqual({ value: 1 });
    expect(
      await firstValueFrom(api.request('GET', resource, { fetchPolicy: 'cache-only' })),
    ).toEqual({ value: 1 });
  });

  it.each([true, false])(
    'should not delay batch results for persistence and fail the next request (JSON: %s)',
    async (jsonBatchFormat) => {
      const cache = new ODataIndexedDBCache({ name: 'test' });
      await cache.ready();
      vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });
      const handled = new Error('handled persistence failure');
      const errorHandler = vi.fn(() => throwError(() => handled));
      const api = new ODataApi({
        serviceRootUrl: 'https://example.test/',
        cache,
        errorHandler,
        options: { jsonBatchFormat },
      });
      api.requester = (req) =>
        of(
          jsonBatchFormat
            ? new HttpResponse({
                body: {
                  responses: req.body.requests.map((item: { id: string }) => ({
                    id: item.id,
                    status: 200,
                    body: { value: 1 },
                  })),
                },
              })
            : new HttpResponse({
                body: '--response\r\nContent-Type: application/http\r\n\r\nHTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{"value":1}\r\n--response--',
                headers: new HttpHeaders({ 'Content-Type': 'multipart/mixed; boundary=response' }),
              }),
        );
      const batch = ODataBatchResource.factory(api);
      batch.add(() => api.request('GET', new ODataResource(api), { responseType: 'json' }));
      expect((await firstValueFrom(batch.send())).status).toBe(200);
      expect(errorHandler).not.toHaveBeenCalled();
      await expect(cache.ready()).rejects.toThrow('persistence failed');
      await expect(firstValueFrom(api.request('GET', new ODataResource(api), {}))).rejects.toBe(
        handled,
      );
      expect(errorHandler).toHaveBeenCalledOnce();
    },
  );

  it.each([true, false])(
    'should terminate inner batch requests after readiness fails (handler: %s)',
    async (withHandler) => {
      vi.stubGlobal('indexedDB', undefined);
      const cache = new ODataIndexedDBCache();
      const handled = new Error('handled readiness failure');
      const api = new ODataApi({
        serviceRootUrl: 'https://example.test/',
        cache,
        errorHandler: withHandler ? () => throwError(() => handled) : undefined,
      });
      api.requester = vi.fn(() => of(new HttpResponse({ body: {} })));
      const batch = ODataBatchResource.factory(api);
      const errors = [vi.fn(), vi.fn()];
      const subscriptions = errors.map((error) =>
        batch
          .add(() =>
            api.request('GET', new ODataResource(api), {
              fetchPolicy: 'cache-first',
            }),
          )
          .subscribe({ error }),
      );
      await expect(firstValueFrom(batch.send())).rejects.toThrow(
        withHandler ? 'handled readiness failure' : 'persistence failed',
      );
      errors.forEach((error) => expect(error).toHaveBeenCalledOnce());
      expect(subscriptions.every((subscription) => subscription.closed)).toBe(true);
      expect(api.requester).not.toHaveBeenCalled();
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    },
  );

  it('should settle readiness and preserve local writes if cursor creation fails', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'openCursor').mockImplementationOnce(() => {
      throw new DOMException('cursor failed', 'UnknownError');
    });
    const onError = vi.fn();
    const cache = new ODataIndexedDBCache({ name: 'test', onError });
    cache.put('item', 1);
    await cache.ready();
    expect(cache.get('item')).toBe(1);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('should settle readiness if the hydration transaction aborts', async () => {
    const transaction = FakeDatabase.prototype.transaction;
    vi.spyOn(FakeDatabase.prototype, 'transaction').mockImplementation(function (
      this: IDBDatabase,
      ...args
    ) {
      const result = transaction.apply(this, args);
      queueMicrotask(() => result.abort());
      return result;
    });
    const onError = vi.fn();
    const cache = new ODataIndexedDBCache({ name: 'test', onError });
    cache.put('item', 1);
    await cache.ready();
    expect(cache.get('item')).toBe(1);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('should report write failures and retain the memory view', async () => {
    const onError = vi.fn();
    const cache = new ODataIndexedDBCache({ name: 'test', onError });
    await cache.ready();
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    cache.put('item', 1);
    await cache.ready();
    expect(cache.get('item')).toBe(1);
    expect(onError).toHaveBeenCalledOnce();
    cache.put('next', 2);
    await cache.ready();
    expect(cache.get('next')).toBe(2);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('should settle a blocked open and fall back without waiting indefinitely', async () => {
    const blocker = await open();
    const onError = vi.fn();
    const cache = new ODataIndexedDBCache({ name: 'test', version: 2, onError });
    cache.put('item', 1);
    await cache.ready();
    expect(cache.get('item')).toBe(1);
    expect(onError).toHaveBeenCalledOnce();
    blocker.close();
  });

  it('should close on version changes and report the switch to memory', async () => {
    const onError = vi.fn();
    const cache = new ODataIndexedDBCache({ name: 'test', onError });
    await cache.ready();
    cache.put('item', 1);
    await cache.ready();
    const upgraded = await open(2);
    upgraded.close();
    expect(onError).toHaveBeenCalledOnce();
    expect(cache.get('item')).toBe(1);
  });

  it('should persist binary responses and restore a detached body for the current request', async () => {
    const cache = new ODataIndexedDBCache({ name: 'test' });
    const api = new ODataApi({ serviceRootUrl: 'https://example.test/' });
    const req = ODataRequest.factory(api, 'GET', new ODataResource(api), {
      observe: 'response',
      responseType: 'arraybuffer',
    });
    const body = new Uint8Array([1, 2]).buffer;
    cache.putResponse(req, ODataResponse.fromHttpResponse(req, new HttpResponse({ body })));
    new Uint8Array(body)[0] = 9;
    await cache.ready();
    const reloaded = new ODataIndexedDBCache({ name: 'test' });
    await reloaded.ready();
    const restored = reloaded.getResponse(req)!;
    expect(new Uint8Array(restored.body)).toEqual(new Uint8Array([1, 2]));
    expect(restored.resource).toBe(req.resource);
    new Uint8Array(restored.body)[0] = 9;
    expect(new Uint8Array(reloaded.getResponse(req)!.body)).toEqual(new Uint8Array([1, 2]));
  });
});
