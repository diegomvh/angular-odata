export const Enums = {
  toValues<E>(Enum: E, value: any): number[] {
    if (typeof value === 'string'){
      value = value.split(", ")
    } else { 
      value = [value];
    }
    return value.map(opcion => Enum[opcion]);
  },

  toString<E>(Flags: E, value: number): string {
    let opciones = Object.keys(Flags).filter(key => !isNaN(Number(Flags[key])));
    opciones.reverse();
    opciones = opciones.filter(name => {
      let opcion = Flags[name];
      return (opcion & value) === opcion;
    });
    return opciones.join(", ");
  },
  
  toFlags<E>(Enum: E, value: any): number {
    if (typeof value === "number") {
      return value;
    }
    return this.toValues(Enum, value).reduce((flags, value) => flags | value, 0);
  }
}