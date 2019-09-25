import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ODataRequest } from '../request';
import { Options, Expand, PlainObject, Select } from '../types';

export class ODataSingleRequest<T> extends ODataRequest {
  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<T> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }

  select(opts?: Select) {
    return this.options.option<Select>(Options.select, opts);
  }

  expand(opts?: Expand) {
    return this.options.option<Expand>(Options.expand, opts);
  }

  custom(opts?: PlainObject) {
    return this.options.option<PlainObject>(Options.custom, opts);
  }
}
