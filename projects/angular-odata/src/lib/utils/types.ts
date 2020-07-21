import { Tags } from './tags';

const MAX_SAFE_INTEGER = 9007199254740991;
const reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
  reIsPlainProp = /^\w*$/,
  reIsUint = /^(?:0|[1-9]\d*)$/;

export const Types = {
  isNull(value: any): boolean {
    return value === null;
  },

  isUndefined(value: any): boolean {
    return value === undefined;
  },

  isNullOrUndefined(value: any): boolean {
    return Types.isNull(value) || Types.isUndefined(value);
  },

  isObject(value: any): boolean {
    var type = typeof value;
    return !Types.isNull(value) && (type === 'object' || type === 'function');
  },

  isObjectLike(value: any): boolean {
    return value != null && typeof value == 'object';
  },

  isSymbol(value: any): boolean {
    return typeof value == 'symbol' ||
      (Types.isObjectLike(value) && Tags.baseGetTag(value) == '[object Symbol]');
  },

  isFunction(value: any): boolean {
    return typeof value === "function";
  },

  isArray(value: any): boolean {
    return Array.isArray(value);
  },

  isLength(value) {
    return typeof value == 'number' &&
      value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
  },

  isIndex(value, length?: number) {
    var type = typeof value;
    length = length == null ? MAX_SAFE_INTEGER : length;

    return !!length &&
      (type == 'number' ||
        (type != 'symbol' && reIsUint.test(value))) &&
      (value > -1 && value % 1 == 0 && value < length);
  },

  isKey(value, object) {
    if (Array.isArray(value)) {
      return false;
    }
    var type = typeof value;
    if (type == 'number' || type == 'symbol' || type == 'boolean' ||
      value == null || Types.isSymbol(value)) {
      return true;
    }
    return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
      (object != null && value in Object(object));
  },

  isEmpty(value: any): boolean {
    return Types.isNullOrUndefined(value)
      || (typeof (value) === 'string' && !value.length)
      || (Types.isArray(value) && !value.length)
      || (Types.isFunction(value.isEmpty) && value.isEmpty())
      || (Types.isArray(value) && (value as any[]).every(v => Types.isEmpty(v)))
      || (Types.isObject(value) && !Object.keys(value).filter(k => value.hasOwnProperty(k)).length);
  }
}
