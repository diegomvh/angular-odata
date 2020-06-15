import { TestBed } from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import { ODataClient } from './client';
import { ODataMetadataResource, ODataEntitySetResource, ODataFunctionResource, ODataActionResource, ODataSingletonResource, ODataBatchResource } from './resources';
import { ODataModule } from './module';

const SERVICE_ROOT = 'https://services.odata.org/v4/TripPinServiceRW/';
const ENTITY_SET = 'People';
const SINGLETON = 'Me';
interface Person {}

describe('ODataClient', () => {
  let client: ODataClient;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ODataModule.forRoot({serviceRootUrl: SERVICE_ROOT}), HttpClientTestingModule]
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
});