import { Dates } from './dates';

describe('Dates', () => {
  describe('isoStringToDate', () => {
    it('should convert an ISO string with milliseconds to a date', () => {
      const result = Dates.isoStringToDate('2021-01-01T00:00:00.000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2021-01-01T00:00:00.000Z');
    });

    it('should convert an ISO string without milliseconds to a date', () => {
      const result = Dates.isoStringToDate('2021-01-01T00:00:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2021-01-01T00:00:00.000Z');
    });

    it('should convert an ISO string with a time offset to a date', () => {
      const result = Dates.isoStringToDate('2021-01-01T02:00:00+02:00');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2021-01-01T00:00:00.000Z');
    });

    it('should leave a timestamp without a time zone untouched', () => {
      expect(Dates.isoStringToDate('2021-01-01T00:00:00')).toBe('2021-01-01T00:00:00');
    });

    it('should leave a non ISO string untouched', () => {
      expect(Dates.isoStringToDate('hello')).toBe('hello');
      expect(Dates.isoStringToDate('2021-01-01')).toBe('2021-01-01');
      expect(Dates.isoStringToDate('01/01/2021')).toBe('01/01/2021');
      expect(Dates.isoStringToDate('')).toBe('');
    });

    it('should not convert an ISO string that does not start at index zero', () => {
      expect(Dates.isoStringToDate('date: 2021-01-01T00:00:00.000Z')).toBe(
        'date: 2021-01-01T00:00:00.000Z',
      );
    });

    it('should leave other primitives untouched', () => {
      expect(Dates.isoStringToDate(1)).toBe(1);
      expect(Dates.isoStringToDate(true)).toBe(true);
      expect(Dates.isoStringToDate(null)).toBeNull();
      expect(Dates.isoStringToDate(undefined)).toBeUndefined();
    });

    it('should map over an array', () => {
      const result = Dates.isoStringToDate(['2021-01-01T00:00:00.000Z', 'hello', 1]);
      expect(result[0]).toBeInstanceOf(Date);
      expect(result[1]).toBe('hello');
      expect(result[2]).toBe(1);
    });

    it('should map over the values of an object', () => {
      const result = Dates.isoStringToDate({
        start: '2021-01-01T00:00:00.000Z',
        nested: { end: '2021-01-02T00:00:00.000Z' },
        name: 'hello',
      });
      expect(result.start).toBeInstanceOf(Date);
      expect(result.nested.end).toBeInstanceOf(Date);
      expect(result.name).toBe('hello');
    });

    it('should return an empty object for an empty object', () => {
      expect(Dates.isoStringToDate({})).toEqual({});
    });
  });
});
