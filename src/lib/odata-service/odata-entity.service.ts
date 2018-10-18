import { HttpParams, HttpClient } from '@angular/common/http';

import { ODataResponse } from "../odata-response/odata-response";
import { ODataQueryBuilder } from "../odata-query/odata-query-builder";
import { ODataQuery } from "../odata-query/odata-query";
import { ODataService } from "./odata.service";
import { ODataQueryAbstract } from '../odata-query/odata-query-abstract';
import { ODataContext } from '../odata-context';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export class ODataEntityService<T> extends ODataService {
  private static readonly ODATA_ETAG = '@odata.etag';
  private static readonly ODATA_ID = '@odata.id';
  
  constructor(protected http: HttpClient, protected context: ODataContext, protected set: string) {
    super(http, context);
  }

  public collection(): ODataQuery {
    return this.query()
        .entitySet(this.set);
  }

  public entity(key): ODataQuery {
    return this.collection()
        .entityKey(key);
  }

  public collectionBuilder(): ODataQueryBuilder {
    let builder = this.queryBuilder();
    builder.entitySet(this.set);
    return builder;
  }

  public entityBuilder(key): ODataQueryBuilder {
    let builder = this.collectionBuilder();
    builder.entityKey(key);
    return builder;
  }

  public fetch(query: ODataQuery | ODataQueryBuilder, options?): Observable<ODataResponse> {
    return query
      .get();
  }

  public fetchAll(query: ODataQuery | ODataQueryBuilder, options?): Observable<T[]> {
    return this.fetch(query, options)
      .pipe(map(resp => resp.toEntitySet<T>().getEntities()));
  }

  public fetchOne(query: ODataQuery | ODataQueryBuilder, options?): Observable<T> {
    return this.fetch(query, options)
      .pipe(map(resp => resp.toEntity<T>()));
  }

  public fetchValue<V>(query: ODataQuery | ODataQueryBuilder, options?): Observable<V> {
    return this.fetch(query, options)
      .pipe(map(resp => resp.toPropertyValue<V>()));
  }

  // Entity Actions
  public read(key, options?): Observable<T> {
    return this.entity(key)
      .get(options)
      .pipe(map(resp => resp.toEntity<T>()));
  }

  public create(data, options?): Observable<T> {
    return this.collection()
      .post(data, options)
      .pipe(map(resp => resp.toEntity<T>()));
  }

  public update(entity, options?): Observable<T> {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    return this.entity(entity.id)
      .put(entity, etag, options)
      .pipe(map(resp => resp.toEntity<T>()));
  }

  public assign(delta, options?) {
    let etag = delta[ODataEntityService.ODATA_ETAG];
    return this.entity(delta.id)
      .patch(delta, etag, options);
  }

  public remove(entity, options?) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    return this.entity(entity.id)
      .delete(etag, options);
  }

  // Shortcuts
  public save(entity) {
    if (entity.id)
      return this.update(entity);
    else
      return this.create(entity);
  }

  protected navigation(entity, name, options?) {
    return this.entity(entity.id)
      .navigationProperty(name)
      .get(options)
      .pipe(
        map(resp => resp.toEntitySet<T>().getEntities())
        );
    }
    
  protected property(entity, name, options?) {
    return this.entity(entity.id)
      .property(name)
      .get(options)
      .pipe(
        map(resp=> resp.toPropertyValue())
      );
    }

  protected createRef(entity, property, target: ODataQueryAbstract, options?) {
    let refurl = this.context.createEndpointUrl(target);
    let etag = entity[ODataEntityService.ODATA_ETAG];
    return this.entity(entity.id)
      .navigationProperty(property)
      .ref()
      .put({[ODataEntityService.ODATA_ID]: refurl}, etag, options);
  }

  protected createCollectionRef(entity, property, target: ODataQueryAbstract, options?) {
    let refurl = this.context.createEndpointUrl(target);
    return this.entity(entity.id)
      .navigationProperty(property)
      .ref()
      .post({[ODataEntityService.ODATA_ID]: refurl}, options);
  }

  protected deleteRef(entity, property, target: ODataQueryAbstract, options?) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    return this.entity(entity.id)
      .navigationProperty(property)
      .ref()
      .delete(etag, options);
  }

  protected deleteCollectionRef(entity, property, target: ODataQueryAbstract, options?) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    let refurl = this.context.createEndpointUrl(target);
    options = this.context.assignOptions(options || {}, {params: {"$id": refurl}});
    return this.entity(entity.id)
      .navigationProperty(property)
      .ref()
      .delete(etag, options);
  }

  // Function and actions
  protected customAction(key: any, name: string, postdata: any = {}, options?): Observable<ODataResponse> {
    let builder = this.entityBuilder(key);
    builder.action(name);
    return builder.post(postdata, options);
  }

  protected customCollectionAction(name: string, postdata: any = {}, options?): Observable<ODataResponse> {
    let builder = this.collectionBuilder();
    builder.action(name);
    return builder.post(postdata, options);
  }

  protected customFunction(key: any, name: string, parameters: any = {}, options?): Observable<ODataResponse> {
    let builder = this.entityBuilder(key);
    builder.function(name).assign(parameters);
    return builder.get(options);
  }

  protected customCollectionFunction(name: string, parameters: any = {}, opcions?): Observable<ODataResponse> {
    let builder = this.collectionBuilder();
    builder.function(name).assign(parameters);
    return builder.get(opcions);
  }
}
