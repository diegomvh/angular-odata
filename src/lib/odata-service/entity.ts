import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, empty } from 'rxjs';
import { catchError, expand, concatMap, toArray, map } from 'rxjs/operators';

import { ODataEntitySet, ODataProperty } from '../odata-response';
import { Types } from '../utils/types';
import { ODataEntitySetRequest, ODataEntityRequest } from '../odata-request';

import { ODataClient } from "../client";
import { EntitySchema } from '../odata-model/entity';

@Injectable()
export class ODataEntityService<T> {
  static set: string = "";
  schema: EntitySchema<T>;

  constructor(protected client: ODataClient) {}

  protected resolveEntityKey(entity: Partial<T>) {
    return this.schema.resolveKey(entity);
  }

  public entities(): ODataEntitySetRequest<T> {
    let Ctor = <typeof ODataEntityService>this.constructor;
    return this.client.entitySet<T>(Ctor.set);
  }

  public entity(entity?: number | string | Partial<T>): ODataEntityRequest<T> {
    let key = Types.isObject(entity) ? this.resolveEntityKey(entity as Partial<T>) : entity;
    return this.entities().entity(key);
  }

  public isNew(entity: Partial<T>) {
    return this.schema.isNew(entity);
  }

  // Entity Actions
  public fetchPage(options: {skip?: number, skiptoken?: string, top?: number, withCount?: boolean} = {}): Observable<ODataEntitySet<T>> {
    let query = this.entities();
    if (options.skiptoken)
      query.skiptoken(options.skiptoken);
    else if (options.skip)
      query.skip(options.skip);
    if (options.top)
      query.top(options.top);
    return query
      .get({withCount: options.withCount});
  }

  public fetchAll(): Observable<T[]> {
    return this.fetchPage()
      .pipe(
        expand((resp: ODataEntitySet<T>) => (resp.skip || resp.skiptoken) ? this.fetchPage(resp) : empty()),
        concatMap((resp: ODataEntitySet<T>) => resp.entities),
        toArray());
  }

  public fetchOne(entity: Partial<T>): Observable<T> {
    return this.entity(entity)
      .get();
  }

  public create(entity: T): Observable<T> {
    return this.entities()
      .post(this.schema.serialize(entity));
  }

  public fetchOrCreate(entity: Partial<T>): Observable<T> {
    return this.fetchOne(entity)
      .pipe(catchError((error: HttpErrorResponse) => {
        if (error.status === 404)
          return this.create(entity as T);
        else
          return throwError(error);
      }));
  }

  public update(entity: T): Observable<T> {
    let etag = this.client.resolveEtag<T>(entity);
    return this.entity(entity)
      .put(entity, etag);
  }

  public assign(entity: Partial<T>, options?) {
    let etag = this.client.resolveEtag<T>(entity);
    return this.entity(entity)
      .patch(entity, etag, options);
  }

  public destroy(entity: T, options?) {
    let etag = this.client.resolveEtag<T>(entity);
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
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected navigationProperty<P>(entity: Partial<T>, name: string, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<ODataEntitySet<P>>;

  protected navigationProperty<P>(entity: Partial<T>, name: string, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'text' | 'entity' | 'entityset' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<any> {
    let query = this.entity(entity).navigationProperty<P>(name);
    return query.get(options);
  }

  protected createRef<P>(entity: Partial<T>, name: string, target: ODataEntityRequest<P>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected createRef<P>(entity: Partial<T>, name: string, target: ODataEntityRequest<P>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataEntitySet<P>>;

  protected createRef<P>(entity: Partial<T>, name: string, target: ODataEntityRequest<P>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType: 'entity' | 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let etag = this.client.resolveEtag<T>(entity);
    let ref = this.entity(entity).navigationProperty<P>(name).ref();
    return (options.responseType === "entityset") ?
      ref.post(target, options) :
      ref.put(target, etag, options);
  }

  protected deleteRef<P>(entity: Partial<T>, name: string, options: {
    target?: ODataEntityRequest<P>, 
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let etag = this.client.resolveEtag<T>(entity);
    let ref = this.entity(entity).navigationProperty<P>(name).ref();
    return ref.delete(etag, options);
  }

  protected customAction<P>(entity: Partial<T>, name: string, data: any, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customAction<P>(entity: Partial<T>, name: string, data: any, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataEntitySet<P>>;

  protected customAction<P>(entity: Partial<T>, name: string, data: any, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataProperty<P>>;

  protected customAction<P>(entity: Partial<T>, name: string, data: any, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'text' | 'entity' | 'entityset' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entity(entity).action<P>(name);
    return query.post(data, options);
  }

  protected customCollectionAction<P>(name: string, data: any, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customCollectionAction<P>(name: string, data: any, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataEntitySet<P>>;

  protected customCollectionAction<P>(name: string, data: any, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataProperty<P>>;

  protected customCollectionAction<P>(name: string, data: any, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'text' | 'entity' | 'entityset' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entities().action<P>(name);
    return query.post(data, options);
  }

  protected customFunction<P>(entity: Partial<T>, name: string, data: any, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customFunction<P>(entity: Partial<T>, name: string, data: any, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataEntitySet<P>>;

  protected customFunction<P>(entity: Partial<T>, name: string, data: any, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataProperty<P>>;

  protected customFunction<P>(entity: Partial<T>, name: string, data: any, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'text' | 'entity' | 'entityset' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entity(entity).function<P>(name);
    query.parameters(data);
    return query.get(options);
  }

  protected customCollectionFunction<P>(name: string, data: any, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customCollectionFunction<P>(name: string, data: any, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataEntitySet<P>>;

  protected customCollectionFunction<P>(name: string, data: any, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataProperty<P>>;

  protected customCollectionFunction<P>(name: string, data: any, options?: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'text' | 'entity' | 'entityset' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entities().function<P>(name);
    query.parameters(data);
    return query.get(options);
  }
}
