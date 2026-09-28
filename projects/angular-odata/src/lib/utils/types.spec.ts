import { Types } from './types';

describe('Types', () => {
  describe('rawType', () => {
    it('should return the internal type name', () => {
      expect(Types.rawType(1)).toBe('Number');
      expect(Types.rawType('a')).toBe('String');
      expect(Types.rawType(true)).toBe('Boolean');
      expect(Types.rawType(undefined)).toBe('Undefined');
      expect(Types.rawType(null)).toBe('Null');
      expect(Types.rawType([])).toBe('Array');
      expect(Types.rawType({})).toBe('Object');
      expect(Types.rawType(new Date())).toBe('Date');
      expect(Types.rawType(/a/)).toBe('RegExp');
      expect(Types.rawType(new Map())).toBe('Map');
      expect(Types.rawType(new Set())).toBe('Set');
      expect(Types.rawType(Symbol('a'))).toBe('Symbol');
      expect(Types.rawType(() => 1)).toBe('Function');
      expect(Types.rawType(Promise.resolve())).toBe('Promise');
      expect(Types.rawType(new ArrayBuffer(1))).toBe('ArrayBuffer');
    });
  });

  describe('isObject', () => {
    it('should return true for non null objects', () => {
      expect(Types.isObject({})).toBe(true);
      expect(Types.isObject([])).toBe(true);
      expect(Types.isObject(new Date())).toBe(true);
      expect(Types.isObject(new Map())).toBe(true);
    });

    it('should return false for null and primitives', () => {
      expect(Types.isObject(null)).toBe(false);
      expect(Types.isObject(undefined)).toBe(false);
      expect(Types.isObject(1)).toBe(false);
      expect(Types.isObject('a')).toBe(false);
      expect(Types.isObject(() => 1)).toBe(false);
    });
  });

  describe('isPlainObject', () => {
    it('should return true for object literals', () => {
      expect(Types.isPlainObject({})).toBe(true);
      expect(Types.isPlainObject({ a: 1 })).toBe(true);
      expect(Types.isPlainObject(new Object())).toBe(true);
      expect(Types.isPlainObject(Object.create(null))).toBe(true);
    });

    it('should return false for other types', () => {
      expect(Types.isPlainObject([])).toBe(false);
      expect(Types.isPlainObject(null)).toBe(false);
      expect(Types.isPlainObject(undefined)).toBe(false);
      expect(Types.isPlainObject(new Date())).toBe(false);
      expect(Types.isPlainObject(new Map())).toBe(false);
      expect(Types.isPlainObject(() => 1)).toBe(false);
    });

    it('should return false for class instances', () => {
      class Person {
        name = 'a';
      }
      expect(Types.isPlainObject(new Person())).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('should return true for functions', () => {
      expect(Types.isFunction(() => 1)).toBe(true);
      expect(Types.isFunction(function named() {})).toBe(true);
      expect(Types.isFunction(class Foo {})).toBe(true);
    });

    it('should return false for non functions', () => {
      expect(Types.isFunction({})).toBe(false);
      expect(Types.isFunction(null)).toBe(false);
      expect(Types.isFunction(1)).toBe(false);
    });
  });

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(Types.isArray([])).toBe(true);
      expect(Types.isArray([1])).toBe(true);
    });

    it('should return false for non arrays', () => {
      expect(Types.isArray({})).toBe(false);
      expect(Types.isArray('a')).toBe(false);
      expect(Types.isArray(null)).toBe(false);
    });
  });

  describe('isMap', () => {
    it('should return true for maps', () => {
      expect(Types.isMap(new Map())).toBe(true);
    });

    it('should return false for non maps', () => {
      expect(Types.isMap({})).toBe(false);
      expect(Types.isMap(new Set())).toBe(false);
      expect(Types.isMap(null)).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty primitives', () => {
      expect(Types.isEmpty(undefined)).toBe(true);
      expect(Types.isEmpty(null)).toBe(true);
      expect(Types.isEmpty('')).toBe(true);
    });

    it('should return false for non empty primitives', () => {
      expect(Types.isEmpty(0)).toBe(false);
      expect(Types.isEmpty(false)).toBe(false);
      expect(Types.isEmpty('a')).toBe(false);
      expect(Types.isEmpty(Symbol('a'))).toBe(false);
    });

    it('should handle dates', () => {
      expect(Types.isEmpty(new Date('invalid'))).toBe(true);
      expect(Types.isEmpty(new Date(0))).toBe(false);
    });

    it('should handle maps', () => {
      expect(Types.isEmpty(new Map())).toBe(true);
      expect(Types.isEmpty(new Map([['a', 1]]))).toBe(false);
    });

    it('should handle arrays', () => {
      expect(Types.isEmpty([])).toBe(true);
      expect(Types.isEmpty([1])).toBe(false);
      expect(Types.isEmpty([null])).toBe(true);
      expect(Types.isEmpty([undefined])).toBe(true);
      expect(Types.isEmpty([1, 2])).toBe(false);
    });

    it('should handle objects', () => {
      expect(Types.isEmpty({})).toBe(true);
      expect(Types.isEmpty({ a: 1 })).toBe(false);
    });

    it('should delegate to an isEmpty function when present', () => {
      expect(Types.isEmpty({ isEmpty: () => true })).toBe(true);
      expect(Types.isEmpty({ isEmpty: () => false })).toBe(false);
    });
  });

  describe('isEqual', () => {
    it('should compare primitives', () => {
      expect(Types.isEqual(1, 1)).toBe(true);
      expect(Types.isEqual(1, 2)).toBe(false);
      expect(Types.isEqual('a', 'a')).toBe(true);
      expect(Types.isEqual(null, null)).toBe(true);
      expect(Types.isEqual(undefined, undefined)).toBe(true);
      expect(Types.isEqual(null, undefined)).toBe(false);
    });

    it('should compare dates by time', () => {
      expect(Types.isEqual(new Date(1000), new Date(1000))).toBe(true);
      expect(Types.isEqual(new Date(1000), new Date(2000))).toBe(false);
    });

    it('should compare array buffers by bytes', () => {
      const buffer = (value: number) => new Uint8Array([value]).buffer;
      expect(Types.isEqual(buffer(1), buffer(1))).toBe(true);
      expect(Types.isEqual(buffer(1), buffer(2))).toBe(false);
      expect(Types.isEqual(buffer(1), new ArrayBuffer(2))).toBe(false);
    });

    it('should compare arrays deeply', () => {
      expect(Types.isEqual([1, 2], [1, 2])).toBe(true);
      expect(Types.isEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(Types.isEqual([{ a: 1 }], [{ a: 1 }])).toBe(true);
      expect(Types.isEqual([{ a: 1 }], [{ a: 2 }])).toBe(false);
    });

    it('should compare objects deeply', () => {
      expect(Types.isEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(Types.isEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(Types.isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
      expect(Types.isEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
      expect(Types.isEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false);
    });

    it('should compare functions by source', () => {
      expect(
        Types.isEqual(
          () => 1,
          () => 1,
        ),
      ).toBe(true);
      expect(
        Types.isEqual(
          () => 1,
          () => 2,
        ),
      ).toBe(false);
    });

    it('should return false for different types', () => {
      expect(Types.isEqual(1, '1')).toBe(false);
      expect(Types.isEqual([], {})).toBe(false);
      expect(Types.isEqual(new Date(1), 1)).toBe(false);
    });
  });

  describe('clone', () => {
    it('should clone wrapper types', () => {
      const date = new Date(1000);
      expect(Types.clone(date)).toEqual(new Date(1000));
      expect(Types.clone(date)).not.toBe(date);
    });

    it('should wrap primitives in their object type', () => {
      expect(Types.rawType(Types.clone(1))).toBe('Number');
      expect(Number(Types.clone(1))).toBe(1);
      expect(Types.rawType(Types.clone('a'))).toBe('String');
      expect(String(Types.clone('a'))).toBe('a');
      expect(Types.rawType(Types.clone(true))).toBe('Boolean');
      expect((Types.clone(false) as Boolean).valueOf()).toBe(false);
    });

    it('should clone a regular expression', () => {
      const result = Types.clone(/abc/);
      expect(result).toBeInstanceOf(RegExp);
      expect(result.source).toBe('abc');
    });

    it('should preserve the lastIndex of a regular expression', () => {
      const regex = /abc/g;
      regex.lastIndex = 3;
      expect(Types.clone(regex).lastIndex).toBe(3);
    });

    it('should clone a symbol', () => {
      const symbol = Symbol('a');
      const result = Types.clone(symbol);
      expect(Types.rawType(result)).toBe('Symbol');
      expect(Symbol.prototype.valueOf.call(result)).toBe(symbol);
    });

    it('should return the same function', () => {
      const fn = () => 1;
      expect(Types.clone(fn)).toBe(fn);
    });

    it('should return null for unsupported types', () => {
      expect(Types.clone({})).toBeNull();
      expect(Types.clone([])).toBeNull();
      expect(Types.clone(new Map())).toBeNull();
    });
  });
});
