import { Types } from './types';
import { Tags } from './tags';

/** Used to match property names within property paths. */
const rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,
  reEscapeChar = /\\(\\)?/g;

const symbolProto = Symbol ? Symbol.prototype : undefined,
  symbolToString = symbolProto ? symbolProto.toString : undefined;
const INFINITY = 1 / 0;

const stringToPath = function (string) {
  var result = [];
  if (string.charCodeAt(0) === 46 /* . */) {
    result.push('');
  }
  string.replace(rePropName, function (match, number, quote, subString) {
    result.push(quote ? subString.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
};

function arrayMap(array, iteratee) {
  var index = -1,
    length = array == null ? 0 : array.length,
    result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (Types.isArray(value)) {
    // Recursively convert values (susceptible to call stack limits).
    return arrayMap(value, baseToString) + '';
  }
  if (Types.isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

function toString(value) {
  return value == null ? '' : baseToString(value);
}

function castPath(value, object) {
  if (Types.isArray(value)) {
    return value;
  }
  return Types.isKey(value, object) ? [value] : stringToPath(toString(value));
}

function toKey(value) {
  if (typeof value == 'string' || Types.isSymbol(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

function assignValue(object, key, value) {
  var objValue = object[key];
  if (!(Object.prototype.hasOwnProperty.call(object, key) && eq(objValue, value)) ||
    (value === undefined && !(key in object))) {
    object[key] = value;
  }
}

function baseIsArguments(value) {
  return Types.isObjectLike(value) && Tags.baseGetTag(value) == '[object Arguments]';
}

var isArguments = baseIsArguments(function () { return arguments; }()) ? baseIsArguments : function (value) {
  return Types.isObjectLike(value) && Object.prototype.hasOwnProperty.call(value, 'callee') &&
    !Object.prototype.propertyIsEnumerable.call(value, 'callee');
};

export function baseSet(object, path, value, customizer) {
  if (!Types.isObject(object)) {
    return object;
  }
  path = castPath(path, object);

  var index = -1,
    length = path.length,
    lastIndex = length - 1,
    nested = object;

  while (nested != null && ++index < length) {
    var key = toKey(path[index]),
      newValue = value;

    if (index != lastIndex) {
      var objValue = nested[key];
      newValue = customizer ? customizer(objValue, key, nested) : undefined;
      if (newValue === undefined) {
        newValue = Types.isObject(objValue)
          ? objValue
          : (Types.isIndex(path[index + 1]) ? [] : {});
      }
    }
    assignValue(nested, key, newValue);
    nested = nested[key];
  }
  return object;
}

export function baseGet(object, path) {
  path = castPath(path, object);

  var index = 0,
    length = path.length;

  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return (index && index == length) ? object : undefined;
}

export function hasPath(object, path, hasFunc) {
  path = castPath(path, object);

  var index = -1,
    length = path.length,
    result = false;

  while (++index < length) {
    var key = toKey(path[index]);
    if (!(result = object != null && hasFunc(object, key))) {
      break;
    }
    object = object[key];
  }
  if (result || ++index != length) {
    return result;
  }
  length = object == null ? 0 : object.length;
  return !!length && Types.isLength(length) && Types.isIndex(key, length) &&
    (Types.isArray(object) || isArguments(object));
}