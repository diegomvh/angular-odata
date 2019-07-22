import { HttpClient } from '@angular/common/http';

import { ODataResponse } from "../odata-response/odata-response";
import { ODataQueryBuilder } from "../odata-query/odata-query-builder";
import { ODataQuery } from "../odata-query/odata-query";
import { ODataService } from "./odata.service";
import { ODataQueryBase } from '../odata-query/odata-query-base';
import { ODataContext } from '../odata-context';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { EntitySet } from '../odata-response/entity-collection';
import { Utils } from '../utils/utils';

export abstract class ODataEntityService<T> extends ODataService {
  public static readonly ODATA_ETAG = '@odata.etag';
  public static readonly ODATA_ID = '@odata.id';

  constructor(protected http: HttpClient, protected context: ODataContext, protected set: string) {
    super(http, context);
  }

  protected abstract resolveEntityKey(entity: Partial<T>);

  // Queries
  public entitySetQuery(): ODataQuery {
    return this.query()
      .entitySet(this.set);
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

  public collectionQueryBuilder(): ODataQueryBuilder {
    let builder = this.queryBuilder();
    builder.entitySet(this.set);
    return builder;
  }

  public entityQueryBuilder(entity: Partial<T>): ODataQueryBuilder {
    let builder = this.collectionQueryBuilder();
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
  public all(options?): Observable<EntitySet<T>> {
    return this.entitySetQuery().get(options)
      .pipe(map(resp => resp.toEntitySet<T>()));
  }

  public fetch(entity: Partial<T>, options?): Observable<T> {
    return this.entityQuery(entity)
      .get(options)
      .pipe(map(resp => resp.toEntity<T>()));
  }

  public create(entity: T, options?): Observable<T> {
    return this.entitySetQuery()
      .post(entity, options)
      .pipe(map(resp => resp.toEntity<T>()));
  }

  public readOrCreate(entity: Partial<T>, options?): Observable<T> {
    return this.fetch(entity, options)
      .pipe(catchError(error => {
        if (error.code === 404)
          return this.create(entity as T, options);
        else
          return throwError(error);
      }));
  }

  public update(entity: T, options?): Observable<T> {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    return this.entityQuery(entity)
      .put(entity, etag, options)
      .pipe(map(resp => resp.toEntity<T>()));
  }

  public assign(entity: Partial<T>, options?) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    return this.entityQuery(entity)
      .patch(entity, etag, options);
  }

  public destroy(entity: T, options?) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    return this.entityQuery(entity)
      .delete(etag, options);
  }

  // Shortcuts
  public save(entity: T, options?) {
    if (this.isNew(entity))
      return this.create(entity, options);
    else
      return this.update(entity, options);
  }

  protected navigationProperty<M>(entity: Partial<T>, name, options?): Observable<EntitySet<M>> {
    return this.navigationPropertyQuery(entity, name)
      .get(options)
      .pipe(
        map(resp => resp.toEntitySet<M>())
      );
  }

  protected property<P>(entity: Partial<T>, name: string, options?): Observable<P> {
    return this.propertyQuery(entity, name)
      .get(options)
      .pipe(
        map(resp => resp.toPropertyValue<P>())
      );
  }

  protected createRef(entity: Partial<T>, name: string, target: ODataQueryBase, options?) {
    let refurl = this.context.createEndpointUrl(target);
    let etag = entity[ODataEntityService.ODATA_ETAG];
    return this.refQuery(entity, name)
      .put({ [ODataEntityService.ODATA_ID]: refurl }, etag, options);
  }

  protected createCollectionRef(entity: Partial<T>, name: string, target: ODataQueryBase, options?) {
    let refurl = this.context.createEndpointUrl(target);
    return this.refQuery(entity, name)
      .post({ [ODataEntityService.ODATA_ID]: refurl }, options);
  }

  protected deleteRef(entity: Partial<T>, name: string, target: ODataQueryBase, options?) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    return this.refQuery(entity, name)
      .delete(etag, options);
  }

  protected deleteCollectionRef(entity: Partial<T>, name: string, target: ODataQueryBase, options?) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    let refurl = this.context.createEndpointUrl(target);
    options = this.context.assignOptions(options || {}, { params: { "$id": refurl } });
    return this.refQuery(entity, name)
      .delete(etag, options);
  }

  // Function and actions
  protected customAction(entity: Partial<T>, name: string, postdata: any = {}, options?): Observable<ODataResponse> {
    let builder = this.entityQueryBuilder(entity);
    builder.action(name);
    return builder.post(postdata, options);
  }

  protected customCollectionAction(name: string, postdata: any = {}, options?): Observable<ODataResponse> {
    let builder = this.collectionQueryBuilder();
    builder.action(name);
    return builder.post(postdata, options);
  }

  protected customFunction(entity: Partial<T>, name: string, parameters: any = {}, options?): Observable<ODataResponse> {
    let builder = this.entityQueryBuilder(entity);
    builder.function(name).assign(parameters);
    return builder.get(options);
  }

  protected customCollectionFunction(name: string, parameters: any = {}, opcions?): Observable<ODataResponse> {
    let builder = this.collectionQueryBuilder();
    builder.function(name).assign(parameters);
    return builder.get(opcions);
  }
}
