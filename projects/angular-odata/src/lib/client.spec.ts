import { TestBed } from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import { ODataClient } from './client';
import { ODataMetadataResource, ODataEntitySetResource, ODataFunctionResource, ODataActionResource, ODataSingletonResource, ODataBatchResource } from './resources';
import { ODataModule } from './module';
import { ODataEntityParser } from './parsers';
import { EntityConfig } from './types';

const SERVICE_ROOT = 'https://services.odata.org/v4/TripPinServiceRW/';
const ENTITY_SET = 'People';
const SINGLETON = 'Me';
interface Person {
  FirstName: string;
  LastName: string;
}
const NAMESPACE = 'Tests';
const NAME = 'Person';
const PersonConfig = {
  name: NAME,
  fields: {
    FirstName: {type: "String", nullable: false},
    LastName: {type: "String", nullable: false}
  }
} as EntityConfig<Person>;

describe('ODataClient', () => {
  let client: ODataClient;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ODataModule.forRoot({
        serviceRootUrl: SERVICE_ROOT,
        schemas: [{namespace: NAMESPACE, entities: [PersonConfig]}]
      }), HttpClientTestingModule]
    });

    client = TestBed.inject<ODataClient>(ODataClient);
  });

  it('should create metadata resource', () => {
    const metadata: ODataMetadataResource = client.metadata();
    expect(client.endpointUrl(metadata)).toEqual(SERVICE_ROOT + '$metadata');
  });

  it('should create batch resource', () => {
    const batch: ODataBatchResource = client.batch();
    expect(client.endpointUrl(batch)).toEqual(SERVICE_ROOT + '$batch');
  });

  it('should create singleton resource', () => {
    const singleton: ODataSingletonResource<Person> = client.singleton<Person>(SINGLETON);
    expect(client.endpointUrl(singleton)).toEqual(SERVICE_ROOT + 'Me');
  });

  it('should create entitySet resource', () => {
    const set: ODataEntitySetResource<Person> = client.entitySet<Person>(ENTITY_SET);
    expect(client.endpointUrl(set)).toEqual(SERVICE_ROOT + 'People');
  });

  it('should create unbound function resource', () => {
    const fun: ODataFunctionResource<any> = client.function<any>("NS.MyFunction")
    expect(client.endpointUrl(fun)).toEqual(SERVICE_ROOT + 'NS.MyFunction');
  });

  it('should create unbound action resource', () => {
    const act: ODataActionResource<any> = client.action<any>("NS.MyAction")
    expect(client.endpointUrl(act)).toEqual(SERVICE_ROOT + 'NS.MyAction');
  });

  it('should create unbound action resource', () => {
    const act: ODataActionResource<any> = client.action<any>("NS.MyAction")
    expect(client.endpointUrl(act)).toEqual(SERVICE_ROOT + 'NS.MyAction');
  });

  it('should return parser for resource', () => {
    const set: ODataEntitySetResource<Person> = client.entitySet<Person>(ENTITY_SET, `${NAMESPACE}.${NAME}`);
    const parser = client.parserFor<Person>(set) as ODataEntityParser<Person>;
    expect(parser).toBeInstanceOf(ODataEntityParser);
    expect(parser.fields.length).toEqual(2);
  });

  it('should convert resource to json', () => {
    const set: ODataEntitySetResource<Person> = client.entitySet<Person>(ENTITY_SET, `${NAMESPACE}.${NAME}`);
    const func = set.function("NS.MyFunction");
    const json = func.toJSON();
    expect(client.fromJSON(json)).toEqual(func);
  });

  it('should merge headers', () => {
    const headers = client.mergeHttpHeaders({
      'Content-Type': 'application/json'
    }, {
      Authorization: 'Bearer token'
    });
    expect(headers.get('Authorization')).toEqual("Bearer token");
  });

  it('should merge params', () => {
    const params = client.mergeHttpParams({
      param1: 'value1',
      param2: 'value2',
      params: 'value1'
    }, {
      params: 'value2',
      param3: 'value3'
    });
    expect(params.toString()).toEqual('param1=value1&param2=value2&params=value1&params=value2&param3=value3');
  });
});