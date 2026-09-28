import { raw } from '../../resources/query';
import { EdmType, StructuredTypeFieldOptions } from '../../types';
import { EDM_PARSERS } from './edm';

const options = (extra: Partial<StructuredTypeFieldOptions> = {}): StructuredTypeFieldOptions =>
  ({ field: { type: 'Edm.String' }, ...extra }) as StructuredTypeFieldOptions;

describe('EDM_PARSERS', () => {
  describe('Edm.Guid', () => {
    const parser = EDM_PARSERS[EdmType.Guid];
    const guid = '0e6d5a3f-2e0c-4a2a-9c8f-1234567890ab';

    it('should deserialize a guid as is', () => {
      expect(parser.deserialize(guid, options())).toBe(guid);
    });

    it('should serialize a guid as is', () => {
      expect(parser.serialize(guid, options())).toBe(guid);
    });

    it('should encode a guid as a raw value', () => {
      expect(parser.encode(guid, options())).toEqual(raw(guid));
    });
  });

  describe('numeric types', () => {
    const types = [EdmType.Int16, EdmType.Int32, EdmType.Int64, EdmType.Byte, EdmType.SByte];

    types.forEach((type) => {
      it(`should deserialize a number for ${type}`, () => {
        expect(EDM_PARSERS[type].deserialize('42', options())).toBe(42);
      });

      it(`should serialize a number for ${type}`, () => {
        expect(EDM_PARSERS[type].serialize(42, options())).toBe(42);
      });
    });

    it('should map over an array', () => {
      expect(EDM_PARSERS[EdmType.Int32].deserialize(['1', '2'], options())).toEqual([1, 2]);
      expect(EDM_PARSERS[EdmType.Int32].serialize([1, 2], options())).toEqual([1, 2]);
    });
  });

  describe('Edm.String', () => {
    const parser = EDM_PARSERS[EdmType.String];

    it('should deserialize a value to a string', () => {
      expect(parser.deserialize(42, options())).toBe('42');
      expect(parser.deserialize('abc', options())).toBe('abc');
    });

    it('should serialize a value to a string', () => {
      expect(parser.serialize(42, options())).toBe('42');
    });
  });

  describe('Edm.Boolean', () => {
    const parser = EDM_PARSERS[EdmType.Boolean];

    it('should deserialize to a boolean', () => {
      expect(parser.deserialize(true, options())).toBe(true);
      expect(parser.deserialize(false, options())).toBe(false);
    });

    it('should serialize to a boolean', () => {
      expect(parser.serialize(true, options())).toBe(true);
    });
  });

  describe('Edm.Date', () => {
    const parser = EDM_PARSERS[EdmType.Date];

    it('should deserialize a date string', () => {
      const result = parser.deserialize('2021-01-01', options());
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2021-01-01T00:00:00.000Z');
    });

    it('should serialize a date to a date only string', () => {
      const result = parser.serialize(new Date('2021-01-01T10:20:30Z'), options());
      expect(result).toBe('2021-01-01');
    });

    it('should encode a date as a raw value', () => {
      const result = parser.encode(new Date('2021-01-01T10:20:30Z'), options());
      expect(result).toEqual(raw('2021-01-01'));
    });
  });

  describe('Edm.TimeOfDay', () => {
    const parser = EDM_PARSERS[EdmType.TimeOfDay];

    it('should deserialize a time string', () => {
      const result = parser.deserialize('10:20:30', options());
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('1970-01-01T10:20:30.000Z');
    });

    it('should serialize a date to a time only string', () => {
      const result = parser.serialize(new Date('1970-01-01T10:20:30Z'), options());
      expect(result).toBe('10:20:30.000');
    });
  });

  describe('Edm.DateTimeOffset', () => {
    const parser = EDM_PARSERS[EdmType.DateTimeOffset];

    it('should deserialize a date time string', () => {
      const result = parser.deserialize('2021-01-01T10:20:30Z', options());
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2021-01-01T10:20:30.000Z');
    });

    it('should serialize a date to an ISO string', () => {
      const result = parser.serialize(new Date('2021-01-01T10:20:30Z'), options());
      expect(result).toBe('2021-01-01T10:20:30.000Z');
    });

    it('should encode a date as a raw value', () => {
      const result = parser.encode(new Date('2021-01-01T10:20:30Z'), options());
      expect(result).toEqual(raw('2021-01-01T10:20:30.000Z'));
    });
  });

  describe('Edm.Duration', () => {
    const parser = EDM_PARSERS[EdmType.Duration];

    it('should deserialize a duration string', () => {
      const result = parser.deserialize('PT1H', options());
      expect(result).toBeDefined();
    });

    it('should serialize a duration to a string', () => {
      const parsed = parser.deserialize('PT1H', options());
      const result = parser.serialize(parsed, options());
      expect(typeof result).toBe('string');
    });
  });

  describe('Edm.Decimal', () => {
    const parser = EDM_PARSERS[EdmType.Decimal];

    it('should deserialize a decimal string', () => {
      expect(parser.deserialize('1.5', options())).toBe(1.5);
    });

    it('should keep the number without ieee754Compatible', () => {
      expect(parser.serialize(1.5, options())).toBe(1.5);
    });

    it('should apply the precision and scale with ieee754Compatible', () => {
      const opts = options({
        ieee754Compatible: true,
        field: { type: 'Edm.Decimal', precision: 10, scale: 2 },
      });
      expect(parser.serialize(1.23456789012, opts)).toBe('1.23');
    });

    it('should apply the precision without a scale', () => {
      const opts = options({
        ieee754Compatible: true,
        field: { type: 'Edm.Decimal', precision: 5 },
      });
      expect(parser.serialize(1.23456789012, opts)).toBe('1.2346');
    });
  });

  describe('Edm.Double and Edm.Single', () => {
    [EdmType.Double, EdmType.Single].forEach((type) => {
      const parser = EDM_PARSERS[type];

      it(`should deserialize INF to Infinity for ${type}`, () => {
        expect(parser.deserialize('INF', options())).toBe(Infinity);
      });

      it(`should serialize Infinity to INF for ${type}`, () => {
        expect(parser.serialize(Infinity, options())).toBe('INF');
      });

      it(`should deserialize a number for ${type}`, () => {
        expect(parser.deserialize(1.5, options())).toBe(1.5);
      });

      it(`should encode Infinity as a raw value for ${type}`, () => {
        expect(parser.encode(Infinity, options())).toEqual(raw('INF'));
      });
    });
  });

  describe('Edm.Binary', () => {
    const parser = EDM_PARSERS[EdmType.Binary];

    it('should deserialize a base64 string into an array buffer', () => {
      const result = parser.deserialize('SGVsbG8=', options());
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(5);
    });

    it('should serialize an array buffer into a base64 string', () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      expect(parser.serialize(buffer, options())).toBe('AQIDBAU=');
    });

    it('should encode an array buffer as a raw value', () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      expect(parser.encode(buffer, options())).toEqual(raw('AQIDBAU='));
    });
  });

  describe('encode with a raw value', () => {
    it('should return a raw value untouched', () => {
      const parser = EDM_PARSERS[EdmType.Guid];
      const value = raw('abc');
      expect(parser.encode(value, options())).toBe(value);
    });
  });
});
