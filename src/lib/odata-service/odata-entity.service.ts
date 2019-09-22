import { HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';

import { ODataQuery } from "../odata-query/odata-query";
import { ODataService } from "./odata.service";
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ODataSet } from '../odata-response/odata-set';
import { Utils } from '../utils/utils';

export abstract class ODataEntityService<T> extends ODataService {
  static set: string = "";

  protected abstract resolveEntityKey(entity: Partial<T>);

  // Queries
  public entitySetQuery(): ODataQuery {
    let ctor = <typeof ODataEntityService>this.constructor;
    let query = this.query();
    query.entitySet(ctor.set);
    return query;
  }

  public entityQuery(entity: number | string | Partial<T>): ODataQuery {
    let key = Utils.isObject(entity) ? this.resolveEntityKey(entity as Partial<T>) : entity;
    let query = this.entitySetQuery()
    query.entityKey(key);
    return query;
  }

  public navigationPropertyQuery(entity: Partial<T>, name: string): ODataQuery {
    let query = this.entityQuery(entity);
    query.navigationProperty(name);
    return query;
  }

  public propertyQuery(entity: Partial<T>, name: string): ODataQuery {
    let query = this.entityQuery(entity);
    query.property(name);
    return query;
  }

  public refQuery(entity: Partial<T>, name: string): ODataQuery {
    let query = this.entityQuery(entity);
    query.navigationProperty(name);
    query.ref();
    return query;
  }

  public isNew(entity: Partial<T>) {
    return !this.resolveEntityKey(entity);
  }

  // Entity Actions
  public all(): Observable<ODataSet<T>> {
    return this.entitySetQuery().getSet<T>();
  }

  public fetch(entity: Partial<T>): Observable<T> {
    return this.entityQuery(entity)
      .get<T>();
  }

  public create(entity: T): Observable<T> {
    return this.entitySetQuery()
      .post<T>(entity);
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
    let etag = entity[ODataService.ODATA_ETAG];
    return this.entityQuery(entity)
      .put<T>(entity, etag);
  }

  public assign(entity: Partial<T>, options?) {
    let etag = entity[ODataService.ODATA_ETAG];
    return this.entityQuery(entity)
      .patch(entity, etag, options);
  }

  public destroy(entity: T, options?) {
    let etag = entity[ODataService.ODATA_ETAG];
    return this.entityQuery(entity)
      .delete(etag, options);
  }

  // Shortcuts
  public save(entity: T) {
    if (this.isNew(entity))
      return this.create(entity);
    else
      return this.update(entity);
  }

  protected navigationProperty<P>(entity: Partial<T>, name: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    return this.navigationPropertyQuery(entity, name)
      .get<P>(options);
  }

  protected navigationPropertySet<P>(entity: Partial<T>, name: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataSet<P>> {
    return this.navigationPropertyQuery(entity, name)
      .getSet<P>(options);
  }

  protected property<P>(entity: Partial<T>, name: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    return this.propertyQuery(entity, name)
      .getProperty<P>(options);
  }

  protected createRef(entity: Partial<T>, name: string, target: ODataQuery, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }) {
    let refurl = this.createEndpointUrl(target);
    let etag = entity[ODataService.ODATA_ETAG];
    return this.refQuery(entity, name)
      .put({ [ODataService.ODATA_ID]: refurl }, etag);
  }

  protected createCollectionRef(entity: Partial<T>, name: string, target: ODataQuery, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }) {
    let refurl = this.createEndpointUrl(target);
    return this.refQuery(entity, name)
      .post({ [ODataService.ODATA_ID]: refurl });
  }

  protected deleteRef(entity: Partial<T>, name: string, target: ODataQuery, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }) {
    let etag = entity[ODataService.ODATA_ETAG];
    return this.refQuery(entity, name)
      .delete(etag);
  }

  protected deleteCollectionRef(entity: Partial<T>, name: string, target: ODataQuery, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }) {
    let etag = entity[ODataService.ODATA_ETAG];
    let refurl = this.createEndpointUrl(target);
    return this.refQuery(entity, name)
      .delete(etag, {params: {"$id": refurl}});
  }

  // Function and actions
  protected customAction<P>(entity: Partial<T>, name: string, postdata: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entityQuery(entity);
    query.action(name);
    return query.post<P>(postdata, options);
  }

  protected customActionSet<P>(entity: Partial<T>, name: string, postdata: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataSet<P>> {
    let query = this.entityQuery(entity);
    query.action(name);
    return query.post<P>(postdata, {
      observe: 'body',
      headers: options.headers,
      params: options.params,
      responseType: 'set',
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
  }

  protected customActionProperty<P>(entity: Partial<T>, name: string, postdata: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entityQuery(entity);
    query.action(name);
    return query.post<P>(postdata, {
      observe: 'body',
      headers: options.headers,
      params: options.params,
      responseType: 'property',
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
  }

  protected customCollectionAction<P>(name: string, postdata: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entitySetQuery();
    query.action(name);
    return query.post<P>(postdata, options);
  }

  protected customCollectionActionSet<P>(name: string, postdata: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataSet<P>> {
    let query = this.entitySetQuery();
    query.action(name);
    return query.post<P>(postdata, {
      observe: 'body',
      headers: options.headers,
      params: options.params,
      responseType: 'set',
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
  }

  protected customCollectionActionProperty<P>(name: string, postdata: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entitySetQuery();
    query.action(name);
    return query.post<P>(postdata, {
      observe: 'body',
      headers: options.headers,
      params: options.params,
      responseType: 'property',
      reportProgress: options.reportProgress,
      withCredentials: options.withCredentials
    });
  }

  protected customFunction<P>(entity: Partial<T>, name: string, parameters: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entityQuery(entity);
    query.function(name).options().assign(parameters);
    return query.get<P>(options);
  }

  protected customFunctionSet<P>(entity: Partial<T>, name: string, parameters: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataSet<P>> {
    let query = this.entityQuery(entity);
    query.function(name).options().assign(parameters);
    return query.getSet<P>(options);
  }

  protected customFunctionProperty<P>(entity: Partial<T>, name: string, parameters: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entityQuery(entity);
    query.function(name).options().assign(parameters);
    return query.getProperty<P>(options);
  }

  protected customCollectionFunction<P>(name: string, parameters: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entitySetQuery();
    query.function(name).options().assign(parameters);
    return query.get<P>(options);
  }

  protected customCollectionFunctionSet<P>(name: string, parameters: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataSet<P>> {
    let query = this.entitySetQuery();
    query.function(name).options().assign(parameters);
    return query.getSet<P>(options);
  }

  protected customCollectionFunctionProperty<P>(name: string, parameters: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entitySetQuery();
    query.function(name).options().assign(parameters);
    return query.getProperty<P>(options);
  }
}
