import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, empty } from 'rxjs';
import { catchError, expand, concatMap, toArray, map } from 'rxjs/operators';

import { ODataEntitySet, ODataProperty } from '../odata-response';
import { Types } from '../utils/types';
import { ODataEntitySetRequest, ODataEntityRequest } from '../odata-request';

import { ODataClient, addEtag } from "../client";
import { EntityCollection } from '../odata-model/entity';
import { ODataSettings } from '../settings';
import { Schema } from '../schema';
import { query } from '@angular/animations';

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

  protected _schemaForField<E>(name) {
    let field = this.schema().getField(name);
    return this.settings.schemaForType(field.type) as Schema<E>;
  }

  protected schema(): Schema<T> {
    let Ctor = <typeof ODataEntityService>this.constructor;
    return this.client.schemaForType<T>(Ctor.entity) as Schema<T>;
  }

  protected resolveEntityKey(entity: Partial<T>) {
    return this.schema().resolveKey(entity);
  }

  public isNew(entity: Partial<T>) {
    return this.schema().isNew(entity);
  }

  // Build requests
  public entities(): ODataEntitySetRequest<T> {
    let Ctor = <typeof ODataEntityService>this.constructor;
    let query = this.client.entitySet<T>(Ctor.set);
    query.schema = this.schema();
    return query;
  }

  public entity(entity?: number | string | Partial<T>): ODataEntityRequest<T> {
    let key = Types.isObject(entity) ? this.resolveEntityKey(entity as Partial<T>) : entity;
    return this.entities().entity(key);
  }

  // Entity Actions
  public fetchCollection(size?: number): Observable<EntityCollection<T>> {
    let query = this.entities();
    size = size || this.settings.maxSize;
    if (size)
      query.top(size);
    return query
      .get({ withCount: true })
      .pipe(map(entityset => new EntityCollection<T>(entityset, query)));
  }

  public fetchAll(): Observable<T[]> {
    let query = this.entities();
    let fetch = (options?: { skip?: number, skiptoken?: string, top?: number }) => {
      if (options) {
        if (options.skiptoken)
          query.skiptoken(options.skiptoken);
        else if (options.skip)
          query.skip(options.skip);
        if (options.top)
          query.top(options.top);
      }
      return query.get();
    }
    return fetch()
      .pipe(
        expand((resp: ODataEntitySet<T>) => (resp.skip || resp.skiptoken) ? fetch(resp) : empty()),
        concatMap((resp: ODataEntitySet<T>) => resp.value),
        toArray());
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
    let etag = this.client.resolveEtag<T>(entity);
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
  }): Observable<EntityCollection<P>>;

  protected navigationProperty<P>(entity: Partial<T>, name: string, options: {
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
        return resp$.pipe(map(entityset => new EntityCollection<P>(entityset as any, query)));
      default:
        return resp$;
    }
  }

  protected property<P>(entity: Partial<T>, name: string, options: {
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

  protected createRef<P>(entity: Partial<T>, name: string, target: ODataEntityRequest<P>, options: {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let field = this.schema().getField(name);
    let etag = this.client.resolveEtag<T>(entity);
    let ref = this.entity(entity).navigationProperty<P>(name).ref();
    return (field.isCollection) ?
      ref.post(target, options) :
      ref.put(target, addEtag(options, etag));
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
    return ref.delete(addEtag(options, etag));
  }

  protected customAction<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customAction<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P[]>;

  protected customAction<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customAction<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity' | 'entityset' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let query = this.entity(entity).action<P>(name);
    query.schema = this.client.schemaForType<P>(options.returnType);
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

  protected customCollectionAction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customCollectionAction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<EntityCollection<P>>;

  protected customCollectionAction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customCollectionAction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity' | 'entityset' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let query = this.entities().action<P>(name);
    query.schema = this.client.schemaForType<P>(options.returnType);
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

  protected customFunction<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customFunction<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<EntityCollection<P>>;

  protected customFunction<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customFunction<P>(entity: Partial<T>, name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity' | 'entityset' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let query = this.entity(entity).function<P>(name);
    query.schema = this.client.schemaForType<P>(options.returnType);
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

  protected customCollectionFunction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customCollectionFunction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entityset',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P[]>;

  protected customCollectionFunction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P>;

  protected customCollectionFunction<P>(name: string, data: any, options: {
    returnType: string,
    headers?: HttpHeaders | { [header: string]: string | string[] },
    params?: HttpParams | { [param: string]: string | string[] },
    responseType?: 'entity' | 'entityset' | 'property',
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<any> {
    let query = this.entities().function<P>(name);
    query.schema = this.client.schemaForType<P>(options.returnType);
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
