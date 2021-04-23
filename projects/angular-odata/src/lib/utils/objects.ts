import { Types } from "./types";

export const Objects = {
  set(obj: Object, path: string, value: any) {
    // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
    const pathArray = (Types.isArray(path) ? path : path.match(/([^[.\]])+/g)) as any[];

    pathArray.reduce((acc, key, i) => {
      if (acc[key] === undefined) acc[key] = {};
      if (i === pathArray.length - 1) acc[key] = value;
      return acc[key];
    }, obj);
  },

  get(obj: Object, path: string, def?: any): any {
    // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
    const pathArray = (Types.isArray(path) ? path : path.match(/([^[.\]])+/g)) as any[];
    // Find value if exist return otherwise return undefined value;
    return (pathArray.reduce((prevObj, key) => prevObj && prevObj[key], obj) || def);
  },

  unset(obj: Object, path: string) {
    // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
    const pathArray = (Types.isArray(path) ? path : path.match(/([^[.\]])+/g)) as any[];

    pathArray.reduce((acc, key, i) => {
      if (i === pathArray.length - 1) delete acc[key];
      return acc[key];
    }, obj);
  },

  has(obj: Object, path: string) {
    // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
    const pathArray = (Types.isArray(path) ? path : path.match(/([^[.\]])+/g)) as any[];

    return !!pathArray.reduce((prevObj, key) => prevObj && prevObj[key], obj);
  },

  merge(target: Object, source: Object) {
    const merge = (target: any, source: { [attr: string]: any }) => {
      for (let attr in source) {
        let value = source[attr];
        if (value !== null && Types.isObject(value) && attr in target) {
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
      const areObjects = Types.isObject(val1) && Types.isObject(val2);
      if (
        areObjects && !Objects.equal(val1, val2) ||
        !areObjects && val1 !== val2
      ) {
        return false;
      }
    }
    return true;
  },

  difference(object1: { [attr: string]: any }, object2: { [attr: string]: any }) {
    if (!object2 || !Types.isObject(object2)) {
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

      if (Types.isObject(item1)) {
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
  uniqueId: (counter => (str = '') => `${str}${++counter}`)(0)
}
