import { raw } from '../../resources/query';
import { EdmType, FieldParser, StructuredTypeFieldOptions } from '../../types';
import { ArrayBuffers } from '../../utils/arraybuffers';
import { Duration, Durations } from '../../utils/durations';

// Core EdmTypeParserBuilder
const EdmParser = <T>(
  _d: (v: any, o: StructuredTypeFieldOptions) => T,
  _s: (v: any, o: StructuredTypeFieldOptions) => any,
  _e: (v: any, o: StructuredTypeFieldOptions) => any
): FieldParser<T | T[]> => ({
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

export const EDM_PARSERS: { [type: string]: FieldParser<any> } = {
  //Edm.Guid 16-byte (128-bit) unique identifier
  [EdmType.Guid]: EdmParser<string>(Identity, Identity, (v: string) => raw(v)),
  //Edm.Int16 Signed 16-bit integer
  [EdmType.Int16]: EdmParser<number>(toNumber, toNumber, toNumber),
  //Edm.String Sequence of UTF-8 characters
  [EdmType.String]: EdmParser<string>(toString, toString, toString),
  //Edm.Boolean Binary-valued logic
  [EdmType.Boolean]: EdmParser<boolean>(toBoolean, toBoolean, toBoolean),
  //Edm.Byte Unsigned 8-bit integer
  [EdmType.Byte]: EdmParser<number>(toNumber, toNumber, toNumber),
  //Edm.SByte Signed 8-bit integer
  [EdmType.SByte]: EdmParser<number>(toNumber, toNumber, toNumber),
  //Edm.Int32 Signed 16-bit integer
  [EdmType.Int32]: EdmParser<number>(toNumber, toNumber, toNumber),
  //Edm.Int64 Signed 16-bit integer
  [EdmType.Int64]: EdmParser<number>(toNumber, toNumber, toNumber),
  //Edm.Date Date without a time-zone offset
  [EdmType.Date]: EdmParser<Date>(
    (v: any) => new Date(`${v}T00:00:00.000Z`),
    (v: any) => toDate(v).toISOString().substring(0, 10),
    (v: any) => raw(toDate(v).toISOString().substring(0, 10))
  ),
  //Edm.TimeOfDay Clock time 00:00-23:59:59.999999999999
  [EdmType.TimeOfDay]: EdmParser<Date>(
    (v: any) => new Date(`1970-01-01T${v}Z`),
    (v: any) => toDate(v).toISOString().substring(11, 23),
    (v: any) => raw(toDate(v).toISOString().substring(11, 23))
  ),
  //Edm.DateTimeOffset Date and time with a time-zone offset, no leap seconds
  [EdmType.DateTimeOffset]: EdmParser<Date>(
    toDate,
    (v: any) => toDate(v).toISOString(),
    (v: any) => raw(toDate(v).toISOString())
  ),
  //Edm.Duration Signed duration in days, hours, minutes, and (sub)seconds
  [EdmType.Duration]: EdmParser<Duration>(
    (v: any) => Durations.toDuration(v),
    (v: Duration) => Durations.toString(v),
    (v: Duration) => raw(Durations.toString(v))
  ),
  //Edm.Decimal Numeric values with fixed precision and scale
  [EdmType.Decimal]: EdmParser<number>(
    (v: any, o: StructuredTypeFieldOptions) => {
      if (typeof v === 'string' && o.ieee754Compatible) {
        return parseFloat(v);
      }
      return v;
    },
    (v: number, o: StructuredTypeFieldOptions) => {
      if (o.ieee754Compatible) {
        let vstr = v.toPrecision(o.field.precision);
        if (typeof o.field.scale === 'number') {
          vstr = parseFloat(vstr).toFixed(o.field.scale);
        }
        return vstr;
      }
      return v;
    },
    (v: number, o: StructuredTypeFieldOptions) => {
      if (o.ieee754Compatible) {
        let vstr = v.toPrecision(o.field.precision);
        if (typeof o.field.scale === 'number') {
          vstr = parseFloat(vstr).toFixed(o.field.scale);
        }
        return raw(vstr);
      }
      return v;
    }
  ),
  //Edm.Double IEEE 754 binary64 floating-point number (15-17 decimal digits)
  [EdmType.Double]: EdmParser<number>(
    (v: any) => (v === 'INF' ? Infinity : (v as number)),
    (v: number) => (v === Infinity ? 'INF' : v),
    (v: number) => raw(v === Infinity ? 'INF' : v.toString())
  ),
  //Edm.Single IEEE 754 binary32 floating-point number (6-9 decimal digits)
  [EdmType.Single]: EdmParser<number>(
    (v: any) => (v === 'INF' ? Infinity : (v as number)),
    (v: number) => (v === Infinity ? 'INF' : v),
    (v: number) => raw(v === Infinity ? 'INF' : v.toString())
  ),
  //Edm.Binary Binary data
  [EdmType.Binary]: EdmParser<ArrayBuffer>(
    (v: string) => ArrayBuffers.toArrayBuffer(v),
    (v: ArrayBuffer) => ArrayBuffers.toString(v),
    (v: ArrayBuffer) => raw(ArrayBuffers.toString(v))
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
