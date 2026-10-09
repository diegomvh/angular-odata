import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpResponse } from '@angular/common/http';

import { ODataApi } from '../api';
import { ODataRequest } from '../resources/request';
import { ODataResource } from '../resources/resource';
import { ODataResponse } from '../resources/response';
import { ODataInStorageCache } from './storage';

class MemoryStorage implements Storage {
  [name: string]: any;

  get length() {
    return Object.keys(this).length;
  }

  clear() {
    Object.keys(this).forEach((key) => delete this[key]);
  }

  getItem(key: string): string | null {
    return key in this ? this[key] : null;
  }

  key(index: number): string | null {
    return Object.keys(this)[index] ?? null;
  }

  removeItem(key: string) {
    delete this[key];
  }

  setItem(key: string, value: string) {
    this[key] = value;
  }
}

const build = (prefix: string = 'odata:') => {
  const storage = new MemoryStorage();
  const cache = new ODataInStorageCache({ prefix, storage });
  return { storage, cache };
};

describe('ODataInStorageCache', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('put/get', () => {
    it('should store and return a payload', () => {
      const { cache } = build();
      cache.put('People', [1, 2, 3]);
      expect(cache.get('People')).toEqual([1, 2, 3]);
    });

    it('should scope entries', () => {
      const { cache } = build();
      cache.put('People', { a: 1 }, { scope: ['request'] });
      expect(cache.get('People', { scope: ['request'] })).toEqual({ a: 1 });
      expect(cache.get('People')).toBeUndefined();
    });

    it('should overwrite an existing entry', () => {
      const { cache } = build();
      cache.put('People', 1);
      cache.put('People', 2);
      expect(cache.get('People')).toBe(2);
    });

    it('should return undefined for a missing entry', () => {
      const { cache } = build();
      expect(cache.get('People')).toBeUndefined();
    });
  });

  describe('buildKey', () => {
    it('should prefix the key', () => {
      const { cache } = build('test');
      expect(cache.buildKey(['a'])).toBe('test:a');
      expect(cache.buildKey(['a', 'b'])).toBe('test:a:b');
    });
  });

  describe('expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2021-01-01T00:00:00.000Z'));
    });

    it('should return undefined for an expired payload', () => {
      const { cache } = build();
      cache.put('People', 1);
      vi.setSystemTime(new Date('2021-01-01T00:01:01.000Z'));
      expect(cache.get('People')).toBeUndefined();
    });

    it('should return the payload within the max age', () => {
      const { cache } = build();
      cache.put('People', 1);
      vi.setSystemTime(new Date('2021-01-01T00:00:59.000Z'));
      expect(cache.get('People')).toBe(1);
    });

    it('should forget expired entries even without a filter', () => {
      const { cache } = build();
      cache.put('People', 1);
      vi.setSystemTime(new Date('2021-01-01T00:01:01.000Z'));
      cache.forget({});
      expect(cache.size()).toBe(0);
    });

    it('should not delete an entry another cache instance has refreshed', () => {
      const { cache, storage } = build('odata');
      const other = new ODataInStorageCache({ prefix: 'odata', storage });
      cache.put('shared', 'old', { maxAge: 1 });
      vi.advanceTimersByTime(1000);
      other.put('shared', 'new');
      cache.put('trigger-cleanup', 1);
      expect(other.get('shared')).toBe('new');
      expect(cache.get('shared')).toBe('new');
    });
  });

  describe('forget', () => {
    it('should forget an entry by name', () => {
      const { cache } = build();
      cache.put('People', 1);
      cache.put('Trips', 2);
      cache.forget({ name: 'People' });
      expect(cache.get('People')).toBeUndefined();
      expect(cache.get('Trips')).toBe(2);
    });

    it('should forget entries by scope prefix', () => {
      const { cache } = build();
      cache.put('People', 1, { scope: ['request', 'People'] });
      cache.put('People', 2, { scope: ['request', 'Trips'] });
      cache.forget({ scope: ['request', 'People'] });
      expect(cache.get('People', { scope: ['request', 'People'] })).toBeUndefined();
      expect(cache.get('People', { scope: ['request', 'Trips'] })).toBe(2);
    });

    it('should forget entries matching a tag', () => {
      const { cache } = build();
      cache.put('People', 1, { tags: ['TripPin.Person'] });
      cache.put('Trips', 2, { tags: ['TripPin.Trip'] });
      cache.forget({ tags: ['TripPin.Person'] });
      expect(cache.get('People')).toBeUndefined();
      expect(cache.get('Trips')).toBe(2);
    });
  });

  describe('flush', () => {
    it('should preserve neighboring storage namespaces', () => {
      const storage = new MemoryStorage();
      const cache = new ODataInStorageCache({ prefix: 'odata', storage });
      const other = new ODataInStorageCache({ prefix: 'odata2', storage });
      cache.put('People', 1);
      other.put('People', 2);
      expect(cache.size()).toBe(1);
      cache.flush();
      expect(other.get('People')).toBe(2);
    });

    it('should remove only the entries with the configured prefix', () => {
      const { storage, cache } = build('odata:');
      cache.put('People', 1);
      storage.setItem('other:Thing', '{ "payload": 1, "date": 0, "maxAge": 0, "tags": [] }');
      cache.flush();
      expect(cache.get('People')).toBeUndefined();
      expect(cache.size()).toBe(0);
      expect(storage.getItem('other:Thing')).toBeTruthy();
    });
  });

  describe('size', () => {
    it('should count only the prefixed entries', () => {
      const { storage, cache } = build('odata:');
      cache.put('People', 1);
      cache.put('Trips', 2);
      storage.setItem('other:Thing', '{ "payload": 1, "date": 0, "maxAge": 0, "tags": [] }');
      expect(cache.size()).toBe(2);
    });
  });

  describe('stored payload', () => {
    it('should persist the serialized entry in the storage', () => {
      const { storage, cache } = build('odata');
      cache.put('People', { id: 1 });
      const raw = storage.getItem('odata:People');
      expect(raw).toBeDefined();
      const entry = JSON.parse(raw as string);
      expect(entry.payload).toEqual({ id: 1 });
      expect(entry.maxAge).toBe(60 * 1000);
      expect(entry.tags).toEqual([]);
    });
  });

  describe('persistence failures', () => {
    it.each(['not json', 'null', '{}', '{"payload":1}'])(
      'should report and remove an invalid stored entry: %s',
      (raw) => {
        const storage = new MemoryStorage();
        const onError = vi.fn();
        const cache = new ODataInStorageCache({ prefix: 'odata', storage, onError });
        storage.setItem('odata:broken', raw);
        expect(cache.get('broken')).toBeUndefined();
        expect(storage.getItem('odata:broken')).toBeNull();
        expect(onError).toHaveBeenCalledOnce();
      },
    );

    it('should preserve a write in memory and report a storage quota failure', () => {
      const storage = new MemoryStorage();
      const onError = vi.fn();
      const cache = new ODataInStorageCache({ prefix: 'odata', storage, onError });
      cache.put('existing', 1);
      vi.spyOn(storage, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });
      expect(() => cache.put('new', 2)).not.toThrow();
      expect(cache.get('new')).toBe(2);
      expect(cache.get('existing')).toBe(1);
      expect(onError).toHaveBeenCalledOnce();
      cache.forget({ name: 'existing' });
      expect(cache.get('existing')).toBeUndefined();
      cache.flush();
      expect(cache.size()).toBe(0);
    });

    it('should use the existing in-memory view after storage access fails', () => {
      const storage = new MemoryStorage();
      const onError = vi.fn();
      const cache = new ODataInStorageCache({ prefix: 'odata', storage, onError });
      cache.put('existing', 1);
      vi.spyOn(storage, 'getItem').mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
      expect(cache.get('existing')).toBe(1);
      expect(onError).toHaveBeenCalledOnce();
    });

    it('should report unavailable browser storage and remain usable', () => {
      vi.stubGlobal('sessionStorage', undefined);
      const onError = vi.fn();
      const cache = new ODataInStorageCache({ prefix: 'odata', onError });
      cache.put('item', 1);
      expect(cache.get('item')).toBe(1);
      expect(onError).toHaveBeenCalledOnce();
    });

    it('should discard a corrupt entry without onError and remain usable', () => {
      const storage = new MemoryStorage();
      storage.setItem('odata:broken', 'not json');
      const cache = new ODataInStorageCache({ prefix: 'odata', storage });
      expect(storage.getItem('odata:broken')).toBeNull();
      cache.put('item', 1);
      expect(cache.get('item')).toBe(1);
      expect(() => new ODataInStorageCache({ prefix: 'odata', storage })).not.toThrow();
    });

    it('should remove persisted entries on flush and forget after a storage fallback', () => {
      const storage = new MemoryStorage();
      const onError = vi.fn();
      const cache = new ODataInStorageCache({ prefix: 'odata', storage, onError });
      cache.put('kept', 1);
      cache.put('forgotten', 2);
      vi.spyOn(storage, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });
      cache.put('failed', 3);
      expect(onError).toHaveBeenCalledOnce();
      cache.put('kept', 4);
      expect(storage.getItem('odata:kept')).toBeNull();
      cache.forget({ name: 'forgotten' });
      expect(storage.getItem('odata:forgotten')).toBeNull();
      storage['odata:other'] = '{}';
      cache.flush();
      expect(Object.keys(storage).filter((key) => key.startsWith('odata:'))).toEqual([]);
    });

    it('should propagate persistence errors without logging by default', () => {
      vi.stubGlobal('sessionStorage', undefined);
      const report = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => new ODataInStorageCache({ prefix: 'odata' })).toThrow('persistence failed');
      expect(report).not.toHaveBeenCalled();
    });
  });

  describe('response fidelity', () => {
    it.each([new Blob(['bytes'], { type: 'text/plain' }), new Uint8Array([1, 2]).buffer])(
      'should keep unsupported binary responses in memory rather than storing lossy JSON',
      (body) => {
        const { cache, storage } = build('odata');
        const api = new ODataApi({ serviceRootUrl: 'https://example.test/' });
        const req = ODataRequest.factory(api, 'GET', new ODataResource(api), {
          observe: 'response',
        });
        cache.putResponse(req, ODataResponse.fromHttpResponse(req, new HttpResponse({ body })));
        const restored = cache.getResponse(req)!.body;
        expect(Object.prototype.toString.call(restored)).toBe(Object.prototype.toString.call(body));
        expect(restored instanceof Blob ? restored.size : restored.byteLength).toBe(
          body instanceof Blob ? body.size : body.byteLength,
        );
        expect(cache.size()).toBe(1);
        expect(storage.length).toBe(0);
        const reloaded = new ODataInStorageCache({ prefix: 'odata', storage });
        expect(reloaded.getResponse(req)).toBeUndefined();
      },
    );

    it('should persist and restore a JSON response without sharing its body', () => {
      const { cache, storage } = build('odata');
      const api = new ODataApi({ serviceRootUrl: 'https://example.test/' });
      const req = ODataRequest.factory(api, 'GET', new ODataResource(api), {
        observe: 'response',
      });
      const body = { value: 1 };
      cache.putResponse(req, ODataResponse.fromHttpResponse(req, new HttpResponse({ body })));
      body.value = 2;
      const reloaded = new ODataInStorageCache({ prefix: 'odata', storage });
      expect(reloaded.getResponse(req)!.body).toEqual({ value: 1 });
      expect(reloaded.getResponse(req)!.resource).toBe(req.resource);
    });
  });
});
