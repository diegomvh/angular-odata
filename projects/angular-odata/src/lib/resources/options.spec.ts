import { ODataResponseOptions } from './options';

describe('ODataResponseOptions', () => {
  it('should default the version to 4.0', () => {
    const options = new ODataResponseOptions({});
    expect(options.version).toBe('4.0');
  });

  it('should keep the configured version', () => {
    expect(new ODataResponseOptions({ version: '2.0' }).version).toBe('2.0');
    expect(new ODataResponseOptions({ version: '3.0' }).version).toBe('3.0');
    expect(new ODataResponseOptions({ version: '4.0' }).version).toBe('4.0');
  });

  it('should resolve the helper for the configured version', () => {
    expect(new ODataResponseOptions({ version: '3.0' }).helper.VALUE).toBe('value');
  });

  describe('clone', () => {
    it('should return a new instance with the same version', () => {
      const options = new ODataResponseOptions({ version: '4.0' });
      const cloned = options.clone();
      expect(cloned).toBeInstanceOf(ODataResponseOptions);
      expect(cloned).not.toBe(options);
      expect(cloned.version).toBe(options.version);
    });
  });

  describe('setFeatures', () => {
    it('should set the metadata, streaming and ieee754 compatible flags', () => {
      const options = new ODataResponseOptions({});
      options.setFeatures('odata.metadata=minimal;odata.streaming=true;IEEE754Compatible=false');
      expect(options.metadata).toBe('minimal');
      expect(options.streaming).toBe(true);
      expect(options.ieee754Compatible).toBe(false);
    });

    it('should ignore unknown features', () => {
      const options = new ODataResponseOptions({});
      options.setFeatures('charset=utf-8');
      expect(options.metadata).toBeUndefined();
      expect(options.streaming).toBeUndefined();
      expect(options.ieee754Compatible).toBeUndefined();
    });

    it('should trim the feature name', () => {
      const options = new ODataResponseOptions({});
      options.setFeatures(' odata.metadata =none');
      expect(options.metadata).toBe('none');
    });

    it('should set streaming only for the value true', () => {
      const options = new ODataResponseOptions({});
      options.setFeatures('odata.streaming=false');
      expect(options.streaming).toBe(false);
    });
  });

  describe('setVersion', () => {
    it('should set a supported version', () => {
      const options = new ODataResponseOptions({});
      options.setVersion('3.0');
      expect(options.version).toBe('3.0');
    });

    it('should strip a trailing semicolon', () => {
      const options = new ODataResponseOptions({});
      options.setVersion('4.0;');
      expect(options.version).toBe('4.0');
    });

    it('should ignore an unsupported version', () => {
      const options = new ODataResponseOptions({});
      options.setVersion('1.0');
      expect(options.version).toBe('4.0');
    });
  });

  describe('setLocation', () => {
    it('should set the location', () => {
      const options = new ODataResponseOptions({});
      options.setLocation('/People(1)');
      expect(options.location).toBe('/People(1)');
    });
  });

  describe('setCache', () => {
    it('should set the max age', () => {
      const options = new ODataResponseOptions({});
      options.setCache('max-age=3600');
      expect(options.maxAge).toBe(3600);
    });

    it('should set the cacheability', () => {
      const options = new ODataResponseOptions({});
      options.setCache('public');
      expect(options.cacheability).toBe('public');
      options.setCache('private');
      expect(options.cacheability).toBe('private');
      options.setCache('no-cache');
      expect(options.cacheability).toBe('no-cache');
      options.setCache('no-store');
      expect(options.cacheability).toBe('no-store');
    });

    it('should set the max age and cacheability together', () => {
      const options = new ODataResponseOptions({});
      options.setCache('max-age=3600,private');
      expect(options.maxAge).toBe(3600);
      expect(options.cacheability).toBe('private');
    });

    it('should not set the cacheability when the directive is not trimmed', () => {
      const options = new ODataResponseOptions({});
      options.setCache('max-age=3600, private');
      expect(options.maxAge).toBe(3600);
      expect(options.cacheability).toBeUndefined();
    });

    it('should ignore a non numeric max age', () => {
      const options = new ODataResponseOptions({});
      options.setCache('max-age=abc');
      expect(options.maxAge).toBeUndefined();
    });
  });
});
