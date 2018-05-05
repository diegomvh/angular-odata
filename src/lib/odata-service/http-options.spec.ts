import { HttpHeaders, HttpParams } from '@angular/common/http';

import { HttpOptions, HttpOptionsI } from './http-options';

describe('HttpOptions', () => {
  it('test HttpOptionsI creation', () => {
    let options: HttpOptionsI = {};
    expect(options.headers).toBeUndefined();
    expect(options.params).toBeUndefined();
    expect(options.reportProgress).toBeUndefined();
    expect(options.withCredentials).toBeUndefined();

    options = {
      headers: new HttpHeaders({ 'test': 'test' }),
      params: new HttpParams({ fromString: 'test=test' }),
      reportProgress: true,
      withCredentials: true
    };
    expect(options.headers.get('test')).toEqual('test');
    expect(options.params.get('test')).toEqual('test');
    expect(options.reportProgress).toEqual(true);
    expect(options.withCredentials).toEqual(true);
  });

  it('test HttpOptions creation', () => {
    let options: HttpOptions = new HttpOptions();
    expect(options.headers).toBeUndefined();
    expect(options.observe).toEqual('response');
    expect(options.params).toBeUndefined();
    expect(options.reportProgress).toBeUndefined();
    expect(options.responseType).toEqual('text');
    expect(options.withCredentials).toBeUndefined();

    options = new HttpOptions(
      new HttpHeaders({ 'test': 'test' }),
      'response',
      new HttpParams({ fromString: 'test=test' }),
      true,
      'text',
      true
    );
    expect(options.headers.get('test')).toEqual('test');
    expect(options.observe).toEqual('response');
    expect(options.params.get('test')).toEqual('test');
    expect(options.reportProgress).toEqual(true);
    expect(options.responseType).toEqual('text');
    expect(options.withCredentials).toEqual(true);
  });
});
