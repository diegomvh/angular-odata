import { Objects } from './objects';

describe('Objects', () => {
  describe('set', () => {
    it('should set a value on a dotted path', () => {
      const obj: { [attr: string]: any } = {};
      Objects.set(obj, 'a.b.c', 1);
      expect(obj).toEqual({ a: { b: { c: 1 } } });
    });

    it('should set a value on an array path', () => {
      const obj: { [attr: string]: any } = {};
      Objects.set(obj, ['a', 'b'] as any, 1);
      expect(obj).toEqual({ a: { b: 1 } });
    });

    it('should create intermediate objects', () => {
      const obj: { [attr: string]: any } = { a: { b: {} } };
      Objects.set(obj, 'a.b.c', 1);
      expect(obj['a']['b']['c']).toBe(1);
    });

    it('should overwrite an existing value', () => {
      const obj: { [attr: string]: any } = { a: 1 };
      Objects.set(obj, 'a', 2);
      expect(obj).toEqual({ a: 2 });
    });

    it('should support bracket notation', () => {
      const obj: { [attr: string]: any } = {};
      Objects.set(obj, 'a[0].b', 1);
      expect(obj).toEqual({ a: { 0: { b: 1 } } });
    });

    it('should set a key without a separator', () => {
      const obj: { [attr: string]: any } = {};
      Objects.set(obj, 'a', 1);
      expect(obj).toEqual({ a: 1 });
    });
  });

  describe('get', () => {
    it('should get a value on a dotted path', () => {
      expect(Objects.get({ a: { b: { c: 1 } } }, 'a.b.c')).toBe(1);
    });

    it('should get a value on an array path', () => {
      expect(Objects.get({ a: { b: 1 } }, ['a', 'b'] as any)).toBe(1);
    });

    it('should return the default value when the path does not exist', () => {
      expect(Objects.get({}, 'a.b.c')).toBeUndefined();
      expect(Objects.get({}, 'a.b.c', 'default')).toBe('default');
      expect(Objects.get({ a: {} }, 'a.b.c', 'default')).toBe('default');
    });

    it('should support bracket notation', () => {
      expect(Objects.get({ a: [{ b: 1 }] }, 'a[0].b')).toBe(1);
    });

    it('should return the default for a falsy resolved value', () => {
      expect(Objects.get({ a: 0 }, 'a', 'default')).toBe('default');
    });
  });

  describe('unset', () => {
    it('should remove a value on a dotted path', () => {
      const obj = { a: { b: { c: 1 } } };
      Objects.unset(obj, 'a.b.c');
      expect(obj).toEqual({ a: { b: {} } });
    });

    it('should remove a value on an array path', () => {
      const obj = { a: { b: 1 } };
      Objects.unset(obj, ['a', 'b'] as any);
      expect(obj).toEqual({ a: {} });
    });

    it('should remove a top level key', () => {
      const obj = { a: 1, b: 2 };
      Objects.unset(obj, 'a');
      expect(obj).toEqual({ b: 2 });
    });
  });

  describe('has', () => {
    it('should return true for an existing path', () => {
      expect(Objects.has({ a: { b: 1 } }, 'a.b')).toBe(true);
      expect(Objects.has({ a: 1 }, 'a')).toBe(true);
    });

    it('should return false for a missing path', () => {
      expect(Objects.has({}, 'a')).toBe(false);
      expect(Objects.has({ a: {} }, 'a.b')).toBe(false);
    });

    it('should return false for a falsy value', () => {
      expect(Objects.has({ a: 0 }, 'a')).toBe(false);
    });
  });

  describe('merge', () => {
    it('should merge nested objects', () => {
      const target = { a: { b: 1 } };
      Objects.merge(target, { a: { c: 2 } });
      expect(target).toEqual({ a: { b: 1, c: 2 } });
    });

    it('should merge deeply', () => {
      const target = { a: { b: { c: 1 } } };
      Objects.merge(target, { a: { b: { d: 2 } } });
      expect(target).toEqual({ a: { b: { c: 1, d: 2 } } });
    });

    it('should return the target', () => {
      const target = { a: 1 };
      expect(Objects.merge(target, { b: 2 })).toBe(target);
    });

    it('should add new keys', () => {
      expect(Objects.merge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    });

    it('should overwrite a scalar', () => {
      expect(Objects.merge({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
    });

    it('should replace an object with a scalar', () => {
      expect(Objects.merge({ a: { b: 1 } }, { a: 2 })).toEqual({ a: 2 });
    });

    it('should overwrite a nested value with null', () => {
      expect(Objects.merge({ a: { b: 1 } }, { a: { b: null } })).toEqual({ a: { b: null } });
    });
  });

  describe('equal', () => {
    it('should return true for structurally equal objects', () => {
      expect(Objects.equal({}, {})).toBe(true);
      expect(Objects.equal({ a: 1 }, { a: 1 })).toBe(true);
      expect(Objects.equal({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
      expect(Objects.equal({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
    });

    it('should return false for a different value', () => {
      expect(Objects.equal({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('should return false for a different amount of keys', () => {
      expect(Objects.equal({ a: 1 }, { a: 1, b: 2 })).toBe(false);
      expect(Objects.equal({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    });

    it('should compare arrays by reference', () => {
      const value = [1];
      expect(Objects.equal({ a: value }, { a: value })).toBe(true);
      expect(Objects.equal({ a: [1] }, { a: [1] })).toBe(false);
    });
  });

  describe('difference', () => {
    it('should return the first object when the second is not a plain object', () => {
      const object1 = { a: 1 };
      expect(Objects.difference(object1, undefined as any)).toBe(object1);
      expect(Objects.difference(object1, null as any)).toBe(object1);
      expect(Objects.difference(object1, 'a' as any)).toBe(object1);
    });

    it('should return an empty object for equal objects', () => {
      expect(Objects.difference({ a: 1 }, { a: 1 })).toEqual({});
    });

    it('should return the changed value', () => {
      expect(Objects.difference({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual({ b: 3 });
    });

    it('should return null for a key missing in the second object', () => {
      expect(Objects.difference({ a: 1, b: 2 }, { a: 1 })).toEqual({ b: null });
    });

    it('should return the new value for a key missing in the first object', () => {
      expect(Objects.difference({ a: 1 }, { a: 1, b: 2 })).toEqual({ b: 2 });
    });

    it('should detect a type change', () => {
      expect(Objects.difference({ a: 1 }, { a: '1' })).toEqual({ a: '1' });
    });

    it('should compute a nested difference', () => {
      expect(Objects.difference({ a: { b: 1 } }, { a: { c: 2 } })).toEqual({
        a: { b: null, c: 2 },
      });
    });

    it('should return the second array when the arrays differ', () => {
      expect(Objects.difference({ a: [1, 2] }, { a: [1, 3] })).toEqual({ a: [1, 3] });
    });

    it('should ignore equal arrays', () => {
      expect(Objects.difference({ a: [1, 2] }, { a: [1, 2] })).toEqual({});
    });
  });

  describe('resolveKey', () => {
    it('should return a primitive key as is', () => {
      expect(Objects.resolveKey(1)).toBe(1);
      expect(Objects.resolveKey('a')).toBe('a');
    });

    it('should return undefined for a non key type', () => {
      expect(Objects.resolveKey(null)).toBeUndefined();
      expect(Objects.resolveKey(undefined)).toBeUndefined();
      expect(Objects.resolveKey([])).toBeUndefined();
    });

    it('should unwrap a single valued object key', () => {
      expect(Objects.resolveKey({ Id: 1 })).toBe(1);
      expect(Objects.resolveKey(new Map([['Id', 1]]))).toBe(1);
    });

    it('should return undefined for a single undefined value', () => {
      expect(Objects.resolveKey({ Id: undefined })).toBeUndefined();
    });

    it('should return a composed key when single is false', () => {
      expect(Objects.resolveKey({ Id: 1 }, { single: false })).toEqual({ Id: 1 });
      expect(Objects.resolveKey(new Map([['Id', 1]]), { single: false })).toEqual({ Id: 1 });
    });

    it('should return undefined for a composed key missing a value', () => {
      expect(Objects.resolveKey({ Id: 1, Name: undefined }, { single: false })).toBeUndefined();
    });

    it('should return a composed object key by default', () => {
      expect(Objects.resolveKey({ Id: 1, Name: 'a' })).toEqual({ Id: 1, Name: 'a' });
    });

    it('should return undefined for an empty key', () => {
      expect(Objects.resolveKey({})).toBeUndefined();
      expect(Objects.resolveKey(new Map())).toBeUndefined();
      expect(Objects.resolveKey({}, { single: false })).toBeUndefined();
    });
  });

  describe('clone', () => {
    it('should return primitives as is', () => {
      expect(Objects.clone(1)).toBe(1);
      expect(Objects.clone('a')).toBe('a');
      expect(Objects.clone(null)).toBeNull();
      expect(Objects.clone(undefined)).toBeUndefined();
    });

    it('should deep clone an object', () => {
      const source = { a: { b: { c: 1 } } };
      const result = Objects.clone(source);
      expect(result).toEqual(source);
      expect(result).not.toBe(source);
      expect(result.a).not.toBe(source.a);
    });

    it('should deep clone an array', () => {
      const source = [{ a: 1 }, 2];
      const result = Objects.clone(source);
      expect(result).toEqual(source);
      expect(result).not.toBe(source);
      expect(result[0]).not.toBe(source[0]);
    });

    it('should clone a set', () => {
      const source = new Set([{ a: 1 }]);
      const result = Objects.clone(source);
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(1);
      expect([...result][0]).toEqual({ a: 1 });
      expect([...result][0]).not.toBe(source.values().next().value);
    });

    it('should clone a map', () => {
      const source = new Map<string, any>([['a', { b: 1 }]]);
      const result = Objects.clone(source);
      expect(result).toBeInstanceOf(Map);
      expect(result.get('a')).toEqual({ b: 1 });
      expect(result.get('a')).not.toBe(source.get('a'));
    });

    it('should preserve map keys', () => {
      const result = Objects.clone(new Map([['a', 1]]));
      expect([...result.keys()]).toEqual(['a']);
    });

    it('should delegate to a clone method when present', () => {
      const cloned = { cloned: true };
      const source = { clone: () => cloned };
      expect(Objects.clone(source)).toBe(cloned);
    });

    it('should clone a date', () => {
      const source = new Date(1000);
      const result = Objects.clone(source);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(1000);
    });

    it('should clone a null prototype object', () => {
      const result = Objects.clone(Object.assign(Object.create(null), { a: 1 }));
      expect(result.a).toBe(1);
    });

    it('should handle an empty object and array', () => {
      expect(Objects.clone({})).toEqual({});
      expect(Objects.clone([])).toEqual([]);
    });
  });
});
