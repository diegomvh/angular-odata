import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ODataEntitySetResource } from '../resources';

import { ODataClient } from "../client";
import { EntityKey } from '../types';
import { ODataModel, ODataModelCollection } from '../models';

@Injectable()
export class ODataModelService<M extends ODataModel, C extends ODataModelCollection<M>> {
  static path: string = "";
  static type: string = "";

  constructor(protected client: ODataClient) { }

  // Build resources
  public entities(): ODataEntitySetResource<M> {
    let Ctor = <typeof ODataModelService>this.constructor;
    return this.client.entitySet<M>(Ctor.path, Ctor.type);
  }

  public createModel(attrs?: any): M {
    return this.entities().entity().toModel<M>(attrs);
  }

  public createCollection(models?: any): C {
    return this.entities().toCollection<C>(models);
  }

  public fetchCollection(): Observable<C> {
    let resource = this.entities();
    return resource.get().pipe(map(([entities, annots]) => resource.toCollection(entities, annots)));
  }

  public fetchAll(): Observable<C> {
    let resource = this.entities();
    return resource.all().pipe(map(models => resource.toCollection(models)));
  }

  public fetchOne(key?: EntityKey<M>): Observable<M> {
    let resource = this.entities().entity(key);
    return resource.get().pipe(map(([entity, annots]) => resource.toModel(entity, annots)))
  }
}
