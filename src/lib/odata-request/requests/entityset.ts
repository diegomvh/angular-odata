import { HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Segments, Options, Expand, Select, Transform, EntityKey } from '../types';
import { ODataClient } from '../../client';
import { ODataSegments } from '../segments';

import { ODataCollectionRequest } from './collection';
import { ODataActionRequest } from './action';
import { ODataFunctionRequest } from './function';
import { ODataOptions } from '../options';
import { ODataEntityRequest } from './entity';

export class ODataEntitySetRequest<T> extends ODataCollectionRequest<T> {
  entity(key?: EntityKey) {
    let entity = ODataEntityRequest.factory<T>(
      this.service, 
      this.segments.clone(),
      this.options.clone()
    );
    if (key)
      entity.key(key);
    return entity;
  }

  static factory<T>(name: string, service: ODataClient, segments?: ODataSegments, options?: ODataOptions) {
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
