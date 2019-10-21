export const Enums = {
  toValue<E>(Enum: E, value: any): number[] {
    return Enum[value];
  },

  toValues<E>(Enum: E, value: any): number[] {
    if (typeof value === 'string'){
      value = value.split(", ")
    } else { 
      value = [value];
    }
    return value.map(opcion => Enum[opcion]);
  },

  toEnum<E>(Enum: E, value: any): string {
    return Enum[value];
  },
  
  toEnums<E>(Enum: E, value: any): string[] {
    let opciones = Object.keys(Enum).filter(key => !isNaN(Number(Enum[key])));
    opciones.reverse();
    opciones = opciones.filter(name => {
      let opcion = Enum[name];
      return (opcion & value) === opcion;
    });
    return opciones;
  },

  toFlags<E>(Enum: E, value: any): number {
    if (typeof value === "number") {
      return value;
    }
    return this.toValues(Enum, value).reduce((flags, value) => flags | value, 0);
  }
}