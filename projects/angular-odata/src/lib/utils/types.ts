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

  isFunction(value: any): boolean {
    return typeof value === "function";
  },

  isArray(value: any): boolean {
    return Array.isArray(value);
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
