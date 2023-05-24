import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { combineLatest } from 'rxjs';
import { ODataClient } from './client';
import { ODataModule } from './module';
import {
  ODataActionResource,
  ODataBatchResource,
  ODataEntityResource,
  ODataEntitySetResource,
  ODataFunctionResource,
  ODataMetadataResource,
  ODataResource,
  ODataSingletonResource,
} from './resources';
import { ODataStructuredType, ODataStructuredTypeParser } from './schema';
import {
  NAMESPACE,
  Person,
  PersonGender,
  Photo,
  PlanItem,
  SERVICE_ROOT,
  Trip,
  TripPinConfig,
  Flight,
  CONFIG_NAME,
} from './trippin.spec';
import { QueryOption } from './types';

describe('ODataClient', () => {
  let client: ODataClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ODataModule.forRoot({ config: TripPinConfig }),
        HttpClientTestingModule,
      ],
    });

    client = TestBed.inject<ODataClient>(ODataClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create entity navigation to collection', () => {
    const set: ODataEntitySetResource<Person> = client.entitySet<Person>(
      'People',
      `${NAMESPACE}.Person`
    );
    const entity = set.entity('russellwhyte');
    const friends = entity.navigationProperty<Person>('Friends');
    expect(friends.toString()).toEqual("People('russellwhyte')/Friends");
  });

  it('should create entity navigation to single', () => {
    const set: ODataEntitySetResource<Person> = client.entitySet<Person>(
      'People',
      `${NAMESPACE}.Person`
    );
    const entity = set.entity('russellwhyte');
    const photo = entity.navigationProperty<Photo>('Photo');
    expect(photo.toString()).toEqual("People('russellwhyte')/Photo");
  });

  it('should return undefined parser for resource', () => {
    const set: ODataResource<Person> = client.entitySet<Person>('People');
    const api = client.apiFor(set);
    const parser = api.parserForType<Person>(
      'Foo'
    ) as ODataStructuredTypeParser<Person>;
    expect(parser).toBeUndefined();
  });

  it('should return person parser for resource', () => {
    const set: ODataResource<Person> = client.entitySet<Person>(
      'People',
      `${NAMESPACE}.Person`
    );
    const api = client.apiFor(set);
    const parser = api.parserForType<Person>(
      set.type() as string
    ) as ODataStructuredTypeParser<Person>;
    expect(parser instanceof ODataStructuredTypeParser).toBeTruthy();
  });

  it('should throw error parser for type', () => {
    expect(function () {
      client.parserForType<Person>(`${NAMESPACE}.Foo`);
    }).toThrow(new Error('No Parser for type TripPin.Foo was found'));
  });

  it('should throw error entity config', () => {
    expect(function () {
      client.enumTypeForType<Person>(`${NAMESPACE}.Foo`);
    }).toThrow(new Error('No Enum for type TripPin.Foo was found'));
  });

  it('should throw error entity config', () => {
    expect(function () {
      client.structuredTypeForType<Person>(`${NAMESPACE}.Foo`);
    }).toThrow(new Error('No Structured for type TripPin.Foo was found'));
  });

  it('should return person parser for type', () => {
    const parser = client.parserForType<Person>(`${NAMESPACE}.Person`);
    expect(parser instanceof ODataStructuredTypeParser).toBeTruthy();
  });

  it('should return person entity config', () => {
    const config = client.structuredTypeForType<Person>(`${NAMESPACE}.Person`);
    expect(config instanceof ODataStructuredType).toBeTruthy();
  });

  it('should create metadata resource', () => {
    const metadata: ODataMetadataResource = client.metadata();
    expect(metadata.endpointUrl()).toEqual(SERVICE_ROOT + '$metadata');
  });

  it('should create batch resource', () => {
    const batch: ODataBatchResource = client.batch();
    expect(batch.endpointUrl()).toEqual(SERVICE_ROOT + '$batch');
  });

  it('should create singleton resource', () => {
    const singleton: ODataSingletonResource<Person> =
      client.singleton<Person>('Me');
    expect(singleton.endpointUrl()).toEqual(SERVICE_ROOT + 'Me');
  });

  it('should create entitySet resource', () => {
    const set: ODataEntitySetResource<Person> =
      client.entitySet<Person>('People');
    expect(set.endpointUrl()).toEqual(SERVICE_ROOT + 'People');
  });

  it('should create unbound function resource', () => {
    const fun: ODataFunctionResource<any, any> = client.function<any, any>(
      'NS.MyFunction'
    );
    expect(fun.endpointUrl()).toEqual(SERVICE_ROOT + 'NS.MyFunction()');
  });

  it('should create unbound action resource', () => {
    const act: ODataActionResource<any, any> = client.action<any, any>(
      'NS.MyAction'
    );
    expect(act.endpointUrl()).toEqual(SERVICE_ROOT + 'NS.MyAction');
  });

  it('should return parser for People', () => {
    const api = client.apiFor(CONFIG_NAME);
    const parser = api.parserForType<Person>(
      `${NAMESPACE}.Person`
    ) as ODataStructuredTypeParser<Person>;
    expect(parser instanceof ODataStructuredTypeParser).toBeTruthy();
    expect(
      parser.fields({ include_navigation: true, include_parents: false }).length
    ).toEqual(9);
    expect(
      parser.fields({ include_navigation: false, include_parents: false })
        .length
    ).toEqual(6);
  });

  it('should return parser for Flight', () => {
    const api = client.apiFor(CONFIG_NAME);
    const parser = api.parserForType<Flight>(
      `${NAMESPACE}.Flight`
    ) as ODataStructuredTypeParser<Flight>;
    expect(parser instanceof ODataStructuredTypeParser).toBeTruthy();
    expect(
      parser.fields({ include_navigation: false, include_parents: false })
        .length
    ).toEqual(1);
    expect(
      parser.fields({ include_navigation: true, include_parents: false }).length
    ).toEqual(4);
    expect(
      parser.fields({ include_navigation: false, include_parents: true }).length
    ).toEqual(7);
    expect(
      parser.fields({ include_navigation: true, include_parents: true }).length
    ).toEqual(10);
  });

  it('should convert resource to json', () => {
    const set: ODataEntitySetResource<Person> = client.entitySet<Person>(
      'People',
      `${NAMESPACE}.Person`
    );
    const func = set.function<any, any>('NS.MyFunction');
    const json = func.toJSON();
    expect(json).toEqual({
      segments: [
        { name: 'entitySet', path: 'People', type: 'TripPin.Person' },
        { name: 'function', path: 'NS.MyFunction' },
      ],
      options: {},
    });
  });

  it('should convert resource with expression to json', () => {
    const set: ODataEntitySetResource<Person> = client.entitySet<Person>(
      'People',
      `${NAMESPACE}.Person`
    );
    const func = set.function<any, any>('NS.MyFunction');
    func.query((q) => {
      q.filter(({ e }) => e().eq('Name', 'John'));
    });
    const json = func.toJSON();
    expect(json).toEqual({
      segments: [
        { name: 'entitySet', path: 'People', type: 'TripPin.Person' },
        { name: 'function', path: 'NS.MyFunction' },
      ],
      options: {
        filter: {
          children: [
            {
              $type: 'Operator',
              op: 'eq',
              values: ['Name', 'John'],
              normalize: 'right',
            },
          ],
          connector: 'and',
          negated: false,
        },
      },
    });
  });

  it('should fetch people', () => {
    const dummyPeople = [
      {
        '@odata.id':
          "http://services.odata.org/V4/TripPinServiceRW/People('russellwhyte')",
        '@odata.etag': 'W/"08D814450D6BDB6F"',
        UserName: 'russellwhyte',
        FirstName: 'Russell',
        LastName: 'Whyte',
        Emails: ['Russell@example.com', 'Russell@contoso.com'],
      },
      {
        '@odata.id':
          "http://services.odata.org/V4/TripPinServiceRW/People('scottketchum')",
        '@odata.etag': 'W/"08D814450D6BDB6F"',
        UserName: 'scottketchum',
        FirstName: 'Scott',
        LastName: 'Ketchum',
        Emails: ['Scott@example.com'],
      },
    ];
    const data = {
      '@odata.context':
        'http://services.odata.org/V4/TripPinServiceRW/$metadata#People',
      value: dummyPeople,
    };
    client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .query((q) => q.top(2))
      .fetch()
      .subscribe(({ entities, annots }) => {
        expect(entities !== null).toBeTrue();
        expect((entities as any[]).length).toBe(2);
        expect(annots.entitySet).toEqual('People');
        expect(entities).toEqual(dummyPeople);
      });

    const req = httpMock.expectOne(`${SERVICE_ROOT}People?$top=2`);
    expect(req.request.method).toBe('GET');
    req.flush(data);
  });

  it('should fetch person', () => {
    const person = {
      UserName: 'russellwhyte',
      FirstName: 'Russell',
      LastName: 'Whyte',
      Emails: ['Russell@example.com', 'Russell@contoso.com'],
    };
    const entityMetadata = {
      '@odata.context':
        'http://services.odata.org/V4/TripPinServiceRW/$metadata#People/$entity',
      '@odata.id':
        "http://services.odata.org/V4/TripPinServiceRW/People('russellwhyte')",
      '@odata.etag': 'W/"08D814450D6BDB6F"',
    };
    const entityFunctions = {
      '#Microsoft.OData.SampleService.Models.TripPin.GetFriendsTrips': {
        title: 'Microsoft.OData.SampleService.Models.TripPin.GetFriendsTrips',
        target:
          "http://services.odata.org/V4/(S(4m0tuxtnhcfctl4gzem3gr10))/TripPinServiceRW/People('diegomvh')/Microsoft.OData.SampleService.Models.TripPin.GetFriendsTrips",
      },
    };

    const entity: ODataEntityResource<Person> = client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('russellwhyte');

    entity.fetch().subscribe(({ entity, annots }) => {
      expect(annots.entitySet).toEqual('People');
      expect(annots.etag).toEqual('W/"08D814450D6BDB6F"');
      expect(entity).toEqual(person);
    });

    const req = httpMock.expectOne(`${SERVICE_ROOT}People('russellwhyte')`);
    expect(req.request.method).toBe('GET');

    const data = { ...person, ...entityMetadata, ...entityFunctions };
    req.flush(data);
  });

  it('should create trip', () => {
    const trip: Trip = {
      TripId: 3,
      ShareId: '00000000-0000-0000-0000-000000000000',
      Description: 'Create Containment',
      Name: 'Test Trip',
      Budget: 1000,
      StartsAt: new Date(Date.parse('2014-01-01T00:00:00+08:00')),
      EndsAt: new Date(Date.parse('2014-02-01T00:00:00+08:00')),
      Tags: ['Test Tag 1', 'Test Tag 2'],
    };
    const data = {
      '@odata.context':
        "serviceRoot/$metadata#People('russellwhyte')/Trips/$entity",
      ...trip,
    };
    client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('russellwhyte')
      .navigationProperty<Trip>('Trips')
      .create({
        //'@odata.type': 'Microsoft.OData.SampleService.Models.TripPin.Trip',
        TripId: 3,
        ShareId: '00000000-0000-0000-0000-000000000000',
        Description: 'Create Containment',
        Name: 'Test Trip',
        StartsAt: new Date(Date.parse('2014-01-01T00:00:00+08:00')),
        EndsAt: new Date(Date.parse('2014-02-01T00:00:00+08:00')),
        Budget: 1000,
        Tags: ['Test Tag 1', 'Test Tag 2'],
      })
      .subscribe(({ entity, annots: meta }) => {
        expect(entity !== null).toBeTrue();
        expect(meta.entitySet).toEqual('People');
        expect(entity).toEqual(trip);
      });

    const req = httpMock.expectOne(
      `${SERVICE_ROOT}People('russellwhyte')/Trips`
    );
    expect(req.request.method).toBe('POST');
    req.flush(data);
  });

  it('should create planItem', () => {
    const item: PlanItem = {
      //"@odata.type": "#Microsoft.OData.SampleService.Models.TripPin.Event",
      ConfirmationCode: '4372899DD',
      Description: 'Client Meeting',
      Duration: 'PT3H',
      EndsAt: new Date('2014-06-01T23:11:17.5479185-07:00'),
      OccursAt: {
        '@odata.type':
          '#Microsoft.OData.SampleService.Models.TripPin.EventLocation',
        Address: '100 Church Street, 8th Floor, Manhattan, 10007',
        BuildingInfo: 'Regus Business Center',
        City: {
          '@odata.type': '#Microsoft.OData.SampleService.Models.TripPin.City',
          CountryRegion: 'United States',
          Name: 'New York City',
          Region: 'New York',
        },
      },
      PlanItemId: 33,
      StartsAt: new Date('2014-05-25T23:11:17.5459178-07:00'),
    };
    const data = {
      '@odata.context':
        "serviceRoot/$metadata#People('russellwhyte')/Trips(1003)/PlanItems/$entity",
      ...item,
    };
    client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('russellwhyte')
      .navigationProperty<Trip>('Trips')
      .key(1003)
      .navigationProperty<PlanItem>('PlanItems')
      .create(item)
      .subscribe(({ entity, annots: meta }) => {
        expect(entity !== null).toBeTrue();
        expect(meta.entitySet).toEqual('People');
        expect(entity).toEqual(item);
      });

    const req = httpMock.expectOne(
      `${SERVICE_ROOT}People('russellwhyte')/Trips(1003)/PlanItems`
    );
    expect(req.request.method).toBe('POST');
    req.flush(data);
  });

  it('should delete trip', () => {
    client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('russellwhyte')
      .navigationProperty<Trip>('Trips')
      .key(1001)
      .destroy()
      .subscribe(({ entity, annots }) => {
        expect(entity).toBeNull();
      });

    const req = httpMock.expectOne(
      `${SERVICE_ROOT}People('russellwhyte')/Trips(1001)`
    );
    expect(req.request.method).toBe('DELETE');
    req.flush('');
  });

  it('should get reference', () => {
    client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('russellwhyte')
      .navigationProperty<Photo>('Photo')
      .reference()
      .fetchEntity()
      .subscribe((photo) => {
        expect(photo).toBeDefined();
      });

    const req = httpMock.expectOne(
      `${SERVICE_ROOT}People('russellwhyte')/Photo/$ref`
    );
    expect(req.request.method).toBe('GET');
    req.flush('');
  });

  it('should set reference', () => {
    let target = client
      .entitySet<Photo>('Photos', `${NAMESPACE}.Photo`)
      .entity(1);
    client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('russellwhyte')
      .navigationProperty<Photo>('Photo')
      .reference()
      .set(target)
      .subscribe(({ entity, annots: meta }) => {
        //expect(entity).toBeNull();
      });

    const req = httpMock.expectOne(
      `${SERVICE_ROOT}People('russellwhyte')/Photo/$ref`
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      '@odata.id': `${SERVICE_ROOT}Photos(1)`,
    });
    req.flush('');
  });

  it('should unset reference', () => {
    client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('russellwhyte')
      .navigationProperty<Photo>('Photo')
      .reference()
      .unset()
      .subscribe(({ entity, annots: meta }) => {
        //expect(entity).toBeNull();
      });

    const req = httpMock.expectOne(
      `${SERVICE_ROOT}People('russellwhyte')/Photo/$ref`
    );
    expect(req.request.method).toBe('DELETE');
    req.flush('');
  });

  it('should add collection reference', () => {
    let target = client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('mirsking');
    client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('russellwhyte')
      .navigationProperty<Person>('Friends')
      .reference()
      .add(target)
      .subscribe(({ entity, annots }) => {
        //expect(entity).toBeNull();
      });

    const req = httpMock.expectOne(
      `${SERVICE_ROOT}People('russellwhyte')/Friends/$ref`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      '@odata.id': `${SERVICE_ROOT}People('mirsking')`,
    });
    req.flush('');
  });

  it('should remove collection reference using target', () => {
    let target = client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('mirsking');
    client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('russellwhyte')
      .navigationProperty<Person>('Friends')
      .reference()
      .remove(target)
      .subscribe(({ entity, annots }) => {
        //expect(entity).toBeNull();
      });

    const req = httpMock.expectOne(
      `${SERVICE_ROOT}People('russellwhyte')/Friends/$ref?$id=${SERVICE_ROOT}People('mirsking')`
    );
    expect(req.request.method).toBe('DELETE');
    req.flush('');
  });

  it('should remove collection reference using ids', () => {
    client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('russellwhyte')
      .navigationProperty<Person>('Friends')
      .key('mirsking')
      .reference()
      .remove()
      .subscribe(({ entity, annots: meta }) => {
        //expect(entity).toBeNull();
      });

    const req = httpMock.expectOne(
      `${SERVICE_ROOT}People('russellwhyte')/Friends('mirsking')/$ref`
    );
    expect(req.request.method).toBe('DELETE');
    req.flush('');
  });

  it('should get by passing query options in the request body using api options', () => {
    const people: ODataEntitySetResource<Person> = client.entitySet<Person>(
      'People',
      `${NAMESPACE}.Person`
    );
    const api = client.apiFor(people);
    api.options.bodyQueryOptions = [QueryOption.select, QueryOption.expand];
    people
      .query((q) => {
        q.select(['FistName', 'LastName']);
        q.expand({ Friends: {} });
      })
      .fetchAll()
      .subscribe((people) => {
        expect(people).toBeDefined();
      });

    const req = httpMock.expectOne(`${SERVICE_ROOT}People/$query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe('$select=FistName,LastName&$expand=Friends');
    req.flush('');
  });

  it('should get by passing query options in the request body using fetch options', () => {
    client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .query((q) => {
        q.select(['FistName', 'LastName']);
        q.expand({ Friends: {} });
      })
      .fetchAll({
        bodyQueryOptions: [QueryOption.select, QueryOption.expand],
      })
      .subscribe((people) => {
        expect(people).toBeDefined();
      });

    const req = httpMock.expectOne(`${SERVICE_ROOT}People/$query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe('$select=FistName,LastName&$expand=Friends');
    req.flush('');
  });

  it('should get by passing query options in the request body using mixed options', () => {
    const people: ODataEntitySetResource<Person> = client.entitySet<Person>(
      'People',
      `${NAMESPACE}.Person`
    );
    const api = client.apiFor(people);
    api.options.bodyQueryOptions = [QueryOption.select];
    people
      .query((q, s) => {
        q.select(['FistName', 'LastName']);
        q.expand({ Friends: {} });
        q.filter({
          Gender: s?.field<PersonGender>('Gender')?.encode(PersonGender.Male),
        });
      })
      .fetchAll({ bodyQueryOptions: [QueryOption.filter] })
      .subscribe((people) => {
        expect(people).toBeDefined();
      });

    const req = httpMock.expectOne(
      `${SERVICE_ROOT}People/$query?$expand=Friends`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(
      "$select=FistName,LastName&$filter=Gender%20eq%20'Male'"
    );
    req.flush('');
  });

  it('should execute one batch', () => {
    const payload = {
      '@odata.context':
        'http://services.odata.org/V4/TripPinServiceRW/$metadata#People/$entity',
      '@odata.id':
        "http://services.odata.org/V4/TripPinServiceRW/People('russellwhyte')",
      '@odata.etag': 'W/"08D814450D6BDB6F"',
      UserName: 'russellwhyte',
      FirstName: 'Russell',
      LastName: 'Whyte',
      Emails: ['Russell@example.com', 'Russell@contoso.com'],
    };
    const data = `--batchresponse_6520643b-3c13-4889-aa60-b4422cf2b82b
Content-Type: application/http
Content-Transfer-Encoding: binary

HTTP/1.1 200 OK
Content-Type: application/json; odata.metadata=minimal
OData-Version: 4.0

${JSON.stringify(payload)}
--batchresponse_6520643b-3c13-4889-aa60-b4422cf2b82b--`;
    const entity: ODataEntityResource<Person> = client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('russellwhyte');
    client
      .batch()
      .exec((batch) => {
        expect(batch.endpointUrl()).toEqual(SERVICE_ROOT + '$batch');
        entity.fetch().subscribe(({ annots }) => {
          expect(annots.entitySet).toEqual('People');
          expect(annots.etag).toEqual('W/"08D814450D6BDB6F"');
        });
      })
      .subscribe();

    const headers = new HttpHeaders({
      'Content-Length': data.length.toString(),
      'Content-Type':
        'multipart/mixed; boundary=batchresponse_6520643b-3c13-4889-aa60-b4422cf2b82b',
    });
    const req = httpMock.expectOne(`${SERVICE_ROOT}$batch`);
    expect(req.request.method).toBe('POST');
    req.flush(data, { headers });
  });

  it('should execute two batch', () => {
    const payload = {
      '@odata.context':
        'http://services.odata.org/V4/TripPinServiceRW/$metadata#People/$entity',
      '@odata.id':
        "http://services.odata.org/V4/TripPinServiceRW/People('russellwhyte')",
      '@odata.etag': 'W/"08D814450D6BDB6F"',
      UserName: 'russellwhyte',
      FirstName: 'Russell',
      LastName: 'Whyte',
      Emails: ['Russell@example.com', 'Russell@contoso.com'],
    };
    const data = `--batch_6520643b-3c13-4889-aa60-b4422cf2b82b
Content-Type: application/http
Content-Transfer-Encoding: binary

HTTP/1.1 200 OK
Content-Type: application/json; odata.metadata=minimal
OData-Version: 4.0

${JSON.stringify(payload)}

--batch_6520643b-3c13-4889-aa60-b4422cf2b82b
Content-Type: application/http
Content-Transfer-Encoding: binary

HTTP/1.1 200 OK
Content-Type: application/json; odata.metadata=minimal
OData-Version: 4.0

${JSON.stringify(payload)}
--batch_6520643b-3c13-4889-aa60-b4422cf2b82b--`;
    const entity: ODataEntityResource<Person> = client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('russellwhyte');
    client
      .batch()
      .exec(() =>
        combineLatest({
          one: entity.fetch(),
          two: entity.fetch(),
        })
      )
      .subscribe((resp) => { });

    const headers = new HttpHeaders({
      'Content-Length': data.length.toString(),
      'Content-Type':
        'multipart/mixed; boundary=batch_6520643b-3c13-4889-aa60-b4422cf2b82b',
    });
    const req = httpMock.expectOne(`${SERVICE_ROOT}$batch`);
    expect(req.request.method).toBe('POST');
    req.flush(data, { headers });
  });

  it('should execute one json batch', () => {
    const api = client.apiFor(CONFIG_NAME);
    api.options.jsonBatchFormat = true;
    const payload = {
      responses: [
        {
          id: '',
          status: 200,
          body: {
            '@odata.context':
              'http://services.odata.org/V4/TripPinServiceRW/$metadata#People/$entity',
            '@odata.id':
              "http://services.odata.org/V4/TripPinServiceRW/People('russellwhyte')",
            '@odata.etag': 'W/"08D814450D6BDB6F"',
            UserName: 'russellwhyte',
            FirstName: 'Russell',
            LastName: 'Whyte',
            Emails: ['Russell@example.com', 'Russell@contoso.com'],
          },
        },
      ],
    };
    const data = `${JSON.stringify(payload)}`;
    const entity: ODataEntityResource<Person> = client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('russellwhyte');
    client
      .batch()
      .exec((batch) => {
        expect(batch.endpointUrl()).toEqual(SERVICE_ROOT + '$batch');
        entity.fetch().subscribe(({ annots }) => {
          expect(annots.entitySet).toEqual('People');
          expect(annots.etag).toEqual('W/"08D814450D6BDB6F"');
        });
      })
      .subscribe();

    const headers = new HttpHeaders({
      'Content-Length': data.length.toString(),
      'OData-Version': '4.01',
      'Content-Type': 'application/json',
    });
    const req = httpMock.expectOne(`${SERVICE_ROOT}$batch`);
    expect(req.request.method).toBe('POST');
    req.flush(payload, { headers });
  });

  it('should execute two batch', () => {
    const api = client.apiFor(CONFIG_NAME);
    api.options.jsonBatchFormat = true;
    const payload = {
      responses: [
        {
          id: '',
          status: 200,
          body: {
            '@odata.context':
              'http://services.odata.org/V4/TripPinServiceRW/$metadata#People/$entity',
            '@odata.id':
              "http://services.odata.org/V4/TripPinServiceRW/People('russellwhyte')",
            '@odata.etag': 'W/"08D814450D6BDB6F"',
            UserName: 'russellwhyte',
            FirstName: 'Russell',
            LastName: 'Whyte',
            Emails: ['Russell@example.com', 'Russell@contoso.com'],
          },
        },
        {
          id: '',
          status: 200,
          body: {
            '@odata.context':
              'http://services.odata.org/V4/TripPinServiceRW/$metadata#People/$entity',
            '@odata.id':
              "http://services.odata.org/V4/TripPinServiceRW/People('russellwhyte')",
            '@odata.etag': 'W/"08D814450D6BDB6F"',
            UserName: 'russellwhyte',
            FirstName: 'Russell',
            LastName: 'Whyte',
            Emails: ['Russell@example.com', 'Russell@contoso.com'],
          },
        },
      ],
    };
    const data = `${JSON.stringify(payload)}`;
    const entity: ODataEntityResource<Person> = client
      .entitySet<Person>('People', `${NAMESPACE}.Person`)
      .entity('russellwhyte');
    client
      .batch()
      .exec(() =>
        combineLatest({
          one: entity.fetch(),
          two: entity.fetch(),
        })
      )
      .subscribe((resp) => { });

    const headers = new HttpHeaders({
      'Content-Length': data.length.toString(),
      'OData-Version': '4.01',
      'Content-Type': 'application/json',
    });
    const req = httpMock.expectOne(`${SERVICE_ROOT}$batch`);
    expect(req.request.method).toBe('POST');
    req.flush(payload, { headers });
  });
});
