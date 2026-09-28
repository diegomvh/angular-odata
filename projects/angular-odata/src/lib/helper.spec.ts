import { VERSION_2_0, VERSION_3_0, VERSION_4_0 } from './constants';
import { ODataHelper } from './helper';

describe('ODataHelper', () => {
  describe('Version 4.0', () => {
    const helper = ODataHelper[VERSION_4_0];

    describe('entity/entities/property', () => {
      it('should return the payload as is for an entity', () => {
        const data = { name: 'Ana' };
        expect(helper.entity(data)).toBe(data);
      });

      it('should return the value of the payload for entities', () => {
        expect(helper.entities({ value: [{ name: 'Ana' }] })).toEqual([{ name: 'Ana' }]);
      });

      it('should return the value of the payload for a property', () => {
        expect(helper.property({ value: 1 })).toBe(1);
      });

      it('should return the payload for a property without a value', () => {
        expect(helper.property({ name: 'Ana' })).toEqual({ name: 'Ana' });
      });
    });

    describe('annotations', () => {
      it('should collect the odata and function annotations', () => {
        const annots = helper.annotations({
          '@odata.type': 'TripPin.Person',
          '#TripPin.GetPeople': { parameters: {} },
          name: 'Ana',
        });
        expect(annots.get('@odata.type')).toBe('TripPin.Person');
        expect(annots.get('#TripPin.GetPeople')).toEqual({ parameters: {} });
        expect(annots.size).toBe(2);
      });

      it('should return an empty map without annotations', () => {
        expect(helper.annotations({ name: 'Ana' })).toEqual(new Map());
      });
    });

    describe('attributes', () => {
      it('should return all attributes for metadata none', () => {
        const value = {
          '@odata.type': 'T',
          'Friends@odata.navigationLink': 'x',
          Name: 'Ana',
          '#Func': 'fn',
        };
        expect(helper.attributes(value, 'none')).toEqual(value);
      });

      it('should strip non leading odata annotations for metadata minimal', () => {
        const result = helper.attributes(
          {
            '@odata.type': 'T',
            'Friends@odata.navigationLink': 'x',
            Name: 'Ana',
            '#Func': 'fn',
          },
          'minimal',
        );
        expect(result).toEqual({ '@odata.type': 'T', Name: 'Ana' });
      });

      it('should strip all odata annotations for metadata full', () => {
        const result = helper.attributes(
          {
            '@odata.type': 'T',
            'Friends@odata.navigationLink': 'x',
            Name: 'Ana',
            '#Func': 'fn',
          },
          'full',
        );
        expect(result).toEqual({ Name: 'Ana' });
      });

      it('should not include function annotations', () => {
        const result = helper.attributes({ Name: 'Ana', '#Func': 1 }, 'none');
        expect(result).toEqual({ Name: 'Ana', '#Func': 1 });
      });
    });

    describe('nextLink/readLink/editLink/deltaLink/media*', () => {
      it('should decode the next link', () => {
        const annots = new Map([['@odata.nextLink', 'People?$skip=10%20%26%20more']]);
        expect(helper.nextLink(annots)).toBe('People?$skip=10 & more');
      });

      it('should return undefined for a missing next link', () => {
        expect(helper.nextLink(new Map())).toBeUndefined();
      });

      it('should decode the read link', () => {
        const annots = new Map([['@odata.readLink', 'People(1)%20']]);
        expect(helper.readLink(annots)).toBe('People(1) ');
      });

      it('should decode the edit link', () => {
        const annots = new Map([['@odata.editLink', 'People(1)%2F']]);
        expect(helper.editLink(annots)).toBe('People(1)/');
      });

      it('should decode the media read link', () => {
        const annots = new Map([['@odata.mediaReadLink', 'Photo%20']]);
        expect(helper.mediaReadLink(annots)).toBe('Photo ');
      });

      it('should decode the media edit link', () => {
        const annots = new Map([['@odata.mediaEditLink', 'Photo%2Fedit']]);
        expect(helper.mediaEditLink(annots)).toBe('Photo/edit');
      });

      it('should decode the delta link', () => {
        const annots = new Map([['@odata.deltaLink', 'People?$deltatoken=1']]);
        expect(helper.deltaLink(annots)).toBe('People?$deltatoken=1');
      });

      it('should decode the media content type', () => {
        const annots = new Map([['@odata.mediaContentType', 'image%2Fjpeg']]);
        expect(helper.mediaContentType(annots)).toBe('image/jpeg');
      });
    });

    describe('id/etag/type/count', () => {
      const annots = new Map([
        ['@odata.id', 'People(1)'],
        ['@odata.etag', 'W/"123"'],
        ['@odata.type', '#TripPin.Person'],
        ['@odata.count', '10'],
      ]);

      it('should get the id', () => {
        expect(helper.id(annots)).toBe('People(1)');
        expect(helper.id({ '@odata.id': 'People(1)' })).toBe('People(1)');
        expect(helper.id(new Map())).toBeUndefined();
      });

      it('should get the etag', () => {
        expect(helper.etag(annots)).toBe('W/"123"');
        expect(helper.etag({ '@odata.etag': 'W/"123"' })).toBe('W/"123"');
        expect(helper.etag(new Map())).toBeUndefined();
      });

      it('should get the type', () => {
        expect(helper.type(annots)).toBe('TripPin.Person');
        expect(helper.type({ '@odata.type': '#TripPin.Person' })).toBe('TripPin.Person');
        expect(helper.type(new Map())).toBeUndefined();
      });

      it('should resolve a collection type', () => {
        expect(helper.type(new Map([['@odata.type', '#Collection(TripPin.Person)']]))).toBe(
          'TripPin.Person',
        );
      });

      it('should qualify a simple collection type with the Edm prefix', () => {
        expect(helper.type(new Map([['@odata.type', '#Collection(String)']]))).toBe('Edm.String');
      });

      it('should return the count as a number', () => {
        expect(helper.count(annots)).toBe(10);
        expect(helper.count(new Map())).toBeUndefined();
      });
    });

    describe('functions/properties', () => {
      it('should extract the function annotations without the prefix', () => {
        const annots = new Map<string, any>([
          ['#TripPin.GetPeople', { a: 1 }],
          ['#TripPin.GetInvolvedPeople', { b: 2 }],
          ['@odata.type', 'TripPin.Person'],
        ]);
        const funcs = helper.functions(annots);
        expect(funcs.get('TripPin.GetPeople')).toEqual({ a: 1 });
        expect(funcs.get('TripPin.GetInvolvedPeople')).toEqual({ b: 2 });
        expect(funcs.size).toBe(2);
      });

      it('should extract the property annotations grouped by name', () => {
        const annots = new Map<string, any>([
          ['Friends@odata.navigationLink', 'x'],
          ['Friends@odata.editLink', 'y'],
          ['BestFriend@odata.navigationLink', 'z'],
        ]);
        const props = helper.properties(annots) as unknown as Map<string, Map<string, any>>;
        expect(props.get('Friends')).toEqual(
          new Map([
            ['@odata.navigationLink', 'x'],
            ['@odata.editLink', 'y'],
          ]),
        );
        expect(props.get('BestFriend')).toEqual(new Map([['@odata.navigationLink', 'z']]));
      });
    });

    describe('context', () => {
      it('should parse a single entity context', () => {
        const context = helper.context({
          '@odata.context': 'http://localhost/$metadata#People/$entity',
        });
        expect(context.serviceRootUrl).toBe('http://localhost/');
        expect(context.metadataUrl).toBe('http://localhost/$metadata');
        expect(context.entitySet).toBe('People');
        expect(context.entity).toBe(true);
      });

      it('should parse an entity set context', () => {
        const context = helper.context({ '@odata.context': 'http://localhost/$metadata#People' });
        expect(context.serviceRootUrl).toBe('http://localhost/');
        expect(context.metadataUrl).toBe('http://localhost/$metadata');
        expect(context.entitySet).toBe('People');
        expect(context.entity).toBe(false);
      });

      it('should parse an entity context with a key', () => {
        const context = helper.context({
          '@odata.context': 'http://localhost/$metadata#People(1)',
        });
        expect(context.entitySet).toBe('People');
        expect(context.key).toBe('1');
        expect(context.property).toBeUndefined();
      });

      it('should parse a navigation property context', () => {
        const context = helper.context({
          '@odata.context': 'http://localhost/$metadata#People(1)/Trips',
        });
        expect(context.entitySet).toBe('People');
        expect(context.key).toBe('1');
        expect(context.property).toBe('Trips');
      });

      it('should parse a collection type context', () => {
        const context = helper.context({
          '@odata.context': 'http://localhost/$metadata#Collection(TripPin.Person)',
        });
        expect(context.type).toBe('TripPin.Person');
      });

      it('should parse a type context', () => {
        const context = helper.context({
          '@odata.context': 'http://localhost/$metadata#TripPin.Person',
        });
        expect(context.type).toBe('TripPin.Person');
      });

      it('should parse an expand context', () => {
        const context = helper.context({
          '@odata.context':
            'http://localhost/$metadata#Categories(children(children(children())))/$entity',
        });
        expect(context.entitySet).toBe('Categories');
        expect(context.expand).toBe('children(children(children()))');
        expect(context.entity).toBe(true);
      });

      it('should return an empty context without a context annotation', () => {
        expect(helper.context(new Map())).toEqual({});
        expect(helper.context({})).toEqual({});
      });
    });

    describe('countParam', () => {
      it('should use the $count parameter for version 4.0', () => {
        expect(helper.countParam()).toEqual({ $count: 'true' });
      });
    });
  });

  describe('Version 3.0', () => {
    const helper = ODataHelper[VERSION_3_0];

    it('should use odata.metadata as the context annotation', () => {
      const context = helper.context({
        'odata.metadata': 'http://localhost/$metadata#People',
      });
      expect(context.entitySet).toBe('People');
      expect(context.metadataUrl).toBe('http://localhost/$metadata');
    });

    it('should use the value key for collections', () => {
      expect(helper.entities({ value: [1] })).toEqual([1]);
    });

    it('should parse the count annotation', () => {
      expect(helper.count(new Map([['odata.count', '5']]))).toBe(5);
    });

    it('should use the $inlinecount parameter for version 3.0', () => {
      expect(helper.countParam()).toEqual({ $inlinecount: 'allpages' });
    });
  });

  describe('Version 2.0', () => {
    const helper = ODataHelper[VERSION_2_0];

    it('should collect the annotations from the __metadata attribute', () => {
      const annots = helper.annotations({ __metadata: { id: 'x', type: 'TripPin.Person' } });
      expect(annots.get('id')).toBe('x');
      expect(annots.get('type')).toBe('TripPin.Person');
    });

    it('should return the attributes as is', () => {
      const value = { name: 'Ana' };
      expect(helper.attributes(value, 'full' as any)).toBe(value);
    });

    it('should use the results key for collections', () => {
      expect(helper.entities({ results: [1] })).toEqual([1]);
    });

    it('should return an empty context', () => {
      expect(helper.context({})).toEqual({});
    });

    it('should use the $inlinecount parameter for version 2.0', () => {
      expect(helper.countParam()).toEqual({ $inlinecount: 'allpages' });
    });
  });
});
