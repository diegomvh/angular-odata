import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ODataClient } from './client';
import { ODataMetadataResource, ODataEntitySetResource, ODataFunctionResource, ODataActionResource, ODataSingletonResource, ODataEntityResource, ODataBatchResource } from './resources';
import { ODataModule } from './module';
import { ODataEntityParser } from './parsers';
import { EntityConfig } from './types';
import { ODataEntityConfig } from './models';
import { HttpResponseBase, HttpHandler, HttpHeaders } from '@angular/common/http';

const SERVICE_ROOT = 'https://services.odata.org/v4/TripPinServiceRW/';
const SINGLETON = 'Me';
const NAMESPACE = 'Tests';

//#region Schema
interface PlanItem {
  PlanItemId: number;
  ConfirmationCode?: string;
  StartsAt?: Date;
  EndsAt?: Date;
  Duration?: string;
}
const PlanItemConfig = {
  name: "PlanItem",
  fields: {
    PlanItemId: { type: 'Number', key: true, ref: 'PlanItemId', nullable: false },
    ConfirmationCode: { type: 'String' },
    StartsAt: { type: 'Date' },
    EndsAt: { type: 'Date' },
    Duration: { type: 'String' }
  }
} as EntityConfig<PlanItem>;

interface Trip {
  TripId: number;
  ShareId?: string;
  Description?: string;
  Name: string;
  Budget: number;
  StartsAt: Date;
  EndsAt: Date;
  Tags: string[];
  PlanItems?: PlanItem[];
}

export const TripConfig = {
  name: "Trip",
  fields: {
    TripId: { type: 'Number', key: true, ref: 'TripId', nullable: false },
    ShareId: { type: 'String' },
    Description: { type: 'String' },
    Name: { type: 'String', nullable: false },
    Budget: { type: 'Number', nullable: false },
    StartsAt: { type: 'Date', nullable: false },
    EndsAt: { type: 'Date', nullable: false },
    Tags: { type: 'String', nullable: false, collection: true },
    PlanItems: { type: `${NAMESPACE}.PlanItem`, collection: true, navigation: true }
  }
} as EntityConfig<Trip>;

const ENTITY_SET = 'People';
interface Person {
  UserName: string;
  FirstName: string;
  LastName: string;
  Emails?: string[];
  Friends?: Person[];
  Trips?: Trip[];
}
const NAME = 'Person';
const PersonConfig = {
  name: NAME,
  fields: {
    UserName: { type: 'String', key: true, ref: 'UserName', nullable: false },
    FirstName: { type: 'String', nullable: false },
    LastName: { type: 'String', nullable: false },
    Emails: { type: 'String', collection: true },
    Friends: { type: `${NAMESPACE}.Person`, collection: true, navigation: true },
    Trips: { type: `${NAMESPACE}.Trip`, collection: true, navigation: true }
  }
} as EntityConfig<Person>;
//#endregion

describe('ODataClient', () => {
  let client: ODataClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ODataModule.forRoot({
        serviceRootUrl: SERVICE_ROOT,
        schemas: [{ namespace: NAMESPACE, entities: [PlanItemConfig, TripConfig, PersonConfig] }]
      }), HttpClientTestingModule]
    });

    client = TestBed.inject<ODataClient>(ODataClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should return undefined parser for resource', () => {
    const set: ODataEntitySetResource<Person> = client.entitySet<Person>(ENTITY_SET);
    const parser = client.parserFor<Person>(set);
    expect(parser).toBeUndefined();
  });

  it('should return person parser for resource', () => {
    const set: ODataEntitySetResource<Person> = client.entitySet<Person>(ENTITY_SET, `${NAMESPACE}.${NAME}`);
    const parser = client.parserFor<Person>(set);
    expect(parser).toBeInstanceOf(ODataEntityParser);
  });

  it('should return undefined parser for type', () => {
    const parser = client.parserForType<Person>(`${NAMESPACE}.Foo`);
    expect(parser).toBeUndefined();
  });

  it('should return person parser for type', () => {
    const parser = client.parserForType<Person>(`${NAMESPACE}.${NAME}`);
    expect(parser).toBeInstanceOf(ODataEntityParser);
  });

  it('should return undefined entity config', () => {
    const config = client.entityConfigForType<Person>(`${NAMESPACE}.Foo`);
    expect(config).toBeUndefined();
  });

  it('should return person entity config', () => {
    const config = client.entityConfigForType<Person>(`${NAMESPACE}.${NAME}`);
    expect(config).toBeInstanceOf(ODataEntityConfig);
  });

  it('should create metadata resource', () => {
    const metadata: ODataMetadataResource = client.metadata();
    expect(client.endpointUrl(metadata)).toEqual(SERVICE_ROOT + '$metadata');
  });

  it('should create batch resource', () => {
    client.batch((batch) => {
      expect(client.endpointUrl(batch)).toEqual(SERVICE_ROOT + '$batch');
    });
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
    expect(parser.fields.length).toEqual(6);
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
      Authorization: 'Bearer token',
      'Content-Type': '*/*'
    });
    expect(headers.get('Authorization')).toEqual("Bearer token");
    expect(headers.getAll('Content-Type')).toEqual(['application/json', '*/*']);
  });

  it('should merge params', () => {
    const params = client.mergeHttpParams({
      param1: 'value1',
      param2: 'value2',
      params: ['value1']
    }, {
      param3: 'value3',
      params: ['value2', 'value3', 'value4'],
    }, {
      params: ['value5', 'value6'],
      param4: 'value4'
    });
    expect(params.toString()).toEqual('param1=value1&param2=value2&params=value1&params=value2&params=value3&params=value4&params=value5&params=value6&param3=value3&param4=value4');
  });

  it('should fetch people', () => {
    const dummyPeople = [
        {
          "@odata.id": "http://services.odata.org/V4/TripPinServiceRW/People('russellwhyte')",
          "@odata.etag": "W/\"08D814450D6BDB6F\"",
          "UserName": "russellwhyte", "FirstName": "Russell", "LastName": "Whyte",
          "Emails": [
            "Russell@example.com",
            "Russell@contoso.com"
          ]
        },
        {
          "@odata.id": "http://services.odata.org/V4/TripPinServiceRW/People('scottketchum')",
          "@odata.etag": "W/\"08D814450D6BDB6F\"",
          "UserName": "scottketchum", "FirstName": "Scott", "LastName": "Ketchum",
          "Emails": [
            "Scott@example.com"
          ]
        }
      ];
    const data = {
      "@odata.context": "http://services.odata.org/V4/TripPinServiceRW/$metadata#People",
      "value": dummyPeople
    };
    const set: ODataEntitySetResource<Person> = client.entitySet<Person>(ENTITY_SET, `${NAMESPACE}.${NAME}`);
    set.top(2);

    set.get().subscribe(([people, annotations]) => {
      expect(people.length).toBe(2);
      expect(annotations.context.set).toEqual("People");
      expect(people).toEqual(dummyPeople);
    });

    const req = httpMock.expectOne(`${SERVICE_ROOT}${ENTITY_SET}?$top=2`);
    expect(req.request.method).toBe("GET");
    req.flush(data);
  });

  it('should fetch person', () => {
    const dummyPerson = {
      "UserName": "russellwhyte", "FirstName": "Russell", "LastName": "Whyte",
      "Emails": [
        "Russell@example.com",
        "Russell@contoso.com"
      ]
    };
    const data = Object.assign({}, dummyPerson, {
      "@odata.context":"http://services.odata.org/V4/TripPinServiceRW/$metadata#People/$entity",
      "@odata.id": "http://services.odata.org/V4/TripPinServiceRW/People('russellwhyte')",
      "@odata.etag": "W/\"08D814450D6BDB6F\"",
    });
    const entity: ODataEntityResource<Person> = client.entitySet<Person>(ENTITY_SET, `${NAMESPACE}.${NAME}`).entity('russellwhyte');

    entity.get().subscribe(([person, annotations]) => {
      expect(annotations.context.set).toEqual("People");
      expect(annotations.etag).toEqual('W/"08D814450D6BDB6F"');
      expect(person).toEqual(person);
    });

    const req = httpMock.expectOne(`${SERVICE_ROOT}${ENTITY_SET}('russellwhyte')`);
    expect(req.request.method).toBe("GET");
    req.flush(data);
  });

  it('should execute batch', () => {
    const entity: ODataEntityResource<Person> = client.entitySet<Person>(ENTITY_SET, `${NAMESPACE}.${NAME}`).entity('russellwhyte');
    const batch = client.batch((batch) => {
      entity.get({batch}).subscribe(([person, annotations]) => {
        expect(annotations.context.set).toEqual("People");
        expect(annotations.etag).toEqual('W/"08D814450D6BDB6F"');
        expect(person).toEqual(person);
      });
    }).subscribe();

    const headers = new HttpHeaders({
      'Content-Length': 'response_total_content_length',
      'Content-Type': 'multipart/mixed; boundary=batch_foobarbaz'
    });
    const req = httpMock.expectOne(`${SERVICE_ROOT}$batch`);
    expect(req.request.method).toBe("POST");
    req.flush(`--batch_foobarbaz
Content-Type: application/http
Content-ID: <response-item1:12930812@classroom.example.com>

HTTP/1.1 200 OK
Content-Type application/json
Content-Length: response_part_1_content_length

{
  "id": "134529639",
  "name": "Course 1",
  "section": "Section 1",
  "ownerId": "116269102540619633451",
  "creationTime": "2015-06-25T14:23:56.535Z",
  "updateTime": "2015-06-25T14:33:06.583Z",
  "enrollmentCode": "6paeflo",
  "courseState": "PROVISIONED",
  "alternateLink": "http://classroom.google.com/c/MTM0NTI5NjM5"
}
--batch_foobarbaz
Content-Type: application/http
Content-ID: <response-item2:12930812@classroom.example.com>

HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: response_part_2_content_length

{
  "id": "134529901",
  "name": "Course 1",
  "section": "Section 2",
  "ownerId": "116269102540619633451",
  "creationTime": "2015-06-25T14:23:08.761Z",
  "updateTime": "2015-06-25T14:33:06.490Z",
  "enrollmentCode": "so75ha5",
  "courseState": "PROVISIONED",
  "alternateLink": "http://classroom.google.com/c/MTM0NTI5OTAx"
}
--batch_foobarbaz--`, {headers});
  });
});