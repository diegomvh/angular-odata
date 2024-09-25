import { strings, normalize } from '@angular-devkit/core';

export const toTypescriptType = (type: string, geo: boolean = true) => {
  if (type == null) return 'any';
  if (
    geo &&
    (type.startsWith('Edm.Geography') || type.startsWith('Edm.Geometry'))
  ) {
    switch (type) {
      case 'Edm.Geography': //Abstract base type for all Geography types
      case 'Edm.GeographyPoint': //A point in a round-earth coordinate system
        return 'Point';
      case 'Edm.GeographyMultiPoint': //Collection of points in a round-earth coordinate system
        return 'MultiPoint';
      case 'Edm.GeographyLineString': //Line string in a round-earth coordinate system
        return 'LineString';
      case 'Edm.GeographyMultiLineString': //Collection of line strings in a round-earth coordinate system
        return 'MultiLineString';
      case 'Edm.GeographyPolygon': //Polygon in a round-earth coordinate system
        return 'Polygon';
      case 'Edm.GeographyMultiPolygon': //Collection of polygons in a round-earth coordinate system
        return 'MultiPolygon';
      case 'Edm.GeographyCollection': //Collection of arbitrary Geography values
        return 'GeometryCollection';
      case 'Edm.Geometry': //Abstract base type for all Geometry types
      case 'Edm.GeometryPoint': //Point in a flat-earth coordinate system
        return 'Point';
      case 'Edm.GeometryMultiPoint': //Collection of points in a flat-earth coordinate system
        return 'MultiPoint';
      case 'Edm.GeometryLineString': //Line string in a flat-earth coordinate system
        return 'LineString';
      case 'Edm.GeometryMultiLineString': //Collection of line strings in a flat-earth coordinate system
        return 'MultiLineString';
      case 'Edm.GeometryPolygon': //Polygon in a flat-earth coordinate system
        return 'Polygon';
      case 'Edm.GeometryMultiPolygon': //Collection of polygons in a flat-earth coordinate system
        return 'MultiPolygon';
      case 'Edm.GeometryCollection': //Collection of arbitrary Geometry values
        return 'GeometryCollection';
    }
  }
  switch (type) {
    case 'Edm.String': //Sequence of UTF-8 characters
    case 'Edm.Guid': //16-byte (128-bit) unique identifier
      return 'string';
    case 'Edm.Binary': //Binary data
      return 'ArrayBuffer';
    case 'Edm.Duration': //Signed duration in days, hours, minutes, and (sub)seconds
      return 'Duration';
    case 'Edm.Int16': //Signed 16-bit integer
    case 'Edm.Int32': //Signed 32-bit integer
    case 'Edm.Int64': //Signed 64-bit integer
    case 'Edm.SByte': //Signed 8-bit integer
    case 'Edm.Byte': //Unsigned 8-bit integer
    case 'Edm.Single': //IEEE 754 binary32 floating-point number (6-9 decimal digits)
    case 'Edm.Decimal': //Numeric values with fixed precision and scale
    case 'Edm.Double': //IEEE 754 binary64 floating-point number (15-17 decimal digits)
      return 'number';
    case 'Edm.Boolean': //Binary-valued logic
      return 'boolean';
    case 'Edm.DateTimeOffset': //Date and time with a time-zone offset, no leap seconds
    case 'Edm.Date': //Date without a time-zone offset
    case 'Edm.TimeOfDay': //Clock time 00:00-23:59:59.999999999999
      return 'Date';
    case 'Edm.Stream': //Binary data stream
    default: {
      return type.includes('.') && !type.startsWith('Edm')
        ? strings.classify(type.substring(type.lastIndexOf('.')))
        : 'any';
    }
  }
};

export const makeRelativePath = (from: string, to: string) => {
  if (from === '') {
    return to;
  }
  if (to.startsWith(from)) {
    return to.substring(from.length + 1);
  }
  const froma: string[] = from.split('/');
  const toa: string[] = to.split('/');
  if (froma[0] !== toa[0]) {
    return froma.map((s) => '..').join('/') + '/' + toa.join('/');
  }
  const shared: string[] = [];
  let i = 0;
  while (froma[i] === toa[i] && i < froma.length) {
    shared.push(froma[i]);
    i++;
  }
  return (
    Array.from({ length: froma.length - shared.length })
      .fill('..')
      .join('/') +
    to.substring(shared.join('/').length + (to.startsWith('/') ? 1 : 0))
  );
};
