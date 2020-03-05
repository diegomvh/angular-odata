export const Enums = {
  keys<E>(Enum: E) {
    return Object.keys(Enum).filter(k => typeof Enum[k] === 'number');
  },
  
  values<E>(Enum: E) {
    return Object.keys(Enum).filter(k => typeof Enum[k] === 'string');
  },

  toValue<E>(Enum: E, value: any): number[] {
    return Enum[value];
  },

  toValues<E>(Enum: E, value: any): number[] {
    if (typeof value === 'string'){
      return value.split(", ").map(opcion => Enum[opcion]);
    } else if (typeof value === 'number') {
      return Object.values(Enum).filter(v => typeof v === "number" && (value & v) === v);
    }
    return [value];
  },

  toEnum<E>(Enum: E, value: any): string {
    return Enum[value];
  },
  
  toEnums<E>(Enum: E, value: any): string[] {
    if (typeof value === 'number') {
      return Object.values(Enum)
        .filter(e => typeof e === "string" && (Enum[e] & value) === Enum[e]);
    }
    return [value.toString()];
  },

  toFlags<E>(Enum: E, value: any): number {
    if (typeof value === "string") {
      return this.toValues(Enum, value).reduce((flags, v) => flags | v, 0);
    }
    return Number(value);
  },

  toString<E>(Enum: E, value: any): string {
    return this.toEnums(Enum, value).join(", ");
  }
}