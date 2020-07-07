import { TestBed } from '@angular/core/testing';
import { ODataMetadataResource, ODataEntitySetResource, ODataFunctionResource, ODataActionResource, ODataSingletonResource, ODataEntityResource, ODataBatchResource } from '../resources';
import { TripPinConfig, Person, NAMESPACE, SERVICE_ROOT, PersonGender } from '../trippin.spec';
import { ODataClient } from '../client';
import { ODataModule } from '../module';
import { ODataParser } from './base';
import { ODataEnumParser } from 'angular-odata';

describe('ODataClient', () => {
  let client: ODataClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ODataModule.forRoot(TripPinConfig)]
    });

    client = TestBed.inject<ODataClient>(ODataClient);
  });

  it('should return parser for type', () => {
    const parser = client.parserForType(`${NAMESPACE}.Person`);
    expect(parser instanceof ODataParser).toBeTruthy();
  });

  it('should return parser from config', () => {
    const config = client.entityConfigForType(`${NAMESPACE}.Person`);
    const parser = config.parser; 
    expect(parser instanceof ODataParser).toBeTruthy();
  });

  it('should serialize enum', () => {
    const config = client.entityConfigForType<Person>(`${NAMESPACE}.Person`);
    const field = config.field('Gender');
    expect(field.parser.serialize(PersonGender.Female)).toEqual('Female');
  });

  it('should deserialize enum', () => {
    const config = client.entityConfigForType<Person>(`${NAMESPACE}.Person`);
    const field = config.field('Gender');
    expect(field.parser.deserialize('Female')).toEqual(PersonGender.Female);
  });

  it('should serialize flags', () => {
    const config = client.entityConfigForType<Person>(`${NAMESPACE}.Person`);
    const field = config.field('Gender');
    (field.parser as ODataEnumParser<PersonGender>).flags = true;
    expect(field.serialize(3)).toEqual('Male, Female, Unknown');
  });

  it('should deserialize flags', () => {
    const config = client.entityConfigForType<Person>(`${NAMESPACE}.Person`);
    const field = config.field('Gender');
    (field.parser as ODataEnumParser<PersonGender>).flags = true;
    expect(field.deserialize('Male, Female, Unknown')).toEqual(3);
  });

  it('should serialize entity', () => {
    const config = client.entityConfigForType<Person>(`${NAMESPACE}.Person`);
    const field = config.field('Gender');
    field.parser.stringAsEnum = false;
    expect(config.parser.serialize({
      FirstName: 'Name',
      Emails: [], 
      Gender: PersonGender.Male
    })).toEqual({FirstName: 'Name', Emails: [], Gender: `${NAMESPACE}.PersonGender'Male'`}); 
  });
});