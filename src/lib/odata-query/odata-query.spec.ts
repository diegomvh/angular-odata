import {HttpHeaders} from '@angular/common/http';
import {HttpClientTestingModule, HttpTestingController, TestRequest} from '@angular/common/http/testing';
import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {EntitySet} from '../odata-response/entity-collection';
import {ODataResponse} from '../odata-response/odata-response';
import {ODataService} from '../odata-service/odata.service';
import {ODataModule} from '../odata.module';
import {Expand} from '../query-options/expand';
import {FilterComparison} from '../query-options/filter/filter-comparison';
import {FilterContains, FilterEndswith} from '../query-options/filter/filter-function';
import {FilterLambda, LambdaCollection, LambdaOperator} from '../query-options/filter/filter-lambda';
import {OperatorComparison} from '../query-options/operator';
import {Order, Orderby} from '../query-options/orderby';
import {SearchSimple} from '../query-options/search/search-simple';
import {ODataQuery} from './odata-query';
import {QuotedString} from './quoted-string';

const SERVICE_ROOT = 'https://services.odata.org/v4/TripPinServiceRW';
const ENTITY_SET = 'People';

describe('OdataQuery', () => {
  let odataService: ODataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ODataModule.forContext({baseUrl: SERVICE_ROOT}), HttpClientTestingModule]
    });

    odataService = TestBed.get(ODataService);
  });

  it('should be created', () => {
    const odataQuery: ODataQuery = odataService.query();
    expect(odataQuery).toBeTruthy();
    expect(odataQuery.toString()).toEqual(SERVICE_ROOT);
  });

  it('should create metadata request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .metadata();
    expect(odataQuery.toString()).toEqual(SERVICE_ROOT + '/$metadata');
  });

  it('should create entitySet request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET);
    expect(odataQuery.toString()).toEqual(SERVICE_ROOT + '/People');
  });

  it('should create entity request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .entityKey(new QuotedString('russellwhyte'));
    expect(odataQuery.toString()).toEqual(SERVICE_ROOT + '/People(\'russellwhyte\')');
  });

  it('should create singleton request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .singleton('Me');
    expect(odataQuery.toString()).toEqual(SERVICE_ROOT + '/Me');
  });

  it('should create derived entityset request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .entityKey('\'russellwhyte\'')
      .navigationProperty('Trips')
      .entityKey(1003)
      .navigationProperty('PlanItems')
      .typeName('Microsoft.OData.SampleService.Models.TripPin.Flight');
    expect(odataQuery.toString()).toEqual(SERVICE_ROOT + '/People(\'russellwhyte\')/Trips(1003)/PlanItems/Microsoft.OData.SampleService.Models.TripPin.Flight');
  });

  it('should create derived entity request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .entityKey('\'russellwhyte\'')
      .navigationProperty('Trips')
      .entityKey(1003)
      .navigationProperty('PlanItems')
      .entityKey(21)
      .typeName('Microsoft.OData.SampleService.Models.TripPin.Flight');
    expect(odataQuery.toString()).toEqual(SERVICE_ROOT + '/People(\'russellwhyte\')/Trips(1003)/PlanItems(21)/Microsoft.OData.SampleService.Models.TripPin.Flight');
  });

  it('should create property request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .entityKey(new QuotedString('russellwhyte'))
      .property('FirstName');
    expect(odataQuery.toString()).toEqual(SERVICE_ROOT + '/People(\'russellwhyte\')/FirstName');
  });

  it('should create property raw value request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .entityKey(new QuotedString('russellwhyte'))
      .property('FirstName')
      .value();
    expect(odataQuery.toString()).toEqual(SERVICE_ROOT + '/People(\'russellwhyte\')/FirstName/$value');
  });

  it('should create entitySet request using binary filter', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .filter(new FilterComparison('FirstName', OperatorComparison.EQ, new QuotedString('Scott')));
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People?$filter=' + encodeURIComponent('FirstName eq \'Scott\''));
  });

  it('should create entitySet request using contains filter', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .filter(new FilterContains('Location/Address', 'San Francisco'));
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People?$filter=' + encodeURIComponent('contains(Location/Address,\'San Francisco\')'));
  });

  it('should create entitySet request using binary filter with enum', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .filter(new FilterComparison('Gender', OperatorComparison.EQ, 'Microsoft.OData.SampleService.Models.TripPin.PersonGender\'Female\''));
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People?$filter=' + encodeURIComponent('Gender eq Microsoft.OData.SampleService.Models.TripPin.PersonGender\'Female\''));
  });

  it('should create expand request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .entityKey(new QuotedString('russellwhyte'))
      .expand([new Expand('Trips')]);
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People(\'russellwhyte\')?$expand=Trips');
  });

  it('should create expand request using select', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .entityKey(new QuotedString('russellwhyte'))
      .expand(new Expand('Trips').select('Name'));
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People(\'russellwhyte\')?$expand=Trips($select=Name)');
  });

  it('should create expand request using filter', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .entityKey(new QuotedString('russellwhyte'))
      .expand(new Expand('Trips').filter(new FilterComparison('Name', OperatorComparison.EQ, new QuotedString('Trip in US'))));
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People(\'russellwhyte\')?$expand=Trips($filter=' + encodeURIComponent('Name eq \'Trip in US\')'));
  });

  it('should create orderby request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .orderby([new Orderby('EndsAt', Order.DESC)]);
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People?$orderby=EndsAt desc');
  });

  it('should create skip and top request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .skip(10).top(20);
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People?$skip=10&$top=20');
  });

  it('should create count request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .countSegment();
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People/$count');
  });

  it('should create count=true request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .countOption(true);
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People?$count=true');
  });

  it('should create select request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .select(['Name', 'IcaoCode']);
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People?$select=Name,IcaoCode');
  });

  it('should create search request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .search(new SearchSimple('Boise'));
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People?$search=' + encodeURIComponent('Boise'));
  });

  it('should create lambda any on properties request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .filter(new FilterLambda(LambdaCollection.PROPERTY_COLLECTION, 'Emails', LambdaOperator.ANY, new FilterEndswith('Emails', 'contoso.com')));
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People?$filter=' + encodeURIComponent('Emails/any(x:endswith(x,\'contoso.com\'))'));
  });

  it('should create lambda all on properties request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .filter(new FilterLambda(LambdaCollection.PROPERTY_COLLECTION, 'Emails', LambdaOperator.ALL, new FilterEndswith('Emails', 'contoso.com')));
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People?$filter=' + encodeURIComponent('Emails/all(x:endswith(x,\'contoso.com\'))'));
  });

  it('should create lambda any on properties request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .filter(new FilterLambda(LambdaCollection.ENTITY_SET, 'Friends', LambdaOperator.ANY, new FilterComparison('FirstName', OperatorComparison.EQ, new QuotedString('Scott'))));
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People?$filter=' + encodeURIComponent('Friends/any(x:x/FirstName eq \'Scott\')'));
  });

  it('should create lambda all on properties request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .filter(new FilterLambda(LambdaCollection.ENTITY_SET, 'Friends', LambdaOperator.ALL, new FilterComparison('FirstName', OperatorComparison.EQ, new QuotedString('Scott'))));
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People?$filter=' + encodeURIComponent('Friends/all(x:x/FirstName eq \'Scott\')'));
  });

  it('should create reference request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .entityKey(new QuotedString('scottketchum'))
      .navigationProperty('Friends')
      .ref();
    expect(odataQuery.toString()).toEqual(SERVICE_ROOT + '/People(\'scottketchum\')/Friends/$ref');
  });

  it('should create change reference request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .entityKey(new QuotedString('russellwhyte'))
      .navigationProperty('Trips')
      .entityKey(1001)
      .navigationProperty('PlanItems')
      .entityKey(11)
      .navigationProperty('Microsoft.OData.SampleService.Models.TripPin.Flight/Airline')
      .ref();
    expect(odataQuery.toString()).toEqual(SERVICE_ROOT + '/People(\'russellwhyte\')/Trips(1001)/PlanItems(11)/Microsoft.OData.SampleService.Models.TripPin.Flight/Airline/$ref');
  });

  it('should create unbound function call request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .functionCall('GetNearestAirport(lat = 33, lon = -118)');
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/GetNearestAirport(lat = 33, lon = -118)');
  });

  it('should create bound function call request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .entityKey(new QuotedString('russellwhyte'))
      .functionCall('Microsoft.OData.SampleService.Models.TripPin.GetFavoriteAirline()');
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People(\'russellwhyte\')/Microsoft.OData.SampleService.Models.TripPin.GetFavoriteAirline()');
  });

  it('should create unbound action call request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .actionCall('Microsoft.OData.SampleService.Models.TripPin.ShareTrip');
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/Microsoft.OData.SampleService.Models.TripPin.ShareTrip');
  });

  it('should create bound action call request', () => {
    const odataQuery: ODataQuery = odataService.query()
      .entitySet(ENTITY_SET)
      .entityKey(new QuotedString('russellwhyte'))
      .actionCall('Microsoft.OData.SampleService.Models.TripPin.ShareTrip');
    expect(odataQuery.toString()).toEqual(
      SERVICE_ROOT + '/People(\'russellwhyte\')/Microsoft.OData.SampleService.Models.TripPin.ShareTrip');
  });

  it('test get', () => {
    const odataQuery: ODataQuery = odataService.query()
    spyOn(odataQuery, 'get');
    spyOn(odataQuery, 'post');
    spyOn(odataQuery, 'patch');
    spyOn(odataQuery, 'put');
    spyOn(odataQuery, 'delete');

    const httpOptions = {};
    const httpOptionsI = { headers: new HttpHeaders({ test: 'test' }) };

    odataQuery.get(httpOptions);
    expect(odataQuery.get).toHaveBeenCalledWith(httpOptions);
    odataQuery.get(httpOptionsI);
    expect(odataQuery.get).toHaveBeenCalledWith(httpOptionsI);

    odataQuery.post(undefined, httpOptions);
    expect(odataQuery.post).toHaveBeenCalledWith(undefined, httpOptions);
    odataQuery.post(undefined, httpOptionsI);
    expect(odataQuery.post).toHaveBeenCalledWith(undefined, httpOptionsI);

    odataQuery.patch(undefined, undefined, httpOptions);
    expect(odataQuery.patch).toHaveBeenCalledWith(undefined, undefined, httpOptions);
    odataQuery.patch(undefined, undefined, httpOptionsI);
    expect(odataQuery.patch).toHaveBeenCalledWith(undefined, undefined, httpOptionsI);

    odataQuery.put(undefined, undefined, httpOptions);
    expect(odataQuery.put).toHaveBeenCalledWith(undefined, undefined, httpOptions);
    odataQuery.put(undefined, undefined, httpOptionsI);
    expect(odataQuery.put).toHaveBeenCalledWith(undefined, undefined, httpOptionsI);

    odataQuery.delete(undefined, httpOptions);
    expect(odataQuery.delete).toHaveBeenCalledWith(undefined, httpOptions);
    odataQuery.delete(undefined, httpOptionsI);
    expect(odataQuery.delete).toHaveBeenCalledWith(undefined, httpOptionsI);
  });

  class Type {
    type: string;
    getType(): string {
      return this.type;
    }
  }

  it('test toEntitySet', fakeAsync(() => {
    const httpMock: HttpTestingController = TestBed.get(HttpTestingController);
    const responseBody: any = { value: [{ type: 'type1' }, { type: 'type2' }] };
    const responseHeaders: any = { headers: { 'Content-Type': 'application/json' } };

    odataService.query().entitySet(ENTITY_SET).get().subscribe(
      (odataResponse: ODataResponse) => {
        const entitySetData: EntitySet<Type> = odataResponse.toEntitySet<Type>();
        const types: Type[] = entitySetData.getEntities();

        expect(types[0].type).toEqual('type1');
        expect(types[1].type).toEqual('type2');
        expect(types[0].getType).toBeUndefined();
        expect(types[1].getType).toBeUndefined();
      }, error => {
        console.log('Failed to fetch addressType');
      });

    let request: TestRequest = httpMock.expectOne('https://services.odata.org/v4/TripPinServiceRW/People');
    request.flush(responseBody, responseHeaders);
    tick();
    httpMock.verify();

    odataService.query().entitySet(ENTITY_SET).get().subscribe(
      (odataResponse: ODataResponse) => {
        const entitySetData: EntitySet<Type> = odataResponse.toEntitySet<Type>();
        const types: Type[] = entitySetData.getEntities();

        expect(types[0].type).toEqual('type1');
        expect(types[1].type).toEqual('type2');
        expect(types[0].getType).toBeDefined();
        expect(types[1].getType).toBeDefined();
      }, error => {
        console.log('Failed to fetch addressType');
      });

    request = httpMock.expectOne('https://services.odata.org/v4/TripPinServiceRW/People');
    request.flush(responseBody, responseHeaders);
    tick();
    httpMock.verify();
  }));

  it('test toComplexCollection', fakeAsync(() => {
    const httpMock: HttpTestingController = TestBed.get(HttpTestingController);
    const responseBody: any = { value: [{ type: 'type1' }, { type: 'type2' }] };
    const responseHeaders: any = { headers: { 'Content-Type': 'application/json' } };

    odataService.query().entitySet(ENTITY_SET).get().subscribe(
      (odataResponse: ODataResponse) => {
        const complexCollection: Type[] = odataResponse.toComplexCollection<Type>();

        expect(complexCollection[0].type).toEqual('type1');
        expect(complexCollection[1].type).toEqual('type2');
        expect(complexCollection[0].getType).toBeUndefined();
        expect(complexCollection[1].getType).toBeUndefined();
      }, error => {
        console.log('Failed to fetch addressType');
      });

    let request: TestRequest = httpMock.expectOne('https://services.odata.org/v4/TripPinServiceRW/People');
    request.flush(responseBody, responseHeaders);
    tick();
    httpMock.verify();

    odataService.query().entitySet(ENTITY_SET).get().subscribe(
      (odataResponse: ODataResponse) => {
        const complexCollection: Type[] = odataResponse.toComplexCollection<Type>();

        expect(complexCollection[0].type).toEqual('type1');
        expect(complexCollection[1].type).toEqual('type2');
        expect(complexCollection[0].getType).toBeDefined();
        expect(complexCollection[1].getType).toBeDefined();
      }, error => {
        console.log('Failed to fetch addressType');
      });

    request = httpMock.expectOne('https://services.odata.org/v4/TripPinServiceRW/People');
    request.flush(responseBody, responseHeaders);
    tick();
    httpMock.verify();
  }));

  it('test toEntity', fakeAsync(() => {
    const httpMock: HttpTestingController = TestBed.get(HttpTestingController);
    const responseBody: any = { type: 'type1' };
    const responseHeaders: any = { headers: { 'Content-Type': 'application/json' } };

    odataService.query().entitySet(ENTITY_SET).entityKey('entityKey').get().subscribe(
      (odataResponse: ODataResponse) => {
        const entity: Type = odataResponse.toEntity<Type>();

        expect(entity.type).toEqual('type1');
        expect(entity.getType).toBeUndefined();
      }, error => {
        console.log('Failed to fetch Type');
      });

    let request: TestRequest = httpMock.expectOne('https://services.odata.org/v4/TripPinServiceRW/People(entityKey)');
    request.flush(responseBody, responseHeaders);
    tick();
    httpMock.verify();

    odataService.query().entitySet(ENTITY_SET).entityKey('entityKey').get().subscribe(
      (odataResponse: ODataResponse) => {
        const entity: Type = odataResponse.toEntity<Type>();

        expect(entity.type).toEqual('type1');
        expect(entity.getType).toBeDefined();
      }, error => {
        console.log('Failed to fetch Type');
      });

    request = httpMock.expectOne('https://services.odata.org/v4/TripPinServiceRW/People(entityKey)');
    request.flush(responseBody, responseHeaders);
    tick();
    httpMock.verify();
  }));

  it('test toComplexValue', fakeAsync(() => {
    const httpMock: HttpTestingController = TestBed.get(HttpTestingController);
    const responseBody: any = { type: 'type1' };
    const responseHeaders: any = { headers: { 'Content-Type': 'application/json' } };

    odataService.query().entitySet(ENTITY_SET).entityKey('entityKey').get().subscribe(
      (odataResponse: ODataResponse) => {
        const entity: Type = odataResponse.toComplexValue<Type>();

        expect(entity.type).toEqual('type1');
        expect(entity.getType).toBeUndefined();
      }, error => {
        console.log('Failed to fetch Type');
      });

    let request: TestRequest = httpMock.expectOne('https://services.odata.org/v4/TripPinServiceRW/People(entityKey)');
    request.flush(responseBody, responseHeaders);
    tick();
    httpMock.verify();

    odataService.query().entitySet(ENTITY_SET).entityKey('entityKey').get().subscribe(
      (odataResponse: ODataResponse) => {
        const entity: Type = odataResponse.toComplexValue<Type>();

        expect(entity.type).toEqual('type1');
        expect(entity.getType).toBeDefined();
      }, error => {
        console.log('Failed to fetch Type');
      });

    request = httpMock.expectOne('https://services.odata.org/v4/TripPinServiceRW/People(entityKey)');
    request.flush(responseBody, responseHeaders);
    tick();
    httpMock.verify();
  }));

  it('test toPropertyValue', fakeAsync(() => {
    const httpMock: HttpTestingController = TestBed.get(HttpTestingController);
    const responseBody: any = { value: 'type1' };
    const responseHeaders: any = { headers: { 'Content-Type': 'application/json' } };

    odataService.query().entitySet(ENTITY_SET).entityKey('entityKey').property('property').get().subscribe(
      (odataResponse: ODataResponse) => {
        const propertyValue: string = odataResponse.toPropertyValue<string>();

        expect(propertyValue).toEqual('type1');
      }, error => {
        console.log('Failed to fetch Type');
      });

    const request: TestRequest = httpMock.expectOne('https://services.odata.org/v4/TripPinServiceRW/People(entityKey)/property');
    request.flush(responseBody, responseHeaders);
    tick();
    httpMock.verify();
  }));

  it('test toCount', fakeAsync(() => {
    const httpMock: HttpTestingController = TestBed.get(HttpTestingController);
    const responseBody: any = 0;
    const responseHeaders: any = { headers: { 'Content-Type': 'application/json' } };

    odataService.query().entitySet(ENTITY_SET).countSegment().get().subscribe(
      (odataResponse: ODataResponse) => {
        const count: number = odataResponse.toCount();

        expect(count).toEqual(0);
      }, error => {
        console.log('Failed to fetch Type');
      });

    const request: TestRequest = httpMock.expectOne('https://services.odata.org/v4/TripPinServiceRW/People/$count');
    request.flush(responseBody, responseHeaders);
    tick();
    httpMock.verify();
  }));
});
