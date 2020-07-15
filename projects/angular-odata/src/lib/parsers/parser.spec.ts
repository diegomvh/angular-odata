import { TestBed } from '@angular/core/testing';
import { TripPinConfig, Person, NAMESPACE, PersonGender } from '../trippin.spec';
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
    expect(field.serialize(PersonGender.Female)).toEqual('Female');
  });

  it('should deserialize enum', () => {
    const config = client.entityConfigForType<Person>(`${NAMESPACE}.Person`);
    const field = config.field('Gender');
    expect(field.deserialize('Female')).toEqual(PersonGender.Female);
  });

  it('should serialize flags', () => {
    const config = client.entityConfigForType<Person>(`${NAMESPACE}.Person`);
    const parser = client.parserForType<PersonGender>(`${NAMESPACE}.PersonGender`) as ODataEnumParser<PersonGender>;
    parser.flags = true;
    const field = config.field('Gender');
    expect(field.serialize(3)).toEqual("Male, Female, Unknown");
    expect(field.serialize([0, 1, 2])).toEqual("Male, Female, Unknown");
  });

  it('should deserialize flags', () => {
    const config = client.entityConfigForType<Person>(`${NAMESPACE}.Person`);
    const parser = client.parserForType<PersonGender>(`${NAMESPACE}.PersonGender`) as ODataEnumParser<PersonGender>;
    parser.flags = true;
    const field = config.field('Gender');
    expect(field.deserialize('Male, Female, Unknown')).toEqual(3);
  });

  it('should serialize entity', () => {
    const config = client.entityConfigForType<Person>(`${NAMESPACE}.Person`);
    const parser = client.parserForType<PersonGender>(`${NAMESPACE}.PersonGender`) as ODataEnumParser<PersonGender>;
    parser.stringAsEnum = false;
    expect(config.parser.serialize({
      FirstName: 'Name',
      Emails: [], 
      Gender: PersonGender.Male
    })).toEqual({FirstName: 'Name', Emails: [], Gender: `${NAMESPACE}.PersonGender'Male'`}); 
  });
});