import { HttpParams } from '@angular/common/http';

import { ODataResponse } from "../odata-response/odata-response";
import { ODataQueryBuilder } from "../odata-query/odata-query-builder";
import { ODataQuery } from "../odata-query/odata-query";
import { ODataService } from "./odata.service";
import { HttpOptions } from "./http-options";

export class ODataEntityService<T> {
  private static readonly ODATA_ETAG = '@odata.etag';
  private static readonly ODATA_ID = '@odata.id';
  
  constructor(
    protected odataService: ODataService,
    protected serviceRoot: string,
    protected entitySet: string) {
  }

  public entity(key): ODataQuery {
    return new ODataQuery(this.odataService, this.serviceRoot)
        .entitySet(this.entitySet)
        .entityKey(key);
  }

  public collection(): ODataQuery {
    return new ODataQuery(this.odataService, this.serviceRoot)
        .entitySet(this.entitySet);
  }

  public entityBuilder(key): ODataQueryBuilder {
    return new ODataQueryBuilder(this.odataService, this.serviceRoot)
        .set(this.entitySet)
        .key(key);
  }

  public collectionBuilder(): ODataQueryBuilder {
    return new ODataQueryBuilder(this.odataService, this.serviceRoot)
        .set(this.entitySet);
  }

  public fetch(query: ODataQuery | ODataQueryBuilder): Promise<ODataResponse> {
    return query
      .get().toPromise();
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
  public get(key): Promise<T> {
    return this.entity(key)
      .get()
      .toPromise()
      .then(resp => resp.toEntity<T>());
  }

  public create(data) {
    return this.collection()
      .post(data)
      .toPromise()
      .then(resp => resp.toEntity<T>());
  }

  public update(entity): Promise<T> {
    return this.entity(entity.id)
      .put(entity)
      .toPromise()
      .then(resp => resp.toEntity<T>());
  }

  public patch(delta) {
    return this.entity(delta.id)
      .patch(delta)
      .toPromise();
  }

  public delete(entity) {
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

  protected createRef(entity, property, target: ODataQuery) {
    
    return this.entity(entity.id)
      .navigationProperty(property)
      .ref()
      .put({[ODataEntityService.ODATA_ID]: target.toString()})
      .toPromise();
  }

  protected createCollectionRef(entity, property, target: ODataQuery) {
    return this.entity(entity.id)
      .navigationProperty(property)
      .ref()
      .post({[ODataEntityService.ODATA_ID]: target.toString()})
      .toPromise();
  }

  protected deleteRef(entity, property, target: ODataQuery) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    return this.entity(entity.id)
      .navigationProperty(property)
      .ref()
      .delete(etag)
      .toPromise();
  }

  protected deleteCollectionRef(entity, property, target: ODataQuery) {
    let etag = entity[ODataEntityService.ODATA_ETAG];
    let options = new HttpOptions();
    options.params = new HttpParams({fromObject: {
      "$id": target
        .toString()}
      });
    return this.entity(entity.id)
      .navigationProperty(property)
      .ref()
      .delete(etag, options)
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
