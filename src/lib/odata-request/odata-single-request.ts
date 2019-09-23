import { ODataRequestBase } from './odata-request';
import { ODataPropertyUrl } from './odata-property-request';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export class ODataSingleUrl<T> extends ODataRequestBase {
  property<P>(name: string) {
    let prop = this.clone(ODataPropertyUrl) as ODataPropertyUrl<P>
    prop.name(name);
    return prop;
  }

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
}
