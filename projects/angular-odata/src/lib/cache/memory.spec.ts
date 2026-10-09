import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpHeaders, HttpResponse } from '@angular/common/http';

import { ODataApi } from '../api';
import { ODataPathSegments } from '../resources/path/segments';
import { ODataRequest } from '../resources/request';
import { ODataResource } from '../resources/resource';
import { ODataResponse } from '../resources/response';
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

    it('should expire at the exact deadline and remove expired entries during writes', () => {
      const cache = new ODataInMemoryCache({ maxAge: 1 });
      cache.put('zero', 0, { maxAge: 0 });
      expect(cache.get('zero')).toBeUndefined();
      cache.put('old', 1);
      vi.advanceTimersByTime(999);
      expect(cache.get('old')).toBe(1);
      vi.advanceTimersByTime(1);
      cache.put('new', 2);
      expect(cache.get('old')).toBeUndefined();
      expect(cache.size()).toBe(1);
    });
  });

  describe('forget', () => {
    it('should respect scope boundaries and leave the input scope unchanged', () => {
      const cache = new ODataInMemoryCache();
      const scope = ['request', 'People'];
      cache.put('one', 1, { scope });
      cache.put('two', 2, { scope: ['request', 'PeopleArchive'] });
      cache.put('three', 3, { scope: [...scope, 'child'] });
      cache.forget({ scope });
      expect(cache.get('two', { scope: ['request', 'PeopleArchive'] })).toBe(2);
      expect(cache.get('three', { scope: [...scope, 'child'] })).toBeUndefined();
      cache.forget({ name: 'one', scope });
      expect(scope).toEqual(['request', 'People']);
    });

    it('should match names exactly rather than as prefixes', () => {
      const cache = new ODataInMemoryCache();
      cache.put('People', 1);
      cache.put('PeopleArchive', 2);
      cache.forget({ name: 'People' });
      expect(cache.get('PeopleArchive')).toBe(2);
    });
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
    const fixture = (body: unknown = { value: 1 }, maxAge?: number) => {
      const api = new ODataApi({ serviceRootUrl: 'https://example.test/' });
      const resource = new ODataResource(api, {
        segments: new ODataPathSegments([{ name: PathSegment.entitySet, path: 'People' }]),
      });
      const req = ODataRequest.factory(api, 'GET', resource, {
        observe: 'response',
        maxAge,
      });
      const res = ODataResponse.fromHttpResponse(
        req,
        new HttpResponse({
          body,
          headers: new HttpHeaders({ ETag: '"one"' }),
          url: req.url,
        }),
      );
      return { req, res };
    };

    it('should round trip a response', () => {
      const cache = new ODataInMemoryCache();
      const { req, res } = fixture();
      cache.putResponse(req, res);
      const restored = cache.getResponse(req)!;
      expect(restored).not.toBe(res);
      expect(restored.body).toEqual(res.body);
      expect(restored.headers.get('ETag')).toBe('"one"');
      expect(restored.url).toBe(req.url);
      expect(restored.status).toBe(200);
    });

    it('should return undefined for a missing response', () => {
      const cache = new ODataInMemoryCache();
      const { req } = fixture();
      expect(cache.getResponse(req)).toBeUndefined();
    });

    it('should store the response with the max age of the request', () => {
      const cache = new ODataInMemoryCache({ maxAge: 60 });
      const { req, res } = fixture({ value: 1 }, 120);
      cache.putResponse(req, res);
      const key = cache.buildKey([...cache.scope(req), req.cacheKey]);
      expect(cache.entries.get(key)?.maxAge).toBe(120 * 1000);
    });

    it('should detach stored and returned response bodies', () => {
      const cache = new ODataInMemoryCache();
      const body = { value: 1 };
      const { req, res } = fixture(body);
      cache.putResponse(req, res);
      body.value = 2;
      cache.getResponse(req)!.body.value = 3;
      expect(cache.getResponse(req)!.body).toEqual({ value: 1 });
    });

    it('should reconstruct the response using the current resource', () => {
      const cache = new ODataInMemoryCache();
      const { req, res } = fixture();
      const current = fixture().req;
      cache.putResponse(req, res);
      expect(cache.getResponse(current)!.resource).toBe(current.resource);
    });

    it.each([new Blob(['bytes'], { type: 'text/plain' }), new Uint8Array([1, 2]).buffer])(
      'should preserve binary response bodies',
      (body) => {
        const cache = new ODataInMemoryCache();
        const { req, res } = fixture(body);
        cache.putResponse(req, res);
        const restored = cache.getResponse(req)!.body;
        expect(restored).not.toBe(body);
        expect(Object.prototype.toString.call(restored)).toBe(Object.prototype.toString.call(body));
        expect(restored instanceof Blob ? restored.size : restored.byteLength).toBe(
          body instanceof Blob ? body.size : body.byteLength,
        );
      },
    );

    it('should report and discard malformed cached response envelopes', () => {
      const onError = vi.fn();
      const cache = new ODataInMemoryCache({ onError });
      const { req } = fixture();
      cache.put(req.cacheKey, { body: {} }, { scope: cache.scope(req) });
      expect(cache.getResponse(req)).toBeUndefined();
      expect(onError).toHaveBeenCalledOnce();
      expect(cache.size()).toBe(0);
    });

    it('should keep the cache usable after a malformed response without onError', () => {
      const cache = new ODataInMemoryCache();
      const { req } = fixture();
      cache.put(req.cacheKey, { body: {} }, { scope: cache.scope(req) });
      expect(cache.getResponse(req)).toBeUndefined();
      cache.put('item', 1);
      expect(cache.get('item')).toBe(1);
    });
  });
});
