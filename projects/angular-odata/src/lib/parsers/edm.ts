import { binary, duration, raw } from '../resources/builder';
import { Parser, StructuredTypeFieldOptions } from '../types';

//https://en.wikipedia.org/wiki/ISO_8601#Durations
export type Duration = {
  sign?: 1 | -1;
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
};

//https://github.com/niklasvh/base64-arraybuffer
const chars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Use a lookup table to find the index.
const lookup = new Uint8Array(256);
for (var i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}

// Core EdmTypeParserBuilder
const EdmParser = <T>(
  _d: (v: any, o: StructuredTypeFieldOptions) => T,
  _s: (v: any, o: StructuredTypeFieldOptions) => any,
  _e: (v: any, o: StructuredTypeFieldOptions) => any
): Parser<T | T[]> => ({
  deserialize(value: any, options: StructuredTypeFieldOptions): T | T[] {
    return Array.isArray(value)
      ? value.map((v) => _d(v, options))
      : _d(value, options);
  },
  serialize(value: any, options: StructuredTypeFieldOptions): any {
    return Array.isArray(value)
      ? value.map((v) => _s(v, options))
      : _s(value, options);
  },
  encode(value: any, options: StructuredTypeFieldOptions): any {
    return Array.isArray(value)
      ? value.map((v) => _e(v, options))
      : _e(value, options);
  },
});

const Identity = (v: any) => v;
const toNumber = (v: any) => Number(v);
const toString = (v: any) => v.toString();
const toBoolean = (v: any) => Boolean(v);
const toDate = (v: any) => new Date(v);

export const EDM_PARSERS: { [type: string]: Parser<any> } = {
  //Edm.Guid 16-byte (128-bit) unique identifier
  'Edm.Guid': EdmParser<string>(Identity, Identity, (v: string) => raw(v)),
  //Edm.Int16 Signed 16-bit integer
  'Edm.Int16': EdmParser<number>(toNumber, toNumber, toNumber),
  //Edm.String Sequence of UTF-8 characters
  'Edm.String': EdmParser<string>(toString, toString, toString),
  //Edm.Boolean Binary-valued logic
  'Edm.Boolean': EdmParser<boolean>(toBoolean, toBoolean, toBoolean),
  //Edm.Byte Unsigned 8-bit integer
  'Edm.Byte': EdmParser<number>(toNumber, toNumber, toNumber),
  //Edm.SByte Signed 8-bit integer
  'Edm.SByte': EdmParser<number>(toNumber, toNumber, toNumber),
  //Edm.Int32 Signed 16-bit integer
  'Edm.Int32': EdmParser<number>(toNumber, toNumber, toNumber),
  //Edm.Int64 Signed 16-bit integer
  'Edm.Int64': EdmParser<number>(toNumber, toNumber, toNumber),
  //Edm.Date Date without a time-zone offset
  'Edm.Date': EdmParser<Date>(
    (v: any) => new Date(`${v}T00:00:00.000Z`),
    (v: any) => toDate(v).toISOString().substring(0, 10),
    (v: any) => toDate(v).toISOString().substring(0, 10)
  ),
  //Edm.TimeOfDay Clock time 00:00-23:59:59.999999999999
  'Edm.TimeOfDay': EdmParser<Date>(
    (v: any) => new Date(`1970-01-01T${v}Z`),
    (v: any) => toDate(v).toISOString().substring(11, 23),
    (v: any) => toDate(v).toISOString().substring(11, 23)
  ),
  //Edm.DateTimeOffset Date and time with a time-zone offset, no leap seconds
  'Edm.DateTimeOffset': EdmParser<Date>(
    toDate,
    (v: any) => toDate(v).toISOString(),
    (v: any) => toDate(v).toISOString()
  ),
  //Edm.Duration Signed duration in days, hours, minutes, and (sub)seconds
  'Edm.Duration': EdmParser<Duration>(
    (v: any) => {
      const matches =
        /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/.exec(
          v
        );
      if (!matches || v.length < 3) {
        throw new TypeError(
          `duration invalid: "${v}". Must be a ISO 8601 duration. See https://en.wikipedia.org/wiki/ISO_8601#Durations`
        );
      }
      let duration: Duration = {};
      duration.sign = matches[1] === '-' ? -1 : 1;
      return [
        'years',
        'months',
        'weeks',
        'days',
        'hours',
        'minutes',
        'seconds',
      ].reduce((acc: any, name, index) => {
        const v = parseFloat(matches[index + 2]);
        if (!Number.isNaN(v)) acc[name] = v;
        return acc;
      }, duration) as Duration;
    },
    (v: Duration) =>
      [
        v.sign === -1 ? '-' : '',
        'P',
        v.years ? v.years + 'Y' : '',
        v.months ? v.months + 'M' : '',
        v.weeks ? v.weeks + 'W' : '',
        v.days ? v.days + 'D' : '',
        'T',
        v.hours ? v.hours + 'H' : '',
        v.minutes ? v.minutes + 'M' : '',
        v.seconds ? v.seconds + 'S' : '',
      ].join(''),
    (v: Duration) =>
      [
        v.sign === -1 ? '-' : '',
        'P',
        v.years ? v.years + 'Y' : '',
        v.months ? v.months + 'M' : '',
        v.weeks ? v.weeks + 'W' : '',
        v.days ? v.days + 'D' : '',
        'T',
        v.hours ? v.hours + 'H' : '',
        v.minutes ? v.minutes + 'M' : '',
        v.seconds ? v.seconds + 'S' : '',
      ].join('')
  ),
  //Edm.Decimal Numeric values with fixed precision and scale
  'Edm.Decimal': EdmParser<number>(
    (v: any, o: StructuredTypeFieldOptions) => {
      if (typeof v === 'string' && o.ieee754Compatible) {
        return parseFloat(v);
      }
      return v;
    },
    (v: number, o: StructuredTypeFieldOptions) => {
      if (o.ieee754Compatible) {
        return parseFloat(v.toPrecision(o.field.precision)).toFixed(
          o.field.scale
        );
      }
      return v;
    },
    (v: number, o: StructuredTypeFieldOptions) => {
      if (o.ieee754Compatible) {
        return parseFloat(v.toPrecision(o.field.precision)).toFixed(
          o.field.scale
        );
      }
      return v;
    }
  ),
  //Edm.Double IEEE 754 binary64 floating-point number (15-17 decimal digits)
  'Edm.Double': EdmParser<number>(
    (v: any) => (v === 'INF' ? Infinity : (v as number)),
    (v: number) => (v === Infinity ? 'INF' : v),
    (v: number) => (v === Infinity ? 'INF' : v)
  ),
  //Edm.Single IEEE 754 binary32 floating-point number (6-9 decimal digits)
  'Edm.Single': EdmParser<number>(
    (v: any) => (v === 'INF' ? Infinity : (v as number)),
    (v: number) => (v === Infinity ? 'INF' : v),
    (v: number) => (v === Infinity ? 'INF' : v)
  ),
  //Edm.Binary Binary data
  'Edm.Binary': EdmParser<ArrayBuffer>(
    (v: string) => {
      var bufferLength = v.length * 0.75,
        len = v.length,
        i,
        p = 0,
        encoded1,
        encoded2,
        encoded3,
        encoded4;

      if (v[v.length - 1] === '=') {
        bufferLength--;
        if (v[v.length - 2] === '=') {
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
    },
    (v: ArrayBuffer) => {
      var bytes = new Uint8Array(v),
        i,
        len = bytes.length,
        base64 = '';

      for (i = 0; i < len; i += 3) {
        base64 += chars[bytes[i] >> 2];
        base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64 += chars[bytes[i + 2] & 63];
      }

      if (len % 3 === 2) {
        base64 = base64.substring(0, base64.length - 1) + '=';
      } else if (len % 3 === 1) {
        base64 = base64.substring(0, base64.length - 2) + '==';
      }
      return base64;
    },
    (v: ArrayBuffer) => {
      var bytes = new Uint8Array(v),
        i,
        len = bytes.length,
        base64 = '';

      for (i = 0; i < len; i += 3) {
        base64 += chars[bytes[i] >> 2];
        base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64 += chars[bytes[i + 2] & 63];
      }

      if (len % 3 === 2) {
        base64 = base64.substring(0, base64.length - 1) + '=';
      } else if (len % 3 === 1) {
        base64 = base64.substring(0, base64.length - 2) + '==';
      }
      return base64;
    }
  ),
};

/*
Edm.Stream Binary data stream
Edm.Geography Abstract base type for all Geography types
Edm.GeographyPoint A point in a round-earth coordinate system
Edm.GeographyLineString Line string in a round-earth coordinate system
Edm.GeographyPolygon Polygon in a round-earth coordinate system
Edm.GeographyMultiPoint Collection of points in a round-earth coordinate system
Edm.GeographyMultiLineString Collection of line strings in a round-earth coordinate system
Edm.GeographyMultiPolygon Collection of polygons in a round-earth coordinate system
Edm.GeographyCollection Collection of arbitrary Geography values
Edm.Geometry Abstract base type for all Geometry types
Edm.GeometryPoint Point in a flat-earth coordinate system
Edm.GeometryLineString Line string in a flat-earth coordinate system
Edm.GeometryPolygon Polygon in a flat-earth coordinate system
Edm.GeometryMultiPoint Collection of points in a flat-earth coordinate system
Edm.GeometryMultiLineString Collection of line strings in a flat-earth coordinate system
Edm.GeometryMultiPolygon Collection of polygons in a flat-earth coordinate system
Edm.GeometryCollection Collection of arbitrary Geometry values
*/
