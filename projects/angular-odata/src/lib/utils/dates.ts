const ISO_REGEX =
  /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;

export const Dates = {
  isoStringToDate(value: any): any {
    if (typeof value === 'string' && value.search(ISO_REGEX) === 0) {
      return new Date(value);
    } else if (Array.isArray(value)) {
      return value.map((v) => this.isoStringToDate(v));
    } else if (value && value.constructor === Object) {
      return Object.keys(value)
        .map((key) => [key, this.isoStringToDate(value[key])])
        .reduce((acc, v) => Object.assign(acc, { [v[0]]: v[1] }), {});
    }
    return value;
  },
};
