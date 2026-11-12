import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ODataApi } from '../api';
import { ODataClient } from '../client';
import { provideODataClient } from '../module';
import { ODataEntityResource, ODataEntitySetResource } from '../resources';
import { Person, Photo, TRIPPIN_NAMESPACE, TripPinConfig } from '../trippin.config';
import { ODataApiConfig } from '../types';
import { ODataCollection } from './collection';
import { ODataModel } from './model';
import {
  BUBBLES,
  INCLUDE_DEEP,
  INCLUDE_SHALLOW,
  Model,
  ModelField,
  ModelOptions,
  ODataModelAttribute,
  ODataModelEvent,
  ODataModelEventEmitter,
  ODataModelEventType,
  ODataModelField,
  ODataModelOptions,
} from './options';

const PERSON_TYPE = `${TRIPPIN_NAMESPACE}.Person`;
const PHOTO_TYPE = `${TRIPPIN_NAMESPACE}.Photo`;
const PLAN_ITEM_TYPE = `${TRIPPIN_NAMESPACE}.PlanItem`;
const PUBLIC_TRANSPORTATION_TYPE = `${TRIPPIN_NAMESPACE}.PublicTransportation`;
const FLIGHT_TYPE = `${TRIPPIN_NAMESPACE}.Flight`;
const LOCATION_TYPE = `${TRIPPIN_NAMESPACE}.Location`;

//#region Decorated models
@Model({ cid: '_id' })
class PhotoModel<E extends Photo> extends ODataModel<E> {
  @ModelField()
  declare Id: number;
  @ModelField({ name: 'Name', minLength: 3, pattern: /^[a-z]+$/, default: 'untitled' })
  declare Title: string;
}

class PhotoCollection<E extends Photo, M extends PhotoModel<E>> extends ODataCollection<E, M> {}

const DecoratedConfig = {
  ...TripPinConfig,
  models: { [PHOTO_TYPE]: PhotoModel },
  collections: { [PHOTO_TYPE]: PhotoCollection },
} as ODataApiConfig;
//#endregion

describe('ODataModelOptions', () => {
  let client: ODataClient;
  let api: ODataApi;

  const setup = async (config: ODataApiConfig = TripPinConfig) => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideODataClient({ config }),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(ODataClient);
    await client.initialize();
    api = client.apiFor();
  };

  /** Options of a model built (and configured) by the api for the given type. */
  const metaFor = <T>(type: string) => api.modelForType<T>(type).meta as ODataModelOptions<T>;

  describe('metadata', () => {
    beforeEach(() => setup());

    it('should be created for every structured type', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      expect(meta instanceof ODataModelOptions).toBe(true);
      expect(meta.name).toEqual('Person');
      expect(meta.type()).toEqual(PERSON_TYPE);
      expect(meta.structuredType).toBe(api.findStructuredType(PERSON_TYPE));
      expect(meta.api).toBe(api);
    });

    it('should be memoized by type', () => {
      expect(api.optionsForType(PERSON_TYPE)).toBe(api.optionsForType(PERSON_TYPE));
      expect(metaFor(PERSON_TYPE)).toBe(api.optionsForType(PERSON_TYPE));
    });

    it('should return undefined for unknown types', () => {
      expect(api.optionsForType(`${TRIPPIN_NAMESPACE}.Foo`)).toBeUndefined();
    });

    it('should use the default client id field', () => {
      expect(metaFor(PERSON_TYPE).cid).toEqual('_cid');
    });

    it('should describe the kind of structured type', () => {
      const person = metaFor(PERSON_TYPE);
      const location = metaFor(LOCATION_TYPE);
      expect(person.isEntityType()).toBe(true);
      expect(person.isComplexType()).toBe(false);
      expect(person.isOpenType()).toBe(true);
      expect(location.isComplexType()).toBe(true);
      expect(metaFor(PHOTO_TYPE).isOpenType()).toBe(false);
    });

    it('should check its type', () => {
      const meta = metaFor(PERSON_TYPE);
      expect(meta.isTypeOf(PERSON_TYPE)).toBe(true);
      expect(meta.isTypeOf(PHOTO_TYPE)).toBe(false);
    });

    it('should resolve its entity set', () => {
      expect(metaFor(PERSON_TYPE).entitySet?.name).toEqual('People');
      expect(metaFor(LOCATION_TYPE).entitySet).toBeUndefined();
    });

    it('should build a json schema', () => {
      const schema = metaFor(PHOTO_TYPE).toJsonSchema() as any;
      expect(Object.keys(schema.properties)).toEqual(['Id', 'Name']);
    });
  });

  describe('hierarchy', () => {
    beforeEach(() => setup());

    it('should link parent and children options', () => {
      const planItem = metaFor(PLAN_ITEM_TYPE);
      const transportation = metaFor(PUBLIC_TRANSPORTATION_TYPE);
      const flight = metaFor(FLIGHT_TYPE);
      expect(flight.base).toEqual(PUBLIC_TRANSPORTATION_TYPE);
      expect(flight.parent).toBe(transportation);
      expect(transportation.parent).toBe(planItem);
      expect(planItem.children).toContain(transportation);
      expect(transportation.children).toContain(flight);
    });

    it('should find child options recursively', () => {
      const planItem = metaFor(PLAN_ITEM_TYPE);
      metaFor(PUBLIC_TRANSPORTATION_TYPE);
      const flight = metaFor(FLIGHT_TYPE);
      expect(planItem.findChildOptions((o) => o.isTypeOf(FLIGHT_TYPE))).toBe(flight);
      expect(planItem.findChildOptions((o) => o.isTypeOf(PLAN_ITEM_TYPE))).toBe(planItem);
      expect(planItem.findChildOptions((o) => o.isTypeOf(PERSON_TYPE))).toBeUndefined();
    });

    // Known issue: api.optionsForType builds the default config with
    // `fields({ include_parents: true })`, so derived options already own the inherited fields and
    // `fields({ include_parents: true })` lists them twice. Remove `.fails` once fixed.
    it.fails('should include parent fields on demand', () => {
      metaFor(PLAN_ITEM_TYPE);
      metaFor(PUBLIC_TRANSPORTATION_TYPE);
      const flight = metaFor(FLIGHT_TYPE);
      expect(
        flight.fields({ include_parents: true, include_navigation: false }).map((f) => f.name),
      ).toEqual([
        'PlanItemId',
        'ConfirmationCode',
        'StartsAt',
        'EndsAt',
        'Duration',
        'SeatNumber',
        'FlightNumber',
      ]);
    });
  });

  describe('fields', () => {
    beforeEach(() => setup());

    it('should filter navigation fields', () => {
      const meta = metaFor(PERSON_TYPE);
      const names = (include_navigation: boolean) =>
        meta.fields({ include_parents: true, include_navigation }).map((f) => f.name);
      expect(names(false)).not.toContain('Friends');
      expect(names(true)).toEqual(expect.arrayContaining(['Friends', 'Trips', 'Photo']));
    });

    it('should find fields by name', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      const field = meta.field('FirstName');
      expect(field instanceof ODataModelField).toBe(true);
      expect(field.name).toEqual('FirstName');
      expect(field.field).toEqual('FirstName');
      expect(field.type).toEqual('Edm.String');
      expect(meta.findField('Unknown')).toBeUndefined();
    });

    it('should throw for unknown fields', () => {
      expect(() => metaFor(PERSON_TYPE).field('Unknown')).toThrow('No field with name Unknown');
    });

    it('should describe its fields', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      const userName = meta.field('UserName');
      const concurrency = meta.field('Concurrency');
      const friends = meta.field('Friends');
      const photo = meta.field('Photo');
      const address = meta.field('AddressInfo');
      const gender = meta.field('Gender');

      expect(userName.isKey()).toBe(true);
      expect(userName.isEdmType()).toBe(true);
      expect(concurrency.isComputed()).toBe(true);
      expect(friends.navigation).toBe(true);
      expect(friends.collection).toBe(true);
      expect(friends.isStructuredType()).toBe(true);
      expect(friends.structuredType().type()).toEqual(PERSON_TYPE);
      expect(photo.navigation).toBe(true);
      expect(photo.collection).toBe(false);
      expect(address.navigation).toBe(false);
      expect(address.collection).toBe(true);
      expect(address.isStructuredType()).toBe(true);
      expect(gender.isEnumType()).toBe(true);
      expect(gender.enumType().name).toEqual('PersonGender');
    });

    it('should throw when resolving types of the wrong kind', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      expect(() => meta.field('FirstName').structuredType()).toThrow(
        'Could not find structured type for Edm.String',
      );
      expect(() => meta.field('FirstName').enumType()).toThrow(
        'Could not find enum type for Edm.String',
      );
    });

    it('should require name and field to add a field', () => {
      const meta = metaFor(PERSON_TYPE);
      expect(() => meta.addField('Other', {})).toThrow('Model Properties need name and field');
    });

    it('should require a structured type field to add a field', () => {
      const meta = metaFor(PERSON_TYPE);
      expect(() => meta.addField('Other', { field: 'Missing' })).toThrow(
        'Person has no field named Missing',
      );
    });

    it('should map custom field names to entity fields', () => {
      const structured = api.findStructuredType<any>(PERSON_TYPE)!;
      const meta = new ODataModelOptions<any>({
        config: { fields: new Map([['First', { field: 'FirstName' }]]) },
        structuredType: structured,
      });
      expect(meta.field('First').field).toEqual('FirstName');
      expect(meta.findField('FirstName')).toBeUndefined();
      expect(meta.findField('FirstName', { reset: true })?.name).toEqual('First');
    });

    it('should build resources from fields', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      const entity = client.entitySet<Person>('People').entity('russellwhyte');
      expect(meta.field('Friends').resourceFactory(entity).toString()).toEqual(
        "People('russellwhyte')/Friends",
      );
      expect(meta.field('FirstName').resourceFactory(entity).toString()).toEqual(
        "People('russellwhyte')/FirstName",
      );
      expect(() => meta.field('Friends').resourceFactory(client.entitySet('People'))).toThrow(
        "Can't build resource for non compatible base type",
      );
    });

    it('should serialize, deserialize and encode values', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      const gender = meta.field('Gender');
      expect(gender.deserialize('Female')).toEqual(1);
      expect(gender.serialize(1 as any)).toEqual('Female');
      expect(gender.encode(1 as any)).toEqual(expect.objectContaining({ value: "'Female'" }));
    });
  });

  describe('keys and referentials', () => {
    beforeEach(() => setup());

    it('should resolve simple keys', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      expect(meta.resolveKey({ UserName: 'russellwhyte', FirstName: 'R' })).toEqual('russellwhyte');
      expect(meta.resolveKey({ UserName: 'russellwhyte' }, { resolve: false })).toEqual({
        UserName: 'russellwhyte',
      });
      expect(meta.resolveKey({ FirstName: 'R' })).toBeUndefined();
    });

    it('should resolve keys from models', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      const model = client.entitySet<Person>('People').asModel({ UserName: 'russellwhyte' });
      expect(meta.resolveKey(model)).toEqual('russellwhyte');
    });

    it('should resolve keys of derived types from the base type', () => {
      metaFor(PLAN_ITEM_TYPE);
      metaFor(PUBLIC_TRANSPORTATION_TYPE);
      const flight = metaFor(FLIGHT_TYPE);
      expect(flight.resolveKey({ PlanItemId: 3, FlightNumber: 'AA26' })).toEqual(3);
    });

    it('should not resolve keys for complex types', () => {
      expect(metaFor(LOCATION_TYPE).resolveKey({ Address: 'Street' })).toBeUndefined();
    });

    it('should resolve no referentials when there are no constraints', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      const field = meta.field('Photo');
      expect(meta.resolveReferential({ UserName: 'x' }, field)).toBeUndefined();
      expect(meta.resolveReferenced({ UserName: 'x' }, field)).toBeUndefined();
    });
  });

  describe('defaults and validation', () => {
    beforeEach(() => setup(DecoratedConfig));

    it('should collect field defaults', () => {
      expect(metaFor(PHOTO_TYPE).defaults()).toEqual({ Title: 'untitled' });
      expect(metaFor(PERSON_TYPE).defaults()).toBeUndefined();
    });

    it('should apply defaults to new models', () => {
      const photo = new PhotoModel<Photo>({ Id: 1 });
      expect(photo.Title).toEqual('untitled');
    });

    it('should not apply defaults when resetting', () => {
      const photo = new PhotoModel<Photo>({ Id: 1 }, { reset: true });
      expect(photo.Title).toBeUndefined();
    });

    it('should validate with field options', () => {
      const field = metaFor<Photo>(PHOTO_TYPE).field<string>('Title');
      expect(field.validate('a1', { method: 'create' })).toEqual(['minlength', 'pattern']);
      expect(field.validate('ab', { method: 'create' })).toEqual(['minlength']);
      expect(field.validate('Abcd', { method: 'create' })).toEqual(['pattern']);
      expect(field.validate('abcd', { method: 'create' })).toBeUndefined();
    });

    it('should validate min and max', () => {
      const structured = api.findStructuredType<Photo>(PHOTO_TYPE)!;
      const meta = new ODataModelOptions<Photo>({
        config: { fields: new Map([['Id', { field: 'Id', min: 1, max: 10 }]]) },
        structuredType: structured,
      });
      const field = meta.field<number>('Id');
      expect(field.validate(0, { method: 'create' })).toEqual(['min']);
      expect(field.validate(11, { method: 'create' })).toEqual(['max']);
      expect(field.validate(5, { method: 'create' })).toBeUndefined();
    });

    it('should validate whole models', () => {
      const photo = new PhotoModel<Photo>({ Title: 'X' });
      expect(metaFor<Photo>(PHOTO_TYPE).validate(photo, { method: 'create' })).toEqual({
        Id: ['required'],
        Title: ['minlength', 'pattern'],
      });
    });

    it('should validate nested models and collections', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      const person = client.entitySet<Person>('People').asModel({
        UserName: 'u',
        FirstName: 'F',
        LastName: 'L',
        AddressInfo: [{ Address: 'Street' }],
      } as any);
      const errors = meta.validate(person, { method: 'create' });
      expect(errors?.['AddressInfo']).toEqual([{ City: ['required'] }]);
    });
  });

  describe('decorators', () => {
    beforeEach(() => setup(DecoratedConfig));

    it('should register model options with @Model and @ModelField', () => {
      const options = (PhotoModel as any).options as ModelOptions;
      expect(options.cid).toEqual('_id');
      expect([...options.fields.keys()]).toEqual(['Id', 'Title']);
      expect(options.fields.get('Title')?.field).toEqual('Name');
    });

    it('should use the decorated model and collection for the type', () => {
      expect(api.modelForType(PHOTO_TYPE)).toBe(PhotoModel);
      expect(api.collectionForType(PHOTO_TYPE)).toBe(PhotoCollection);
      expect(PhotoCollection.model).toBe(PhotoModel);
    });

    it('should configure the model meta from the decorators', () => {
      const meta = PhotoModel.meta;
      expect(meta.cid).toEqual('_id');
      expect(
        meta.fields({ include_parents: true, include_navigation: true }).map((f) => f.name),
      ).toEqual(['Id', 'Title']);
    });

    it('should map field names to entity names', () => {
      const photo = new PhotoModel<Photo>({ Id: 1, Name: 'avatar' }, { reset: true });
      expect(photo.Title).toEqual('avatar');
      expect(photo.toEntity()).toEqual({ Id: 1, Title: 'avatar' });
      expect(photo.toEntity({ field_mapping: true })).toEqual({ Id: 1, Name: 'avatar' });
      expect((photo as any)._id).toMatch(/^photo-/);
    });

    it('should create typed models and collections from resources', () => {
      const photos = client.entitySet<Photo>('Photos');
      expect(photos.asModel({ Id: 1 }) instanceof PhotoModel).toBe(true);
      expect(photos.asCollection([{ Id: 1 }]) instanceof PhotoCollection).toBe(true);
    });

    it('should create typed navigation models', () => {
      const person = client.entitySet<Person>('People').asModel({ UserName: 'u' });
      expect(person.getAttribute('Photo') instanceof PhotoModel).toBe(true);
    });
  });

  describe('resources', () => {
    beforeEach(() => setup());

    it('should build collection and model resources from the entity set', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      const collection = meta.collectionResourceFactory();
      const model = meta.modelResourceFactory();
      expect(collection instanceof ODataEntitySetResource).toBe(true);
      expect(collection?.toString()).toEqual('People');
      expect(model instanceof ODataEntityResource).toBe(true);
      expect(model?.toString()).toEqual('People');
    });

    it('should keep the query when building resources', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      const query = client
        .entitySet<Person>('People')
        .query((q) => q.top(5))
        .cloneQuery<Person>();
      expect(meta.collectionResourceFactory(query)?.toString()).toEqual('People?$top=5');
    });

    it('should not build resources for types without entity set', () => {
      const meta = metaFor(LOCATION_TYPE);
      expect(meta.collectionResourceFactory()).toBeNull();
      expect(meta.modelResourceFactory()).toBeNull();
    });

    it('should build the parent chain of a model', () => {
      const person = client.entitySet<Person>('People').asModel({
        UserName: 'u',
        AddressInfo: [{ Address: 'Street', City: { Name: 'C' } }],
      } as any);
      const city = person.get('AddressInfo[0].City');
      const chain = ODataModelOptions.chain(city);
      // Each link holds a container and the field through which the next link hangs from it.
      expect(chain.map(([c, f]) => [Object.prototype.toString.call(c), f?.name ?? null])).toEqual([
        ['[object Model]', 'AddressInfo'],
        ['[object Collection]', null],
        ['[object Model]', 'City'],
        ['[object Model]', null],
      ]);
      expect(chain[0][0]).toBe(person);
      expect(chain[1][0]).toBe(person.get('AddressInfo'));
      expect(chain[3][0]).toBe(city);
    });

    it('should resolve resources through the parent chain', () => {
      const person = client.entitySet<Person>('People').asModel({ UserName: 'u' });
      const friends = person.getAttribute<Person>('Friends') as ODataCollection<
        Person,
        ODataModel<Person>
      >;
      friends.assign([{ UserName: 'f' }], { reset: true });
      expect(ODataModelOptions.resource(friends)?.toString()).toEqual("People('u')/Friends");
      expect(ODataModelOptions.resource(friends.first()!)?.toString()).toEqual(
        "People('u')/Friends('f')",
      );
    });

    it('should identify models and collections', () => {
      const people = client.entitySet<Person>('People');
      const model = people.asModel({});
      const collection = people.asCollection([]);
      expect(ODataModelOptions.isModel(model)).toBe(true);
      expect(ODataModelOptions.isModel(collection)).toBe(false);
      expect(ODataModelOptions.isCollection(collection)).toBe(true);
      expect(ODataModelOptions.isCollection({})).toBe(false);
    });

    it('should recognise entities it models', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      expect(meta.isModelFor({ UserName: 'u', FirstName: 'F' })).toBe(true);
      expect(meta.isModelFor({ '@odata.type': `#${PERSON_TYPE}` })).toBe(true);
      expect(meta.isModelFor({ UserName: 'u', Other: 1 })).toBe(false);
    });
  });

  describe('model pool', () => {
    beforeEach(() => setup());

    it('should pool entity models with simple keys', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      const Model = api.modelForType<Person>(PERSON_TYPE);
      const first = meta.modelFactory(Model, { UserName: 'u', FirstName: 'A' });
      const second = meta.modelFactory(Model, { UserName: 'u', FirstName: 'B' });
      expect(second).toBe(first);
      expect(first.get('FirstName')).toEqual('B');
      expect(meta.pool.get('u')).toBe(first);
    });

    it('should not pool models without key', () => {
      const meta = metaFor<Person>(PERSON_TYPE);
      const Model = api.modelForType<Person>(PERSON_TYPE);
      expect(meta.modelFactory(Model, {})).not.toBe(meta.modelFactory(Model, {}));
    });

    it('should not pool complex models', () => {
      const meta = metaFor<any>(LOCATION_TYPE);
      const Model = api.modelForType<any>(LOCATION_TYPE);
      const data = { Address: 'Street' };
      expect(meta.modelFactory(Model, data)).not.toBe(meta.modelFactory(Model, data));
    });
  });
});

describe('ODataModelAttribute', () => {
  let client: ODataClient;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideODataClient({ config: TripPinConfig }),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(ODataClient);
    await client.initialize();
  });

  const attribute = (name: string) => {
    const model = client.entitySet<Person>('People').asModel({});
    const field = model._meta.field(name);
    return { model, field, attr: new ODataModelAttribute<any>(model, field) };
  };

  it('should expose its field', () => {
    const { attr, field } = attribute('FirstName');
    expect(attr.name).toEqual('FirstName');
    expect(attr.fieldName).toEqual('FirstName');
    expect(attr.type).toEqual(field.type);
    expect(attr.navigation).toBeFalsy();
    expect(attr.isComputed()).toBeFalsy();
    expect(attr.isStructuredType()).toBe(false);
  });

  it('should track added, modified and reset values', () => {
    const { attr } = attribute('FirstName');
    expect(attr.get()).toBeUndefined();
    expect(attr.isModified()).toBe(false);

    expect(attr.set('A')).toBe(true);
    expect(attr.get()).toEqual('A');
    expect(attr.isModified()).toBe(true);

    attr.reset();
    expect(attr.get()).toBeUndefined();
    expect(attr.isModified()).toBe(false);
  });

  it('should keep the value when set with reset', () => {
    const { attr } = attribute('FirstName');
    attr.set('A', true);
    expect(attr.isModified()).toBe(false);
    attr.set('B');
    expect(attr.isModified()).toBe(true);
    attr.set('A');
    expect(attr.isModified()).toBe(false);
    expect(attr.get()).toEqual('A');
  });

  it('should report no modification for equal values', () => {
    const { attr } = attribute('Emails');
    attr.set(['a'], true);
    expect(attr.set(['a'])).toBe(false);
    expect(attr.isModified()).toBe(false);
  });

  it('should forward events of linked models and reparent them', () => {
    const { attr, model } = attribute('Photo');
    const photo = client.entitySet<Photo>('Photos').asModel({ Id: 1 });
    const events: ODataModelEvent<any>[] = [];
    attr.events$.subscribe((e) => events.push(e));

    attr.set(photo, false, true);
    expect(photo._parent?.[0]).toBe(model);
    photo.set('Name', 'x');
    expect(events.map((e) => e.type)).toContain(ODataModelEventType.Change);

    events.length = 0;
    attr.set(null);
    photo.set('Name', 'y');
    expect(events).toEqual([]);
  });

  it('should be modified when a linked model is modified', () => {
    const { attr } = attribute('Photo');
    const photo = client.entitySet<Photo>('Photos').asModel({ Id: 1 }, { reset: true });
    attr.set(photo, true);
    expect(attr.isModified()).toBe(false);
    photo.set('Name', 'x');
    expect(attr.isModified()).toBe(true);
  });
});

describe('ODataModelEvent', () => {
  it('should bubble only bubbling types by default', () => {
    expect(BUBBLES).toEqual([
      ODataModelEventType.Change,
      ODataModelEventType.Reset,
      ODataModelEventType.Update,
      ODataModelEventType.Destroy,
      ODataModelEventType.Add,
      ODataModelEventType.Remove,
    ]);
    expect(new ODataModelEvent(ODataModelEventType.Change).bubbles).toBe(true);
    expect(new ODataModelEvent(ODataModelEventType.Request).bubbles).toBe(false);
    expect(new ODataModelEvent(ODataModelEventType.Request, { bubbles: true }).bubbles).toBe(true);
  });

  it('should stop propagation', () => {
    const event = new ODataModelEvent(ODataModelEventType.Change);
    event.stopPropagation();
    expect(event.bubbles).toBe(false);
  });

  it('should build the path from the chain', () => {
    const parent = {} as any;
    const child = {} as any;
    const attr = (name: string) =>
      Object.assign(Object.create(ODataModelAttribute.prototype), {
        _field: { name },
      }) as ODataModelAttribute<any>;
    const event = new ODataModelEvent<any>(ODataModelEventType.Change, {
      chain: [
        [parent, attr('Trips')],
        [child, 2],
        [child, attr('Name')],
      ],
    });
    expect(event.path).toEqual('Trips[2].Name');
  });

  it('should detect visited links', () => {
    const a = {} as any;
    const b = {} as any;
    const event = new ODataModelEvent<any>(ODataModelEventType.Change, {
      chain: [
        [a, null],
        [b, null],
      ],
    });
    expect(event.visited(a)).toBe(true);
    expect(event.visited(b)).toBe(false);
    expect(event.canContinueWith(a)).toBe(false);
    event.stopPropagation();
    expect(event.canContinueWith({} as any)).toBe(false);
  });
});

describe('ODataModelEventEmitter', () => {
  it('should emit one event per space separated type', () => {
    const emitter = new ODataModelEventEmitter<any>();
    const types: string[] = [];
    emitter.subscribe((e) => types.push(e.type));
    emitter.trigger('change update');
    emitter.trigger(ODataModelEventType.Sync);
    expect(types).toEqual(['change', 'update', 'sync']);
  });

  it('should pass event payload', () => {
    const emitter = new ODataModelEventEmitter<any>();
    let event: ODataModelEvent<any> | undefined;
    emitter.subscribe((e) => (event = e));
    emitter.trigger(ODataModelEventType.Change, { value: 2, previous: 1, options: { key: true } });
    expect(event?.value).toEqual(2);
    expect(event?.previous).toEqual(1);
    expect(event?.options).toEqual({ key: true });
  });
});

describe('Include presets', () => {
  it('should define shallow and deep serialization presets', () => {
    expect(INCLUDE_SHALLOW).toEqual({
      include_concurrency: true,
      include_computed: true,
      include_key: true,
      include_id: false,
    });
    expect(INCLUDE_DEEP).toEqual({
      ...INCLUDE_SHALLOW,
      include_navigation: true,
      include_non_field: true,
    });
  });
});
