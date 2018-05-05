import { ODataQueryBatch, BatchRequest, Method } from './odata-query-batch';
import { ODataService } from '../odata-service/odata.service';
import { ODataModule } from './../odata.module';
import { ODataQuery } from './odata-query';
import { HttpModule } from '@angular/http';
import { TestBed } from '@angular/core/testing';
import { HttpHeaders } from '@angular/common/http';
import { HttpOptionsI, HttpOptions } from '../odata-service/http-options';

describe('ODataQueryBatch', () => {
  let odataService: ODataService;
  let odataQuery: ODataQuery;

  const SERVICE_ROOT = 'serviceRoot';
  const body: any = { test: 'test' };
  const httpOptionsI: HttpOptionsI = { headers: new HttpHeaders({ 'test': 'test' }) };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ODataModule]
    });

    odataService = TestBed.get(ODataService);
    odataQuery = new ODataQuery(odataService, SERVICE_ROOT);
  });

  it('test get', () => {
    const odataQueryBatch: ODataQueryBatch = new ODataQueryBatch(odataService, SERVICE_ROOT);
    expect(() => odataQueryBatch.get(undefined)).toThrowError('odataQuery cannot be undefined');
    expect(() => odataQueryBatch.get(null)).toThrowError('odataQuery cannot be null');

    odataQueryBatch.get(odataQuery);
    odataQueryBatch.get(odataQuery, httpOptionsI);
    expect(odataQueryBatch['requests'][0]).toEqual(new BatchRequest(Method.GET, odataQuery));
    expect(odataQueryBatch['requests'][1]).toEqual(new BatchRequest(Method.GET, odataQuery, undefined, httpOptionsI));
  });

  it('test post', () => {
    const odataQueryBatch: ODataQueryBatch = new ODataQueryBatch(odataService, SERVICE_ROOT);
    expect(() => odataQueryBatch.post(undefined, undefined)).toThrowError('odataQuery cannot be undefined');
    expect(() => odataQueryBatch.post(null, null)).toThrowError('odataQuery cannot be null');

    odataQueryBatch.post(odataQuery, body);
    odataQueryBatch.post(odataQuery, body, httpOptionsI);
    expect(odataQueryBatch['requests'][0]).toEqual(new BatchRequest(Method.POST, odataQuery, body));
    expect(odataQueryBatch['requests'][1]).toEqual(new BatchRequest(Method.POST, odataQuery, body, httpOptionsI));
  });

  it('test put', () => {
    const odataQueryBatch: ODataQueryBatch = new ODataQueryBatch(odataService, SERVICE_ROOT);
    expect(() => odataQueryBatch.put(undefined, undefined)).toThrowError('odataQuery cannot be undefined');
    expect(() => odataQueryBatch.put(null, null)).toThrowError('odataQuery cannot be null');

    odataQueryBatch.put(odataQuery, body);
    odataQueryBatch.put(odataQuery, body, httpOptionsI);
    expect(odataQueryBatch['requests'][0]).toEqual(new BatchRequest(Method.PUT, odataQuery, body));
    expect(odataQueryBatch['requests'][1]).toEqual(new BatchRequest(Method.PUT, odataQuery, body, httpOptionsI));
  });

  it('test patch', () => {
    const odataQueryBatch: ODataQueryBatch = new ODataQueryBatch(odataService, SERVICE_ROOT);
    expect(() => odataQueryBatch.patch(undefined, undefined)).toThrowError('odataQuery cannot be undefined');
    expect(() => odataQueryBatch.patch(null, null)).toThrowError('odataQuery cannot be null');

    odataQueryBatch.patch(odataQuery, body);
    odataQueryBatch.patch(odataQuery, body, httpOptionsI);
    expect(odataQueryBatch['requests'][0]).toEqual(new BatchRequest(Method.PATCH, odataQuery, body));
    expect(odataQueryBatch['requests'][1]).toEqual(new BatchRequest(Method.PATCH, odataQuery, body, httpOptionsI));
  });

  it('test delete', () => {
    const odataQueryBatch: ODataQueryBatch = new ODataQueryBatch(odataService, SERVICE_ROOT);
    expect(() => odataQueryBatch.delete(undefined)).toThrowError('odataQuery cannot be undefined');
    expect(() => odataQueryBatch.delete(null)).toThrowError('odataQuery cannot be null');

    odataQueryBatch.delete(odataQuery);
    odataQueryBatch.delete(odataQuery, httpOptionsI);
    expect(odataQueryBatch['requests'][0]).toEqual(new BatchRequest(Method.DELETE, odataQuery));
    expect(odataQueryBatch['requests'][1]).toEqual(new BatchRequest(Method.DELETE, odataQuery, undefined, httpOptionsI));
  });

  it('test execute', () => {
    const odataQueryBatch: ODataQueryBatch = new ODataQueryBatch(odataService, SERVICE_ROOT);
    const spy: jasmine.Spy = spyOn(odataService, 'post').and.returnValue(null);
    odataQueryBatch['batchBoundary'] = 'batchBoundary';

    odataQueryBatch.execute();
    expect(spy.calls.mostRecent().args[0]).toEqual(odataQueryBatch);
    expect(spy.calls.mostRecent().args[1]).toEqual(odataQueryBatch.getBody());
    const httpOptionsIArg: HttpOptionsI = spy.calls.mostRecent().args[2];
    expect(httpOptionsIArg instanceof HttpOptions).toBeFalsy();
    expect(httpOptionsIArg.headers.get('Content-Type')).toEqual('multipart/mixed;boundary=batchBoundary');
    expect(httpOptionsIArg.params).toEqual(undefined);
    expect(httpOptionsIArg.reportProgress).toEqual(undefined);
    expect(httpOptionsIArg.withCredentials).toEqual(undefined);

    odataQueryBatch.execute(new HttpOptions(new HttpHeaders({ 'test': 'test' })));
    expect(spy.calls.mostRecent().args[0]).toEqual(odataQueryBatch);
    expect(spy.calls.mostRecent().args[1]).toEqual(odataQueryBatch.getBody());
    const httpOptionsArg: HttpOptions = spy.calls.mostRecent().args[2];
    expect(httpOptionsArg instanceof HttpOptions).toBeTruthy();
    expect(httpOptionsArg.headers.get('test')).toEqual('test');
    expect(httpOptionsArg.headers.get('Content-Type')).toEqual('multipart/mixed;boundary=batchBoundary');
    expect(httpOptionsArg.params).toEqual(undefined);
    expect(httpOptionsArg.reportProgress).toEqual(undefined);
    expect(httpOptionsArg.withCredentials).toEqual(undefined);
  });

  it('test toString', () => {
    const odataQueryBatch: ODataQueryBatch = new ODataQueryBatch(odataService, SERVICE_ROOT);
    expect(odataQueryBatch.toString()).toEqual(SERVICE_ROOT + '/$batch');
  });
});
