import { ODataCollectionUrl } from './odata-collection-request';
import { ODataActionUrl } from './odata-action-request';
import { ODataFunctionUrl } from './odata-function-request';
import { Observable } from 'rxjs';
import { HttpParams, HttpHeaders } from '@angular/common/http';

export class ODataEntitySetUrl<T> extends ODataCollectionUrl<T> {
  public static readonly ENTITY_SET = 'entitySet';

  name(name: string) {
    return this.wrapSegment(ODataEntitySetUrl.ENTITY_SET, name);
  }

  action<T>(name: string) {
    let action = this.clone(ODataActionUrl) as ODataActionUrl<T>;
    action.name(name);
    return action;
  }

  function<T>(name: string) {
    let func = this.clone(ODataFunctionUrl) as ODataFunctionUrl<T>;
    func.name(name);
    return func;
  }

  post(body: T, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<T> {
    return super.post(body, {
      headers: options && options.headers,
      observe: 'body',
      params: options && options.params,
      responseType: 'json',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    });
  }
}
