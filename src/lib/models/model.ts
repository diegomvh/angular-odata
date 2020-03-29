import { Observable, NEVER } from 'rxjs';
import { map } from 'rxjs/operators';

import { ODataEntityResource, Expand, ODataPropertyResource, ODataEntityAnnotations, ODataFunctionResource, ODataActionResource, ODataResource, ODataAnnotations, Select, ODataPropertyAnnotations, ODataCollectionAnnotations } from '../resources';

import { ODataCollection } from './collection';
import { ODataNavigationPropertyResource } from '../resources/requests/navigationproperty';
import { HttpOptions, HttpEntityOptions, HttpPropertyOptions } from '../resources/http-options';
import { entityAttributes, odataAnnotations } from '../types';
import { ODataField } from './meta';
import { ODataCallableResource } from '../resources/requests/callable';

export class ODataModel<T> {
  private resource: ODataResource<T>;
  private entity: T;
  private annotations: ODataAnnotations | null;
  private relationships: { [name: string]: ODataModel<any> | ODataCollection<any, ODataModel<any>> }

  constructor(resource: ODataResource<T>, entity?: Partial<T>, annots?: ODataAnnotations) {
    this.resource = resource;
    this.resource.meta().fields()
      .filter(field => field.navigation)
      .forEach(field => {
        Object.defineProperty(this, field.name, {
          get() {
            return this.getNavigationProperty(field.name);
          },
          set(model: ODataModel<any> | null) {
            return this.setNavigationProperty(field.name, model);
          }
        });
      });
    this.populate((entity || {}) as T, annots || null);
  }

  attach(resource: ODataResource<T>) {
    if (this.resource.type() !== resource.type())
      throw new Error(`Can't reattach ${resource.type()} with ${this.resource.type()}`);
    this.resource = resource;
    return this;
  }

  target() {
    return this.resource.clone() as ODataResource<T>;
  }

  private related<R>(resource: ODataResource<R>, f: ODataField<any>) {
    let value = this.entity[f.name];
    if (f.collection) {
      value = value || [];
      let annots = this.annotations !== null ? this.annotations.related(f.name) : undefined;
      return resource.toCollection(value, annots);
    } else {
      value = value || {};
      let entity = entityAttributes(value);
      let annots = ODataEntityAnnotations.factory(odataAnnotations(value));
      return resource.toModel(entity, annots);
    }
  }

  private populate(entity: T, annots?: ODataAnnotations | null) {
    this.entity = entity;
    this.annotations = annots;
    this.relationships = {};
    let fields = this.resource.meta().fields();
    let entries = Object.entries(entity)
      .map(([key, value]) => [key, value, fields.find(f => f.name === key)]);
      //Attributes
    let attrs = entries
      .filter(([,, f]) => f && !f.navigation)
      .reduce((acc, [k, v]) => Object.assign(acc, {[k]: v}), {});
    //console.log(attrs);
    Object.assign(this, attrs);
      //Others
    let others = entries
      .filter(([,, f]) => !f)
      .reduce((acc, [k, v]) => Object.assign(acc, {[k]: v}), {});
    //console.log(others);
    Object.assign(this, others);
      //Complexes
    let complexes = entries
      .filter(([,, f]) => f && !f.navigation && f.schema)
      .reduce((acc, [k,, f]) => {
        let prop = (this.resource as ODataEntityResource<T>).property(f.name);
        let complex = this.related(prop, f);
        return Object.assign(acc, {[k]: complex});
      } , {});
    //console.log(complexes);
    Object.assign(this, complexes);
    return this;
  }

  toEntity() : T {
    let entity = {} as T;
    this.resource.meta().fields().forEach(field => {
      if (field.parser) {
        if (field.navigation) {
          if (field.name in this.relationships) {
            let rel = this.relationships[field.name];
            entity[field.name] = (rel instanceof ODataModel)? rel.toEntity() : rel.toEntities();
          }
        } else if (this[field.name] !== undefined) {
          let complex = this[field.name];
          entity[field.name] = (complex instanceof ODataModel)? complex.toEntity() : complex.toEntities();
        }
      } else if (this[field.name] !== undefined) {
        entity[field.name] = this[field.name];
      }
    });
    return entity;
  }

  clone() {
    let Ctor = <typeof ODataModel>this.constructor;
    return (new Ctor(this.resource.clone(), this.toEntity(), this.annotations)) as ODataModel<T>;
  }

  fetch(options?: HttpOptions): Observable<this | null> {
    let opts = <HttpEntityOptions & HttpPropertyOptions>{
      headers: options && options.headers,
      params: options && options.params,
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }
    let obs$: Observable<any>;
    if (this.resource instanceof ODataEntityResource) {
      this.resource.key(this);
      if (!this.resource.hasKey())
        throw new Error(`Can't fetch entity without key`);
      obs$ = this.resource.get(opts);
    } else if (this.resource instanceof ODataNavigationPropertyResource) {
      obs$ = this.resource.get(Object.assign(opts, { responseType: 'entity' }));
    } else if (this.resource instanceof ODataPropertyResource) {
      obs$ = this.resource.get(Object.assign(opts, { responseType: 'property' }));
    } else if (this.resource instanceof ODataFunctionResource) {
      obs$ = this.resource.get(Object.assign(opts, { responseType: 'entity' }));
    }
    if (!obs$)
      throw new Error("Not Yet!");
    return obs$.pipe(
      map(([entity, annots]) => entity ? this.populate(entity, annots) : null));
  }

  create(options?: HttpOptions): Observable<this> {
    let opts = <HttpEntityOptions & HttpPropertyOptions>{
      headers: options && options.headers,
      params: options && options.params,
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }
    if (this.resource instanceof ODataEntityResource) {
      return this.resource.post(this.toEntity(), opts).pipe(map(([entity, annots]) => this.populate(entity, annots)));
    }
    throw new Error(`Can't create`);
  }

  update(options?: HttpOptions): Observable<this> {
    let opts = <HttpEntityOptions & HttpPropertyOptions>{
      headers: options && options.headers,
      params: options && options.params,
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }
    if (this.resource instanceof ODataEntityResource) {
      this.resource.key(this);
      if (!this.resource.hasKey()) 
        throw new Error(`Can't update entity without key`);
      let etag = (this.annotations && this.annotations instanceof ODataEntityAnnotations) ? this.annotations.etag : undefined;
      return this.resource.put(this.toEntity(), Object.assign(opts, {etag})).pipe(map(([entity, annots]) => this.populate(entity, annots)));
    }
    throw new Error(`Can't update`);
  }
  
  save(options?: HttpOptions): Observable<this> {
    if (this.resource instanceof ODataEntityResource) {
      this.resource.key(this);
      return this.resource.hasKey() ? this.update(options) : this.create(options);
    }
    throw new Error(`Can't save`);
  }

  destroy(options?: HttpOptions): Observable<null> {
    let opts = <HttpEntityOptions & HttpPropertyOptions>{
      headers: options && options.headers,
      params: options && options.params,
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }
    if (this.resource instanceof ODataEntityResource) {
      this.resource.key(this);
      if (!this.resource.hasKey())
        throw new Error(`Can't destroy entity without key`);
      let etag = (this.annotations && this.annotations instanceof ODataEntityAnnotations) ? this.annotations.etag : undefined;
      return this.resource.delete(Object.assign(opts, { etag }));
    }
    throw new Error(`Can't destroy`);
  }

  // Callable
  protected call<R>(
    callable: ODataCallableResource<R>, 
    args: any | null, 
    responseType: 'value', 
    options?: HttpOptions
  ): Observable<R>;

  protected call<R, M extends ODataModel<R>>(
    callable: ODataCallableResource<R>, 
    args: any | null, 
    responseType: 'model', 
    options?: HttpOptions
  ): Observable<M>;

  protected call<R, M extends ODataModel<R>, C extends ODataCollection<R, M>>(
    callable: ODataCallableResource<R>, 
    args: any | null, 
    responseType: 'collection', 
    options?: HttpOptions
  ): Observable<C>;

  protected call(
    callable: ODataCallableResource<any>, 
    args: any | null, 
    responseType: 'value' | 'model' | 'collection', 
    options?: HttpOptions
  ): Observable<any> {
    let ops = <any>{
      headers: options && options.headers,
      params: options && options.params,
      responseType: responseType === 'value' ? 'property' : 
        responseType === 'model' ? 'entity' : 'entities',
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials,
      withCount: responseType === 'collection' 
    }
    let res$: Observable<any> = NEVER;
    if (callable instanceof ODataFunctionResource) {
      if (args)
        callable.parameters(args);
      res$ = callable.get(ops) as Observable<any>;
    } else if (callable instanceof ODataActionResource) {
      res$ = callable.post(args, ops) as Observable<any>;
    } else {
      throw new Error(`Can't call resource`);
    }
    switch (responseType) {
      case 'value':
        return (res$ as Observable<[any, ODataPropertyAnnotations]>).pipe(map(([value, ]) => value));
      case 'model':
        return (res$ as Observable<[any, ODataEntityAnnotations]>).pipe(map(([entity, annots]) => callable.toModel<ODataModel<any>>(entity, annots)));
      case 'collection':
        return (res$ as Observable<[any[], ODataCollectionAnnotations]>).pipe(map(([entities, annots]) => callable.toCollection<ODataCollection<any, ODataModel<any>>>(entities, annots)));
    }
  }

  // Functions
  protected function<R>(name: string, returnType?: string): ODataFunctionResource<R> {
    if (this.resource instanceof ODataEntityResource) {
      this.resource.key(this);
      if (!this.resource.hasKey()) 
        throw new Error(`Can't function without key`);
      return this.resource.function<R>(name, returnType);
    }
    throw new Error(`Can't function without EntityResource`);
  }

  // Actions
  protected action<R>(name: string, returnType?: string): ODataActionResource<R> {
    if (this.resource instanceof ODataEntityResource) {
      this.resource.key(this);
      if (!this.resource.hasKey()) 
        throw new Error(`Can't action without key`);
      return this.resource.action<R>(name, returnType);
    }
    throw new Error(`Can't action without EntityResource`);
  }

  // Navigation Properties === References
  protected navigationProperty<P>(name: string): ODataNavigationPropertyResource<P> {
    if (this.resource instanceof ODataEntityResource) {
      this.resource.key(this);
      if (!this.resource.hasKey()) 
        throw new Error(`Can't navigation without key`);
      return this.resource.navigationProperty<P>(name);
    }
    throw new Error(`Can't navigation without EntityResource`);
  }

  protected getNavigationProperty<P>(name: string): ODataModel<P> | ODataCollection<P, ODataModel<P>> {
    let field = this.resource.meta().fields().find(f => f.name === name);
    if (!(name in this.relationships)) {
      let nav = this.navigationProperty<P>(field.name);
      this.relationships[field.name] = this.related(nav, field);
    }
    return this.relationships[field.name];
  }

  protected setNavigationProperty<P, Pm extends ODataModel<P>>(name: string, model: Pm | null): Observable<this> {
    let field = this.resource.meta().fields().find(f => f.name === name);
    if (field.collection)
      throw new Error(`Can't set ${field.name} to collection, use add`);
    let ref = this.navigationProperty<P>(name).reference();
    let etag = (this.annotations as ODataEntityAnnotations).etag;
    // TODO: change the resource of a model 
    delete this.relationships[field.name];
    if (model instanceof ODataModel) {
      return ref.set(model.resource as ODataEntityResource<P>, { etag });
    } else if (model === null)
      return ref.remove({etag});
  }

  // Query options
  get query() {
    let resource = this.resource as ODataEntityResource<T>;
    return {
      select(select?: Select<T>) { return resource.select(select); },
      expand(expand?: Expand<T>) { return resource.expand(expand); },
    }
  }
}
