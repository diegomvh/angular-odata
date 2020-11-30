import { TestBed } from '@angular/core/testing';
import { TripPinConfig, Person, NAMESPACE, PersonGender } from '../trippin.spec';
import { ODataClient } from '../client';
import { ODataModule } from '../module';
import { ODataEnumParser } from './enum';
import { ODataEntityParser, ODataFieldParser } from './entity';
import { ODataApi } from '../api';
import { ODataStructuredType } from '../schema';
import { Parser } from '../types';
import { HttpClientModule } from '@angular/common/http';

describe('ODataClient', () => {
  let client: ODataClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule, ODataModule.forRoot(TripPinConfig)]
    });

    client = TestBed.inject<ODataClient>(ODataClient);
  });

  it('should return parser for type', () => {
    const parser = client.parserForType(`${NAMESPACE}.Person`);
    expect(parser instanceof ODataEntityParser).toBeTruthy();
  });

  it('should return parser from config', () => {
    const schema = client.structuredTypeForType<Person>(`${NAMESPACE}.Person`);
    expect(schema !== null).toBeTruthy();
    const parser = (schema as ODataStructuredType<Person>).parser;
    expect(parser instanceof ODataEntityParser).toBeTruthy();
  });

  it('should serialize enum', () => {
    const schema = client.structuredTypeForType<Person>(`${NAMESPACE}.Person`);
    expect(schema !== null).toBeTruthy();
    const field = (schema as ODataStructuredType<Person>).findField('Gender');
    expect(field !== undefined).toBeTruthy();
    expect((field as ODataFieldParser<any>).serialize(PersonGender.Female, (schema as ODataStructuredType<Person>).options)).toEqual('Female');
  });

  it('should deserialize enum', () => {
    const schema = client.structuredTypeForType<Person>(`${NAMESPACE}.Person`);
    const field = schema.findField('Gender') as ODataFieldParser<PersonGender>;
    expect(field !== undefined).toBeTruthy();
    expect(field.deserialize('Female', schema.options)).toEqual(PersonGender.Female);
  });

  it('should serialize flags', () => {
    const schema = client.structuredTypeForType<Person>(`${NAMESPACE}.Person`) as ODataStructuredType<Person>;
    const parser = client.parserForType(`${NAMESPACE}.PersonGender`) as ODataEnumParser<PersonGender>;
    parser.flags = true;
    const options = schema.options;
    options.stringAsEnum = true;
    const field = (schema as ODataStructuredType<Person>).findField('Gender') as Parser<PersonGender>;
    expect(field !== undefined).toBeTruthy();
    expect(field.serialize(3, options)).toEqual('Male, Female, Unknown');
    expect(field.serialize(PersonGender.Male | PersonGender.Female | PersonGender.Unknown, options)).toEqual('Male, Female, Unknown');
  });

  it('should deserialize flags', () => {
    const schema = client.structuredTypeForType<Person>(`${NAMESPACE}.Person`) as ODataStructuredType<Person>;
    const parser = client.parserForType(`${NAMESPACE}.PersonGender`) as ODataEnumParser<PersonGender>;
    parser.flags = true;
    const field = (schema as ODataStructuredType<Person>).findField('Gender') as Parser<PersonGender>;
    expect(field !== undefined).toBeTruthy();
    expect(field.deserialize('Male, Female, Unknown', schema.options)).toEqual(3);
  });

  it('should serialize entity', () => {
    const schema = client.structuredTypeForType<Person>(`${NAMESPACE}.Person`) as ODataStructuredType<Person>;
    const options = schema.options;
    options.stringAsEnum = false;
    expect(schema.parser.serialize(<Person>{
      FirstName: 'Name',
      LastName: 'Name',
      UserName: 'name',
      Emails: [],
      Gender: PersonGender.Male
    }, options)).toEqual({FirstName: 'Name', LastName: 'Name', UserName: 'name', Emails: [], Gender: `${NAMESPACE}.PersonGender'Male'`});
  });

  it('should deserialize primitive values', () => {
    enum Color { Red = 1, Yellow, Orange, Green, Black};
    const config = new ODataApi({
      serviceRootUrl: "http://foo",
      options: {
        stringAsEnum: true,
      },
      schemas: [{
        namespace: "Primitive",
        enums: [{name: "Color", members: Color}],
        entities: [
          {
            name: "Entity",
            fields: {
              // Null values are represented as the JSON literal null.
              'null': {type: 'Edm.String', nullable: true},
              // Values of type Edm.Boolean are represented as the JSON literals true and false
              'true': {type: 'Edm.Boolean'}, //The binary-valued logic
              'false': {type: 'Edm.Boolean'},
              // Values of types Edm.Byte, Edm.SByte, Edm.Int16, Edm.Int32, Edm.Int64, Edm.Single, Edm.Double, and Edm.Decimal are represented as JSON numbers, except for NaN, INF, and –INF which are represented as strings.
              'byte': {type: 'Edm.Byte'}, //The unsigned 8-bit integer
              'sbyte': {type: 'Edm.SByte'}, //The signed 8-bit integer
              'int16': {type: 'Edm.Int16'},
              'int32': {type: 'Edm.Int32'},
              'int64': {type: 'Edm.Int64'},
              'single': {type: 'Edm.Single'},
              'double': {type: 'Edm.Double'}, //The IEEE 754 binary64 floating-point number with 15 - 17 decimal digits
              'decimal': {type: 'Edm.Decimal'}, //The numeric values with fixed precision and scale
              // Values of type Edm.String are represented as JSON strings, using the JSON string escaping rules.
              'string': {type: 'Edm.String'},
              // Values of type Edm.Binary, Edm.Date, Edm.DateTimeOffset, Edm.Duration,  Edm.Guid, and Edm.TimeOfDay as well as enumeration values are represented as JSON strings whose content satisfies the rules binaryValue, dateValue, dateTimeOffsetValue, durationValue, guidValue, timeOfDayValue, and enumValue
              'binary': {type: 'Edm.Binary'},
              'date': {type: 'Edm.Date'}, //The date without a time-zone offset
              'dateTimeOffset': {type: 'Edm.DateTimeOffset'},
              'duration': {type: 'Edm.Duration'},
              'timeOfDay': {type: 'Edm.TimeOfDay'}, //The clock time 00:00 - 23:59:59.999999999999
              'guid': {type: 'Edm.Guid'},
              'enumeration': {type: 'Primitive.Color'},
            }
          }]
      }]
    });
    config.configure();
    const primitives = {
      "null": null,
      "true": true,
      "false": false,
      "byte": -128,
      "sbyte": -128,
      "int16": -128,
      "int32": -128,
      "int64": -128,
      "single": "INF",
      "double": 3.1415926535897931,
      "decimal": 34.95,
      "string": "Say \"Hello\",\nthen go",
      "binary": "T0RhdGE=",
      "date": "2012-12-03",
      "timeOfDay": "07:59:59.999",
      "dateTimeOffset": "2012-12-03T07:16:23Z",
      "duration": "P12DT23H59M59.999999999999S",
      "guid": "01234567-89ab-cdef-0123-456789abcdef",
      "enumeration": "Yellow",
      "point": {"type": "point","coordinates":[142.1,64.1]}
    };
    const parser = config.findParserForType<any>('Primitive.Entity') as Parser<any>;
    const result = parser.deserialize(primitives, config.options);
    expect(parser.serialize(result, config.options)).toEqual(primitives);
  });
});
