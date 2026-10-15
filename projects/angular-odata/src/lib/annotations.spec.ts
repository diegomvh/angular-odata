import { VERSION_4_0 } from './constants';
import { ODataHelper } from './helper';
import { ODataEntitiesAnnotations } from './annotations';

describe('ODataEntitiesAnnotations', () => {
  let instance: ODataEntitiesAnnotations<AirPort>;
  let annots: Map<string, any>;

  describe('version 4.0', () => {
    beforeEach(() => {
      const helper = ODataHelper[VERSION_4_0];
      annots = new Map<string, any>();
      instance = new ODataEntitiesAnnotations<AirPort>(helper, annots);
    });

    it('returns skipToken', () => {
      // Given
      const nextLink =
        'https://graph.microsoft.com/v1.0/users?$skiptoken=RFNwdAoAAQAAAAAAAAAAFAAAAHoO-P3xtNOT90O-DRY2LSZF_AFWAAAAAQIAAAA';
      annots.set('@odata.nextLink', nextLink);

      // When
      const actual = instance.skiptoken;

      // Then
      const expected = 'RFNwdAoAAQAAAAAAAAAAFAAAAHoO-P3xtNOT90O-DRY2LSZF_AFWAAAAAQIAAAA';
      expect(actual).toBe(expected);
    });

    it('should keep every sort key of a composite skiptoken', () => {
      annots.set(
        '@odata.nextLink',
        "https://example.test/EventUsers?$skiptoken=EventId-5,UserId-'a%2Cb'&$top=10",
      );
      expect(instance.skiptoken).toBe("EventId-5,UserId-'a,b'");
    });

    it('should keep encoded separators and decode the skiptoken once', () => {
      annots.set(
        '@odata.nextLink',
        'https://example.test/Events?%24skiptoken=Date-2024-01-01T10%3A00%3A00Z,Name-a%26b%25c',
      );
      expect(instance.skiptoken).toBe('Date-2024-01-01T10:00:00Z,Name-a&b%c');
    });

    it('should return the raw skiptoken when it is not valid percent-encoding', () => {
      annots.set('@odata.nextLink', 'https://example.test/Events?$skiptoken=50%-off');
      expect(instance.skiptoken).toBe('50%-off');
    });

    it('should return undefined without a skiptoken', () => {
      expect(instance.skiptoken).toBeUndefined();
      annots.set('@odata.nextLink', 'https://example.test/Events?$skip=10');
      expect(instance.skiptoken).toBeUndefined();
    });
  });
});

interface AirPort {}
