import { HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ODataEntitySet } from '../odata-response';
import { Utils } from '../utils/utils';
import { ODataEntitySetRequest, ODataEntityRequest } from '../odata-request';

import { ODataClient } from "../client";

export abstract class ODataEntityService<T> {
  static set: string = "";

  constructor(protected odata: ODataClient) { }

  protected abstract resolveEntityKey(entity: Partial<T>);

  public entities(): ODataEntitySetRequest<T> {
    let ctor = <typeof ODataEntityService>this.constructor;
    return this.odata.entitySet<T>(ctor.set);
  }

  public entity(entity?: number | string | Partial<T>): ODataEntityRequest<T> {
    let key = Utils.isObject(entity) ? this.resolveEntityKey(entity as Partial<T>) : entity;
    return this.entities().entity(key);
  }

  public isNew(entity: Partial<T>) {
    return !this.resolveEntityKey(entity);
  }

  // Entity Actions
  public all(skip?: number, top?: number): Observable<ODataEntitySet<T>> {
    let query = this.entities();
    if (skip)
      query.skip(skip);
    if (top)
      query.top(top);
    return query.get();
  }

  public fetch(entity: Partial<T>): Observable<T> {
    return this.entity(entity)
      .get();
  }

  public create(entity: T): Observable<T> {
    return this.entities()
      .post(entity);
  }

  public fetchOrCreate(entity: Partial<T>): Observable<T> {
    return this.fetch(entity)
      .pipe(catchError((error: HttpErrorResponse) => {
        if (error.status === 404)
          return this.create(entity as T);
        else
          return throwError(error);
      }));
  }

  public update(entity: T): Observable<T> {
    let etag = this.odata.resolveEtag<T>(entity);
    return this.entity(entity)
      .put(entity, etag);
  }

  public assign(entity: Partial<T>, options?) {
    let etag = this.odata.resolveEtag<T>(entity);
    return this.entity(entity)
      .patch(entity, etag, options);
  }

  public destroy(entity: T, options?) {
    let etag = this.odata.resolveEtag<T>(entity);
    return this.entity(entity)
      .delete(etag, options);
  }

  // Shortcuts
  public save(entity: T) {
    if (this.isNew(entity))
      return this.create(entity);
    else
      return this.update(entity);
  }

  protected navigationProperty<P>(entity: Partial<T>, name: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType: 'json',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected navigationProperty<P>(entity: Partial<T>, name: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType: 'set',
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<ODataEntitySet<P>>;

  protected navigationProperty<P>(entity: Partial<T>, name: string, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'arraybuffer'|'blob'|'json'|'text'|'set'|'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<any> {
    let query = this.entity(entity).navigationProperty<P>(name);
    return query.get(options);
  }

  protected createRef<P>(entity: Partial<T>, name: string, target: ODataEntityRequest<P>, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType: 'json',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected createRef<P>(entity: Partial<T>, name: string, target: ODataEntityRequest<P>, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType: 'set',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataEntitySet<P>>;

  protected createRef<P>(entity: Partial<T>, name: string, target: ODataEntityRequest<P>, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType: 'json'|'set',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let body = this.odata.resolveTarget<P>('body', target);
    let etag = this.odata.resolveEtag<T>(entity);
    let ref = this.entity(entity).navigationProperty<P>(name).ref();
    return (options.responseType === "set")?
      ref.post(body, options) :
      ref.put(body, etag, options);
    }

  protected deleteRef<P>(entity: Partial<T>, name: string, target: ODataEntityRequest<P>, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType: 'json',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected deleteRef<P>(entity: Partial<T>, name: string, target: ODataEntityRequest<P>, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType: 'set',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataEntitySet<P>>;

  protected deleteRef<P>(entity: Partial<T>, name: string, target: ODataEntityRequest<P>, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType: 'json'|'set',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let etag = this.odata.resolveEtag<T>(entity);
    let ref = this.entity(entity).navigationProperty<P>(name).ref();
    if (options.responseType === "set") {
      let params = this.odata.resolveTarget<P>('query', target);
      options.params = this.odata.mergeHttpParams(params, options.params);
    }
    return ref.delete(etag, options);
  }

  protected customAction<P>(entity: Partial<T>, name: string, data: any, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'json',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customAction<P>(entity: Partial<T>, name: string, data: any, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'set',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataEntitySet<P>>;

  protected customAction<P>(entity: Partial<T>, name: string, data: any, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customAction<P>(entity: Partial<T>, name: string, data: any, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'json'|'set'|'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entity(entity).action<P>(name);
    return query.post(data, options);
  }

  protected customCollectionAction<P>(name: string, data: any, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'json',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customCollectionAction<P>(name: string, data: any, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'set',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataEntitySet<P>>;

  protected customCollectionAction<P>(name: string, data: any, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customCollectionAction<P>(name: string, data: any, options: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'json'|'set'|'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entities().action<P>(name);
    return query.post(data, options);
  }

  protected customFunction<P>(entity: Partial<T>, name: string, data: any, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'json',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customFunction<P>(entity: Partial<T>, name: string, data: any, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'set',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataEntitySet<P>>;

  protected customFunction<P>(entity: Partial<T>, name: string, data: any, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customFunction<P>(entity: Partial<T>, name: string, data: any, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'json'|'set'|'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entity(entity).function<P>(name);
    query.parameters().assign(data);
    return query.get(options);
  }

  protected customCollectionFunction<P>(name: string, data: any, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'json',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customCollectionFunction<P>(name: string, data: any, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'set',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataEntitySet<P>>;

  protected customCollectionFunction<P>(name: string, data: any, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customCollectionFunction<P>(name: string, data: any, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    responseType?: 'json'|'set'|'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entities().function<P>(name);
    query.parameters().assign(data);
    return query.get(options);
  }
}
