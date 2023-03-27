import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  ODataMetadataResource,
  ODataEntitySetResource,
  ODataFunctionResource,
  ODataBatchResource,
  ODataActionResource,
  ODataCountResource,
  ODataMediaResource,
  ODataNavigationPropertyResource,
  ODataReferenceResource,
} from './types';
import { raw } from './query';
import { ODataClient } from '../client';
import { ODataModule } from '../module';

const SERVICE_ROOT = 'https://services.odata.org/v4/TripPinServiceRW/';
const ENTITY_SET = 'People';
interface Person {}
interface Photo {}

describe('ODataResource', () => {
  let client: ODataClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ODataModule.forRoot({
          config: {
            serviceRootUrl: SERVICE_ROOT,
          }
        }),
        HttpClientTestingModule,
      ],
    });

    client = TestBed.inject<ODataClient>(ODataClient);
  });

  it('should create batch resource', () => {
    const metadata: ODataBatchResource = ODataBatchResource.factory(
      client.defaultApi()
    );
    expect(metadata.toString()).toEqual('$batch');
  });

  it('should create metadata resource', () => {
    const metadata: ODataMetadataResource = ODataMetadataResource.factory(
      client.defaultApi()
    );
    expect(metadata.toString()).toEqual('$metadata');
  });

  it('should create entitySet resource', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    expect(set.toString()).toEqual('People');
  });

  it('should create entity resource with string key', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    expect(entity.toString()).toEqual("People('russellwhyte')");
  });

  it('should create entity resource with number key', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity(1);
    expect(entity.toString()).toEqual('People(1)');
  });

  it('should create entity resource with guid key', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity(raw('cd5977c2-4a64-42de-b2fc-7fe4707c65cd'));
    expect(entity.toString()).toEqual(
      'People(cd5977c2-4a64-42de-b2fc-7fe4707c65cd)'
    );
  });

  it('should create entity resource with object composite guid key', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity({
      id1: raw('cd5977c2-4a64-42de-b2fc-7fe4707c65cd'),
      id2: 1,
    });
    expect(entity.toString()).toEqual(
      'People(id1=cd5977c2-4a64-42de-b2fc-7fe4707c65cd,id2=1)'
    );
  });

  it('should create entity resource with object simple key', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity({ id: 1 });
    expect(entity.toString()).toEqual('People(1)');
  });

  it('should create entity resource with object composite key', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity({ id1: 1, id2: 2 });
    expect(entity.toString()).toEqual('People(id1=1,id2=2)');
  });

  it('should create collection function', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const fun: ODataFunctionResource<any, any> = set.function<any, any>(
      'NS.MyFunction'
    );
    expect(fun.toString()).toEqual('People/NS.MyFunction()');
  });

  it('should create entity function', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const fun: ODataFunctionResource<any, any> = entity.function<any, any>(
      'NS.MyFunction'
    );
    expect(fun.toString()).toEqual("People('russellwhyte')/NS.MyFunction()");
  });

  it('should create entity function and change parameters', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    let fun: ODataFunctionResource<any, any> = entity
      .function<any, any>('NS.MyFunction')
      .parameters({ arg1: 1, arg2: 2 });
    expect(fun.toString()).toEqual(
      "People('russellwhyte')/NS.MyFunction(arg1=1,arg2=2)"
    );
    fun = fun.parameters({ arg1: 10, arg2: 20 });
    expect(fun.toString()).toEqual(
      "People('russellwhyte')/NS.MyFunction(arg1=10,arg2=20)"
    );
    fun = fun.parameters({ arg1: 10, arg2: 20 }, { alias: true });
    expect(fun.toString()).toEqual(
      "People('russellwhyte')/NS.MyFunction(arg1=@arg1,arg2=@arg2)?@arg1=10&@arg2=20"
    );
    fun = fun.parameters(null);
    expect(fun.toString()).toEqual("People('russellwhyte')/NS.MyFunction()");
  });

  it('should create entity function with all parameters', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const fun: ODataFunctionResource<any, any> = entity
      .function<any, any>('NS.MyFunction')
      .parameters({ arg1: 1, arg2: 2 });
    expect(fun.toString()).toEqual(
      "People('russellwhyte')/NS.MyFunction(arg1=1,arg2=2)"
    );
  });

  it('should create entity function with some parameters', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const fun: ODataFunctionResource<any, any> = entity
      .function<any, any>('NS.MyFunction')
      .parameters({ arg1: 1, arg2: undefined });
    expect(fun.toString()).toEqual(
      "People('russellwhyte')/NS.MyFunction(arg1=1)"
    );
  });

  it('should create entity function with null parameter', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const fun: ODataFunctionResource<any, any> = entity
      .function<any, any>('NS.MyFunction')
      .parameters({ arg1: 1, arg2: null });
    expect(fun.toString()).toEqual(
      "People('russellwhyte')/NS.MyFunction(arg1=1,arg2=null)"
    );
  });

  it('should create entity function with alias parameters', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const fun: ODataFunctionResource<any, any> = entity
      .function<any, any>('NS.MyFunction')
      .parameters({ arg1: 1, arg2: 2 }, { alias: true });
    expect(fun.toString()).toEqual(
      "People('russellwhyte')/NS.MyFunction(arg1=@arg1,arg2=@arg2)?@arg1=1&@arg2=2"
    );
  });

  it('should create collection action', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const act: ODataActionResource<any, any> = set.action<any, any>(
      'NS.MyAction'
    );
    expect(act.toString()).toEqual('People/NS.MyAction');
  });

  it('should create entity action', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const act: ODataActionResource<any, any> = entity.action<any, any>(
      'NS.MyAction'
    );
    expect(act.toString()).toEqual("People('russellwhyte')/NS.MyAction");
  });

  it('should create collection count', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const count: ODataCountResource<Person> = set.count();
    expect(count.toString()).toEqual('People/$count');
  });

  it('should create entity navigation', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const friends: ODataNavigationPropertyResource<Person> =
      entity.navigationProperty<Person>('Friends');
    expect(friends.toString()).toEqual("People('russellwhyte')/Friends");
  });

  it('should create entity single navigation with string key', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const friends: ODataNavigationPropertyResource<Person> =
      entity.navigationProperty<Person>('Friends');
    const friend = friends.key('mirsking');
    expect(friend.toString()).toEqual(
      "People('russellwhyte')/Friends('mirsking')"
    );
  });

  it('should create entity single navigation with number key', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const friends: ODataNavigationPropertyResource<Person> =
      entity.navigationProperty<Person>('Friends');
    const friend = friends.key(1);
    expect(friend.toString()).toEqual("People('russellwhyte')/Friends(1)");
  });

  it('should create entity single navigation and return keys', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const friends: ODataNavigationPropertyResource<Person> =
      entity.navigationProperty<Person>('Friends');
    const friend = friends.key(1);
    friend.segment((s) => expect(s.keys()).toEqual(['russellwhyte', 1]));
  });

  it('should create entity single navigation and set keys', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity();
    const friends: ODataNavigationPropertyResource<Person> =
      entity.navigationProperty<Person>('Friends');
    const friend = friends.key(1);
    const other = friend.keys(['other', 3]);
    expect(other.toString()).toEqual("People('other')/Friends(3)");
  });

  it('should create entity single navigation with guid key', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const friends: ODataNavigationPropertyResource<Person> =
      entity.navigationProperty<Person>('Friends');
    const friend = friends.key(raw('cd5977c2-4a64-42de-b2fc-7fe4707c65cd'));
    expect(friend.toString()).toEqual(
      "People('russellwhyte')/Friends(cd5977c2-4a64-42de-b2fc-7fe4707c65cd)"
    );
  });

  it('should create entity single navigation with object simple key', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const friends: ODataNavigationPropertyResource<Person> =
      entity.navigationProperty<Person>('Friends');
    const friend = friends.key({ id: 1 });
    expect(friend.toString()).toEqual("People('russellwhyte')/Friends(1)");
  });

  it('should create entity single navigation with object composite key', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const friends: ODataNavigationPropertyResource<Person> =
      entity.navigationProperty<Person>('Friends');
    const friend = friends.key({ id1: 1, id2: 2 });
    expect(friend.toString()).toEqual(
      "People('russellwhyte')/Friends(id1=1,id2=2)"
    );
  });

  it('should create entity multiple navigation', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const mirsking: ODataNavigationPropertyResource<Person> = entity
      .navigationProperty<Person>('Friends')
      .key('mirsking');
    expect(mirsking.toString()).toEqual(
      "People('russellwhyte')/Friends('mirsking')"
    );
    const photo = mirsking.navigationProperty<Photo>('Photo');
    expect(photo.toString()).toEqual(
      "People('russellwhyte')/Friends('mirsking')/Photo"
    );
  });

  it('should create entity navigation media', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const photo: ODataMediaResource = entity
      .navigationProperty<Photo>('Photo')
      .media();
    expect(photo.toString()).toEqual("People('russellwhyte')/Photo/$value");
  });

  it('should create entity recursive navigation', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const mirsking: ODataNavigationPropertyResource<Person> = entity
      .navigationProperty<Person>('Friends')
      .key('mirsking');
    expect(mirsking.toString()).toEqual(
      "People('russellwhyte')/Friends('mirsking')"
    );
    const keithpinckney = mirsking
      .navigationProperty<Person>('Friends')
      .key('keithpinckney');
    expect(keithpinckney.toString()).toEqual(
      "People('russellwhyte')/Friends('mirsking')/Friends('keithpinckney')"
    );
  });

  it('should create collection navigation reference', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const mirsking: ODataReferenceResource<Person> = entity
      .navigationProperty<Person>('Friends')
      .key('mirsking')
      .reference();
    expect(mirsking.toString()).toEqual(
      "People('russellwhyte')/Friends('mirsking')/$ref"
    );
  });

  /*
  it('should detect parent resources', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const mirsking: ODataNavigationPropertyResource<Person> = entity
      .navigationProperty<Person>('Friends')
      .key('mirsking');
    const keithpinckney = mirsking
      .navigationProperty<Person>('Friends')
      .key('keithpinckney');
    expect(entity.isParentOf(mirsking)).toBeTrue();
    expect(mirsking.isParentOf(keithpinckney)).toBeTrue();
    expect(set.isParentOf(entity)).toBeTrue();
    expect(set.isParentOf(mirsking)).toBeTrue();
    expect(set.isParentOf(keithpinckney)).toBeTrue();
  });

  it('should detect child resources', () => {
    const set: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity = set.entity('russellwhyte');
    const mirsking: ODataNavigationPropertyResource<Person> = entity
      .navigationProperty<Person>('Friends')
      .key('mirsking');
    const keithpinckney = mirsking
      .navigationProperty<Person>('Friends')
      .key('keithpinckney');
    expect(mirsking.isChildOf(entity)).toBeTrue();
    expect(keithpinckney.isChildOf(mirsking)).toBeTrue();
    expect(keithpinckney.isChildOf(entity)).toBeTrue();
    expect(keithpinckney.isChildOf(set)).toBeTrue();
  });
  */

  it('should detect equals by path resources', () => {
    const set1: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity1 = set1.entity('russellwhyte');
    const set2: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity2 = set2
      .entity('russellwhyte')
      .query((q) => q.expand({ Friends: {} }));
    expect(entity1.isEqualTo(entity2, 'path')).toBeTrue();
  });

  it('should detect equals by params resources', () => {
    const set1: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity1 = set1
      .entity('russell')
      .query((q) => q.expand({ Friends: {} }));
    const set2: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity2 = set2
      .entity('russellwhyte')
      .query((q) => q.expand({ Friends: {} }));
    expect(entity1.isEqualTo(entity2, 'params')).toBeTrue();
  });

  it('should detect equals resources', () => {
    const set1: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity1 = set1
      .entity('russellwhyte')
      .query((q) => q.expand({ Friends: {} }));
    const set2: ODataEntitySetResource<Person> =
      ODataEntitySetResource.factory<Person>(client.defaultApi(), {
        path: ENTITY_SET,
      });
    const entity2 = set2
      .entity('russellwhyte')
      .query((q) => q.expand({ Friends: {} }));
    expect(entity1.isEqualTo(entity2)).toBeTrue();
  });
});
