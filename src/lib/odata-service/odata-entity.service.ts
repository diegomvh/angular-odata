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

export abstract class ODataEntityService<T> extends ODataService {
  public static readonly ODATA_ETAG = '@odata.etag';
  public static readonly ODATA_ID = '@odata.id';
  
  constructor(protected http: HttpClient, protected context: ODataContext, protected set: string) {
    super(http, context);
  }

  public collectionQuery(): ODataQuery {
    return this.query()
      .entitySet(this.set);
  }

  public entityQuery(key): ODataQuery {
    return this.collectionQuery()
      .entityKey(key);
  }

  public collectionQueryBuilder(): ODataQueryBuilder {
    let builder = this.queryBuilder();
    builder.entitySet(this.set);
    return builder;
  }

  public entityQueryBuilder(key): ODataQueryBuilder {
    let builder = this.collectionQueryBuilder();
    builder.entityKey(key);
    return builder;
  }

  protected abstract resolveEntityKey(entity: Partial<T>);

  public isNew(entity: Partial<T>) {
    return !this.resolveEntityKey(entity);
  }

  // Entity Actions
  public all(options?): Observable<EntitySet<T>> {
    return this.collectionQuery().get(options)
      .pipe(map(resp => resp.toEntitySet<T>()));
  }

  public fetch(entity: Partial<T>, options?): Observable<T> {
    let key = typeof(entity) === "object" ? this.resolveEntityKey(entity) : entity;
    return this.entityQuery(key).get(options)
      .pipe(map(resp => resp.toEntity<T>()));
  }

  public create(entity: T, options?): Observable<T> {
    return this.collectionQuery()
      .post(entity, options)
      .pipe(map(resp => resp.toEntity<T>()));
  }

  public readOrCreate(entity: T, options?): Observable<T> {
    return this.fetch(entity, options)
      .pipe(catchError(error => {
        if (error.code === 404)
          return this.create(entity, options);
        else
          return throwError(error);
      }));
  }

  public update(entity: T, options?): Observable<T> {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    let key = this.resolveEntityKey(entity);
    return this.entityQuery(key)
      .put(entity, etag, options)
      .pipe(map(resp => resp.toEntity<T>()));
  }

  public assign(delta: Partial<T>, options?) {
    let etag = delta[ODataEntityService.ODATA_ETAG];
    let key = this.resolveEntityKey(delta);
    return this.entityQuery(key)
      .patch(delta, etag, options);
  }

  public destroy(entity: T, options?) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    let key = this.resolveEntityKey(entity);
    return this.entityQuery(key)
      .delete(etag, options);
  }

  // Shortcuts
  public save(entity: T) {
    if (this.isNew(entity))
      return this.create(entity);
    else
      return this.update(entity);
  }

  protected navigation(entity: Partial<T>, name, options?) {
    let key = this.resolveEntityKey(entity);
    return this.entityQuery(key)
      .navigationProperty(name)
      .get(options)
      .pipe(
        map(resp => resp.toEntitySet<T>())
        );
    }
    
  protected property(entity: Partial<T>, name, options?) {
    let key = this.resolveEntityKey(entity);
    return this.entityQuery(key)
      .property(name)
      .get(options)
      .pipe(
        map(resp=> resp.toPropertyValue())
      );
    }

  protected createRef(entity: Partial<T>, property, target: ODataQueryBase, options?) {
    let refurl = this.context.createEndpointUrl(target);
    let etag = entity[ODataEntityService.ODATA_ETAG];
    let key = this.resolveEntityKey(entity);
    return this.entityQuery(key)
      .navigationProperty(property)
      .ref()
      .put({[ODataEntityService.ODATA_ID]: refurl}, etag, options);
  }

  protected createCollectionRef(entity: Partial<T>, property, target: ODataQueryBase, options?) {
    let refurl = this.context.createEndpointUrl(target);
    let key = this.resolveEntityKey(entity);
    return this.entityQuery(key)
      .navigationProperty(property)
      .ref()
      .post({[ODataEntityService.ODATA_ID]: refurl}, options);
  }

  protected deleteRef(entity: Partial<T>, property, target: ODataQueryBase, options?) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    let key = this.resolveEntityKey(entity);
    return this.entityQuery(key)
      .navigationProperty(property)
      .ref()
      .delete(etag, options);
  }

  protected deleteCollectionRef(entity: Partial<T>, property, target: ODataQueryBase, options?) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    let refurl = this.context.createEndpointUrl(target);
    let key = this.resolveEntityKey(entity);
    options = this.context.assignOptions(options || {}, {params: {"$id": refurl}});
    return this.entityQuery(key)
      .navigationProperty(property)
      .ref()
      .delete(etag, options);
  }

  // Function and actions
  protected customAction(key: Partial<T>, name: string, postdata: any = {}, options?): Observable<ODataResponse> {
    let builder = this.entityQueryBuilder(key);
    builder.action(name);
    return builder.post(postdata, options);
  }

  protected customCollectionAction(name: string, postdata: any = {}, options?): Observable<ODataResponse> {
    let builder = this.collectionQueryBuilder();
    builder.action(name);
    return builder.post(postdata, options);
  }

  protected customFunction(key: Partial<T>, name: string, parameters: any = {}, options?): Observable<ODataResponse> {
    let builder = this.entityQueryBuilder(key);
    builder.function(name).assign(parameters);
    return builder.get(options);
  }

  protected customCollectionFunction(name: string, parameters: any = {}, opcions?): Observable<ODataResponse> {
    let builder = this.collectionQueryBuilder();
    builder.function(name).assign(parameters);
    return builder.get(opcions);
  }
}
