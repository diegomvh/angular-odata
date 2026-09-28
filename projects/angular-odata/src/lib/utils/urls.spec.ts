import { Urls } from './urls';

describe('Urls', () => {
  describe('parseQueryString', () => {
    it('should parse a query string into an object', () => {
      expect(Urls.parseQueryString('$top=5&$skip=10')).toEqual({ $top: '5', $skip: '10' });
    });

    it('should return an empty object for an empty query string', () => {
      expect(Urls.parseQueryString('')).toEqual({});
    });

    it('should ignore parameters without a value separator', () => {
      expect(Urls.parseQueryString('flag')).toEqual({});
      expect(Urls.parseQueryString('flag&$top=5')).toEqual({ $top: '5' });
    });

    it('should only split on the first value separator', () => {
      expect(Urls.parseQueryString('$filter=Name eq a=b')).toEqual({ $filter: 'Name eq a=b' });
    });

    it('should keep empty values', () => {
      expect(Urls.parseQueryString('$filter=')).toEqual({ $filter: '' });
    });

    it('should keep leading whitespace in a value', () => {
      expect(Urls.parseQueryString('$filter= Name eq 1')).toEqual({ $filter: ' Name eq 1' });
    });
  });

  describe('escapeIllegalChars', () => {
    it('should escape illegal characters', () => {
      expect(Urls.escapeIllegalChars('a%b')).toBe('a%25b');
      expect(Urls.escapeIllegalChars('a+b')).toBe('a%2Bb');
      expect(Urls.escapeIllegalChars('a/b')).toBe('a%2Fb');
      expect(Urls.escapeIllegalChars('a?b')).toBe('a%3Fb');
      expect(Urls.escapeIllegalChars('a#b')).toBe('a%23b');
      expect(Urls.escapeIllegalChars('a&b')).toBe('a%26b');
    });

    it('should escape a single quote', () => {
      expect(Urls.escapeIllegalChars("O'Reilly")).toBe("O''Reilly");
    });

    it('should leave a legal string untouched', () => {
      expect(Urls.escapeIllegalChars('Firstname eq abc')).toBe('Firstname eq abc');
    });

    it('should escape every illegal character in one string', () => {
      expect(Urls.escapeIllegalChars("%+/?#&'")).toBe("%25%2B%2F%3F%23%26''");
    });
  });
});
