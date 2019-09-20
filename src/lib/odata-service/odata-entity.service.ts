import { HttpErrorResponse } from '@angular/common/http';

import { ODataQueryBuilder } from "../odata-query/odata-query-builder";
import { ODataQuery } from "../odata-query/odata-query";
import { ODataService } from "./odata.service";
import { ODataQueryBase } from '../odata-query/odata-query-base';
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
    return this.query()
      .entitySet(ctor.set);
  }

  public entityQuery(entity: number | string | Partial<T>): ODataQuery {
    let key = Utils.isObject(entity) ? this.resolveEntityKey(entity as Partial<T>) : entity;
    return this.entitySetQuery()
      .entityKey(key);
  }

  public navigationPropertyQuery(entity: Partial<T>, name): ODataQuery {
    return this.entityQuery(entity)
      .navigationProperty(name);
  }

  public propertyQuery(entity: Partial<T>, name): ODataQuery {
    return this.entityQuery(entity)
      .property(name);
  }

  public refQuery(entity: Partial<T>, name): ODataQuery {
    return this.entityQuery(entity)
      .navigationProperty(name)
      .ref();
  }

  public entitySetQueryBuilder(): ODataQueryBuilder {
    let ctor = <typeof ODataEntityService>this.constructor;
    let builder = this.queryBuilder();
    builder.entitySet(ctor.set);
    return builder;
  }

  public entityQueryBuilder(entity: Partial<T>): ODataQueryBuilder {
    let builder = this.entitySetQueryBuilder();
    builder.entityKey(entity);
    return builder;
  }

  public navigationPropertyQueryBuilder(entity: Partial<T>, name): ODataQueryBuilder {
    let builder = this.entityQueryBuilder(entity);
    builder.navigationProperty(name);
    return builder;
  }

  public isNew(entity: Partial<T>) {
    return !this.resolveEntityKey(entity);
  }

  // Entity Actions
  public all(): Observable<ODataSet<T>> {
    return this.entitySetQuery().get<T>({responseType: 'set'});
  }

  public fetch(entity: Partial<T>): Observable<T> {
    return this.entityQuery(entity)
      .get({responseType: 'json'});
  }

  public create(entity: T): Observable<T> {
    return this.entitySetQuery()
      .post<T>(entity, {responseType: 'json'});
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
      .put(entity, etag, {responseType: 'json'});
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

  protected navigationProperty<P>(entity: Partial<T>, name): Observable<P> {
    return this.navigationPropertyQuery(entity, name)
      .get<P>({responseType: 'json'});
  }

  protected navigationPropertySet<P>(entity: Partial<T>, name): Observable<ODataSet<P>> {
    return this.navigationPropertyQuery(entity, name)
      .get<P>({responseType: 'set'});
  }

  protected property<P>(entity: Partial<T>, name: string): Observable<P> {
    return this.propertyQuery(entity, name)
      .get({responseType: 'property'});
  }

  protected createRef(entity: Partial<T>, name: string, target: ODataQueryBase) {
    let refurl = this.createEndpointUrl(target);
    let etag = entity[ODataService.ODATA_ETAG];
    return this.refQuery(entity, name)
      .put({ [ODataService.ODATA_ID]: refurl }, etag);
  }

  protected createCollectionRef(entity: Partial<T>, name: string, target: ODataQueryBase) {
    let refurl = this.createEndpointUrl(target);
    return this.refQuery(entity, name)
      .post({ [ODataService.ODATA_ID]: refurl });
  }

  protected deleteRef(entity: Partial<T>, name: string, target: ODataQueryBase) {
    let etag = entity[ODataService.ODATA_ETAG];
    return this.refQuery(entity, name)
      .delete(etag);
  }

  protected deleteCollectionRef(entity: Partial<T>, name: string, target: ODataQueryBase) {
    let etag = entity[ODataService.ODATA_ETAG];
    let refurl = this.createEndpointUrl(target);
    return this.refQuery(entity, name)
      .delete(etag, {params: {"$id": refurl}});
  }

  // Function and actions
  protected customAction<P>(entity: Partial<T>, name: string, postdata: any = {}): Observable<P> {
    let builder = this.entityQueryBuilder(entity);
    builder.action(name);
    return builder.post<P>(postdata, {responseType: 'json'});
  }

  protected customActionSet<P>(entity: Partial<T>, name: string, postdata: any = {}): Observable<ODataSet<P>> {
    let builder = this.entityQueryBuilder(entity);
    builder.action(name);
    return builder.post<P>(postdata, {responseType: 'set'});
  }

  protected customActionProperty<P>(entity: Partial<T>, name: string, postdata: any = {}): Observable<P> {
    let builder = this.entityQueryBuilder(entity);
    builder.action(name);
    return builder.post<P>(postdata, {responseType: 'property'});
  }

  protected customCollectionAction<P>(name: string, postdata: any = {}): Observable<P> {
    let builder = this.entitySetQueryBuilder();
    builder.action(name);
    return builder.post<P>(postdata, {responseType: 'json'});
  }

  protected customCollectionActionSet<P>(name: string, postdata: any = {}): Observable<ODataSet<P>> {
    let builder = this.entitySetQueryBuilder();
    builder.action(name);
    return builder.post<P>(postdata, {responseType: 'set'});
  }

  protected customCollectionActionProperty<P>(name: string, postdata: any = {}): Observable<P> {
    let builder = this.entitySetQueryBuilder();
    builder.action(name);
    return builder.post<P>(postdata, {responseType: 'property'});
  }

  protected customFunction<P>(entity: Partial<T>, name: string, parameters: any = {}): Observable<P> {
    let builder = this.entityQueryBuilder(entity);
    builder.function(name).options().assign(parameters);
    return builder.get<P>({responseType: 'json'});
  }

  protected customFunctionSet<P>(entity: Partial<T>, name: string, parameters: any = {}): Observable<ODataSet<P>> {
    let builder = this.entityQueryBuilder(entity);
    builder.function(name).options().assign(parameters);
    return builder.get<P>({responseType: 'set'});
  }

  protected customFunctionProperty<P>(entity: Partial<T>, name: string, parameters: any = {}): Observable<P> {
    let builder = this.entityQueryBuilder(entity);
    builder.function(name).options().assign(parameters);
    return builder.get<P>({responseType: 'property'});
  }

  protected customCollectionFunction<P>(name: string, parameters: any = {}): Observable<P> {
    let builder = this.entitySetQueryBuilder();
    builder.function(name).options().assign(parameters);
    return builder.get<P>({responseType: 'json'});
  }

  protected customCollectionFunctionSet<P>(name: string, parameters: any = {}): Observable<ODataSet<P>> {
    let builder = this.entitySetQueryBuilder();
    builder.function(name).options().assign(parameters);
    return builder.get<P>({responseType: 'set'});
  }

  protected customCollectionFunctionProperty<P>(name: string, parameters: any = {}): Observable<P> {
    let builder = this.entitySetQueryBuilder();
    builder.function(name).options().assign(parameters);
    return builder.get<P>({responseType: 'property'});
  }
}
