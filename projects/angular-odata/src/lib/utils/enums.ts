export const Enums = {
  names<E extends { [key: string]: any }>(enums: E): string[] {
    return Object.values<string>(enums).filter((v) => typeof v === 'string');
  },

  values<E extends { [key: string]: any }>(enums: E): number[] {
    return Object.values<number>(enums).filter((v) => typeof v === 'number');
  },

  toValue<E extends { [key: string]: any }>(
    enums: E,
    value: any
  ): number | undefined {
    if (value in enums) return typeof value === 'string' ? enums[value] : value;
    return undefined;
  },

  toValues<E extends { [key: string]: any }>(enums: E, value: any): number[] {
    if (typeof value === 'number') {
      return this.values(enums).filter((v) => (value & v) === v);
    }
    if (typeof value === 'string') {
      value = value.split(',').map((o) => o.trim());
    }
    if (Array.isArray(value) && value.every((v) => v in enums)) {
      return value.map((o) => this.toValue(enums, o) as number);
    }
    return [];
  },

  toName<E extends { [key: string]: any }>(
    enums: E,
    value: any
  ): string | undefined {
    if (value in enums) return typeof value === 'number' ? enums[value] : value;
    return undefined;
  },

  toNames<E extends { [key: string]: any }>(enums: E, value: any): string[] {
    if (typeof value === 'number') {
      return this.values(enums)
        .filter((v) => (value & v) === v)
        .map((v) => this.toName(enums, v) as string);
    }
    if (typeof value === 'string') {
      value = value.split(',').map((o) => o.trim());
    }
    if (Array.isArray(value) && value.every((v) => v in enums)) {
      return value.map((o) => this.toName(enums, o) as string);
    }
    return [];
  },

  toFlags<E extends { [key: string]: any }>(enums: E, value: any): string[] {
    if (typeof value === 'number') {
      return this.values(enums)
        .filter((v) => v !== 0 && (value & v) === v)
        .map((v) => this.toName(enums, v) as string);
    }
    if (typeof value === 'string') {
      value = value.split(',').map((o) => o.trim());
    }
    if (Array.isArray(value) && value.every((v) => v in enums)) {
      return value
        .filter((v) => enums[v])
        .map((v) => this.toName(enums, v) as string);
    }
    return [];
  },
};
