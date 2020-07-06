import { Parser } from '../types';

// InMemory Filter!
// https://github.com/jaystack/odata-v4-inmemory/
export const DATE_PARSERS: { [type: string]: Parser<any> } = {
  'Edm.Date': <Parser<Date>>{
    deserialize(value: any): Date {
      return new Date(value);
    },
    serialize(value: Date): any {
      return value.toISOString();
    }
  },
  'Edm.DateTimeOffset': <Parser<Date>>{
    deserialize(value: any): Date {
      return new Date(value);
    },
    serialize(value: Date): any {
      return value.toISOString();
    }
  },
  'Edm.TimeOfDay': <Parser<Date>>{
    deserialize(value: any): Date {
      return new Date(`1970-01-01T${value}Z`);
    },
    serialize(value: Date): any {
      //TODO: serialize Time from Date
      return value.toTimeString();
    }
  },
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

export const NUMBER_PARSERS: { [type: string]: Parser<any> } = {
  'Edm.Decimal': <Parser<number>>{
    deserialize(value: any): number {
      if (this.ieee754Compatible) {
        return parseFloat(value);
      }
      return value;
    },
    serialize(value: number): any {
      if (this.ieee754Compatible) {
        return parseFloat(value.toPrecision(this.precision)).toFixed(this.scale);
      }
      return value;
    }
  },
  'Edm.Double': <Parser<number>>{
    deserialize(value: any): number {
      if (value === 'INF') return Infinity;
      return value;
    },
    serialize(value: number): any {
      if (value === Infinity) return 'INF';
      return value;
    }
  }
};

export const EDM_PARSERS = Object.assign({}, DATE_PARSERS, NUMBER_PARSERS);