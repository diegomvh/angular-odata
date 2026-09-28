import { ODataApiOptions } from './options';

describe('ODataApiOptions', () => {
  describe('constructor defaults', () => {
    it('should default version to 4.0', () => {
      expect(new ODataApiOptions({}).version).toBe('4.0');
    });

    it('should honor a provided version', () => {
      expect(new ODataApiOptions({ version: '2.0' }).version).toBe('2.0');
    });

    it('should default fetchPolicy to network-only', () => {
      expect(new ODataApiOptions({}).fetchPolicy).toBe('network-only');
    });

    it('should honor a provided fetchPolicy', () => {
      expect(new ODataApiOptions({ fetchPolicy: 'cache-first' }).fetchPolicy).toBe('cache-first');
    });

    it('should default stringAsEnum to false', () => {
      expect(new ODataApiOptions({}).stringAsEnum).toBe(false);
    });

    it('should default params to an empty object', () => {
      expect(new ODataApiOptions({}).params).toEqual({});
    });

    it('should honor provided params', () => {
      expect(new ODataApiOptions({ params: { a: 'b' } }).params).toEqual({ a: 'b' });
    });

    it('should default headers to an empty object', () => {
      expect(new ODataApiOptions({}).headers).toEqual({});
    });

    it('should default bodyQueryOptions to an empty array', () => {
      expect(new ODataApiOptions({}).bodyQueryOptions).toEqual([]);
    });

    it('should default stripMetadata to full', () => {
      expect(new ODataApiOptions({}).stripMetadata).toBe('full');
    });

    it('should honor a provided stripMetadata', () => {
      expect(new ODataApiOptions({ stripMetadata: 'minimal' }).stripMetadata).toBe('minimal');
    });

    it('should default deleteRefBy to path', () => {
      expect(new ODataApiOptions({}).deleteRefBy).toBe('path');
    });

    it('should honor a provided deleteRefBy', () => {
      expect(new ODataApiOptions({ deleteRefBy: 'id' }).deleteRefBy).toBe('id');
    });

    it('should default nonParenthesisForEmptyParameterFunction to false', () => {
      expect(new ODataApiOptions({}).nonParenthesisForEmptyParameterFunction).toBe(false);
    });

    it('should default jsonBatchFormat to false', () => {
      expect(new ODataApiOptions({}).jsonBatchFormat).toBe(false);
    });

    it('should default relativeUrls to true', () => {
      expect(new ODataApiOptions({}).relativeUrls).toBe(true);
    });
  });

  describe('etag', () => {
    it('should default etag options', () => {
      expect(new ODataApiOptions({}).etag).toEqual({ ifMatch: true, ifNoneMatch: false });
    });

    it('should honor a provided etag', () => {
      expect(new ODataApiOptions({ etag: { ifMatch: false, ifNoneMatch: true } }).etag).toEqual({
        ifMatch: false,
        ifNoneMatch: true,
      });
    });
  });

  describe('parserOptions', () => {
    it('should expose parser options with defaults', () => {
      const parserOptions = new ODataApiOptions({}).parserOptions;
      expect(parserOptions.version).toBe('4.0');
      expect(parserOptions.stringAsEnum).toBe(false);
      expect(parserOptions.deleteRefBy).toBe('path');
      expect(parserOptions.nonParenthesisForEmptyParameterFunction).toBe(false);
    });

    it('should merge accept options into the parser options', () => {
      const parserOptions = new ODataApiOptions({
        accept: { metadata: 'none', ieee754Compatible: true, streaming: true },
      }).parserOptions;
      expect(parserOptions.metadata).toBe('none');
      expect(parserOptions.ieee754Compatible).toBe(true);
      expect(parserOptions.streaming).toBe(true);
    });
  });

  describe('helper', () => {
    it('should resolve the helper for the version', () => {
      const helper = new ODataApiOptions({ version: '2.0' }).helper;
      expect(helper.VALUE).toBe('results');
    });
  });
});
