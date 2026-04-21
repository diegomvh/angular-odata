import { Durations, Duration } from './durations';

describe('Durations', () => {
  describe('toDuration', () => {
    it('should parse years', () => {
      expect(Durations.toDuration('P1Y')).toEqual({ sign: 1, years: 1 });
    });

    it('should parse months', () => {
      expect(Durations.toDuration('P2M')).toEqual({ sign: 1, months: 2 });
    });

    it('should parse weeks', () => {
      expect(Durations.toDuration('P3W')).toEqual({ sign: 1, weeks: 3 });
    });

    it('should parse days', () => {
      expect(Durations.toDuration('P4D')).toEqual({ sign: 1, days: 4 });
    });

    it('should parse hours', () => {
      expect(Durations.toDuration('PT5H')).toEqual({ sign: 1, hours: 5 });
    });

    it('should parse minutes', () => {
      expect(Durations.toDuration('PT30M')).toEqual({ sign: 1, minutes: 30 });
    });

    it('should parse seconds', () => {
      expect(Durations.toDuration('PT45S')).toEqual({ sign: 1, seconds: 45 });
    });

    it('should parse full duration with all components', () => {
      expect(Durations.toDuration('P1Y2M3W4DT5H6M7S')).toEqual({
        sign: 1,
        years: 1,
        months: 2,
        weeks: 3,
        days: 4,
        hours: 5,
        minutes: 6,
        seconds: 7,
      });
    });

    it('should parse date and time components', () => {
      expect(Durations.toDuration('P1Y2M3DT4H5M6S')).toEqual({
        sign: 1,
        years: 1,
        months: 2,
        days: 3,
        hours: 4,
        minutes: 5,
        seconds: 6,
      });
    });

    it('should parse negative duration with minus sign', () => {
      expect(Durations.toDuration('-P1Y2M')).toEqual({ sign: -1, years: 1, months: 2 });
    });

    it('should parse positive duration with plus sign', () => {
      expect(Durations.toDuration('+P1Y2M')).toEqual({ sign: 1, years: 1, months: 2 });
    });

    it('should parse decimal values', () => {
      expect(Durations.toDuration('P1.5Y')).toEqual({ sign: 1, years: 1.5 });
    });

    it('should parse decimal values in time components', () => {
      expect(Durations.toDuration('PT1.5H')).toEqual({ sign: 1, hours: 1.5 });
    });

    it('should parse comma as decimal separator', () => {
      expect(Durations.toDuration('P1,5Y')).toEqual({ sign: 1, years: 1 });
    });

    it('should throw error for invalid duration string', () => {
      expect(() => Durations.toDuration('invalid')).toThrowError(TypeError);
    });

    it('should throw error for empty string', () => {
      expect(() => Durations.toDuration('')).toThrowError(TypeError);
    });

    it('should throw error for string without P prefix', () => {
      expect(() => Durations.toDuration('1Y')).toThrowError(TypeError);
    });

    it('should throw error for string too short', () => {
      expect(() => Durations.toDuration('P')).toThrowError(TypeError);
    });

    it('should handle zero values', () => {
      expect(Durations.toDuration('P0Y')).toEqual({ sign: 1, years: 0 });
    });

    it('should include zero components', () => {
      const result = Durations.toDuration('P1Y0M0DT0H0M0S');
      expect(result.years).toBe(1);
      expect(result.months).toBe(0);
      expect(result.days).toBe(0);
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(0);
      expect(result.seconds).toBe(0);
    });
  });

  describe('toString', () => {
    it('should convert years', () => {
      expect(Durations.toString({ years: 1 })).toBe('P1Y');
    });

    it('should convert months', () => {
      expect(Durations.toString({ months: 2 })).toBe('P2M');
    });

    it('should convert weeks', () => {
      expect(Durations.toString({ weeks: 3 })).toBe('P3W');
    });

    it('should convert days', () => {
      expect(Durations.toString({ days: 4 })).toBe('P4D');
    });

    it('should convert hours', () => {
      expect(Durations.toString({ hours: 5 })).toBe('PT5H');
    });

    it('should convert minutes', () => {
      expect(Durations.toString({ minutes: 30 })).toBe('PT30M');
    });

    it('should convert seconds', () => {
      expect(Durations.toString({ seconds: 45 })).toBe('PT45S');
    });

    it('should convert full duration', () => {
      expect(
        Durations.toString({
          years: 1,
          months: 2,
          weeks: 3,
          days: 4,
          hours: 5,
          minutes: 6,
          seconds: 7,
        }),
      ).toBe('P1Y2M3W4DT5H6M7S');
    });

    it('should convert date and time components', () => {
      expect(
        Durations.toString({
          years: 1,
          months: 2,
          days: 3,
          hours: 4,
          minutes: 5,
          seconds: 6,
        }),
      ).toBe('P1Y2M3DT4H5M6S');
    });

    it('should convert negative duration', () => {
      expect(Durations.toString({ sign: -1, years: 1, months: 2 })).toBe('-P1Y2M');
    });

    it('should convert positive sign explicitly', () => {
      expect(Durations.toString({ sign: 1, years: 1 })).toBe('P1Y');
    });

    it('should omit zero year in output', () => {
      expect(Durations.toString({ years: 0 })).toBe('P');
    });

    it('should omit zero time components when no time present', () => {
      expect(Durations.toString({ days: 1, hours: 0 })).toBe('P1D');
    });

    it('should include T only when time components present', () => {
      expect(Durations.toString({ days: 1, hours: 1 })).toBe('P1DT1H');
      expect(Durations.toString({ days: 1 })).toBe('P1D');
    });

    it('should handle empty duration', () => {
      expect(Durations.toString({})).toBe('P');
    });

    it('should convert decimal values', () => {
      expect(Durations.toString({ years: 1.5 })).toBe('P1.5Y');
    });
  });

  describe('roundtrip', () => {
    it('should parse and convert back the same string', () => {
      const original = 'P1Y2M3W4DT5H6M7S';
      const parsed = Durations.toDuration(original);
      const converted = Durations.toString(parsed);
      expect(converted).toBe(original);
    });

    it('should parse and convert negative duration', () => {
      const original = '-P1Y2M';
      const parsed = Durations.toDuration(original);
      const converted = Durations.toString(parsed);
      expect(converted).toBe(original);
    });

    it('should handle decimal values roundtrip', () => {
      const original = 'P1.5Y';
      const parsed = Durations.toDuration(original);
      const converted = Durations.toString(parsed);
      expect(converted).toBe(original);
    });
  });
});
