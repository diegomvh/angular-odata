export const Enums = {
  names<E>(Enum: E): string[] {
    return Object.values(Enum).filter((v) => typeof v === 'string');
  },

  values<E>(Enum: E): number[] {
    return Object.values(Enum).filter((v) => typeof v === 'number');
  },

  toValue<E>(Enum: E, value: any): number {
    if (value in Enum)
      return typeof value === 'string' ? (Enum as any)[value] : value;
    return NaN;
  },

  toValues<E>(Enum: E, value: any): number[] {
    if (typeof value === 'number') {
      return this.values(Enum).filter((v) => (value & v) === v);
    }
    if (typeof value === 'string') {
      value = value.split(',').map((o) => o.trim());
    }
    if (Array.isArray(value) && value.every((v) => v in Enum)) {
      return value.map((o) => this.toValue(Enum, o));
    }
    return [];
  },

  toName<E>(Enum: E, value: any): string {
    if (value in Enum)
      return typeof value === 'number' ? (Enum as any)[value] : value;
    return '';
  },

  toNames<E>(Enum: E, value: any): string[] {
    if (typeof value === 'number') {
      return this.values(Enum)
        .filter((v) => (value & v) === v)
        .map((v) => this.toName(Enum, v));
    }
    if (typeof value === 'string') {
      value = value.split(',').map((o) => o.trim());
    }
    if (Array.isArray(value) && value.every((v) => v in Enum)) {
      return value.map((o) => this.toName(Enum, o) as string);
    }
    return [];
  },
};
