export const Types = {
  isObject(value: any): boolean {
    var type = typeof value;
    return value != null && (type === 'object' || type === 'function');
  },

  isFunction(value: any): boolean {
    return typeof value === "function";
  },

  isArray(value: any): boolean {
    return Array.isArray(value);
  },

  isEmpty(value: any): boolean {
    return value === undefined
      || value === null
      || (typeof (value) === 'string' && !value.length)
      || (Types.isArray(value) && !value.length)
      || (Types.isFunction(value.isEmpty) && value.isEmpty())
      || (Types.isArray(value) && (value as any[]).every(v => Types.isEmpty(v)))
      || (Types.isObject(value) && !Object.keys(value).filter(k => value.hasOwnProperty(k)).length);
  },

  isEqual(value1: any, value2: any) {
    const type1 = typeof value1;
    const type2 = typeof value2;
    if (type1 !== type2) return false;
    if (value1 instanceof Date) {
      return value1.getTime() === value2.getTime();
    }
    if (value1 instanceof ArrayBuffer) {
      if (value1 === value2) {
        return true;
      }

      if (value1.byteLength !== value2.byteLength) {
        return false;
      }

      var view1 = new DataView(value1);
      var view2 = new DataView(value2);

      var i = value1.byteLength;
      while (i--) {
        if (view1.getUint8(i) !== view2.getUint8(i)) {
          return false;
        }
      }

      return true;
    }
    return value1 === value2;
  }
}
