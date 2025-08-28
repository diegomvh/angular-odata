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
  });
});

interface AirPort {}
