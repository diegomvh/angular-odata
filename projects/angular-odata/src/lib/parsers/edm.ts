import { Parser } from '../types';
import { Duration } from './types';

export const DATE_PARSERS: { [type: string]: Parser<any> } = {
  'Edm.Date': <Parser<Date>>{
    deserialize(value: any): Date {
      return new Date(`${value}T00:00:00.000Z`);
    },
    serialize(value: Date): any {
      return value.toISOString().substring(0, 10);
    }
  },
  'Edm.TimeOfDay': <Parser<Date>>{
    deserialize(value: any): Date {
      return new Date(`1970-01-01T${value}Z`);
    },
    serialize(value: Date): any {
      return value.toISOString().substring(11, 23);
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
  'Edm.Duration': <Parser<Duration>>{
    deserialize(value: any): Duration {
      const matches = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/.exec(value);
      if (!matches || value.length < 3) {
        throw new TypeError(`duration invalid: "${value}". Must be a ISO 8601 duration. See https://en.wikipedia.org/wiki/ISO_8601#Durations`)
      }
      let duration: Duration = {};
      if (matches[1] === '-')
        duration.sign = matches[1];
      return ['years', 'months', 'days', 'hours', 'minutes', 'seconds'].reduce((acc, name, index) => {
        const v = parseFloat(matches[index + 3]);
        if (!Number.isNaN(v))
          acc[name] = v;
        return acc;
      }, duration) as Duration;
    },
    serialize(d: Duration): any {
      return [
        (d.sign === '-') ? d.sign : '',
        'P',
        d.years ? d.years + 'Y' : '',
        d.months ? d.months + 'M' : '',
        d.days ? d.days + 'D' : '',
        'T',
        d.hours ? d.hours + 'D' : '',
        d.minutes ? d.minutes + 'M' : '',
        d.seconds ? d.seconds + 'S' : '',
      ].join("");
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
  },
  'Edm.Single': <Parser<number>>{
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

//https://github.com/niklasvh/base64-arraybuffer
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Use a lookup table to find the index.
const lookup = new Uint8Array(256);
for (var i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}

export const BINARY_PARSERS: { [type: string]: Parser<any> } = {
  'Edm.Binary': <Parser<ArrayBuffer>>{
    deserialize(base64: any): ArrayBuffer {
      var bufferLength = base64.length * 0.75,
        len = base64.length, i, p = 0,
        encoded1, encoded2, encoded3, encoded4;

      if (base64[base64.length - 1] === "=") {
        bufferLength--;
        if (base64[base64.length - 2] === "=") {
          bufferLength--;
        }
      }

      var arraybuffer = new ArrayBuffer(bufferLength),
        bytes = new Uint8Array(arraybuffer);

      for (i = 0; i < len; i += 4) {
        encoded1 = lookup[base64.charCodeAt(i)];
        encoded2 = lookup[base64.charCodeAt(i + 1)];
        encoded3 = lookup[base64.charCodeAt(i + 2)];
        encoded4 = lookup[base64.charCodeAt(i + 3)];

        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
      }

      return arraybuffer;
    },
    serialize(arrayBuffer: ArrayBuffer): any {
      var bytes = new Uint8Array(arrayBuffer),
        i, len = bytes.length, base64 = "";

      for (i = 0; i < len; i += 3) {
        base64 += chars[bytes[i] >> 2];
        base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64 += chars[bytes[i + 2] & 63];
      }

      if ((len % 3) === 2) {
        base64 = base64.substring(0, base64.length - 1) + "=";
      } else if (len % 3 === 1) {
        base64 = base64.substring(0, base64.length - 2) + "==";
      }

      return base64;
    }
  }
}

export const EDM_PARSERS = Object.assign({}, DATE_PARSERS, NUMBER_PARSERS, BINARY_PARSERS);