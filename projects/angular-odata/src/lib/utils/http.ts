import { HttpHeaders, HttpParams } from '@angular/common/http';

import { BOUNDARY_PREFIX_SUFFIX } from '../constants';
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
    ...values: (
      | HttpParams
      | {
          [param: string]:
            | string
            | number
            | boolean
            | ReadonlyArray<string | number | boolean>;
        }
    )[]
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

  // Split Params
  splitHttpParams(
    params: HttpParams,
    keys: string[]
  ): [HttpParams, HttpParams] {
    let other = new HttpParams();
    params.keys().forEach((key) => {
      if (keys.includes(key)) {
        other = (params.getAll(key) || []).reduce(
          (acc, v) => acc.append(key, v),
          other
        );
        params = params.delete(key);
      }
    });
    return [params, other];
  },

  // Without Params
  withoutHttpParams(params: HttpParams, keys: string[]): HttpParams {
    return keys.reduce((acc, key) => acc.delete(key), params);
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

  headerValue(header: string): string {
    let res: string = header.split(';')[0].trim();
    res = res.split(':')[1].trim();
    return res;
  },

  parseResponseStatus(line: string): {
    status: string;
    code: number;
    message: string;
  } {
    const chunks = line.split(' ');
    return {
      status: chunks[0],
      code: parseInt(chunks[1], 10),
      message: chunks.slice(2).join(' '),
    };
  },

  boundaryDelimiter(contentType: string): string {
    const contentTypeParts: string[] = contentType.split(';');
    if (contentTypeParts.length === 2) {
      const boundary: string = contentType.split(';')[1].trim();
      const boundaryDelimiter: string =
        BOUNDARY_PREFIX_SUFFIX + boundary.split('=')[1];
      return boundaryDelimiter;
    } else {
      return '';
    }
  },

  boundaryEnd(boundaryDelimiter: string): string {
    if (!boundaryDelimiter.length) {
      return '';
    }
    const boundaryEnd: string = boundaryDelimiter + BOUNDARY_PREFIX_SUFFIX;
    return boundaryEnd;
  },
};
