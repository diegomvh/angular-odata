import { HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PlainObject, Segments, Options, Expand, Select, Transform } from '../types';
import { ODataService } from '../../odata-service/service';
import { ODataSegments } from '../segments';

import { ODataCollectionRequest } from './collection';
import { ODataActionRequest } from './action';
import { ODataFunctionRequest } from './function';
import { ODataOptions } from '../options';

export class ODataEntitySetRequest<T> extends ODataCollectionRequest<T> {

  static factory<T>(name: string, service: ODataService, segments?: ODataSegments, options?: ODataOptions) {
    segments = segments || new ODataSegments();
    options = options || new ODataOptions();

    segments.segment(Segments.entitySet, name);
    options.keep(Options.filter, Options.orderBy, Options.skip, Options.transform, Options.top, Options.search, Options.format);
    return new ODataEntitySetRequest<T>(service, segments, options);
  }

  action<A>(name: string) {
    return ODataActionRequest.factory<A>(
      name, 
      this.service, 
      this.segments.clone(),
      this.options.clone()
    );
  }

  function<F>(name: string) {
    return ODataFunctionRequest.factory<F>(
      name, 
      this.service, 
      this.segments.clone(),
      this.options.clone()
    );
  }

  select(opts?: Select) {
    return this.options.option<Select>(Options.select, opts);
  }

  expand(opts?: Expand) {
    return this.options.option<Expand>(Options.expand, opts);
  }

  transform(opts?: Transform) {
    return this.options.option<Transform>(Options.transform, opts);
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
