import { HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';

import { ODataUrl, ODataEntitySetUrl, ODataEntityUrl } from "../odata-query/odata-query";
import { ODataService } from "./odata.service";
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ODataSet } from '../odata-response/odata-set';
import { Utils } from '../utils/utils';

export abstract class ODataEntityService<T> extends ODataService {
  static set: string = "";

  protected abstract resolveEntityKey(entity: Partial<T>);

  // Queries
  public entitySetQuery(): ODataEntitySetUrl<T> {
    let ctor = <typeof ODataEntityService>this.constructor;
    let query = this.query();
    return query.entitySet<T>(ctor.set);
  }

  public entityQuery(entity: number | string | Partial<T>): ODataEntityUrl<T> {
    let key = Utils.isObject(entity) ? this.resolveEntityKey(entity as Partial<T>) : entity;
    let query = this.entitySetQuery()
    return query.entityKey(key);
  }

  public isNew(entity: Partial<T>) {
    return !this.resolveEntityKey(entity);
  }

  // Entity Actions
  public all(): Observable<ODataSet<T>> {
    return this.entitySetQuery().get();
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
    let query = this.entityQuery(entity).navigationProperty(name).single();
    return query.get(options);
  }

  protected navigationPropertySet<P>(entity: Partial<T>, name: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataSet<P>> {
    let query = this.entityQuery(entity).navigationProperty<P>(name).collection();
    return query.get(options);
  }

  protected property<P>(entity: Partial<T>, name: string, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entityQuery(entity).property<P>(name);
    return query.get(options);
  }

  protected createRef<P>(entity: Partial<T>, name: string, target: ODataUrl, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }) {
    let refurl = this.createEndpointUrl(target);
    let etag = entity[ODataService.ODATA_ETAG];
    let query = this.entityQuery(entity).navigationProperty<P>(name).ref();
    return query.put({ [ODataService.ODATA_ID]: refurl }, etag);
  }

  protected createCollectionRef<P>(entity: Partial<T>, name: string, target: ODataUrl, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }) {
    let refurl = this.createEndpointUrl(target);
    let query = this.entityQuery(entity).navigationProperty<P>(name).ref();
    return query.post({ [ODataService.ODATA_ID]: refurl });
  }

  protected deleteRef<P>(entity: Partial<T>, name: string, target: ODataUrl, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }) {
    let etag = entity[ODataService.ODATA_ETAG];
    let query = this.entityQuery(entity).navigationProperty<P>(name).ref();
    return query.delete(etag);
  }

  protected deleteCollectionRef<P>(entity: Partial<T>, name: string, target: ODataUrl, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }) {
    let etag = entity[ODataService.ODATA_ETAG];
    let refurl = this.createEndpointUrl(target);
    let query = this.entityQuery(entity).navigationProperty<P>(name).ref();
    return query.delete(etag, {params: {"$id": refurl}});
  }

  // Function and actions
  protected customAction<P>(entity: Partial<T>, name: string, postdata: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entityQuery(entity).action(name);
    return query.post<P>(postdata, options);
  }

  protected customActionSet<P>(entity: Partial<T>, name: string, postdata: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataSet<P>> {
    let query = this.entityQuery(entity).action(name);
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
    let query = this.entityQuery(entity).action(name);
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
    let query = this.entitySetQuery().action(name);
    return query.post<P>(postdata, options);
  }

  protected customCollectionActionSet<P>(name: string, postdata: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataSet<P>> {
    let query = this.entitySetQuery().action(name);
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
    let query = this.entitySetQuery().action(name);
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
    let query = this.entityQuery(entity).function(name)
    query.parameters().assign(parameters);
    return query.get<P>(options);
  }

  protected customFunctionSet<P>(entity: Partial<T>, name: string, parameters: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataSet<P>> {
    let query = this.entityQuery(entity).function(name)
    query.parameters().assign(parameters);
    return query.getSet<P>(options);
  }

  protected customFunctionProperty<P>(entity: Partial<T>, name: string, parameters: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entityQuery(entity).function(name)
    query.parameters().assign(parameters);
    return query.getProperty<P>(options);
  }

  protected customCollectionFunction<P>(name: string, parameters: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entitySetQuery().function(name);
    query.parameters().assign(parameters);
    return query.get<P>(options);
  }

  protected customCollectionFunctionSet<P>(name: string, parameters: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<ODataSet<P>> {
    let query = this.entitySetQuery().function(name);
    query.parameters().assign(parameters);
    return query.getSet<P>(options);
  }

  protected customCollectionFunctionProperty<P>(name: string, parameters: any = {}, options?: {
    headers?: HttpHeaders | {[header: string]: string | string[]},
    params?: HttpParams|{[param: string]: string | string[]},
    reportProgress?: boolean,
    withCredentials?: boolean
  }): Observable<P> {
    let query = this.entitySetQuery().function(name);
    query.parameters().assign(parameters);
    return query.getProperty<P>(options);
  }
}
