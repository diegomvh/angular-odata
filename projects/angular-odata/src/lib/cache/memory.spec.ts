import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ODataPathSegments } from '../resources/path/segments';
import { PathSegment } from '../types';

import { ODataInMemoryCache } from './memory';

describe('ODataInMemoryCache', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('put/get', () => {
    it('should store and return a payload', () => {
      const cache = new ODataInMemoryCache();
      cache.put('People', [1, 2, 3]);
      expect(cache.get('People')).toEqual([1, 2, 3]);
    });

    it('should scope entries', () => {
      const cache = new ODataInMemoryCache();
      cache.put('People', { a: 1 }, { scope: ['request'] });
      expect(cache.get('People', { scope: ['request'] })).toEqual({ a: 1 });
      expect(cache.get('People')).toBeUndefined();
    });

    it('should overwrite an existing entry', () => {
      const cache = new ODataInMemoryCache();
      cache.put('People', 1);
      cache.put('People', 2);
      expect(cache.get('People')).toBe(2);
    });

    it('should return undefined for a missing entry', () => {
      const cache = new ODataInMemoryCache();
      expect(cache.get('People')).toBeUndefined();
    });

    it('should track the size', () => {
      const cache = new ODataInMemoryCache();
      expect(cache.size()).toBe(0);
      cache.put('People', 1);
      cache.put('Trips', 2);
      expect(cache.size()).toBe(2);
      cache.flush();
      expect(cache.size()).toBe(0);
    });
  });

  describe('expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2021-01-01T00:00:00.000Z'));
    });

    it('should return undefined for an expired payload', () => {
      const cache = new ODataInMemoryCache({ maxAge: 60 });
      cache.put('People', 1);
      vi.setSystemTime(new Date('2021-01-01T00:01:01.000Z'));
      expect(cache.get('People')).toBeUndefined();
    });

    it('should return the payload within the max age', () => {
      const cache = new ODataInMemoryCache({ maxAge: 60 });
      cache.put('People', 1);
      vi.setSystemTime(new Date('2021-01-01T00:00:59.000Z'));
      expect(cache.get('People')).toBe(1);
    });

    it('should forget expired entries even without a filter', () => {
      const cache = new ODataInMemoryCache({ maxAge: 60 });
      cache.put('People', 1);
      vi.setSystemTime(new Date('2021-01-01T00:01:01.000Z'));
      cache.forget();
      expect(cache.size()).toBe(0);
    });
  });

  describe('forget', () => {
    it('should forget an entry by name', () => {
      const cache = new ODataInMemoryCache();
      cache.put('People', 1);
      cache.put('Trips', 2);
      cache.forget({ name: 'People' });
      expect(cache.get('People')).toBeUndefined();
      expect(cache.get('Trips')).toBe(2);
    });

    it('should forget entries by scope prefix', () => {
      const cache = new ODataInMemoryCache();
      cache.put('People', 1, { scope: ['request', 'People'] });
      cache.put('People', 2, { scope: ['request', 'Trips'] });
      cache.forget({ scope: ['request', 'People'] });
      expect(cache.get('People', { scope: ['request', 'People'] })).toBeUndefined();
      expect(cache.get('People', { scope: ['request', 'Trips'] })).toBe(2);
    });

    it('should forget entries matching a tag', () => {
      const cache = new ODataInMemoryCache();
      cache.put('People', 1, { tags: ['TripPin.Person'] });
      cache.put('Trips', 2, { tags: ['TripPin.Trip'] });
      cache.forget({ tags: ['TripPin.Person'] });
      expect(cache.get('People')).toBeUndefined();
      expect(cache.get('Trips')).toBe(2);
    });

    it('should forget an entry by name and tag in combination', () => {
      const cache = new ODataInMemoryCache();
      cache.put('People', 1, { tags: ['TripPin.Person'] });
      cache.put('Trips', 2, { tags: ['TripPin.Person'] });
      cache.put('Planes', 3, { tags: ['TripPin.Airport'] });
      cache.forget({ name: 'People', tags: ['TripPin.Person'] });
      expect(cache.get('People')).toBeUndefined();
      expect(cache.get('Trips')).toBeUndefined();
      expect(cache.get('Planes')).toBe(3);
    });
  });

  describe('putResponse/getResponse', () => {
    it('should round trip a response', () => {
      const cache = new ODataInMemoryCache();
      const segments = new ODataPathSegments([{ name: PathSegment.entitySet, path: 'People' }]);
      const req = {
        cacheKey: 'People(1)',
        resource: { cloneSegments: () => segments },
      } as any;
      const res = {
        options: {},
        context: { entitySet: 'People', key: '1', type: 'TripPin.Person' },
      } as any;
      cache.putResponse(req, res);
      expect(cache.getResponse(req)).toBe(res);
    });

    it('should return undefined for a missing response', () => {
      const cache = new ODataInMemoryCache();
      const segments = new ODataPathSegments([{ name: PathSegment.entitySet, path: 'People' }]);
      const req = { cacheKey: 'People(1)', resource: { cloneSegments: () => segments } } as any;
      expect(cache.getResponse(req)).toBeUndefined();
    });

    it('should store the response with the max age of the request', () => {
      const cache = new ODataInMemoryCache({ maxAge: 60 });
      const segments = new ODataPathSegments([{ name: PathSegment.entitySet, path: 'People' }]);
      const req = {
        cacheKey: 'People(1)',
        maxAge: 120,
        resource: { cloneSegments: () => segments },
      } as any;
      const res = { options: {}, context: { entitySet: 'People' } } as any;
      cache.putResponse(req, res);
      expect(cache.entries.get('request:People:People(1)')?.maxAge).toBe(120 * 1000);
    });
  });
});
