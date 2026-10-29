import { VERSION_2_0, VERSION_3_0, VERSION_4_0 } from './constants';
import { ODataHelper } from './helper';
import { ODataEntitiesAnnotations, ODataEntityAnnotations } from './annotations';

describe('ODataEntityAnnotations', () => {
  let instance: ODataEntityAnnotations<AirPort>;
  let annots: Map<string, any>;

  describe('version 4.0', () => {
    beforeEach(() => {
      const helper = ODataHelper[VERSION_4_0];
      annots = new Map<string, any>();
      instance = new ODataEntityAnnotations<AirPort>(helper, annots);
    });

    it('should decode the read link', () => {
      annots.set('@odata.readLink', "Airports('KSFO%20West')");
      expect(instance.readLink).toBe("Airports('KSFO West')");
    });

    it('should decode the edit link', () => {
      annots.set('@odata.editLink', "Airports('a%2Fb')");
      expect(instance.editLink).toBe("Airports('a/b')");
    });

    it('should decode the media read link', () => {
      annots.set('@odata.mediaReadLink', "Airports('KSFO')/Photo%20Small");
      expect(instance.mediaReadLink).toBe("Airports('KSFO')/Photo Small");
    });

    it('should decode the media edit link', () => {
      annots.set('@odata.mediaEditLink', "Airports('KSFO')%2FPhoto");
      expect(instance.mediaEditLink).toBe("Airports('KSFO')/Photo");
    });

    it('should decode the media content type', () => {
      annots.set('@odata.mediaContentType', 'image%2Fjpeg');
      expect(instance.mediaContentType).toBe('image/jpeg');
    });

    it('should decode the media etag', () => {
      annots.set('@odata.mediaEtag', 'W%2F%22123%22');
      expect(instance.mediaEtag).toBe('W/"123"');
    });

    it('should decode the metadata etag', () => {
      annots.set('@odata.metadataEtag', 'W%2F%22abc%22');
      expect(instance.metadataEtag).toBe('W/"abc"');
    });

    it('should return the etag as the server sent it', () => {
      annots.set('@odata.etag', 'W/"MjAyNA%3D%3D"');
      expect(instance.etag).toBe('W/"MjAyNA%3D%3D"');
    });

    it('should return the id as the server sent it', () => {
      annots.set('@odata.id', "Airports('a%2Fb')");
      expect(instance.id).toBe("Airports('a%2Fb')");
    });

    it('should keep already decoded values unchanged', () => {
      annots.set('@odata.readLink', "Airports('KSFO')");
      annots.set('@odata.editLink', "Airports('KSFO')");
      annots.set('@odata.mediaContentType', 'image/jpeg');
      expect(instance.readLink).toBe("Airports('KSFO')");
      expect(instance.editLink).toBe("Airports('KSFO')");
      expect(instance.mediaContentType).toBe('image/jpeg');
    });

    it('should decode values only once', () => {
      annots.set('@odata.readLink', "Airports('a%2520b')");
      annots.set('@odata.mediaEtag', 'W%2F%22a%2520b%22');
      expect(instance.readLink).toBe("Airports('a%20b')");
      expect(instance.mediaEtag).toBe('W/"a%20b"');
    });

    it('should return undefined for missing annotations', () => {
      expect(instance.id).toBeUndefined();
      expect(instance.etag).toBeUndefined();
      expect(instance.mediaEtag).toBeUndefined();
      expect(instance.metadataEtag).toBeUndefined();
      expect(instance.readLink).toBeUndefined();
      expect(instance.editLink).toBeUndefined();
      expect(instance.mediaReadLink).toBeUndefined();
      expect(instance.mediaEditLink).toBeUndefined();
      expect(instance.mediaContentType).toBeUndefined();
    });

    it('should decode annotations taken from the response with update', () => {
      instance.update({
        '@odata.editLink': "Airports('KSFO%20West')",
        '@odata.mediaContentType': 'image%2Fpng',
        Name: 'San Francisco%20International',
      });
      expect(instance.editLink).toBe("Airports('KSFO West')");
      expect(instance.mediaContentType).toBe('image/png');
    });

    it('should keep decoding after clone and union', () => {
      annots.set('@odata.readLink', "Airports('a%20b')");
      const other = new ODataEntityAnnotations<AirPort>(
        ODataHelper[VERSION_4_0],
        new Map([['@odata.editLink', "Airports('c%2Fd')"]]),
      );
      const union = instance.clone().union(other);
      expect(union.readLink).toBe("Airports('a b')");
      expect(union.editLink).toBe("Airports('c/d')");
    });

    it('should decode the annotations of a property', () => {
      instance.update({
        'Photo@odata.mediaReadLink': "Airports('KSFO')/Photo%20Small",
        'Photo@odata.mediaContentType': 'image%2Fjpeg',
        'Gates@odata.nextLink': "Airports('KSFO')/Gates?%24skip=10",
      });
      const photo = instance.property('Photo' as keyof AirPort, 'single');
      expect(photo.mediaReadLink).toBe("Airports('KSFO')/Photo Small");
      expect(photo.mediaContentType).toBe('image/jpeg');
      const gates = instance.property<any>('Gates' as keyof AirPort, 'collection');
      expect(gates.nextLink).toBe("Airports('KSFO')/Gates?$skip=10");
      expect(gates.skip).toBe(10);
    });
  });
});

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

    it('should decode the next link', () => {
      annots.set('@odata.nextLink', "https://example.test/Airports?%24filter=Name%20eq%20'a%2Fb'");
      expect(instance.nextLink).toBe("https://example.test/Airports?$filter=Name eq 'a/b'");
    });

    it('should decode the read link', () => {
      annots.set('@odata.readLink', 'https://example.test/Airports%2FActive');
      expect(instance.readLink).toBe('https://example.test/Airports/Active');
    });

    it('should decode the delta link', () => {
      annots.set('@odata.deltaLink', 'https://example.test/Airports?%24deltatoken=a%2Bb');
      expect(instance.deltaLink).toBe('https://example.test/Airports?$deltatoken=a+b');
    });

    it('should decode links only once', () => {
      annots.set(
        '@odata.nextLink',
        'https://example.test/Airports?$filter=Name%20eq%20%27100%2525%27',
      );
      annots.set('@odata.deltaLink', 'https://example.test/Airports?$deltatoken=a%252Bb');
      expect(instance.nextLink).toBe("https://example.test/Airports?$filter=Name eq '100%25'");
      expect(instance.deltaLink).toBe('https://example.test/Airports?$deltatoken=a%2Bb');
    });

    it('should return undefined for missing annotations', () => {
      expect(instance.readLink).toBeUndefined();
      expect(instance.nextLink).toBeUndefined();
      expect(instance.deltaLink).toBeUndefined();
      expect(instance.count).toBeUndefined();
      expect(instance.top).toBeUndefined();
      expect(instance.skip).toBeUndefined();
    });

    it('should return the count as a number', () => {
      annots.set('@odata.count', '42');
      expect(instance.count).toBe(42);
    });

    it('should read top and skip from the next link', () => {
      annots.set('@odata.nextLink', 'https://example.test/Airports?$top=5&$skip=10');
      expect(instance.top).toBe(5);
      expect(instance.skip).toBe(10);
    });

    it('should read top and skip from an encoded next link', () => {
      annots.set('@odata.nextLink', 'https://example.test/Airports?%24top=5&%24skip=10');
      expect(instance.top).toBe(5);
      expect(instance.skip).toBe(10);
    });

    it('should decode annotations taken from the response with update', () => {
      instance.update({
        '@odata.count': 3,
        '@odata.nextLink': 'https://example.test/Airports?%24skip=2',
        value: [],
      });
      expect(instance.count).toBe(3);
      expect(instance.nextLink).toBe('https://example.test/Airports?$skip=2');
      expect(instance.skip).toBe(2);
    });

    it('should keep decoding after clone and union', () => {
      annots.set('@odata.nextLink', 'https://example.test/Airports?%24skip=2');
      const other = new ODataEntitiesAnnotations<AirPort>(
        ODataHelper[VERSION_4_0],
        new Map([['@odata.deltaLink', 'https://example.test/Airports?%24deltatoken=1']]),
      );
      const union = instance.clone().union(other);
      expect(union.nextLink).toBe('https://example.test/Airports?$skip=2');
      expect(union.deltaLink).toBe('https://example.test/Airports?$deltatoken=1');
    });

    it('should share the decoded links with the entity annotations', () => {
      annots.set('@odata.readLink', 'https://example.test/Airports%2FActive');
      expect(instance.entity().readLink).toBe('https://example.test/Airports/Active');
    });
  });

  describe('version 3.0', () => {
    beforeEach(() => {
      const helper = ODataHelper[VERSION_3_0];
      annots = new Map<string, any>();
      instance = new ODataEntitiesAnnotations<AirPort>(helper, annots);
    });

    it('should decode the next link', () => {
      annots.set('odata.nextLink', 'https://example.test/Airports?%24skip=20');
      expect(instance.nextLink).toBe('https://example.test/Airports?$skip=20');
      expect(instance.skip).toBe(20);
    });

    it('should return the count as a number', () => {
      annots.set('odata.count', '7');
      expect(instance.count).toBe(7);
    });

    it('should ignore version 4.0 annotations', () => {
      annots.set('@odata.nextLink', 'https://example.test/Airports?$skip=20');
      expect(instance.nextLink).toBeUndefined();
    });
  });

  describe('version 2.0', () => {
    beforeEach(() => {
      const helper = ODataHelper[VERSION_2_0];
      annots = new Map<string, any>();
      instance = new ODataEntitiesAnnotations<AirPort>(helper, annots);
    });

    it('should decode the next link', () => {
      annots.set('__next', 'https://example.test/Airports?%24skip=30');
      expect(instance.nextLink).toBe('https://example.test/Airports?$skip=30');
      expect(instance.skip).toBe(30);
    });

    it('should return the count as a number', () => {
      annots.set('__count', '9');
      expect(instance.count).toBe(9);
    });
  });
});

interface AirPort {}
