import { ODataPathSegments } from '../resources/path/segments';
import { PathSegment } from '../types';
import { ODataBaseCache, ODataCacheEntry } from './cache';

class TestCache extends ODataBaseCache {
  put(_name: string, _payload: any, _opts?: any): void {}
  get<T>(_name: string): T | undefined {
    return undefined;
  }
  override getResponse(_req: any): any {
    return undefined;
  }
  override putResponse(_req: any, _res: any): void {}
  forget(_opts?: any): void {}
  flush(): void {}
  size(): number {
    return 0;
  }
}

describe('ODataBaseCache', () => {
  it('should default the max age', () => {
    expect(new TestCache({}).maxAge).toBe(60);
    expect(new TestCache({ maxAge: 120 }).maxAge).toBe(120);
  });

  describe('isExpired', () => {
    it('should return false for a fresh entry', () => {
      const cache = new TestCache({ maxAge: 60 });
      const entry: ODataCacheEntry<any> = {
        payload: 1,
        date: Date.now(),
        maxAge: 60 * 1000,
        tags: [],
      };
      expect(cache.isExpired(entry)).toBe(false);
    });

    it('should return true for an expired entry', () => {
      const cache = new TestCache({ maxAge: 60 });
      const entry: ODataCacheEntry<any> = {
        payload: 1,
        date: Date.now() - 61 * 1000,
        maxAge: 60 * 1000,
        tags: [],
      };
      expect(cache.isExpired(entry)).toBe(true);
    });

    it('should use the max age of the entry', () => {
      const cache = new TestCache({ maxAge: 60 });
      const entry: ODataCacheEntry<any> = {
        payload: 1,
        date: Date.now() - 10 * 1000,
        maxAge: 5 * 1000,
        tags: [],
      };
      expect(cache.isExpired(entry)).toBe(true);
    });
  });

  describe('scope', () => {
    it('should derive the scope from the entity set segments', () => {
      const segments = new ODataPathSegments([
        { name: PathSegment.entitySet, path: 'People' },
        { name: PathSegment.navigationProperty, path: 'Trips' },
      ]);
      const req = {
        cacheScope: ['request', 'v2', 'api'],
        resource: { cloneSegments: () => segments },
      } as any;
      expect(new TestCache({}).scope(req)).toEqual(['request', 'v2', 'api', 'People']);
    });

    it('should not include navigation property names in the scope', () => {
      const segments = new ODataPathSegments([
        { name: PathSegment.entitySet, path: 'People' },
        { name: PathSegment.navigationProperty, path: 'Trips' },
      ]);
      const req = {
        cacheScope: ['request', 'v2', 'api'],
        resource: { cloneSegments: () => segments },
      } as any;
      const scope = new TestCache({}).scope(req);
      expect(scope).not.toContain('Trips');
    });

    it('should return only the default scope for a request without entity set', () => {
      const segments = new ODataPathSegments([{ name: PathSegment.function, path: 'GetPeople' }]);
      const req = {
        cacheScope: ['request', 'v2', 'api'],
        resource: { cloneSegments: () => segments },
      } as any;
      expect(new TestCache({}).scope(req)).toEqual(['request', 'v2', 'api']);
    });
  });

  describe('tags', () => {
    it('should build a tag from the entity set of the context', () => {
      const res = { context: { entitySet: 'People' } } as any;
      expect(new TestCache({}).tags(res)).toEqual(['People']);
    });

    it('should include the key of the entity set', () => {
      const res = { context: { entitySet: 'People', key: '1' } } as any;
      expect(new TestCache({}).tags(res)).toEqual(['People(1)']);
    });

    it('should include the type of the context', () => {
      const res = { context: { type: 'TripPin.Person' } } as any;
      expect(new TestCache({}).tags(res)).toEqual(['TripPin.Person']);
    });

    it('should include both the entity set and the type', () => {
      const res = { context: { entitySet: 'People', type: 'TripPin.Person' } } as any;
      expect(new TestCache({}).tags(res)).toEqual(['People', 'TripPin.Person']);
    });

    it('should return no tags for a context without entity set or type', () => {
      const res = { context: {} } as any;
      expect(new TestCache({}).tags(res)).toEqual([]);
    });
  });

  describe('buildEntry', () => {
    it('should build an entry with default options', () => {
      const cache = new TestCache({ maxAge: 60 });
      const entry = cache.buildEntry('payload', {});
      expect(entry.payload).toBe('payload');
      expect(entry.maxAge).toBe(60 * 1000);
      expect(entry.tags).toEqual([]);
      expect(typeof entry.date).toBe('number');
    });

    it('should use the max age and tags provided', () => {
      const cache = new TestCache({ maxAge: 60 });
      const entry = cache.buildEntry('payload', { maxAge: 120, tags: ['People'] });
      expect(entry.maxAge).toBe(120 * 1000);
      expect(entry.tags).toEqual(['People']);
    });

    it('should prefer an explicit max age over the default', () => {
      const cache = new TestCache({ maxAge: 10 });
      const entry = cache.buildEntry('payload', { maxAge: 120 });
      expect(entry.maxAge).toBe(120 * 1000);
    });

    it.each([-1, NaN, Infinity])('should reject an invalid max age %s', (maxAge) => {
      expect(() => new TestCache({ maxAge })).toThrow(RangeError);
      expect(() => new TestCache({}).buildEntry(1, { maxAge })).toThrow(RangeError);
    });

    it('should copy the supplied tags', () => {
      const tags = ['People'];
      const entry = new TestCache({}).buildEntry(1, { tags });
      tags.push('Trips');
      expect(entry.tags).toEqual(['People']);
    });
  });

  describe('buildKey', () => {
    it('should join the names', () => {
      expect(new TestCache({}).buildKey(['a', 'b', 'c'])).toBe('a:b:c');
    });

    it('should return an empty key for no names', () => {
      expect(new TestCache({}).buildKey([])).toBe('');
    });
  });
});
