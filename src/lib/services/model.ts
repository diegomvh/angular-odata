import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ODataEntitySetResource } from '../resources';

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

  // Models
  public createModel(attrs?: T): M {
    return this.entities().entity().toModel<M>(attrs);
  }

  public createCollection(models?: T[]): C {
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

  public fetchOne(key?: EntityKey<T>): Observable<M> {
    let resource = this.entities().entity(key);
    return resource.get().pipe(map(([entity, annots]) => resource.toModel(entity, annots)))
  }

  // Tools
  public attachModel(model: M): M {
    return model.attach(this.entities().entity());
  }

  public attachCollection(model: M): M {
    return model.attach(this.entities());
  }
}
