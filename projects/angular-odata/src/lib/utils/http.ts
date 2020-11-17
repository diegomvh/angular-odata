import { HttpHeaders, HttpParams } from '@angular/common/http';

export const Http = {
  //Merge Headers
  mergeHttpHeaders(...values: (HttpHeaders | { [header: string]: string | string[]; })[]): HttpHeaders {
    let headers = new HttpHeaders();
    values.forEach(value => {
      if (value instanceof HttpHeaders) {
        value.keys().forEach(key => {
          headers = value.getAll(key).reduce((acc, v) => acc.append(key, v), headers);
        });
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([key, value]) => {
          headers = (Array.isArray(value) ? value : [value]).reduce((acc, v) => acc.append(key, v), headers);
        });
      }
    });
    return headers;
  },

  // Merge Params
  mergeHttpParams(...values: (HttpParams | { [param: string]: string | string[]; })[]): HttpParams {
    let params = new HttpParams();
    values.forEach(value => {
      if (value instanceof HttpParams) {
        value.keys().forEach(key => {
          params = value.getAll(key).reduce((acc, v) => acc.append(key, v), params);
        });
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([key, value]) => {
          params = (Array.isArray(value) ? value : [value]).reduce((acc, v) => acc.append(key, v), params);
        });
      }
    });
    return params;
  }
}