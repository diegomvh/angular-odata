import { ODataSettings } from './settings';
import { ODataApiConfig } from './types';

const config = (name: string, extra: Partial<ODataApiConfig> = {}): ODataApiConfig => ({
  name,
  serviceRootUrl: `https://${name}.example.com/odata`,
  ...extra,
});

describe('ODataSettings', () => {
  describe('constructor', () => {
    it('should create an api for each config', () => {
      const settings = new ODataSettings([config('a'), config('b')]);
      expect(settings.apis.length).toBe(2);
    });

    it('should set the first api as default when no default is set', () => {
      const settings = new ODataSettings([config('a'), config('b')]);
      expect(settings.defaultApi().name).toBe('a');
    });

    it('should keep an explicit default api', () => {
      const settings = new ODataSettings([config('a'), config('b', { default: true })]);
      expect(settings.defaultApi().name).toBe('b');
    });

    it('should throw when multiple apis have no name', () => {
      const settings = [
        { serviceRootUrl: 'https://a.example.com' },
        { serviceRootUrl: 'https://b.example.com' },
      ];
      expect(() => new ODataSettings(settings)).toThrowError(
        'Multiple APIs: Needs configuration names',
      );
    });

    it('should throw when multiple apis are default', () => {
      const settings = [config('a', { default: true }), config('b', { default: true })];
      expect(() => new ODataSettings(settings)).toThrowError(
        'Multiple APIs: Needs only one default api',
      );
    });
  });

  describe('findApiByName/apiByName', () => {
    it('should find an api by name', () => {
      const settings = new ODataSettings([config('a'), config('b')]);
      expect(settings.findApiByName('b')?.name).toBe('b');
    });

    it('should return undefined for an unknown name', () => {
      const settings = new ODataSettings([config('a')]);
      expect(settings.findApiByName('z')).toBeUndefined();
    });

    it('should return the api by name', () => {
      const settings = new ODataSettings([config('a'), config('b')]);
      expect(settings.apiByName('b').name).toBe('b');
    });

    it('should throw for an unknown name', () => {
      const settings = new ODataSettings([config('a')]);
      expect(() => settings.apiByName('z')).toThrowError('No API for name: z');
    });
  });

  describe('findApiForType/apiForType', () => {
    const withSchema = (name: string, namespace: string) =>
      config(name, { schemas: [{ namespace }] });

    it('should find the api for a type namespace', () => {
      const settings = new ODataSettings([withSchema('a', 'A'), withSchema('b', 'B')]);
      expect(settings.findApiForType('B.Person')?.name).toBe('b');
    });

    it('should find the api for a type alias', () => {
      const settings = new ODataSettings([
        withSchema('a', 'A'),
        config('b', { schemas: [{ namespace: 'B', alias: 'b' }] }),
      ]);
      expect(settings.findApiForType('b.Person')?.name).toBe('b');
    });

    it('should return undefined for an unknown type', () => {
      const settings = new ODataSettings([withSchema('a', 'A')]);
      expect(settings.findApiForType('Z.Person')).toBeUndefined();
    });

    it('should return the api for a type', () => {
      const settings = new ODataSettings([withSchema('a', 'A'), withSchema('b', 'B')]);
      expect(settings.apiForType('B.Person').name).toBe('b');
    });

    it('should throw for an unknown type', () => {
      const settings = new ODataSettings([withSchema('a', 'A')]);
      expect(() => settings.apiForType('Z.Person')).toThrowError('No API for type: Z.Person');
    });
  });

  describe('enumTypeForType', () => {
    const withEnum = (name: string) =>
      config(name, {
        schemas: [
          {
            namespace: 'A',
            enums: [
              {
                name: 'Gender',
                members: { Male: 0, Female: 1 },
                fields: { Male: { value: 0 }, Female: { value: 1 } },
                flags: false,
              },
            ],
          },
        ],
      });

    it('should find the enum type', () => {
      const settings = new ODataSettings([withEnum('a')]);
      expect(settings.enumTypeForType('A.Gender')).toBeDefined();
    });

    it('should throw for an unknown enum type', () => {
      const settings = new ODataSettings([withEnum('a')]);
      expect(() => settings.enumTypeForType('A.Missing')).toThrowError(
        'No Enum for type A.Missing was found',
      );
    });
  });

  describe('structuredTypeForType', () => {
    const withEntity = (name: string, namespace: string) =>
      config(name, {
        schemas: [
          {
            namespace,
            entities: [
              {
                name: 'Person',
                keys: [{ name: 'Id' }],
                fields: { Id: { type: 'Edm.String' } },
              },
            ],
          },
        ],
      });

    it('should find the structured type', () => {
      const settings = new ODataSettings([withEntity('a', 'A')]);
      expect(settings.structuredTypeForType('A.Person')).toBeDefined();
    });

    it('should throw for an unknown structured type', () => {
      const settings = new ODataSettings([withEntity('a', 'A')]);
      expect(() => settings.structuredTypeForType('A.Missing')).toThrowError(
        'No Structured for type A.Missing was found',
      );
    });
  });
});
