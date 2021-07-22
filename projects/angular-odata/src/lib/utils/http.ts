import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Types } from './types';

export const Http = {
  //Merge Headers
  mergeHttpHeaders(
    ...values: (HttpHeaders | { [header: string]: string | string[] })[]
  ): HttpHeaders {
    let headers = new HttpHeaders();
    values.forEach((value) => {
      if (value instanceof HttpHeaders) {
        value.keys().forEach((key) => {
          headers = ((value as HttpHeaders).getAll(key) || []).reduce(
            (acc, v) => acc.append(key, v),
            headers
          );
        });
      } else if (Types.isPlainObject(value)) {
        Object.entries(value).forEach(([key, value]) => {
          headers = (Array.isArray(value) ? value : [value]).reduce(
            (acc, v) => acc.append(key, v),
            headers
          );
        });
      }
    });
    return headers;
  },

  // Merge Params
  mergeHttpParams(
    ...values: (HttpParams | { [param: string]: string | string[] })[]
  ): HttpParams {
    let params = new HttpParams();
    values.forEach((value) => {
      if (value instanceof HttpParams) {
        value.keys().forEach((key) => {
          params = ((value as HttpParams).getAll(key) || []).reduce(
            (acc, v) => acc.append(key, v),
            params
          );
        });
      } else if (Types.isPlainObject(value)) {
        Object.entries(value).forEach(([key, value]) => {
          params = (Array.isArray(value) ? value : [value]).reduce(
            (acc, v) => acc.append(key, v),
            params
          );
        });
      }
    });
    return params;
  },
  resolveHeaderKey(
    headers: HttpHeaders | { [param: string]: string | string[] },
    options: string[]
  ): string | undefined {
    if (headers instanceof HttpHeaders) {
      return headers.keys().find((k) => options.indexOf(k) !== -1);
    } else if (Types.isPlainObject(headers)) {
      return Object.keys(headers).find((k) => options.indexOf(k) !== -1);
    }
    return undefined;
  },
};
