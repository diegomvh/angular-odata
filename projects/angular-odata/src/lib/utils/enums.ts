export const Enums = {
  names<E>(Enum: E): string[] {
    return Object.keys(Enum).filter(
      (k) => typeof (Enum as any)[k] === 'number'
    );
  },

  values<E>(Enum: E): number[] {
    return Object.values(Enum).filter((v) => typeof v === 'number');
  },

  toValue<E>(Enum: E, value: string): number {
    return (Enum as any)[value] as number;
  },

  toValues<E>(Enum: E, value: any): number[] {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((opcion) => this.toValue(Enum, opcion.trim()));
    } else if (
      Array.isArray(value) &&
      value.every((v) => typeof v === 'string')
    ) {
      return value.map((opcion) => this.toValue(Enum, opcion.trim()));
    } else if (typeof value === 'number') {
      return this.values(Enum).filter((v) => (value & v) === v);
    }
    return [];
  },

  toName<E>(Enum: E, value: number): string {
    return (Enum as any)[value] as string;
  },

  toNames<E>(Enum: E, value: any): string[] {
    if (typeof value === 'number') {
      return this.names(Enum).filter(
        (k) => (value & (Enum as any)[k]) === (Enum as any)[k]
      );
    } else if (
      Array.isArray(value) &&
      value.every((v) => typeof v === 'number')
    ) {
      return value.map((v) => this.toName(Enum, v));
    }
    return [];
  },
};
