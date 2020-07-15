export const Enums = {
  names<E>(Enum: E): string[] {
    return Object.keys(Enum).filter(k => typeof Enum[k] === 'number');
  },
  
  values<E>(Enum: E): number[] {
    return Object.values(Enum).filter(v => typeof v === 'number');
  },

  toValue<E>(Enum: E, value: any): number {
    return Enum[value];
  },

  toValues<E>(Enum: E, value: any): number[] {
    if (typeof value === 'string') {
      return value.split(',').map(opcion => this.toValue(Enum, opcion.trim()));
    } else if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
      return value.map(opcion => this.toValue(Enum, opcion.trim()));
    } else if (typeof value === 'number') {
      return this.values(Enum).filter(v => (value & v) === v);
    }
  },

  toName<E>(Enum: E, value: any): string {
    return Enum[value];
  },
  
  toNames<E>(Enum: E, value: any): string[] {
    if (typeof value === 'number') {
      return this.names(Enum)
        .filter(k => (value & Enum[k]) === Enum[k]);
    } else if (Array.isArray(value) && value.every(v => typeof v === 'number')) {
      return value.map(v => this.toName(Enum, v));
    } 
  }
}