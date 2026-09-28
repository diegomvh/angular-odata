import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
});
