import { ODataRequestBase } from './odata-request';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ODataValueUrl } from './odata-value-request';

export class ODataPropertyUrl<P> extends ODataRequestBase {
  name(name: string) {
    return this.wrapSegment(ODataRequestBase.PROPERTY, name);
  }

  value() {
    return this.clone(ODataValueUrl) as ODataValueUrl;
  }

  get(options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean,
  }): Observable<P> {
    return super.get({
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'property',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }
}
