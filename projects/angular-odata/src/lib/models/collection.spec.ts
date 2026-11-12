import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ODataClient } from '../client';
import { provideODataClient } from '../module';
import { ODataEntitySetResource } from '../resources';
import { Person, TRIPPIN_NAMESPACE, TRIPPIN_SERVICE_ROOT, TripPinConfig } from '../trippin.config';
import { ODataCollection } from './collection';
import { ODataModel } from './model';
import { ModelInterface, ODataModelEvent, ODataModelEventType, ODataModelState } from './options';

type PersonModel = ODataModel<Person> & ModelInterface<Person>;
type PeopleCollection = ODataCollection<Person, PersonModel>;

const PERSON_TYPE = `${TRIPPIN_NAMESPACE}.Person`;

const PEOPLE = [
  { UserName: 'russellwhyte', FirstName: 'Russell', LastName: 'Whyte' },
  { UserName: 'scottketchum', FirstName: 'Scott', LastName: 'Ketchum' },
  { UserName: 'ronaldmundy', FirstName: 'Ronald', LastName: 'Mundy' },
];

const userNames = (collection: PeopleCollection) => collection.map((m) => m.UserName);

describe('ODataCollection', () => {
  let client: ODataClient;
  let people: ODataEntitySetResource<Person>;

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
    people = client.entitySet<Person>('People', PERSON_TYPE);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  /** A collection as it would come from the server: every entry unchanged. */
  const loaded = (entities: Partial<Person>[] = PEOPLE) =>
    people.asCollection(entities, { reset: true }) as PeopleCollection;

  const newPerson = (data: Partial<Person>) => {
    const Model = client.apiFor().modelForType<Person>(PERSON_TYPE);
    return new Model(data) as PersonModel;
  };

  const record = (collection: PeopleCollection) => {
    const events: ODataModelEvent<any>[] = [];
    collection.events$.subscribe((e) => events.push(e));
    return events;
  };

  /** Events dispatched by the collection itself (not bubbled up from its models). */
  const own = (events: ODataModelEvent<any>[], type: ODataModelEventType) =>
    events.find((e) => e.type === type && e.chain.length === 1);

  describe('creation', () => {
    it('should throw without a model', () => {
      class Orphans extends ODataCollection<any, ODataModel<any>> {}
      expect(() => new Orphans()).toThrow('Collection: Collection need model');
    });

    it('should create models for every entity', () => {
      const collection = loaded();
      expect(collection.length).toEqual(3);
      expect(collection.models().every((m) => m instanceof ODataModel)).toBe(true);
      expect(userNames(collection)).toEqual(['russellwhyte', 'scottketchum', 'ronaldmundy']);
    });

    it('should create an empty collection', () => {
      const collection = people.asCollection();
      expect(collection.length).toEqual(0);
      expect(collection.isEmpty()).toBe(true);
    });

    it('should be built from the api collection type', () => {
      const Collection = client.apiFor().collectionForType<Person>(PERSON_TYPE);
      const collection = new Collection(PEOPLE);
      expect(collection.length).toEqual(3);
      expect(collection.resource()?.toString()).toEqual('People');
    });

    it('should parent its models', () => {
      const collection = loaded();
      expect(collection.models().every((m) => m.collection() === collection)).toBe(true);
      expect(collection.isParentOf(collection.first()!)).toBe(true);
      expect(collection.isParentOf(collection)).toBe(false);
    });

    it('should report the Collection string tag', () => {
      expect(Object.prototype.toString.call(loaded())).toEqual('[object Collection]');
    });
  });

  describe('resources', () => {
    it('should resolve the entity set resource', () => {
      expect(loaded().resource()?.toString()).toEqual('People');
    });

    it('should resolve entity resources for its models', () => {
      expect(loaded().get(1)?.resource()?.toString()).toEqual("People('scottketchum')");
    });

    it('should resolve navigation resources when nested in a model', () => {
      const person = people.asModel(PEOPLE[0], { reset: true });
      const friends = person.getAttribute<Person>('Friends') as PeopleCollection;
      expect(friends.resource()?.toString()).toEqual("People('russellwhyte')/Friends");
      friends.assign([PEOPLE[1]], { reset: true });
      expect(friends.first()?.resource()?.toString()).toEqual(
        "People('russellwhyte')/Friends('scottketchum')",
      );
    });

    it('should apply query options to the resource', () => {
      const collection = loaded();
      collection.query((q) => {
        q.top(2);
        q.orderBy('FirstName');
      });
      expect(collection.resource()?.toString()).toEqual('People?$orderby=FirstName&$top=2');
    });

    it('should restore the resource after withResource', () => {
      const collection = loaded();
      const previous = collection._resource;
      const result = collection.withResource(null, (c) => c._resource);
      expect(result).toBeNull();
      expect(collection._resource).toBe(previous);
    });

    it('should run asEntitySet against the entity set', () => {
      const person = people.asModel(PEOPLE[0], { reset: true });
      const friends = person.getAttribute<Person>('Friends') as PeopleCollection;
      expect(friends.asEntitySet((c) => c.resource()?.toString())).toEqual('People');
      expect(friends.resource()?.toString()).toEqual("People('russellwhyte')/Friends");
    });

    it('should push and pop resources', () => {
      const collection = loaded();
      const other = client.entitySet<Person>('People');
      collection.pushResource(other);
      expect(collection._resource).toBe(other);
      expect(collection.popResource()?.resource).toBe(other);
      expect(collection.popResource()).toBeUndefined();
    });
  });

  describe('accessors', () => {
    it('should get models by index', () => {
      const collection = loaded();
      expect(collection.get(0)?.UserName).toEqual('russellwhyte');
      expect(collection.get(5)).toBeUndefined();
    });

    it('should get nested values by path', () => {
      const collection = loaded();
      expect(collection.get('[1].FirstName')).toEqual('Scott');
      expect(collection.get(['2', 'LastName'])).toEqual('Mundy');
    });

    it('should check values by path', () => {
      const collection = loaded();
      expect(collection.has(0)).toBe(true);
      expect(collection.has(3)).toBe(false);
      expect(collection.has('[0].FirstName')).toBe(true);
      expect(collection.has('[0].Gender')).toBe(false);
    });

    it('should set nested values by path', () => {
      const collection = loaded();
      collection.set('[0].FirstName', 'Rusty', {});
      expect(collection.first()?.FirstName).toEqual('Rusty');
    });

    it('should replace a model by index', () => {
      const collection = loaded();
      const model = newPerson({ UserName: 'other' });
      collection.set('1', model, {});
      expect(collection.get(1)).toBe(model);
      expect(collection.length).toEqual(3);
    });

    it('should iterate over its models', () => {
      const collection = loaded();
      expect([...collection].map((m) => m.UserName)).toEqual(userNames(collection));
    });

    it('should provide array helpers', () => {
      const collection = loaded();
      const [russell, scott, ronald] = collection.models();
      expect(collection.first()).toBe(russell);
      expect(collection.last()).toBe(ronald);
      expect(collection.filter((m) => m.FirstName.startsWith('R'))).toEqual([russell, ronald]);
      expect(collection.find((m) => m.LastName === 'Ketchum')).toBe(scott);
      expect(collection.reduce((acc, m) => acc + m.FirstName.length, 0)).toEqual(18);
      expect(collection.every((m) => m.UserName !== undefined)).toBe(true);
      expect(collection.some((m) => m.FirstName === 'Scott')).toBe(true);
      const visited: string[] = [];
      collection.forEach((m) => visited.push(m.UserName));
      expect(visited.length).toEqual(3);
    });

    it('should locate models by equality', () => {
      const collection = loaded();
      const scott = collection.get(1)!;
      expect(collection.indexOf(scott)).toEqual(1);
      expect(collection.includes(scott)).toBe(true);
      expect(collection.includes(scott, 2)).toBe(false);
      expect(collection.indexOf(newPerson({ UserName: 'nobody' }))).toEqual(-1);
    });

    it('should navigate between models', () => {
      const collection = loaded();
      const [russell, scott, ronald] = collection.models();
      expect(collection.next(russell)).toBe(scott);
      expect(collection.prev(scott)).toBe(russell);
      expect(collection.next(ronald)).toBeUndefined();
      expect(collection.prev(russell)).toBeUndefined();
    });

    it('should not be empty when the server reports a count', () => {
      const collection = people.asCollection();
      collection.annots().update({ '@odata.count': 10 });
      expect(collection.isEmpty()).toBe(false);
    });
  });

  describe('state', () => {
    it('should be unchanged when loaded with reset', () => {
      const collection = loaded();
      expect(collection.isModified()).toBe(false);
      expect(collection._entries.every((e) => e.state === ODataModelState.Unchanged)).toBe(true);
    });

    it('should mark entries as added without reset', () => {
      const collection = people.asCollection(PEOPLE) as PeopleCollection;
      expect(collection._entries.every((e) => e.state === ODataModelState.Added)).toBe(true);
      expect(collection.isModified()).toBe(true);
    });

    it('should be modified when a model changes', () => {
      const collection = loaded();
      collection.first()!.FirstName = 'Rusty';
      expect(collection.isModified()).toBe(true);
    });

    it('should reset added, removed and changed models', async () => {
      const collection = loaded();
      const russell = collection.first()!;
      const scott = collection.get(1)!;
      russell.FirstName = 'Rusty';
      await firstValueFrom(collection.remove(scott, { server: false }));
      await firstValueFrom(collection.add(newPerson({ UserName: 'new' }), { server: false }));
      expect(userNames(collection)).toEqual(['russellwhyte', 'ronaldmundy', 'new']);

      collection.reset();

      expect(collection.length).toEqual(3);
      expect(collection.models()).toContain(scott);
      expect(collection.some((m) => m.UserName === 'new')).toBe(false);
      expect(russell.FirstName).toEqual('Russell');
    });

    // Known issue: reset() re-adds deleted entries through _addModel without `reset`, so they come
    // back with state Added (and at the end of the list). Remove `.fails` once fixed.
    it.fails('should not be modified after resetting a removed model', async () => {
      const collection = loaded();
      await firstValueFrom(collection.remove(collection.get(1)!, { server: false }));
      collection.reset();
      expect(userNames(collection)).toEqual(['russellwhyte', 'scottketchum', 'ronaldmundy']);
      expect(collection.isModified()).toBe(false);
    });

    it('should reset a single model by path', () => {
      const collection = loaded();
      collection.get(0)!.FirstName = 'Rusty';
      collection.get(1)!.FirstName = 'Scotty';
      collection.reset({ path: '[0]' });
      expect(collection.get(0)?.FirstName).toEqual('Russell');
      expect(collection.get(1)?.FirstName).toEqual('Scotty');
    });

    it('should clear every model', () => {
      const collection = loaded();
      const events = record(collection);
      collection.clear();
      expect(collection.length).toEqual(0);
      expect(collection._entries).toEqual([]);
      expect(own(events, ODataModelEventType.Update)?.options.removed.length).toEqual(3);
    });
  });

  describe('add and remove', () => {
    it('should add a model locally', async () => {
      const collection = loaded();
      const model = newPerson({ UserName: 'new' });
      const events = record(collection);
      const added = await firstValueFrom(collection.add(model, { server: false }));
      expect(added).toBe(model);
      expect(collection.length).toEqual(4);
      expect(collection._entries[3].state).toEqual(ODataModelState.Added);
      expect(events.map((e) => e.type)).toContain(ODataModelEventType.Add);
    });

    it('should add a model at a given position', async () => {
      const collection = loaded();
      await firstValueFrom(
        collection.add(newPerson({ UserName: 'new' }), { server: false, position: 1 }),
      );
      expect(userNames(collection)).toEqual(['russellwhyte', 'new', 'scottketchum', 'ronaldmundy']);
    });

    it('should not duplicate models with the same key', async () => {
      const collection = loaded();
      const Model = client.apiFor().modelForType<Person>(PERSON_TYPE);
      const duplicate = new Model({ UserName: 'scottketchum' });
      await firstValueFrom(collection.add(duplicate as PersonModel, { server: false }));
      expect(collection.length).toEqual(3);
    });

    it('should remove a model locally and keep it as deleted', async () => {
      const collection = loaded();
      const scott = collection.get(1)!;
      const events = record(collection);
      await firstValueFrom(collection.remove(scott, { server: false }));
      expect(collection.length).toEqual(2);
      expect(collection.models()).not.toContain(scott);
      const entry = collection._entries.find((e) => e.model === scott);
      expect(entry?.state).toEqual(ODataModelState.Deleted);
      expect(events.map((e) => e.type)).toContain(ODataModelEventType.Remove);
    });

    it('should drop removed models that were only added locally', async () => {
      const collection = loaded();
      const model = newPerson({ UserName: 'new' });
      await firstValueFrom(collection.add(model, { server: false }));
      await firstValueFrom(collection.remove(model, { server: false }));
      expect(collection._entries.some((e) => e.model === model)).toBe(false);
    });

    it('should not emit when silent', async () => {
      const collection = loaded();
      const events = record(collection);
      await firstValueFrom(
        collection.add(newPerson({ UserName: 'new' }), { server: false, silent: true }),
      );
      await firstValueFrom(collection.remove(collection.first()!, { server: false, silent: true }));
      expect(events.filter((e) => e.type !== ODataModelEventType.Sort)).toEqual([]);
    });

    it('should remove a model when it is destroyed', async () => {
      const http = TestBed.inject(HttpTestingController);
      const collection = loaded();
      const scott = collection.get(1)!;
      const promise = firstValueFrom(scott.destroy());
      http
        .expectOne(`${TRIPPIN_SERVICE_ROOT}People('scottketchum')`)
        .flush(null, { status: 204, statusText: 'No Content' });
      await promise;
      expect(collection.models()).not.toContain(scott);
      expect(collection._entries.some((e) => e.model === scott)).toBe(false);
    });
  });

  describe('assign', () => {
    it('should add, merge and remove by default', () => {
      const collection = loaded();
      const events = record(collection);
      const models = collection.assign([
        { UserName: 'scottketchum', FirstName: 'Scotty' },
        { UserName: 'new', FirstName: 'New' },
      ]);
      expect(models.length).toEqual(2);
      expect(userNames(collection)).toEqual(['scottketchum', 'new']);
      expect(collection.first()?.FirstName).toEqual('Scotty');
      const update = own(events, ODataModelEventType.Update);
      expect(update?.options.added.length).toEqual(1);
      expect(update?.options.removed.length).toEqual(2);
      expect(update?.options.merged.length).toEqual(1);
    });

    it('should keep the existing model instance when merging', () => {
      const collection = loaded();
      const scott = collection.get(1);
      collection.assign([...PEOPLE.slice(0, 1), { UserName: 'scottketchum', FirstName: 'S' }]);
      expect(collection.get(1)).toBe(scott);
    });

    it('should not remove missing models when remove is false', () => {
      const collection = loaded();
      collection.assign([{ UserName: 'new' }], { remove: false });
      expect(collection.length).toEqual(4);
      expect(collection.last()?.UserName).toEqual('new');
    });

    it('should not add unknown models when add is false', () => {
      const collection = loaded();
      collection.assign([...PEOPLE, { UserName: 'new' }], { add: false });
      expect(userNames(collection)).toEqual(['russellwhyte', 'scottketchum', 'ronaldmundy']);
    });

    // Known issue: modelFactory goes through the model pool, which assigns the incoming data into
    // the pooled instance before `merge` is evaluated. Remove `.fails` once fixed.
    it.fails('should not merge known models when merge is false', () => {
      const collection = loaded();
      collection.assign([{ ...PEOPLE[0], FirstName: 'Rusty' }], { merge: false, remove: false });
      expect(collection.first()?.FirstName).toEqual('Russell');
    });

    it('should reorder models and emit sort', () => {
      const collection = loaded();
      const events = record(collection);
      collection.assign([PEOPLE[2], PEOPLE[0], PEOPLE[1]]);
      expect(userNames(collection)).toEqual(['ronaldmundy', 'russellwhyte', 'scottketchum']);
      expect(events.map((e) => e.type)).toContain(ODataModelEventType.Sort);
    });

    it('should accept model instances', () => {
      const collection = loaded();
      const model = newPerson({ UserName: 'new' });
      collection.assign([model], { remove: false });
      expect(collection.last()).toBe(model);
    });

    it('should emit reset instead of update when resetting', () => {
      const collection = loaded();
      const events = record(collection);
      collection.assign([{ UserName: 'new' }], { reset: true });
      expect(events.map((e) => e.type)).toContain(ODataModelEventType.Reset);
      expect(events.map((e) => e.type)).not.toContain(ODataModelEventType.Update);
      expect(collection.isModified()).toBe(false);
    });
  });

  describe('sort', () => {
    it('should sort by a field', () => {
      const collection = loaded();
      collection.sort([{ field: 'FirstName' }]);
      expect(collection.isSorted()).toBe(true);
      expect(collection.map((m) => m.FirstName)).toEqual(['Ronald', 'Russell', 'Scott']);
    });

    it('should sort descending', () => {
      const collection = loaded();
      collection.sort([{ field: 'LastName', order: -1 }]);
      expect(collection.map((m) => m.LastName)).toEqual(['Whyte', 'Mundy', 'Ketchum']);
    });

    it('should sort by multiple fields', () => {
      const collection = loaded([
        { UserName: 'a', FirstName: 'Ann', LastName: 'Zed' },
        { UserName: 'b', FirstName: 'Bob', LastName: 'Alpha' },
        { UserName: 'c', FirstName: 'Ann', LastName: 'Alpha' },
      ]);
      collection.sort([{ field: 'FirstName' }, { field: 'LastName' }]);
      expect(userNames(collection)).toEqual(['c', 'a', 'b']);
    });

    it('should sort with a custom comparator', () => {
      const collection = loaded([
        { UserName: 'a', Emails: ['1', '2', '3'] },
        { UserName: 'b', Emails: ['1'] },
        { UserName: 'c', Emails: ['1', '2'] },
      ]);
      collection.sort([
        { field: 'Emails', comparator: (x: string[], y: string[]) => x.length - y.length },
      ]);
      expect(userNames(collection)).toEqual(['b', 'c', 'a']);
    });

    it('should place null values first', () => {
      const collection = loaded([{ UserName: 'a', FirstName: 'Zoe' }, { UserName: 'b' }]);
      collection.sort([{ field: 'FirstName' }]);
      expect(userNames(collection)).toEqual(['b', 'a']);
    });

    it('should keep the order when adding to a sorted collection', async () => {
      const collection = loaded();
      collection.sort([{ field: 'FirstName' }]);
      await firstValueFrom(
        collection.add(newPerson({ UserName: 'new', FirstName: 'Rachel' }), { server: false }),
      );
      expect(collection.map((m) => m.FirstName)).toEqual(['Rachel', 'Ronald', 'Russell', 'Scott']);
    });

    it('should emit sort unless silent', () => {
      const collection = loaded();
      const events = record(collection);
      collection.sort([{ field: 'FirstName' }]);
      collection.sort([{ field: 'LastName' }], { silent: true });
      expect(events.filter((e) => e.type === ODataModelEventType.Sort).length).toEqual(1);
    });
  });

  describe('serialization', () => {
    it('should serialize its models', () => {
      expect(loaded().toEntities()).toEqual(PEOPLE);
    });

    it('should skip deleted models', async () => {
      const collection = loaded();
      await firstValueFrom(collection.remove(collection.get(1)!, { server: false }));
      expect(collection.toEntities().map((e) => e['UserName'])).toEqual([
        'russellwhyte',
        'ronaldmundy',
      ]);
    });

    it('should return only changes of unchanged entries', () => {
      const collection = loaded();
      collection.get(0)!.FirstName = 'Rusty';
      expect(collection.toEntities({ changes_only: true, include_key: false })).toEqual([
        { FirstName: 'Rusty' },
        {},
        {},
      ]);
    });

    it('should serialize everything with toJson', () => {
      expect(loaded().toJson()).toEqual(PEOPLE);
    });

    it('should clone into a distinct collection', () => {
      const collection = loaded();
      const clone = collection.clone<PeopleCollection>();
      expect(clone).not.toBe(collection);
      expect(clone.equals(collection)).toBe(false);
      expect(clone.toJson()).toEqual(collection.toJson());
    });
  });

  describe('events', () => {
    it('should bubble model changes with the model index', () => {
      const collection = loaded();
      const events = record(collection);
      collection.get(1)!.FirstName = 'Scotty';
      const change = events.find((e) => e.type === ODataModelEventType.Change);
      expect(change?.path).toEqual('[1].FirstName');
      expect(change?.currentCollection).toBe(collection);
      expect(change?.model).toBe(collection.get(1));
    });

    it('should not bubble events that do not bubble', () => {
      const collection = loaded();
      const events = record(collection);
      const model = collection.get(0)!;
      model.events$.trigger(ODataModelEventType.Change, { bubbles: false });
      model.events$.trigger(ODataModelEventType.Request);
      expect(events).toEqual([]);
    });

    it('should not bubble events from removed models', async () => {
      const collection = loaded();
      const scott = collection.get(1)!;
      await firstValueFrom(collection.remove(scott, { server: false }));
      const events = record(collection);
      scott.FirstName = 'Scotty';
      expect(events).toEqual([]);
    });

    it('should forward events to the model options', () => {
      const collection = loaded();
      const events: ODataModelEvent<any>[] = [];
      collection._model.meta.events$.subscribe((e) => events.push(e));
      collection.sort([{ field: 'FirstName' }]);
      expect(events.some((e) => e.collection === collection)).toBe(true);
    });
  });

  describe('requests', () => {
    it('should fetch and assign the entities', async () => {
      const http = TestBed.inject(HttpTestingController);
      const collection = people.asCollection() as PeopleCollection;
      const types: string[] = [];
      collection.events$.subscribe((e) => types.push(e.type));

      const promise = firstValueFrom(collection.fetch());
      const req = http.expectOne(`${TRIPPIN_SERVICE_ROOT}People`);
      expect(req.request.method).toEqual('GET');
      req.flush({ value: PEOPLE });
      const models = await promise;

      expect(models.length).toEqual(3);
      expect(userNames(collection)).toEqual(PEOPLE.map((p) => p.UserName));
      expect(collection.isModified()).toBe(false);
      expect(types[0]).toEqual(ODataModelEventType.Request);
      expect(types).toContain(ODataModelEventType.Sync);
    });

    it('should fetch with count', async () => {
      const http = TestBed.inject(HttpTestingController);
      const collection = people.asCollection() as PeopleCollection;
      const promise = firstValueFrom(collection.fetch({ withCount: true }));
      http
        .expectOne(`${TRIPPIN_SERVICE_ROOT}People?$count=true`)
        .flush({ '@odata.count': 20, value: PEOPLE });
      await promise;
      expect(collection.annots().count).toEqual(20);
    });

    it('should fetch with the collection query', async () => {
      const http = TestBed.inject(HttpTestingController);
      const collection = people.asCollection() as PeopleCollection;
      collection.query((q) => q.filter({ FirstName: 'Scott' }));
      const promise = firstValueFrom(collection.fetch());
      http
        .expectOne(`${TRIPPIN_SERVICE_ROOT}People?$filter=FirstName%20eq%20'Scott'`)
        .flush({ value: [PEOPLE[1]] });
      await promise;
      expect(userNames(collection)).toEqual(['scottketchum']);
    });

    it('should fetch pages and append them', async () => {
      const http = TestBed.inject(HttpTestingController);
      const collection = loaded(PEOPLE.slice(0, 1));
      const promise = firstValueFrom(collection.fetchMany(2));
      http
        .expectOne(`${TRIPPIN_SERVICE_ROOT}People?$top=2&$skip=1`)
        .flush({ value: PEOPLE.slice(1) });
      await promise;
      expect(userNames(collection)).toEqual(PEOPLE.map((p) => p.UserName));
    });

    /** Flush every pending request (and the ones they trigger), returning `METHOD url` lines. */
    const flushAll = (http: HttpTestingController) => {
      const sent: string[] = [];
      for (let reqs = http.match(() => true); reqs.length > 0; reqs = http.match(() => true)) {
        reqs.forEach((r) => {
          sent.push(`${r.request.method} ${r.request.urlWithParams}`);
          r.flush(r.request.body);
        });
      }
      return sent;
    };

    it('should create a model on the server and add it', async () => {
      const http = TestBed.inject(HttpTestingController);
      const collection = loaded();
      const promise = firstValueFrom(
        collection.create({ UserName: 'new', FirstName: 'New', LastName: 'User' } as Person),
      );
      const sent = flushAll(http);
      const model = await promise;
      expect(sent).toContain(`POST ${TRIPPIN_SERVICE_ROOT}People`);
      expect(collection.length).toEqual(4);
      expect(collection.models()).toContain(model);
    });

    // Known issue: create() saves the model (PUT, because the new entity already has a key) and
    // then add() saves it again through _addServer (POST). Remove `.fails` once fixed.
    it.fails('should create a model with a single POST', async () => {
      const http = TestBed.inject(HttpTestingController);
      const collection = loaded();
      const promise = firstValueFrom(
        collection.create({ UserName: 'new', FirstName: 'New', LastName: 'User' } as Person),
      );
      const sent = flushAll(http);
      await promise;
      expect(sent).toEqual([`POST ${TRIPPIN_SERVICE_ROOT}People`]);
    });

    it('should create a model locally without server', async () => {
      const collection = loaded();
      const model = await firstValueFrom(
        collection.create({ UserName: 'new', FirstName: 'N', LastName: 'U' } as Person, {
          server: false,
        }),
      );
      expect(collection.models()).toContain(model);
    });

    // On an entity set, removed entries must be destroyed (relModel), not unreferenced.
    it('should save removed and changed models of an entity set', async () => {
      const http = TestBed.inject(HttpTestingController);
      const collection = loaded();
      collection.get(0)!.FirstName = 'Rusty';
      await firstValueFrom(collection.remove(collection.get(1)!, { server: false }));

      const promise = firstValueFrom(collection.save({ method: 'modify', relModel: true }));
      const requests = http.match(() => true);
      const methods = requests.map((r) => `${r.request.method} ${r.request.urlWithParams}`);
      expect(methods).toContain(`PATCH ${TRIPPIN_SERVICE_ROOT}People('russellwhyte')`);
      expect(methods).toContain(`DELETE ${TRIPPIN_SERVICE_ROOT}People('scottketchum')`);
      requests.forEach((r) => r.flush(null, { status: 204, statusText: 'No Content' }));
      await promise;

      expect(collection.isModified()).toBe(false);
      expect(collection._entries.length).toEqual(2);
    });

    it('should complete save without requests when nothing changed', async () => {
      const collection = loaded();
      const models = await firstValueFrom(collection.save());
      expect(models.length).toEqual(3);
    });
  });
});
