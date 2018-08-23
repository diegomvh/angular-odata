import { HttpParams, HttpClient } from '@angular/common/http';

import { ODataResponse } from "../odata-response/odata-response";
import { ODataQueryBuilder } from "../odata-query/odata-query-builder";
import { ODataQuery } from "../odata-query/odata-query";
import { ODataService } from "./odata.service";
import { ODataQueryAbstract } from '../odata-query/odata-query-abstract';
import { ODataContext } from './odata-context';

export class ODataEntityService<T> extends ODataService {
  private static readonly ODATA_ETAG = '@odata.etag';
  private static readonly ODATA_ID = '@odata.id';
  
  constructor(protected http: HttpClient, protected context: ODataContext, protected set: string) {
    super(http, context);
  }

  public entity(key): ODataQuery {
    return this.query()
        .entitySet(this.set)
        .entityKey(key);
  }

  public collection(): ODataQuery {
    return this.query()
        .entitySet(this.set);
  }

  public entityBuilder(key): ODataQueryBuilder {
    return this.queryBuilder()
        .set(this.set)
        .key(key);
  }

  public collectionBuilder(): ODataQueryBuilder {
    return this.queryBuilder()
        .set(this.set);
  }

  public fetch(query: ODataQuery | ODataQueryBuilder): Promise<ODataResponse> {
    return query
      .get()
      .toPromise();
  }

  public fetchAll(query: ODataQuery | ODataQueryBuilder): Promise<T[]> {
    return this.fetch(query)
      .then(resp => resp.toEntitySet<T>().getEntities());
  }

  public fetchOne(query: ODataQuery | ODataQueryBuilder): Promise<T> {
    return this.fetch(query)
      .then(resp => resp.toEntity<T>());
  }

  public fetchValue<V>(query: ODataQuery | ODataQueryBuilder): Promise<V> {
    return this.fetch(query)
      .then(resp => resp.toPropertyValue<V>());
  }

  // Entity Actions
  public read(key): Promise<T> {
    return this.entity(key)
      .get()
      .toPromise()
      .then(resp => resp.toEntity<T>());
  }

  public create(data): Promise<T> {
    return this.collection()
      .post(data)
      .toPromise()
      .then(resp => resp.toEntity<T>());
  }

  public update(entity): Promise<T> {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    return this.entity(entity.id)
      .put(entity, etag)
      .toPromise()
      .then(resp => resp.toEntity<T>());
  }

  public assign(delta) {
    let etag = delta[ODataEntityService.ODATA_ETAG];
    return this.entity(delta.id)
      .patch(delta, etag)
      .toPromise();
  }

  public remove(entity) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    return this.entity(entity.id)
      .delete(etag)
      .toPromise();
  }

  // Shortcuts
  public save(entity) {
    if (entity.id)
      return this.update(entity);
    else
      return this.create(entity);
  }

  protected navigation(entity, name) {
    return this.entity(entity.id)
      .navigationProperty(name)
      .get()
      .toPromise()
      .then(resp => resp.toEntitySet<T>().getEntities());
    }
    
  protected property(entity, name) {
    return this.entity(entity.id)
      .property(name)
      .get()
      .toPromise()
      .then(resp => resp.toPropertyValue());
    }

  protected createRef(entity, property, target: ODataQueryAbstract) {
    let refurl = this.context.createEndpointUrl(target);
    let etag = entity[ODataEntityService.ODATA_ETAG];
    return this.entity(entity.id)
      .navigationProperty(property)
      .ref()
      .put({[ODataEntityService.ODATA_ID]: refurl}, etag)
      .toPromise();
  }

  protected createCollectionRef(entity, property, target: ODataQueryAbstract) {
    let refurl = this.context.createEndpointUrl(target);
    return this.entity(entity.id)
      .navigationProperty(property)
      .ref()
      .post({[ODataEntityService.ODATA_ID]: refurl})
      .toPromise();
  }

  protected deleteRef(entity, property, target: ODataQueryAbstract) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    return this.entity(entity.id)
      .navigationProperty(property)
      .ref()
      .delete(etag)
      .toPromise();
  }

  protected deleteCollectionRef(entity, property, target: ODataQueryAbstract) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    let refurl = this.context.createEndpointUrl(target);
    return this.entity(entity.id)
      .navigationProperty(property)
      .ref()
      .delete(etag, {params: {"$id": refurl}})
      .toPromise();
  }

  // Function and actions
  protected customAction(key: any, name: string, postdata: any = {}): Promise<ODataResponse> {
    return this.entityBuilder(key)
      .action(name)
      .post(postdata)
      .toPromise();
  }

  protected customCollectionAction(name: string, postdata: any = {}): Promise<ODataResponse> {
    return this.collectionBuilder()
      .action(name)
      .post(postdata)
      .toPromise();
  }

  protected customFunction(key: any, name: string, parameters: any = {}): Promise<ODataResponse> {
    return this.entityBuilder(key)
      .func({[name]: parameters})
      .get()
      .toPromise();
  }

  protected customCollectionFunction(name: string, parameters: any = {}): Promise<ODataResponse> {
    return this.collectionBuilder()
      .func({[name]: parameters})
      .get()
      .toPromise();
  }
}
