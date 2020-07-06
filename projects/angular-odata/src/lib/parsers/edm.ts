import { Parser } from '../types';

// InMemory Filter!
// https://github.com/jaystack/odata-v4-inmemory/
const DATE = <Parser<Date>>{
  deserialize(value: any): Date {
    return new Date(value);
  },
  serialize(value: Date): any {
    return value.toISOString();
  }
};

export const DATE_PARSER: { [type: string]: Parser<any> } = {
  'Edm.Date': DATE,
  'Edm.DateTimeOffset': DATE
};

export const DECIMAL_PARSER: { [type: string]: Parser<any> } = {
  'Edm.Decimal': <Parser<number>>{
    deserialize(value: any): number {
      if (this.ieee754Compatible) {
        return Number(value);
      }
      return value;
    },
    serialize(value: number): any {
      if (this.ieee754Compatible) {
        return parseFloat(value.toPrecision(this.precision)).toFixed(this.scale);
      }
      return value;
    }
  }
};

export const DOUBLE_PARSER: { [type: string]: Parser<any> } = {
  'Edm.Double': <Parser<number>>{
    deserialize(value: any): number {
      if (value === 'INF') return Infinity;
      return DECIMAL_PARSER['Decimal'].deserialize(value);
    },
    serialize(value: number): any {
      if (value === Infinity) return 'INF';
      return DECIMAL_PARSER['Decimal'].serialize(value);
    }
  }
};

export const TIME_PARSER: { [type: string]: Parser<any> } = {
  'Edm.Time': <Parser<Date>>{
    deserialize(value: any): Date {
      return new Date(`1970-01-01T${value}Z`);
    },
    serialize(value: Date): any {
      return value.toTimeString();
    }
  }
};

export const DURATION_PARSER: { [type: string]: Parser<any> } = {
  'Edm.Duration': <Parser<Date>>{
    deserialize(value: any): Date {
      var m = value.match(/P([0-9]*D)?T?([0-9]{1,2}H)?([0-9]{1,2}M)?([\.0-9]*S)?/)
      if (m) {
        var d = new Date(0);
        for (var i = 1; i < m.length; i++) {
          switch (m[i].slice(-1)) {
            case 'D': d.setDate(parseInt(m[i])); continue;
            case 'H': d.setHours(parseInt(m[i])); continue;
            case 'M': d.setMinutes(parseInt(m[i])); continue;
            case 'S': d.setSeconds(parseInt(m[i])); continue;
          }
        }
        return d;
      }
    },
    serialize(value: Date): any {
      //TODO: serialize duration from Date
      return value.toTimeString();
    }
  }
};

export const EDM_PARSERS = Object.assign({},
  DATE_PARSER,
  DECIMAL_PARSER,
  DOUBLE_PARSER,
  TIME_PARSER,
  DURATION_PARSER);