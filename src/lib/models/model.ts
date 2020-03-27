import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ODataEntityResource, Expand, ODataPropertyResource, ODataEntityAnnotations, ODataFunctionResource, ODataActionResource, ODataResource, ODataAnnotations, Select, ODataPropertyAnnotations, ODataCollectionAnnotations } from '../resources';

import { ODataCollection } from './collection';
import { ODataNavigationPropertyResource } from '../resources/requests/navigationproperty';
import { HttpOptions, HttpEntityOptions, HttpPropertyOptions } from '../resources/http-options';

export class ODataModel<T> {
  _resource: ODataResource<T>;
  _entity: T;
  _annotations: ODataAnnotations | null;
  _relationships: { [name: string]: ODataModel<any> | ODataCollection<any, ODataModel<any>> }

  constructor(resource: ODataResource<T>, entity?: Partial<T>, annots?: ODataAnnotations) {
    this._resource = resource;
    this._resource.meta().fields()
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
    if (this._resource.type() !== resource.type())
      throw new Error(`Can't reattach ${resource.type()} with ${this._resource.type()}`);
    this._resource = resource;
    return this;
  }

  private populate(entity: T, annots?: ODataAnnotations | null) {
    this._entity = entity;
    this._annotations = annots;
    this._relationships = {};
    let fields = this._resource.meta().fields();
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
        let prop = (this._resource as ODataEntityResource<T>).property(f.name);
        let annots = this._annotations !== null ? this._annotations.related(f.name) : undefined;
        let complex = f.collection ? prop.toCollection(this._entity[f.name], annots) : prop.toModel(this._entity[f.name], annots);
        return Object.assign(acc, {[k]: complex});
      } , {});
    //console.log(complexes);
    Object.assign(this, complexes);
    return this;
  }

  toEntity() : T {
    let entity = {} as T;
    this._resource.meta().fields().forEach(field => {
      if (field.parser) {
        if (field.navigation) {
          if (field.name in this._relationships) {
            let rel = this._relationships[field.name];
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
    return (new Ctor(this._resource.clone(), this.toEntity(), this._annotations)) as ODataModel<T>;
  }

  fetch(options?: HttpOptions): Observable<this | null> {
    let opts = <HttpEntityOptions & HttpPropertyOptions>{
      headers: options && options.headers,
      params: options && options.params,
      reportProgress: options && options.reportProgress,
      withCredentials: options && options.withCredentials
    }
    let obs$: Observable<any>;
    if (this._resource instanceof ODataEntityResource) {
      this._resource.key(this);
      if (!this._resource.hasKey())
        throw new Error(`Can't fetch entity without key`);
      obs$ = this._resource.get(opts);
    } else if (this._resource instanceof ODataNavigationPropertyResource) {
      obs$ = this._resource.get(Object.assign(opts, { responseType: 'entity' }));
    } else if (this._resource instanceof ODataPropertyResource) {
      obs$ = this._resource.get(Object.assign(opts, { responseType: 'property' }));
    } else if (this._resource instanceof ODataFunctionResource) {
      obs$ = this._resource.get(Object.assign(opts, { responseType: 'entity' }));
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
    if (this._resource instanceof ODataEntityResource) {
      return this._resource.post(this.toEntity(), opts).pipe(map(([entity, annots]) => this.populate(entity, annots)));
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
    if (this._resource instanceof ODataEntityResource) {
      this._resource.key(this);
      if (!this._resource.hasKey()) 
        throw new Error(`Can't update entity without key`);
      let etag = (this._annotations && this._annotations instanceof ODataEntityAnnotations) ? this._annotations.etag : undefined;
      return this._resource.put(this.toEntity(), Object.assign(opts, {etag})).pipe(map(([entity, annots]) => this.populate(entity, annots)));
    }
    throw new Error(`Can't update`);
  }
  
  save(options?: HttpOptions): Observable<this> {
    if (this._resource instanceof ODataEntityResource) {
      this._resource.key(this);
      return this._resource.hasKey() ? this.update(options) : this.create(options);
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
    if (this._resource instanceof ODataEntityResource) {
      this._resource.key(this);
      if (!this._resource.hasKey())
        throw new Error(`Can't destroy entity without key`);
      let etag = (this._annotations && this._annotations instanceof ODataEntityAnnotations) ? this._annotations.etag : undefined;
      return this._resource.delete(Object.assign(opts, { etag }));
    }
    throw new Error(`Can't destroy`);
  }

  // Functions
  protected function<R>(name: string, params: any, returnType?: string): ODataFunctionResource<R> {
    if (this._resource instanceof ODataEntityResource) {
      this._resource.key(this);
      if (!this._resource.hasKey()) 
        throw new Error(`Can't function without key`);
      var func = this._resource.function<R>(name, returnType);
      func.parameters(params);
      return func;
    }
    throw new Error(`Can't function without EntityResource`);
  }

  protected callFunction<R>(name: string, params: any | null, 
    responseType: 'value' | 'model' | 'collection', 
    returnType?: string, options?: HttpOptions): Observable<any> {
      let ops = <any>{
        headers: options && options.headers,
        params: options && options.params,
        responseType: responseType === 'value' ? 'property' : 
          responseType === 'model' ? 'entity' : 'entities',
        reportProgress: options && options.reportProgress,
        withCredentials: options && options.withCredentials,
        withCount: responseType === 'collection' 
      }
      let res = this.function<R>(name, params, returnType);
      let res$ = res.get(ops) as Observable<any>;
      switch (responseType) {
        case 'value':
          return (res$ as Observable<[R, ODataPropertyAnnotations]>).pipe(map(([value, ]) => value));
        case 'model':
          return (res$ as Observable<[R, ODataEntityAnnotations]>).pipe(map(([entity, annots]) => res.toModel<ODataModel<R>>(entity, annots)));
        case 'collection':
          return (res$ as Observable<[R[], ODataCollectionAnnotations]>).pipe(map(([entities, annots]) => res.toCollection<ODataCollection<R, ODataModel<R>>>(entities, annots)));
      }
  }

  // Actions
  protected action<R>(name: string, returnType?: string): ODataActionResource<R> {
    if (this._resource instanceof ODataEntityResource) {
      this._resource.key(this);
      if (!this._resource.hasKey()) 
        throw new Error(`Can't action without key`);
      return this._resource.action<R>(name, returnType);
    }
    throw new Error(`Can't action without EntityResource`);
  }

  protected callAction<R>(name: string, body: any | null, 
    responseType: 'value' | 'model' | 'collection', 
    returnType?: string, options?: HttpOptions): Observable<any> {
      let ops = <any>{
        headers: options && options.headers,
        params: options && options.params,
        responseType: responseType === 'value' ? 'property' : 
          responseType === 'model' ? 'entity' : 'entities',
        reportProgress: options && options.reportProgress,
        withCredentials: options && options.withCredentials,
        withCount: responseType === 'collection' 
      }
      let res = this.action<R>(name, returnType);
      let res$ = res.post(body, ops) as Observable<any>;
      switch (responseType) {
        case 'value':
          return (res$ as Observable<[R, ODataPropertyAnnotations]>).pipe(map(([value, ]) => value));
        case 'model':
          return (res$ as Observable<[R, ODataEntityAnnotations]>).pipe(map(([entity, annots]) => res.toModel<ODataModel<R>>(entity, annots)));
        case 'collection':
          return (res$ as Observable<[R[], ODataCollectionAnnotations]>).pipe(map(([entities, annots]) => res.toCollection<ODataCollection<R, ODataModel<R>>>(entities, annots)));
      }
  }

  // Navigation Properties === References
  protected navigationProperty<P>(name: string): ODataNavigationPropertyResource<P> {
    if (this._resource instanceof ODataEntityResource) {
      this._resource.key(this);
      if (!this._resource.hasKey()) 
        throw new Error(`Can't navigation without key`);
      return this._resource.navigationProperty<P>(name);
    }
    throw new Error(`Can't navigation without EntityResource`);
  }

  protected getNavigationProperty(name: string): ODataModel<any> | ODataCollection<any, ODataModel<any>> {
    let field = this._resource.meta().fields().find(f => f.name === name);
    if (!(name in this._relationships)) {
      let nav = this.navigationProperty<any>(field.name);
      let annots = this._annotations !== null ? 
        this._annotations.related(name) : undefined;
      this._relationships[field.name] = field.collection ? 
        nav.toCollection(this._entity[field.name], annots) : nav.toModel(this._entity[field.name], annots);
    }
    return this._relationships[field.name];
  }

  protected setNavigationProperty<R, Rm extends ODataModel<R>>(name: string, model: Rm | null): Observable<this> {
    let field = this._resource.meta().fields().find(f => f.name === name);
    if (field.collection)
      throw new Error(`Can't set ${field.name} to collection, use add`);
    let ref = this.navigationProperty<R>(name).reference();
    let etag = (this._annotations as ODataEntityAnnotations).etag;
    // TODO: change the resource of a model 
    delete this._relationships[field.name];
    if (model instanceof ODataModel) {
      return ref.set(model._resource as ODataEntityResource<R>, { etag });
    } else if (model === null)
      return ref.remove({etag});
  }

  // Query options
  get query() {
    let resource = this._resource as ODataEntityResource<T>;
    return {
      select(select?: Select<T>) { return resource.select(select); },
      expand(expand?: Expand<T>) { return resource.expand(expand); },
    }
  }
}
