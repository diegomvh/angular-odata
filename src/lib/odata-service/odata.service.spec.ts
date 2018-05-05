import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ODataQuery } from '../odata-query/odata-query';
import { ODataModule } from '../odata.module';
import { HttpOptions, HttpOptionsI } from './http-options';
import { ODataService } from './odata.service';
import { ODataResponse } from '../odata-response/odata-response';
import { Observable, of } from 'rxjs';

describe('OdataService', () => {
  let odataService: ODataService;
  let httpClient: HttpClient;
  let odataQuery: ODataQuery;
  let spy: jasmine.Spy;

  const body: any = { test: 'test' };
  const etag = 'etag';
  const SERVICE_ROOT = 'serviceRoot';
  const HTTP_OPTIONS_I: HttpOptionsI = { headers: new HttpHeaders({ 'header': 'value' }) };
  const HTTP_OPTIONS_I_RES: HttpOptions = new HttpOptions(
    new HttpHeaders({ 'header': 'value' }),
    'response',
    undefined,
    undefined,
    'text',
    undefined
  );
  const HTTP_OPTIONS_I_RES_ETAG: HttpOptions = new HttpOptions(
    new HttpHeaders({ 'header': 'value', 'etag': 'etag' }),
    'response',
    undefined,
    undefined,
    'text',
    undefined
  );
  const HTTP_OPTIONS: HttpOptions = new HttpOptions(
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined
  );
  const HTTP_OPTIONS_ETAG: HttpOptions = new HttpOptions(
    new HttpHeaders({ 'etag': 'etag' }),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined
  );
  const odataResponse: Observable<ODataResponse> = of(new ODataResponse(new HttpResponse()));

  function expectEquals(httpOptions1: HttpOptions, httpOptions2: HttpOptions): void {
    // both httpOptions are undefined
    if (!httpOptions1 || !httpOptions2) {
      expect(httpOptions1).toEqual(httpOptions2);
      return;
    }

    // check same keys
    expect(Object.keys(httpOptions1)).toEqual(Object.keys(httpOptions2));

    // check same headers
    if (!httpOptions1.headers || !httpOptions2.headers) {
      expect(httpOptions1).toEqual(httpOptions2);
    } else {
      expect(httpOptions1.headers.get('header')).toEqual(httpOptions2.headers.get('header'));
    }

    // check other keys
    expect(httpOptions1.observe).toEqual(httpOptions2.observe);
    expect(httpOptions1.params).toEqual(httpOptions2.params);
    expect(httpOptions1.reportProgress).toEqual(httpOptions2.reportProgress);
    expect(httpOptions1.responseType).toEqual(httpOptions2.responseType);
    expect(httpOptions1.withCredentials).toEqual(httpOptions2.withCredentials);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ODataModule],
      providers: [ODataService]
    });

    odataService = TestBed.get(ODataService);
    httpClient = TestBed.get(HttpClient);
    odataQuery = new ODataQuery(odataService, SERVICE_ROOT);
  });

  it('should be created', () => {
    expect(odataService).toBeTruthy();
  });

  it('test get', () => {
    spy = spyOn(httpClient, 'get').and.returnValue(odataResponse);

    odataService.get(odataQuery);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expectEquals(spy.calls.mostRecent().args[1], new HttpOptions());

    odataService.get(odataQuery, HTTP_OPTIONS_I);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expectEquals(spy.calls.mostRecent().args[1], HTTP_OPTIONS_I_RES);

    odataService.get(odataQuery, HTTP_OPTIONS);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expectEquals(spy.calls.mostRecent().args[1], HTTP_OPTIONS);
  });

  it('test post', () => {
    spy = spyOn(httpClient, 'post').and.returnValue(odataResponse);

    odataService.post(odataQuery, body);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expect(spy.calls.mostRecent().args[1]).toEqual(body);
    expectEquals(spy.calls.mostRecent().args[2], new HttpOptions());

    odataService.post(odataQuery, body, HTTP_OPTIONS_I);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expect(spy.calls.mostRecent().args[1]).toEqual(body);
    expectEquals(spy.calls.mostRecent().args[2], HTTP_OPTIONS_I_RES);

    odataService.post(odataQuery, body, HTTP_OPTIONS);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expect(spy.calls.mostRecent().args[1]).toEqual(body);
    expectEquals(spy.calls.mostRecent().args[2], HTTP_OPTIONS);
  });

  it('test patch', () => {
    spy = spyOn(httpClient, 'patch').and.returnValue(odataResponse);

    odataService.patch(odataQuery, body);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expect(spy.calls.mostRecent().args[1]).toEqual(body);
    expectEquals(spy.calls.mostRecent().args[2], new HttpOptions());

    odataService.patch(odataQuery, body, etag);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expect(spy.calls.mostRecent().args[1]).toEqual(body);
    expectEquals(spy.calls.mostRecent().args[2], HTTP_OPTIONS_ETAG);

    odataService.patch(odataQuery, body, etag, HTTP_OPTIONS_I);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expect(spy.calls.mostRecent().args[1]).toEqual(body);
    expectEquals(spy.calls.mostRecent().args[2], HTTP_OPTIONS_I_RES_ETAG);

    odataService.patch(odataQuery, body, etag, HTTP_OPTIONS);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expect(spy.calls.mostRecent().args[1]).toEqual(body);
    expectEquals(spy.calls.mostRecent().args[2], HTTP_OPTIONS_ETAG);
  });

  it('test put', () => {
    spy = spyOn(httpClient, 'put').and.returnValue(odataResponse);

    odataService.put(odataQuery, body);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expect(spy.calls.mostRecent().args[1]).toEqual(body);
    expectEquals(spy.calls.mostRecent().args[2], new HttpOptions());

    odataService.put(odataQuery, body, etag);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expect(spy.calls.mostRecent().args[1]).toEqual(body);
    expectEquals(spy.calls.mostRecent().args[2], HTTP_OPTIONS_ETAG);

    odataService.put(odataQuery, body, etag, HTTP_OPTIONS_I);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expect(spy.calls.mostRecent().args[1]).toEqual(body);
    expectEquals(spy.calls.mostRecent().args[2], HTTP_OPTIONS_I_RES_ETAG);

    odataService.put(odataQuery, body, etag, HTTP_OPTIONS);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expect(spy.calls.mostRecent().args[1]).toEqual(body);
    expectEquals(spy.calls.mostRecent().args[2], HTTP_OPTIONS_ETAG);
  });

  it('test delete', () => {
    spy = spyOn(httpClient, 'delete').and.returnValue(odataResponse);

    odataService.delete(odataQuery);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expectEquals(spy.calls.mostRecent().args[1], new HttpOptions());

    odataService.delete(odataQuery, etag);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expectEquals(spy.calls.mostRecent().args[1], HTTP_OPTIONS_ETAG);

    odataService.delete(odataQuery, etag, HTTP_OPTIONS_I);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expectEquals(spy.calls.mostRecent().args[1], HTTP_OPTIONS_I_RES_ETAG);

    odataService.delete(odataQuery, etag, HTTP_OPTIONS);
    expect(spy.calls.mostRecent().args[0]).toEqual(SERVICE_ROOT);
    expectEquals(spy.calls.mostRecent().args[1], HTTP_OPTIONS_ETAG);
  });
});
