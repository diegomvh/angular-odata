const symToStringTag = Symbol ? Symbol.toStringTag : undefined;

export const Tags = {
  getRawTag(value) {
    var isOwn = Object.prototype.hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

    try {
      value[symToStringTag] = undefined;
      var unmasked = true;
    } catch (e) { }

    var result = Object.prototype.toString.call(value);
    if (unmasked) {
      if (isOwn) {
        value[symToStringTag] = tag;
      } else {
        delete value[symToStringTag];
      }
    }
    return result;
  },

  baseGetTag(value) {
    if (value == null) {
      return value === undefined ? '[object Undefined]' : '[object Null]';
    }
    return (symToStringTag && symToStringTag in Object(value))
      ? Tags.getRawTag(value)
      : Object.prototype.toString.call(value);
  }
}