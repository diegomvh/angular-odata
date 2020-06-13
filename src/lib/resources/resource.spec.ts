import { TestBed } from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import { ODataClient } from '../client';
import { ODataModule } from '../module';
import { ODataResource } from './resource';
import { ODataMetadataResource, ODataEntitySetResource } from './requests';

const SERVICE_ROOT = 'https://services.odata.org/v4/TripPinServiceRW/';
const ENTITY_SET = 'People';
interface Person {}

describe('ODataResource', () => {
  let client: ODataClient;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ODataModule.forRoot({serviceRootUrl: SERVICE_ROOT}), HttpClientTestingModule]
    });

    client = TestBed.inject<ODataClient>(ODataClient);
  });

  it('should be created', () => {
    const resource: ODataResource<Person> = new ODataResource<Person>(client);
    expect(resource).toBeTruthy();
    expect(client.endpointUrl(resource)).toEqual(SERVICE_ROOT);
  });

   it('should create metadata resource', () => {
    const metadata: ODataMetadataResource = client.metadata();
    expect(client.endpointUrl(metadata)).toEqual(SERVICE_ROOT + '$metadata');
  });

  it('should create entitySet resource', () => {
    const set: ODataEntitySetResource<Person> = client.entitySet<Person>(ENTITY_SET);
    expect(client.endpointUrl(set)).toEqual(SERVICE_ROOT + 'People');
  });

  it('should create entity resource', () => {
    const set: ODataEntitySetResource<Person> = client.entitySet<Person>(ENTITY_SET);
    const entity = set.entity('russellwhyte');
    expect(client.endpointUrl(entity)).toEqual(SERVICE_ROOT + 'People(\'russellwhyte\')');
  });
});