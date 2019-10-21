import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ODataEntitySet, ODataProperty } from '../odata-response';
import { ODataEntitySetRequest, ODataEntityRequest, ODataNavigationPropertyRequest, ODataPropertyRequest, ODataActionRequest, ODataFunctionRequest } from '../odata-request';

import { ODataClient, addEtag } from "../client";
import { Collection } from '../odata-request/collection';
import { ODataSettings } from '../settings';
import { ODataRefRequest } from '../odata-request/requests/ref';

function addCount(
    options: {
      headers?: HttpHeaders | {[header: string]: string | string[]},
      params?: HttpParams | {[param: string]: string | string[]},
      reportProgress?: boolean,
      responseType?: 'entity' | 'entityset' | 'property',
      withCredentials?: boolean
    }): any {
  return {
    headers: options.headers,
    params: options.params,
    reportProgress: options.reportProgress,
    responseType: options.responseType,
    withCredentials: options.withCredentials,
    withCount: true
  };
}

@Injectable()
export class ODataEntityService<T> {
  static set: string = "";
  static entity: string = "";

  constructor(protected client: ODataClient, protected settings: ODataSettings) { }

  // Build requests
  public entities(): ODataEntitySetRequest<T> {
    let Ctor = <typeof ODataEntityService>this.constructor;
    let query = this.client.entitySet<T>(Ctor.set, Ctor.entity);
    return query;
  }

  public entity(key?: Partial<T>): ODataEntityRequest<T> {
    return this.entities()
      .entity(key);
  }

  public navigationProperty<P>(entity: Partial<T>, name: string): ODataNavigationPropertyRequest<P> {
    return this.entity(entity).navigationProperty<P>(name);
  }

  public property<P>(entity: Partial<T>, name: string): ODataPropertyRequest<P> {
    return this.entity(entity).property<P>(name);
  }

  public ref<P>(entity: Partial<T>, name: string): ODataRefRequest {
    return this.entity(entity).navigationProperty<P>(name).ref();
  }

  public action<R>(entity: Partial<T>, name: string, returnType: string): ODataActionRequest<R> {
    let schema = this.client.schemaForType<R>(returnType);
    return this.entity(entity).action<R>(name, schema);
  }

  public collectionAction<R>(name: string, returnType: string): ODataActionRequest<R> {
    let schema = this.client.schemaForType<R>(returnType);
    return this.entities().action<R>(name, schema);
  }

  public function<R>(entity: Partial<T>, name: string, params: any, returnType: string): ODataFunctionRequest<R> {
    let schema = this.client.schemaForType<R>(returnType);
    let query = this.entity(entity).function<R>(name, schema);
    query.parameters(params);
    return query;
  }

  public collectionFunction<R>(name: string, params: any, returnType: string): ODataFunctionRequest<R> {
    let schema = this.client.schemaForType<R>(returnType);
    let query = this.entities().function<R>(name, schema);
    query.parameters(params);
    return query;
  }

  // Entity Actions
  public fetchCollection(): Observable<Collection<T>> {
    return this.entities()
      .collection();
  }

  public fetchAll(): Observable<T[]> {
    return this.entities()
      .all();
  }

  public fetchOne(entity: Partial<T>): Observable<T> {
    return this.entity(entity)
      .get();
  }

  public create(entity: T): Observable<T> {
    return this.entities()
      .post(entity);
  }

  public update(entity: T): Observable<T> {
    return this.entity(entity)
      .put(entity);
  }

  public assign(entity: Partial<T>) {
    return this.entity(entity)
      .patch(entity);
  }

  public destroy(entity: T) {
    let etag = this.client.resolveEtag(entity);
    return this.entity(entity)
      .delete({etag});
  }

  // Shortcuts
  public fetchOrCreate(entity: Partial<T>): Observable<T> {
    return this.fetchOne(entity)
      .pipe(catchError((error: HttpErrorResponse) => {
        if (error.status === 404)
          return this.create(entity as T);
        else
          return throwError(error);
      }));
  }

  public save(entity: T) {
    let query = this.entity(entity);
    if (query.isNew())
      return this.create(entity);
    else
      return this.update(entity);
  }

  protected _navigationProperty<P>(entity: Partial<T>, name: string, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected _navigationProperty<P>(entity: Partial<T>, name: string, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean,
    withCount?: boolean
  }): Observable<Collection<P>>;

  protected _navigationProperty<P>(entity: Partial<T>, name: string, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity' | 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let query = this.entity(entity).navigationProperty<P>(name);
    let resp$ = query
      .get(addCount(options));
    switch (options.responseType) {
      case 'entityset':
        return resp$.pipe(map(entityset => new Collection<P>(entityset as any, query)));
      default:
        return resp$;
    }
  }

  protected _property<P>(entity: Partial<T>, name: string, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entity(entity).property<P>(name);
    return query
      .get(options)
      .pipe(map(property => property.value));
  }

  protected _createRef<P>(entity: Partial<T>, name: string, target: ODataEntityRequest<P>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let etag = this.client.resolveEtag(entity);
    let nav = this.entity(entity).navigationProperty<P>(name);
    let ref = nav.ref();
    return ref.post(target, options);
    /*
    return (nav.isCollection()) ?
      ref.post(target, options) :
      ref.put(target, addEtag(options, etag));
    */
  }

  protected _deleteRef<P>(entity: Partial<T>, name: string, options: {
    target?: ODataEntityRequest<P>,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let etag = this.client.resolveEtag(entity);
    let ref = this.entity(entity).navigationProperty<P>(name).ref();
    return ref.delete(addEtag(options, etag));
  }

  protected _action<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected _action<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P[]>;

  protected _action<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected _action<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity' | 'entityset' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let schema = this.client.schemaForType<P>(options.returnType);
    let query = this.entity(entity).action<P>(name, schema);
    let resp$ = query.post(data, addCount(options));
    switch (options.responseType) {
      case 'entityset':
        return resp$.pipe(map(entityset => (<any>entityset as ODataEntitySet<P>).value ));
      case 'property':
        return resp$.pipe( map(property => (<any>property as ODataProperty<P>).value ));
      default:
        return resp$;
    }
  }

  protected _collectionAction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected _collectionAction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<Collection<P>>;

  protected _collectionAction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected _collectionAction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity' | 'entityset' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let schema = this.client.schemaForType<P>(options.returnType);
    let query = this.entities().action<P>(name, schema);
    let resp$ = query.post(data, options as any);
    switch (options.responseType) {
      case 'entityset':
        return resp$.pipe(map(entityset => (<any>entityset as ODataEntitySet<P>).value ));
      case 'property':
        return resp$.pipe(map(property => (<any>property as ODataProperty<P>).value ));
      default:
        return resp$;
    }
  }

  protected _function<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected _function<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<Collection<P>>;

  protected _function<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected _function<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity' | 'entityset' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let schema = this.client.schemaForType<P>(options.returnType);
    let query = this.entity(entity).function<P>(name, schema);
    query.parameters(data);
    let resp$ = query.get(options as any);
    switch (options.responseType) {
      case 'entityset':
        return resp$.pipe(map(entityset => (<any>entityset as ODataEntitySet<P>).value ));
      case 'property':
        return resp$.pipe(map(property => (<any>property as ODataProperty<P>).value ));
      default:
        return resp$;
    }
  }

  protected _collectionFunction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected _collectionFunction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P[]>;

  protected _collectionFunction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected _collectionFunction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity' | 'entityset' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let schema = this.client.schemaForType<P>(options.returnType);
    let query = this.entities().function<P>(name, schema);
    query.parameters(data);
    let resp$ = query.get(options as any);
    switch (options.responseType) {
      case 'entityset':
        return resp$.pipe(
          map(entityset => (<any>entityset as ODataEntitySet<P>).value ));
      case 'property':
        return resp$.pipe(map(property => (<any>property as ODataProperty<P>).value ));
      default:
        return resp$;
    }
  }
}
