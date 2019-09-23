import { ODataRequestBase } from './odata-request';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export class ODataCountUrl extends ODataRequestBase {
  get<Number>(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<Number> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }
}
