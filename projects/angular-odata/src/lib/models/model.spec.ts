import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ODataClient } from '../client';
import { provideODataClient } from '../module';
import { ODataEntitySetResource } from '../resources';
import {
  Person,
  Photo,
  TRIPPIN_NAMESPACE,
  TRIPPIN_SERVICE_ROOT,
  TripPinConfig,
} from '../trippin.config';
import { ODataCollection } from './collection';
import { ODataModel } from './model';
import { ModelInterface, ODataModelEvent, ODataModelEventType, ODataModelState } from './options';

interface City {
  Name: string;
  CountryRegion: string;
  Region: string;
}
interface Location {
  Address: string;
  City: City;
}
// Person as described by the TripPin metadata (the shared interface omits some fields).
interface FullPerson extends Person {
  AddressInfo?: Location[];
  Concurrency?: number;
}
type PersonModel = ODataModel<FullPerson> & ModelInterface<FullPerson>;

const PERSON_TYPE = `${TRIPPIN_NAMESPACE}.Person`;

const RUSSELL = {
  UserName: 'russellwhyte',
  FirstName: 'Russell',
  LastName: 'Whyte',
  Emails: ['russell@example.com'],
  Concurrency: 1,
  AddressInfo: [
    {
      Address: '187 Suffolk Ln.',
      City: { Name: 'Boise', CountryRegion: 'United States', Region: 'ID' },
    },
  ],
};

describe('ODataModel', () => {
  let client: ODataClient;
  let people: ODataEntitySetResource<FullPerson>;

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
    people = client.entitySet<FullPerson>('People', PERSON_TYPE);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  /** A model as it would come from the server: every attribute unchanged. */
  const loaded = (data: Partial<FullPerson> | { [name: string]: any } = RUSSELL) =>
    people.asModel(data, { reset: true }) as PersonModel;

  /** A new model bound to a keyless entity resource (People), ready to be created. */
  const created = (data: Partial<FullPerson> | { [name: string]: any } = {}) =>
    people.entity().asModel(data) as PersonModel;

  describe('creation', () => {
    it('should throw when the model class has no metadata', () => {
      class Orphan extends ODataModel<any> {}
      expect(() => new Orphan()).toThrow("Model: Can't create model without metadata");
    });

    it('should create a model for the entity set type', () => {
      const model = loaded();
      expect(model instanceof ODataModel).toBe(true);
      expect(model.schema().type()).toEqual(PERSON_TYPE);
      expect(ODataModel.prototype.isPrototypeOf(model)).toBe(true);
    });

    it('should expose attributes as properties', () => {
      const model = loaded();
      expect(model.UserName).toEqual('russellwhyte');
      expect(model.FirstName).toEqual('Russell');
      expect(model.Emails).toEqual(['russell@example.com']);
    });

    it('should generate a client id prefixed with the type name', () => {
      const model = loaded();
      expect((model as any)[model._meta.cid]).toMatch(/^person-/);
    });

    it('should keep the client id given in the data', () => {
      const model = people.asModel({ _cid: 'person-fixed' } as any) as PersonModel;
      expect((model as any)._cid).toEqual('person-fixed');
    });

    it('should wrap complex collections in an ODataCollection', () => {
      const model = loaded();
      expect(model.AddressInfo instanceof ODataCollection).toBe(true);
      expect(model.AddressInfo!.length).toEqual(1);
      expect(model.get('AddressInfo[0].City.Name')).toEqual('Boise');
    });

    it('should reuse the pooled instance for the same key', () => {
      const first = loaded();
      const second = people.asModel({ UserName: 'russellwhyte', FirstName: 'Other' });
      expect(second).toBe(first);
      expect(first.FirstName).toEqual('Other');
    });

    it('should report the Model string tag', () => {
      expect(Object.prototype.toString.call(loaded())).toEqual('[object Model]');
    });
  });

  describe('identity', () => {
    it('should resolve the key', () => {
      const model = loaded();
      expect(model.key()).toEqual('russellwhyte');
      expect(model.key({ resolve: false })).toEqual({ UserName: 'russellwhyte' });
    });

    it('should return undefined key for a new model', () => {
      const model = people.asModel({}) as PersonModel;
      expect(model.key()).toBeUndefined();
      expect(model.isNew()).toBe(true);
    });

    it('should not be new when it has a key', () => {
      expect(loaded().isNew()).toBe(false);
    });

    it('should not be a compound key', () => {
      expect(loaded().isCompoundKey()).toBe(false);
    });

    it('should be an open model', () => {
      expect(loaded().isOpenModel()).toBe(true);
    });

    it('should be equal to itself and to a model with the same key', () => {
      const model = loaded();
      expect(model.equals(model)).toBe(true);
      const Model = client.apiFor().modelForType<Person>(PERSON_TYPE);
      const other = new Model({ UserName: 'russellwhyte' });
      expect(model.equals(other)).toBe(true);
    });

    it('should not be equal to a model with a different key', () => {
      const model = loaded();
      const other = loaded({ UserName: 'scottketchum' });
      expect(model.equals(other)).toBe(false);
    });

    it('should compare complex models by value', () => {
      const model = loaded();
      const city1 = model.get('AddressInfo[0].City');
      const Model = client.apiFor().modelForType<any>(`${TRIPPIN_NAMESPACE}.City`);
      const city2 = new Model({ Name: 'Boise', CountryRegion: 'United States', Region: 'ID' });
      const city3 = new Model({ Name: 'Seattle', CountryRegion: 'United States', Region: 'WA' });
      expect(city1.equals(city2)).toBe(true);
      expect(city1.equals(city3)).toBe(false);
    });
  });

  describe('resources', () => {
    it('should resolve the entity resource from the key', () => {
      expect(loaded().resource()?.toString()).toEqual("People('russellwhyte')");
    });

    it('should resolve the entity set resource for a new model', () => {
      const model = people.asModel({});
      expect(model.resource()?.toString()).toEqual('People');
    });

    it('should build navigation property resources', () => {
      const model = loaded();
      expect(model.navigationProperty('Friends').toString()).toEqual(
        "People('russellwhyte')/Friends",
      );
      expect(model.navigationProperty('Photo').toString()).toEqual("People('russellwhyte')/Photo");
    });

    it('should throw for unknown navigation properties', () => {
      const model = loaded();
      expect(() => model.navigationProperty('FirstName')).toThrow(
        "navigationProperty: Can't find navigation property FirstName",
      );
    });

    it('should throw for navigation properties without key', () => {
      const model = people.asModel({});
      expect(() => model.navigationProperty('Friends')).toThrow(
        "navigationProperty: Can't get navigation without ODataEntityResource with key",
      );
    });

    it('should build property resources', () => {
      expect(loaded().property('FirstName').toString()).toEqual("People('russellwhyte')/FirstName");
    });

    it('should throw for unknown properties', () => {
      expect(() => loaded().property('Friends')).toThrow("property: Can't find property Friends");
    });

    it('should push and pop resources', () => {
      const model = loaded();
      const other = client.entitySet<Person>('People').entity('scottketchum');
      model.pushResource(other);
      expect(model.resource()?.toString()).toEqual("People('russellwhyte')");
      expect(model._resource).toBe(other);
      const popped = model.popResource();
      expect(popped?.resource).toBe(other);
      expect(model._resource).not.toBe(other);
      expect(model.popResource()).toBeUndefined();
    });

    it('should restore the resource after withResource', () => {
      const model = loaded();
      const previous = model._resource;
      const result = model.withResource(null, (m) => m._resource);
      expect(result).toBeNull();
      expect(model._resource).toBe(previous);
    });

    it('should run asEntity against the entity set', () => {
      const model = loaded();
      const path = model.asEntity((m) => m.resource()?.toString());
      expect(path).toEqual("People('russellwhyte')");
    });

    it('should apply query options to the resource', () => {
      const model = loaded();
      model.query((q) => q.select(['FirstName', 'LastName']));
      expect(model.resource()?.toString()).toEqual(
        "People('russellwhyte')?$select=FirstName,LastName",
      );
    });

    it('should trigger attach when the resource changes', () => {
      const model = loaded();
      const events: ODataModelEvent<any>[] = [];
      model.events$.subscribe((e) => events.push(e));
      model.attach(client.entitySet<Person>('People').entity('other'));
      expect(events.map((e) => e.type)).toEqual([ODataModelEventType.Attach]);
    });

    it('should refuse to attach a resource of another type', () => {
      const model = loaded();
      const photos = client.entitySet<any>('Photos').entity(1);
      expect(() => model.attach(photos as any)).toThrow(/Can't attach/);
    });
  });

  describe('attributes', () => {
    it('should get nested values by path', () => {
      const model = loaded();
      expect(model.get('FirstName')).toEqual('Russell');
      expect(model.get(['AddressInfo', '0', 'Address'])).toEqual('187 Suffolk Ln.');
      expect(model.get('AddressInfo[0].City.Region')).toEqual('ID');
    });

    it('should check nested values by path', () => {
      const model = loaded();
      expect(model.has('FirstName')).toBe(true);
      expect(model.has('Gender')).toBe(false);
      expect(model.has('AddressInfo[0].City.Name')).toBe(true);
      expect(model.has('AddressInfo[1]')).toBe(false);
    });

    it('should set values by path', () => {
      const model = loaded();
      model.set('FirstName', 'Rusty');
      model.set('AddressInfo[0].City.Name', 'Boston');
      expect(model.FirstName).toEqual('Rusty');
      expect(model.get('AddressInfo[0].City.Name')).toEqual('Boston');
    });

    it('should set values through property accessors', () => {
      const model = loaded();
      model.LastName = 'White';
      expect(model.get('LastName')).toEqual('White');
    });

    it('should create dynamic fields on open types', () => {
      const model = loaded();
      model.set('Nickname', 'Rusty');
      expect(model.get('Nickname')).toEqual('Rusty');
      expect(model._meta.findField('Nickname')).toBeDefined();
      expect(model.toEntity()).toEqual(expect.objectContaining({ Nickname: 'Rusty' }));
    });

    it('should lazily create navigation collections with getAttribute', () => {
      const model = loaded();
      const friends = model.getAttribute<Person>('Friends') as ODataCollection<
        Person,
        ODataModel<Person>
      >;
      expect(friends instanceof ODataCollection).toBe(true);
      expect(friends.resource()?.toString()).toEqual("People('russellwhyte')/Friends");
      expect(model.getAttribute('Friends')).toBe(friends);
    });

    it('should lazily create navigation models with getAttribute', () => {
      const model = loaded();
      const photo = model.getAttribute<Photo>('Photo') as ODataModel<Photo>;
      expect(photo instanceof ODataModel).toBe(true);
      expect(photo.resource()?.toString()).toEqual("People('russellwhyte')/Photo");
    });

    it('should not mark the model modified when getAttribute creates a value', () => {
      const model = loaded();
      model.getAttribute('Friends');
      expect(model.isModified({ include_navigation: true })).toBe(false);
    });

    it('should throw getAttribute for unknown fields', () => {
      expect(() => loaded().getAttribute('Unknown')).toThrow(
        "getAttribute: Can't find attribute Unknown",
      );
    });

    it('should encode attribute values', () => {
      const model = loaded();
      expect(model.encode('FirstName')).toEqual('Russell');
      expect(model.encode('Gender')).toBeUndefined();
    });
  });

  describe('state', () => {
    it('should be unchanged when loaded with reset', () => {
      const model = loaded();
      expect(model.isModified()).toBe(false);
      expect(model._state).toEqual(ODataModelState.Unchanged);
    });

    it('should be modified when created without reset', () => {
      const model = people.asModel({ FirstName: 'New' });
      expect(model.isModified()).toBe(true);
    });

    it('should be modified after a change', () => {
      const model = loaded();
      model.FirstName = 'Rusty';
      expect(model.isModified()).toBe(true);
    });

    it('should not be modified when restoring the original value', () => {
      const model = loaded();
      model.FirstName = 'Rusty';
      model.FirstName = 'Russell';
      expect(model.isModified()).toBe(false);
    });

    it('should detect changes inside nested complex values', () => {
      const model = loaded();
      model.set('AddressInfo[0].City.Name', 'Boston');
      expect(model.isModified()).toBe(true);
    });

    it('should reset all changes', () => {
      const model = loaded();
      model.FirstName = 'Rusty';
      model.LastName = 'White';
      model.reset();
      expect(model.FirstName).toEqual('Russell');
      expect(model.LastName).toEqual('Whyte');
      expect(model.isModified()).toBe(false);
    });

    it('should reset a single attribute', () => {
      const model = loaded();
      model.FirstName = 'Rusty';
      model.LastName = 'White';
      model.reset({ path: 'FirstName' });
      expect(model.FirstName).toEqual('Russell');
      expect(model.LastName).toEqual('White');
    });

    it('should reset nested values by path', () => {
      const model = loaded();
      model.set('AddressInfo[0].City.Name', 'Boston');
      model.reset({ path: 'AddressInfo[0].City.Name' });
      expect(model.get('AddressInfo[0].City.Name')).toEqual('Boise');
    });

    it('should clear the attributes', () => {
      const model = loaded();
      model.clear();
      expect(model._attributes.size).toEqual(0);
      expect(model.FirstName).toBeUndefined();
    });
  });

  describe('serialization', () => {
    it('should exclude computed fields by default', () => {
      const entity = loaded().toEntity();
      expect(entity).not.toHaveProperty('Concurrency');
      expect(entity).toEqual(
        expect.objectContaining({ UserName: 'russellwhyte', FirstName: 'Russell' }),
      );
    });

    it('should include computed fields on demand', () => {
      expect(loaded().toEntity({ include_computed: true })).toHaveProperty('Concurrency', 1);
    });

    it('should serialize complex collections', () => {
      expect((loaded().toEntity() as FullPerson).AddressInfo).toEqual(RUSSELL.AddressInfo);
    });

    it('should return only changes', () => {
      const model = loaded();
      model.FirstName = 'Rusty';
      expect(model.toEntity({ changes_only: true, include_key: false })).toEqual({
        FirstName: 'Rusty',
      });
      expect(model.toEntity({ changes_only: true })).toEqual({
        UserName: 'russellwhyte',
        FirstName: 'Rusty',
      });
    });

    it('should include the client id on demand', () => {
      const model = loaded();
      expect(model.toEntity({ client_id: true })).toHaveProperty('_cid', (model as any)._cid);
    });

    it('should include the odata id on demand', () => {
      expect(loaded().toEntity({ include_id: true })).toHaveProperty(
        '@odata.id',
        "People('russellwhyte')",
      );
    });

    it('should include navigation values on demand', () => {
      const model = loaded({ ...RUSSELL, Photo: { Id: 1, Name: 'me' } });
      expect(model.toEntity()).not.toHaveProperty('Photo');
      expect(model.toEntity({ include_navigation: true })).toHaveProperty('Photo', {
        Id: 1,
        Name: 'me',
      });
    });

    it('should serialize everything with toJson', () => {
      const json = loaded().toJson();
      expect(json).toEqual(expect.objectContaining(RUSSELL));
    });

    it('should clone into an equal but distinct model', () => {
      const model = loaded();
      const clone = model.clone<PersonModel>();
      expect(clone).not.toBe(model);
      expect(clone.equals(model)).toBe(true);
      expect(clone.toJson()).toEqual(model.toJson());
    });
  });

  describe('assign', () => {
    it('should assign values and report update', () => {
      const model = loaded();
      const events: ODataModelEvent<any>[] = [];
      model.events$.subscribe((e) => events.push(e));
      model.assign({ FirstName: 'Rusty', LastName: 'White' });
      expect(model.FirstName).toEqual('Rusty');
      const update = events.find((e) => e.type === ODataModelEventType.Update);
      expect(update?.options.changes).toEqual(['FirstName', 'LastName']);
    });

    it('should mark the model unchanged when assigning with reset', () => {
      const model = loaded();
      model.FirstName = 'Rusty';
      model.assign({ FirstName: 'Russ' }, { reset: true });
      expect(model.isModified()).toBe(false);
      expect(model.FirstName).toEqual('Russ');
      expect(model._state).toEqual(ODataModelState.Unchanged);
    });

    it('should not emit events when silent', () => {
      const model = loaded();
      const events: ODataModelEvent<any>[] = [];
      model.events$.subscribe((e) => events.push(e));
      model.assign({ FirstName: 'Rusty' }, { silent: true });
      expect(events).toEqual([]);
    });

    it('should assign non field values as plain properties', () => {
      const Model = client.apiFor().modelForType<any>(`${TRIPPIN_NAMESPACE}.Photo`);
      const photo = new Model({ Id: 1, Extra: 'value' }) as any;
      expect(photo.Extra).toEqual('value');
      expect(photo.toEntity()).not.toHaveProperty('Extra');
      expect(photo.toEntity({ include_non_field: true })).toHaveProperty('Extra', 'value');
    });
  });

  describe('events', () => {
    it('should emit change events with the previous value', () => {
      const model = loaded();
      const events: ODataModelEvent<any>[] = [];
      model.events$.subscribe((e) => events.push(e));
      model.FirstName = 'Rusty';
      expect(events.length).toEqual(1);
      expect(events[0].type).toEqual(ODataModelEventType.Change);
      expect(events[0].value).toEqual('Rusty');
      expect(events[0].previous).toEqual('Russell');
      expect(events[0].path).toEqual('FirstName');
      expect(events[0].options.key).toBe(false);
    });

    it('should flag changes to the key', () => {
      const model = loaded();
      const events: ODataModelEvent<any>[] = [];
      model.events$.subscribe((e) => events.push(e));
      model.UserName = 'russell';
      expect(events[0].options.key).toBe(true);
    });

    it('should not emit when the value does not change', () => {
      const model = loaded();
      const events: ODataModelEvent<any>[] = [];
      model.events$.subscribe((e) => events.push(e));
      model.FirstName = 'Russell';
      expect(events).toEqual([]);
    });

    // Known issue: ODataCollection._link reads `event.options.index`, which ODataModelEvent.push
    // overwrites with the attribute name, so the collection index is lost and the path becomes
    // 'AddressInfo.City.Name'. Remove `.fails` once fixed.
    it.fails('should bubble nested changes with their path', () => {
      const model = loaded();
      const events: ODataModelEvent<any>[] = [];
      model.events$.subscribe((e) => events.push(e));
      model.set('AddressInfo[0].City.Name', 'Boston');
      const change = events.find((e) => e.type === ODataModelEventType.Change);
      expect(change?.path).toEqual('AddressInfo[0].City.Name');
      expect(change?.currentModel).toBe(model);
    });

    it('should emit reset events', () => {
      const model = loaded();
      model.FirstName = 'Rusty';
      const events: ODataModelEvent<any>[] = [];
      model.events$.subscribe((e) => events.push(e));
      model.reset();
      expect(events.map((e) => e.type)).toContain(ODataModelEventType.Reset);
    });

    it('should forward model events to the model options', () => {
      const model = loaded();
      const events: ODataModelEvent<any>[] = [];
      model._meta.events$.subscribe((e) => events.push(e));
      model.FirstName = 'Rusty';
      expect(events.map((e) => e.model)).toContain(model);
    });
  });

  describe('validation', () => {
    it('should report required fields on create', () => {
      const model = people.asModel({}) as PersonModel;
      expect(model.validate({ method: 'create' })).toEqual({
        UserName: ['required'],
        FirstName: ['required'],
        LastName: ['required'],
      });
    });

    it('should not require fields on modify', () => {
      const model = people.asModel({}) as PersonModel;
      expect(model.validate({ method: 'modify' })).toBeUndefined();
    });

    it('should be valid when required fields are set', () => {
      expect(loaded().isValid({ method: 'create' })).toBe(true);
    });

    it('should store errors and emit invalid', () => {
      const model = people.asModel({ UserName: 'x' }) as PersonModel;
      const events: ODataModelEvent<any>[] = [];
      model.events$.subscribe((e) => events.push(e));
      expect(model.isValid({ method: 'create' })).toBe(false);
      expect(model._errors).toEqual({ FirstName: ['required'], LastName: ['required'] });
      expect(events.map((e) => e.type)).toEqual([ODataModelEventType.Invalid]);
    });
  });

  describe('requests', () => {
    it('should fetch and assign the entity', async () => {
      const http = TestBed.inject(HttpTestingController);
      const model = people.asModel({ UserName: 'russellwhyte' }) as PersonModel;
      const types: string[] = [];
      model.events$.subscribe((e) => types.push(e.type));

      const promise = firstValueFrom(model.fetch());
      const req = http.expectOne(`${TRIPPIN_SERVICE_ROOT}People('russellwhyte')`);
      expect(req.request.method).toEqual('GET');
      req.flush(RUSSELL);
      const result = await promise;

      expect(result).toBe(model);
      expect(model.FirstName).toEqual('Russell');
      expect(model.isModified()).toBe(false);
      expect(types[0]).toEqual(ODataModelEventType.Request);
      expect(types).toContain(ODataModelEventType.Sync);
    });

    it('should create new models with POST', async () => {
      const http = TestBed.inject(HttpTestingController);
      const model = people.asModel({
        UserName: 'newuser',
        FirstName: 'New',
        LastName: 'User',
      }) as PersonModel;
      // A model with a key would update, so force create.
      const promise = firstValueFrom(model.save({ method: 'create' }));
      const req = http.expectOne(`${TRIPPIN_SERVICE_ROOT}People`);
      expect(req.request.method).toEqual('POST');
      expect(req.request.body).toEqual({ UserName: 'newuser', FirstName: 'New', LastName: 'User' });
      req.flush({ ...req.request.body, Concurrency: 5 });
      await promise;
      expect(model.Concurrency).toEqual(5);
      expect(model.isModified()).toBe(false);
    });

    it('should update models with key using PUT', async () => {
      const http = TestBed.inject(HttpTestingController);
      const model = loaded();
      model.FirstName = 'Rusty';
      const promise = firstValueFrom(model.save());
      const req = http.expectOne(`${TRIPPIN_SERVICE_ROOT}People('russellwhyte')`);
      expect(req.request.method).toEqual('PUT');
      expect(req.request.body.FirstName).toEqual('Rusty');
      req.flush(null, { status: 204, statusText: 'No Content' });
      await promise;
      expect(model.FirstName).toEqual('Rusty');
      expect(model.isModified()).toBe(false);
    });

    it('should send only changes using PATCH on modify', async () => {
      const http = TestBed.inject(HttpTestingController);
      const model = loaded();
      model.FirstName = 'Rusty';
      const promise = firstValueFrom(model.save({ method: 'modify' }));
      const req = http.expectOne(`${TRIPPIN_SERVICE_ROOT}People('russellwhyte')`);
      expect(req.request.method).toEqual('PATCH');
      expect(req.request.body).toEqual({ UserName: 'russellwhyte', FirstName: 'Rusty' });
      req.flush(null, { status: 204, statusText: 'No Content' });
      await promise;
    });

    it('should not save invalid models', async () => {
      const model = created();
      await expect(firstValueFrom(model.save())).rejects.toThrow('save: Validation errors');
    });

    it('should save invalid models when validation is disabled', async () => {
      const http = TestBed.inject(HttpTestingController);
      const model = created();
      const promise = firstValueFrom(model.save({ validate: false }));
      http.expectOne(`${TRIPPIN_SERVICE_ROOT}People`).flush({});
      await promise;
    });

    it('should destroy models with DELETE and emit destroy', async () => {
      const http = TestBed.inject(HttpTestingController);
      const model = loaded();
      const types: string[] = [];
      model.events$.subscribe((e) => types.push(e.type));
      const promise = firstValueFrom(model.destroy());
      const req = http.expectOne(`${TRIPPIN_SERVICE_ROOT}People('russellwhyte')`);
      expect(req.request.method).toEqual('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
      await promise;
      expect(types).toContain(ODataModelEventType.Destroy);
    });

    it('should not destroy models without key', async () => {
      const model = created();
      await expect(firstValueFrom(model.destroy())).rejects.toThrow(
        "destroy: Can't destroy model without key",
      );
    });

    it('should fetch a structured attribute and assign it', async () => {
      const http = TestBed.inject(HttpTestingController);
      const model = loaded();
      const promise = firstValueFrom(model.fetchAttribute<Photo>('Photo'));
      http
        .expectOne(`${TRIPPIN_SERVICE_ROOT}People('russellwhyte')/Photo`)
        .flush({ Id: 7, Name: 'avatar' });
      const photo = (await promise) as ODataModel<Photo>;
      expect(photo.get('Name')).toEqual('avatar');
      expect(model.get('Photo.Id')).toEqual(7);
    });

    it('should fetch navigation collections', async () => {
      const http = TestBed.inject(HttpTestingController);
      const model = loaded();
      const promise = firstValueFrom(
        model.fetchNavigationProperty<Person>('Friends', 'collection'),
      );
      http
        .expectOne(`${TRIPPIN_SERVICE_ROOT}People('russellwhyte')/Friends`)
        .flush({ value: [{ UserName: 'scottketchum', FirstName: 'Scott', LastName: 'Ketchum' }] });
      const friends = (await promise) as ODataCollection<Person, ODataModel<Person>>;
      expect(friends.length).toEqual(1);
      expect(friends.first()?.get('FirstName')).toEqual('Scott');
    });
  });

  describe('collection tools', () => {
    it('should navigate siblings within its collection', () => {
      const collection = people.asCollection([
        { UserName: 'a' },
        { UserName: 'b' },
        { UserName: 'c' },
      ]);
      const [a, b, c] = collection.models();
      expect(b.collection()).toBe(collection);
      expect(b.prev()).toBe(a);
      expect(b.next()).toBe(c);
      expect(a.prev()).toBeUndefined();
      expect(c.next()).toBeUndefined();
    });

    it('should not have collection when standalone', () => {
      const model = loaded();
      expect(model.collection()).toBeUndefined();
      expect(model.next()).toBeUndefined();
    });

    it('should know its children', () => {
      const model = loaded();
      const address = model.get('AddressInfo[0]');
      expect(model.isParentOf(model.get('AddressInfo'))).toBe(true);
      expect(model.isParentOf(address)).toBe(true);
      expect(model.isParentOf(model)).toBe(false);
    });
  });
});
