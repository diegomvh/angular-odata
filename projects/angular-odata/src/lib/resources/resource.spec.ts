import { ODataResource } from './resource';
import { ODataMetadataResource, ODataEntitySetResource, ODataFunctionResource, ODataBatchResource, ODataActionResource, ODataCountResource, ODataNavigationPropertyResource } from './requests';
import { ODataPathSegments } from './path-segments';
import { ODataQueryOptions } from './query-options';

const ENTITY_SET = 'People';
interface Person {}

describe('ODataResource', () => {
  let segments: ODataPathSegments;
  let options: ODataQueryOptions;
  beforeEach(() => {
    segments = new ODataPathSegments(); 
    options = new ODataQueryOptions(); 
  });

  it('should create resource', () => {
    const resource: ODataResource<Person> = new ODataResource<Person>(null);
    expect(resource).toBeTruthy();
    expect(resource.toString()).toEqual('');
  });

  it('should create batch resource', () => {
    const metadata: ODataBatchResource = ODataBatchResource.factory(null);
    expect(metadata.toString()).toEqual('$batch');
  });

  it('should create metadata resource', () => {
    const metadata: ODataMetadataResource = ODataMetadataResource.factory(null);
    expect(metadata.toString()).toEqual('$metadata');
  });

  it('should create entitySet resource', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(null, 'People', '', segments, options); 
    expect(set.toString()).toEqual('People');
  });

  it('should create entity resource', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(null, 'People', '', segments, options);
    const entity = set.entity('russellwhyte');
    expect(entity.toString()).toEqual("People('russellwhyte')");
  });

  it('should create collection function', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(null, 'People', '', segments, options);
    const fun: ODataFunctionResource<any> = set.function<any>("NS.MyFunction");
    expect(fun.toString()).toEqual('People/NS.MyFunction');
  });

  it('should create entity function', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(null, 'People', '', segments, options);
    const entity = set.entity('russellwhyte');
    const fun: ODataFunctionResource<any> = entity.function<any>("NS.MyFunction");
    expect(fun.toString()).toEqual("People('russellwhyte')/NS.MyFunction");
  });

  it('should create collection action', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(null, 'People', '', segments, options);
    const act: ODataActionResource<any> = set.action<any>("NS.MyAction");
    expect(act.toString()).toEqual('People/NS.MyAction');
  });

  it('should create entity function', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(null, 'People', '', segments, options);
    const entity = set.entity('russellwhyte');
    const act: ODataActionResource<any> = entity.action<any>("NS.MyAction");
    expect(act.toString()).toEqual("People('russellwhyte')/NS.MyAction");
  });

  it('should create collection count', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(null, 'People', '', segments, options);
    const count: ODataCountResource = set.count();
    expect(count.toString()).toEqual("People/$count");
  });

  it('should create entity navigation', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(null, 'People', '', segments, options);
    const entity = set.entity('russellwhyte');
    const friends: ODataNavigationPropertyResource<Person> = entity.navigationProperty<Person>("Friends");
    expect(friends.toString()).toEqual("People('russellwhyte')/Friends");
  });

  it('should create entity single navigation', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(null, 'People', '', segments, options);
    const entity = set.entity('russellwhyte');
    const friends: ODataNavigationPropertyResource<Person> = entity.navigationProperty<Person>("Friends");
    friends.key('mirsking');
    expect(friends.toString()).toEqual("People('russellwhyte')/Friends('mirsking')");
  });

});