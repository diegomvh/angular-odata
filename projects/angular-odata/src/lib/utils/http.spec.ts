import { TestBed } from '@angular/core/testing';
import { Http } from './http';

describe('Http', () => {
  it('should merge headers', () => {
    const headers = Http.mergeHttpHeaders(
      {
        'Content-Type': 'application/json',
      },
      {
        Authorization: 'Bearer token',
        'Content-Type': '*/*',
      }
    );
    expect(headers.get('Authorization')).toEqual('Bearer token');
    expect(headers.getAll('Content-Type')).toEqual(['application/json', '*/*']);
  });

  it('should merge params', () => {
    const params = Http.mergeHttpParams(
      {
        param1: 'value1',
        param2: 'value2',
        params: ['value1'],
      },
      {
        param3: 'value3',
        params: ['value2', 'value3', 'value4'],
      },
      {
        params: ['value5', 'value6'],
        param4: 'value4',
      }
    );
    expect(params.toString()).toEqual(
      'param1=value1&param2=value2&params=value1&params=value2&params=value3&params=value4&params=value5&params=value6&param3=value3&param4=value4'
    );
  });

  it('should split params', () => {
    const params = Http.mergeHttpParams(
      {
        param1: 'value1',
        param2: 'value2',
        params: ['value1'],
      },
      {
        param3: 'value3',
        params: ['value2', 'value3', 'value4'],
      },
      {
        params: ['value5', 'value6'],
        param4: 'value4',
      }
    );
    let [param1, param2] = Http.splitHttpParams(params, ['param1', 'param2']);
    expect(param1.toString()).toEqual(
      'params=value1&params=value2&params=value3&params=value4&params=value5&params=value6&param3=value3&param4=value4'
    );
    expect(param2.toString()).toEqual('param1=value1&param2=value2');
  });
});
