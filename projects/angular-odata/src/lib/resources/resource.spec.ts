import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ODataMetadataResource, ODataEntitySetResource, ODataFunctionResource, ODataBatchResource, ODataActionResource, ODataCountResource, ODataNavigationPropertyResource } from './types';
import { ODataPathSegments } from './path-segments';
import { ODataQueryOptions } from './query-options';
import { ODataClient } from '../client';
import { ODataModule } from '../module';

const SERVICE_ROOT = 'https://services.odata.org/v4/TripPinServiceRW/';
const ENTITY_SET = 'People';
interface Person {}

describe('ODataResource', () => {
  let client: ODataClient;
  let segments: ODataPathSegments;
  let options: ODataQueryOptions;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ODataModule.forRoot({serviceRootUrl: SERVICE_ROOT}), HttpClientTestingModule]
    });

    client = TestBed.inject<ODataClient>(ODataClient);
    segments = new ODataPathSegments();
    options = new ODataQueryOptions();
  });

  it('should create batch resource', () => {
    const metadata: ODataBatchResource = ODataBatchResource.factory(client);
    expect(metadata.toString()).toEqual('$batch');
  });

  it('should create metadata resource', () => {
    const metadata: ODataMetadataResource = ODataMetadataResource.factory(client);
    expect(metadata.toString()).toEqual('$metadata');
  });

  it('should create entitySet resource', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(client, 'People', null, segments, options);
    expect(set.toString()).toEqual('People');
  });

  it('should create entity resource', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(client, 'People', null, segments, options);
    const entity = set.entity('russellwhyte');
    expect(entity.toString()).toEqual("People('russellwhyte')");
  });

  it('should create collection function', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(client, 'People', null, segments, options);
    const fun: ODataFunctionResource<any, any> = set.function<any, any>("NS.MyFunction");
    expect(fun.toString()).toEqual('People/NS.MyFunction');
  });

  it('should create entity function', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(client, 'People', null, segments, options);
    const entity = set.entity('russellwhyte');
    const fun: ODataFunctionResource<any, any> = entity.function<any, any>("NS.MyFunction");
    expect(fun.toString()).toEqual("People('russellwhyte')/NS.MyFunction");
  });

  it('should create entity function with params', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(client, 'People', null, segments, options);
    const entity = set.entity('russellwhyte');
    const fun: ODataFunctionResource<any, any> = entity.function<any, any>("NS.MyFunction");
    expect(fun.toString()).toEqual("People('russellwhyte')/NS.MyFunction(arg1=1, arg2=2)");
  });

  it('should create collection action', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(client, 'People', null, segments, options);
    const act: ODataActionResource<any, any> = set.action<any, any>("NS.MyAction");
    expect(act.toString()).toEqual('People/NS.MyAction');
  });

  it('should create entity function', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(client, 'People', null, segments, options);
    const entity = set.entity('russellwhyte');
    const act: ODataActionResource<any, any> = entity.action<any, any>("NS.MyAction");
    expect(act.toString()).toEqual("People('russellwhyte')/NS.MyAction");
  });

  it('should create collection count', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(client, 'People', null, segments, options);
    const count: ODataCountResource = set.count();
    expect(count.toString()).toEqual("People/$count");
  });

  it('should create entity navigation', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(client, 'People', null, segments, options);
    const entity = set.entity('russellwhyte');
    const friends: ODataNavigationPropertyResource<Person> = entity.navigationProperty<Person>("Friends");
    expect(friends.toString()).toEqual("People('russellwhyte')/Friends");
  });

  it('should create entity single navigation', () => {
    const set: ODataEntitySetResource<Person> = ODataEntitySetResource.factory<Person>(client, 'People', null, segments, options);
    const entity = set.entity('russellwhyte');
    const friends: ODataNavigationPropertyResource<Person> = entity.navigationProperty<Person>("Friends");
    friends.segment.key('mirsking');
    expect(friends.toString()).toEqual("People('russellwhyte')/Friends('mirsking')");
  });

});
