import { Parser, StructuredTypeFieldOptions } from '../types';

//https://en.wikipedia.org/wiki/ISO_8601#Durations

type Duration = {
  sign?: 1 | -1;
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

//https://github.com/niklasvh/base64-arraybuffer
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Use a lookup table to find the index.
const lookup = new Uint8Array(256);
for (var i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}

export const EDM_PARSERS: { [type: string]: Parser<any> } = {
  'Edm.Date': <Parser<Date | Date[]>>{
    deserialize(value: string | string[], options: StructuredTypeFieldOptions): Date | Date[] {
      const _deserialize = (v: string) => new Date(`${v}T00:00:00.000Z`);
      return Array.isArray(value) ? value.map(_deserialize) : _deserialize(value);
    },
    serialize(value: Date | Date[], options: StructuredTypeFieldOptions): string | string[] {
      const _serialize = (v: Date) => v.toISOString().substring(0, 10);
      return Array.isArray(value) ? value.map(_serialize) : _serialize(value);
    }
  },
  'Edm.TimeOfDay': <Parser<Date | Date[]>>{
    deserialize(value: string | string[], options: StructuredTypeFieldOptions): Date | Date [] {
      const _deserialize = (v: string) => new Date(`1970-01-01T${v}Z`);
      return Array.isArray(value) ? value.map(_deserialize) : _deserialize(value);
    },
    serialize(value: Date | Date[], options: StructuredTypeFieldOptions): string | string[] {
      const _serialize = (v: Date) => v.toISOString().substring(11, 23);
      return Array.isArray(value) ? value.map(_serialize) : _serialize(value);
    }
  },
  'Edm.DateTimeOffset': <Parser<Date>>{
    deserialize(value: string | string[], options: StructuredTypeFieldOptions): Date | Date [] {
      const _deserialize = (v: string) => new Date(v);
      return Array.isArray(value) ? value.map(_deserialize) : _deserialize(value);
    },
    serialize(value: Date, options: StructuredTypeFieldOptions): string | string[] {
      const _serialize = (v: Date) => v.toISOString();
      return Array.isArray(value) ? value.map(_serialize) : _serialize(value);
    }
  },
  'Edm.Duration': <Parser<Duration>>{
    deserialize(value: string, options: StructuredTypeFieldOptions): Duration | Duration[] {
      const matches = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/.exec(value);
      const _deserialize = (v: string) => {
        if (!matches || value.length < 3) {
          throw new TypeError(`duration invalid: "${value}". Must be a ISO 8601 duration. See https://en.wikipedia.org/wiki/ISO_8601#Durations`)
        }
        let duration: Duration = {};
        duration.sign = (matches[1] === '-') ? -1 : 1;
        return ['years', 'months', 'days', 'hours', 'minutes', 'seconds'].reduce((acc: any, name, index) => {
          const v = parseFloat(matches[index + 3]);
          if (!Number.isNaN(v))
            acc[name] = v;
          return acc;
        }, duration) as Duration;
      }
      return Array.isArray(value) ? value.map(_deserialize) : _deserialize(value);
    },
    serialize(value: Duration | Duration[], options: StructuredTypeFieldOptions): string | string[] {
      const _serialize = (v: Duration) => [
        (v.sign === -1) ? '-' : '',
        'P',
        v.years ? v.years + 'Y' : '',
        v.months ? v.months + 'M' : '',
        v.days ? v.days + 'D' : '',
        'T',
        v.hours ? v.hours + 'H' : '',
        v.minutes ? v.minutes + 'M' : '',
        v.seconds ? v.seconds + 'S' : '',
      ].join("");
      return Array.isArray(value) ? value.map(_serialize) : _serialize(value);
    }
  },
  'Edm.Decimal': <Parser<number>>{
    deserialize(value: string | number | (string | number)[], options: StructuredTypeFieldOptions): string | number | (string | number)[] {
      const _deserialize = (v: string | number) => {
        if (typeof v === 'string' && options.ieee754Compatible) {
          return parseFloat(v);
        }
        return v;
      }
      return Array.isArray(value) ? value.map(_deserialize) : _deserialize(value);
    },
    serialize(value: number | number[], options: StructuredTypeFieldOptions): string | number | (string | number)[] {
      const _serialize = (v: number) => {
        if (options.ieee754Compatible) {
          return parseFloat(v.toPrecision(options.field.precision)).toFixed(options.field.scale);
        }
        return v;
      }
      return Array.isArray(value) ? value.map(_serialize) : _serialize(value);
    }
  },
  'Edm.Double': <Parser<number>>{
    deserialize(value: string | number | (string | number)[], options: StructuredTypeFieldOptions): number | number[] {
      const _deserialize = (v: string | number) => (v === 'INF')? Infinity : v as number;
      return Array.isArray(value) ? value.map(_deserialize) : _deserialize(value);
    },
    serialize(value: number | number[], options: StructuredTypeFieldOptions): string | number | (string | number)[] {
      const _serialize = (v: number) => (v === Infinity)? 'INF' : v;
      return Array.isArray(value) ? value.map(_serialize) : _serialize(value);
    }
  },
  'Edm.Single': <Parser<number>>{
    deserialize(value: string | number | (string | number)[], options: StructuredTypeFieldOptions): number | number[] {
      const _deserialize = (v: string | number) => (v === 'INF')? Infinity : v as number;
      return Array.isArray(value) ? value.map(_deserialize) : _deserialize(value);
    },
    serialize(value: number | number[], options: StructuredTypeFieldOptions): string | number | (string | number)[] {
      const _serialize = (v: number) => (v === Infinity)? 'INF' : v;
      return Array.isArray(value) ? value.map(_serialize) : _serialize(value);
    }
  },
  'Edm.Binary': <Parser<ArrayBuffer>>{
    deserialize(value: string | string[], options: StructuredTypeFieldOptions): ArrayBuffer | ArrayBuffer[] {
      const _deserialize = (v: string) => {
        var bufferLength = v.length * 0.75,
          len = v.length, i, p = 0,
          encoded1, encoded2, encoded3, encoded4;

        if (v[v.length - 1] === "=") {
          bufferLength--;
          if (v[v.length - 2] === "=") {
            bufferLength--;
          }
        }

        var arraybuffer = new ArrayBuffer(bufferLength),
          bytes = new Uint8Array(arraybuffer);

        for (i = 0; i < len; i += 4) {
          encoded1 = lookup[v.charCodeAt(i)];
          encoded2 = lookup[v.charCodeAt(i + 1)];
          encoded3 = lookup[v.charCodeAt(i + 2)];
          encoded4 = lookup[v.charCodeAt(i + 3)];

          bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
          bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
          bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }

        return arraybuffer;
      }
      return Array.isArray(value) ? value.map(_deserialize) : _deserialize(value);
    },
    serialize(value: ArrayBuffer | ArrayBuffer[], options: StructuredTypeFieldOptions): string | string[] {
      const _serialize = (v: ArrayBuffer) => {
        var bytes = new Uint8Array(v),
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
      return Array.isArray(value) ? value.map(_serialize) : _serialize(value);
    }
  }
}
