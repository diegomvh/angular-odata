import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ODataEntitySetResource, ODataEntityResource } from '../resources';

import { ODataClient } from "../client";
import { EntityKey } from '../types';
import { ODataModel, ODataCollection } from '../models';

@Injectable()
export class ODataModelService<T, M extends ODataModel<T>, C extends ODataCollection<T, M>> {
  static path: string = "";
  static type: string = "";

  constructor(protected client: ODataClient) { }

  // Build resources
  public entities(): ODataEntitySetResource<T> {
    let Ctor = <typeof ODataModelService>this.constructor;
    return this.client.entitySet<T>(Ctor.path, Ctor.type);
  }

  public entity(key?: EntityKey<T>): ODataEntityResource<T> {
    return this.entities()
      .entity(key);
  }

  // Models
  public model(entity?: T): M {
    return this.entity(entity).toModel<M>(entity);
  }

  public collection(models?: T[]): C {
    return this.entities().toCollection<C>(models);
  }

  public fetchCollection(): Observable<C> {
    let resource = this.entities();
    return resource.get().pipe(map(([entities, annots]) => resource.toCollection<C>(entities, annots)));
  }

  public fetchAll(): Observable<C> {
    let resource = this.entities();
    return resource.all().pipe(map(models => resource.toCollection<C>(models)));
  }

  public fetchOne(key?: EntityKey<T>): Observable<M> {
    let resource = this.entities().entity(key);
    return resource.get().pipe(map(([entity, annots]) => resource.toModel<M>(entity, annots)))
  }

  // Tools
  public attach(value: M | C): M | C {
    if (value instanceof ODataModel) {
      return value.attach(this.entities().entity(value.toEntity()));
    } else if (value instanceof ODataCollection) {
      return value.attach(this.entities());
    }
  }
}
