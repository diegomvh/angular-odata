import { Types } from './types';

function forEach(array: any[], iteratee: (value: any, index: number) => void) {
  let index = -1;
  const length = array.length;
  while (++index < length) {
    iteratee(array[index], index);
  }
  return array;
}

export const Objects = {
  set(obj: Object, path: string, value: any) {
    // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
    const pathArray = (
      Types.isArray(path) ? path : path.match(/([^[.\]])+/g)
    ) as any[];

    pathArray.reduce((acc, key, i) => {
      if (acc[key] === undefined) acc[key] = {};
      if (i === pathArray.length - 1) acc[key] = value;
      return acc[key];
    }, obj);
  },

  get(obj: Object, path: string, def?: any): any {
    // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
    const pathArray = (
      Types.isArray(path) ? path : path.match(/([^[.\]])+/g)
    ) as any[];
    // Find value if exist return otherwise return undefined value;
    return (
      pathArray.reduce((prevObj, key) => prevObj && prevObj[key], obj) || def
    );
  },

  unset(obj: Object, path: string) {
    // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
    const pathArray = (
      Types.isArray(path) ? path : path.match(/([^[.\]])+/g)
    ) as any[];

    pathArray.reduce((acc, key, i) => {
      if (i === pathArray.length - 1) delete acc[key];
      return acc[key];
    }, obj);
  },

  has(obj: Object, path: string) {
    // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
    const pathArray = (
      Types.isArray(path) ? path : path.match(/([^[.\]])+/g)
    ) as any[];

    return !!pathArray.reduce((prevObj, key) => prevObj && prevObj[key], obj);
  },

  merge(target: Object, source: Object) {
    const merge = (target: any, source: { [attr: string]: any }) => {
      for (let attr in source) {
        let value = source[attr];
        if (value !== null && Types.isPlainObject(value) && attr in target) {
          merge(target[attr], value);
        } else if (target[attr] !== value) {
          target[attr] = value;
        }
      }
    };
    merge(target, source);
    return target;
  },

  equal(object1: { [attr: string]: any }, object2: { [attr: string]: any }) {
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      const val1 = object1[key];
      const val2 = object2[key];
      const areObjects = Types.isPlainObject(val1) && Types.isPlainObject(val2);
      if (
        (areObjects && !Objects.equal(val1, val2)) ||
        (!areObjects && val1 !== val2)
      ) {
        return false;
      }
    }
    return true;
  },

  difference(
    object1: { [attr: string]: any },
    object2: { [attr: string]: any }
  ) {
    if (!object2 || !Types.isPlainObject(object2)) {
      return object1;
    }
    var diffs: { [name: string]: any } = {};
    var key;
    var arraysMatch = function (arr1: any[], arr2: any[]) {
      if (arr1.length !== arr2.length) return false;

      for (var i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
      }

      return true;
    };

    var compare = function (item1: any, item2: any | undefined, key: string) {
      if (item2 === undefined) {
        diffs[key] = null;
        return;
      }

      if (typeof item1 !== typeof item2) {
        diffs[key] = item2;
        return;
      }

      if (Types.isPlainObject(item1)) {
        var objDiff = Objects.difference(item1, item2);
        if (Object.keys(objDiff).length > 0) {
          diffs[key] = objDiff;
        }
        return;
      }

      if (Array.isArray(item1)) {
        if (!arraysMatch(item1, item2)) {
          diffs[key] = item2;
        }
        return;
      }

      if (item1 !== item2) {
        diffs[key] = item2;
      }
    };

    for (key in object1) {
      if (object1.hasOwnProperty(key)) {
        compare(object1[key], object2[key], key);
      }
    }

    for (key in object2) {
      if (object2.hasOwnProperty(key)) {
        if (!object1[key] && object1[key] !== object2[key]) {
          diffs[key] = object2[key];
        }
      }
    }
    return diffs;
  },

  resolveKey(key: any, { single = true }: { single?: boolean } = {}) {
    if (['number', 'string'].indexOf(typeof key) !== -1) return key;
    if (Types.isPlainObject(key)) {
      const values = Object.values(key);
      if (values.length === 1 && single) {
        // Single primitive key value
        key = values[0];
      } else if (values.some((v) => v === undefined)) {
        // Compose key, needs all values
        return undefined;
      }
      return !Types.isEmpty(key) ? key : undefined;
    }
    return undefined;
  },

  clone(target: any, map?: WeakMap<object, any>) {
    if (map === undefined) map = new WeakMap();
    // clone primitive types
    if (typeof target != 'object' || target == null) {
      return target;
    }

    const type = Types.rawType(target);
    let cloneTarget: any = null;

    if (map.get(target)) {
      return map.get(target);
    }
    map.set(target, cloneTarget);

    if (type != 'Set' && type != 'Map' && type != 'Array' && type != 'Object') {
      return Types.clone(target);
    }

    // clone Set
    if (type == 'Set') {
      cloneTarget = new Set();
      target.forEach((value: any) => {
        cloneTarget.add(this.clone(value, map));
      });
      return cloneTarget;
    }

    // clone Map
    if (type == 'Map') {
      cloneTarget = new Map();
      target.forEach((value: any, key: any) => {
        cloneTarget.set(key, this.clone(value, map));
      });
      return cloneTarget;
    }

    // clone Array
    if (type == 'Array') {
      cloneTarget = new Array();
      forEach(target, (value, index) => {
        cloneTarget[index] = this.clone(value, map);
      });
    }

    // clone normal Object
    if (type == 'Object') {
      cloneTarget = new Object();
      forEach(Object.keys(target), (key, index) => {
        cloneTarget[key] = this.clone(target[key], map);
      });
    }

    return cloneTarget;
  },
};
