import { map, switchMap, tap } from 'rxjs/operators';
import { Observable, EMPTY, NEVER, of, Subscription, merge, throwError } from 'rxjs';

import {
  ODataEntitySetResource,
  ODataEntityResource,
  ODataNavigationPropertyResource,
  ODataEntitiesMeta,
  HttpOptions,
  HttpEntitiesOptions,
  ODataEntities,
  ODataPropertyResource,
  ODataActionResource,
  ODataFunctionResource,
  ODataEntityMeta
} from '../resources/index';

import { ODataModel, ODataModelResource } from './model';
import { EventEmitter } from '@angular/core';
import { ODataStructuredType } from '../schema/structured-type';
import { EntityKey } from '../types';
import { Types } from '../utils/types';

type ODataCollectionResource<T> = ODataEntitySetResource<T> | ODataNavigationPropertyResource<T> | ODataPropertyResource<T>;

export class ODataCollection<T, M extends ODataModel<T>> implements Iterable<M> {
  private _resource?: ODataCollectionResource<T>;
  private _schema?: ODataStructuredType<T>;
  private _meta: ODataEntitiesMeta;
  private _models: { model: M, key?: EntityKey<T>, subscriptions: Subscription[] }[] = [];

  get models() {
    return this._models.map(m => m.model);
  }

  get state() {
    return {
      top: this._meta.top,
      skip: this._meta.skip,
      skiptoken: this._meta.skiptoken,
      records: this._meta.count,
    };
  }

  //Events
  add$ = new EventEmitter<M[]>();
  remove$ = new EventEmitter<M[]>();
  change$ = new EventEmitter<M[]>();
  reset$ = new EventEmitter<M[]>();
  update$ = merge<M[]>(this.add$, this.remove$, this.change$, this.reset$);
  request$ = new EventEmitter<Observable<ODataEntities<T>>>();
  sync$ = new EventEmitter();
  invalid$ = new EventEmitter<{ model: M, errors: { [name: string]: string[] } }>();

  constructor(data: any = {}, {resource, schema, meta, reset = false}: {
    resource?: ODataCollectionResource<T>,
    schema?: ODataStructuredType<T>,
    meta?: ODataEntitiesMeta,
    reset?: boolean
  } = {}) {
    this.resource(resource);
    this.schema(schema);
    this._meta = meta || new ODataEntitiesMeta(data, {options: resource?.api.options});
    if (!Array.isArray(data))
      data = this.meta().data(data) || [];
    this.assign(data, {reset});
  }
  resource(resource?: ODataCollectionResource<T>) {
    if (resource !== undefined) {
      if (this._resource !== undefined && this._resource.type() !== resource.type() && !resource.isSubtypeOf(this._resource))
        throw new Error(`Can't reattach ${resource.type()} to ${this._resource.type()}`);

      const schema = resource.schema;
      if (schema !== undefined)
        this.schema(schema);

      this._resource = resource;
    }
    return this._resource?.clone();
  }
  schema(schema?: ODataStructuredType<T>) {
    if (schema !== undefined)
      this._schema = schema;
    return this._schema;
  }
  meta(meta?: ODataEntitiesMeta) {
    if (meta !== undefined)
      this._meta = meta;
    return this._meta;
  }
  private _modelFactory(data: T, {reset = false}: {reset?: boolean} = {}): M {
    const meta = new ODataEntityMeta(data, { options: this._meta.options });
    const attrs = meta.attributes<T>(data);
    if (this._resource) {
      return ((this._resource instanceof ODataEntitySetResource) ?
          this._resource.entity(data) :
          this._resource.clone())
            .asModel(attrs, { meta, reset });
    }
    const schema = this.schema();
    const Model = schema?.model || ODataModel;
    return new Model(attrs, { schema, meta, parse: reset }) as M;
  }

  toEntities({ include_navigation = false, changes_only = false }: { include_navigation?: boolean, changes_only?: boolean } = {}) {
    return this._models.map(m => m.model.toEntity({include_navigation, changes_only}));
  }

  clone() {
    let resource: ODataCollectionResource<T> | undefined;
    let meta: ODataEntitiesMeta | undefined;
    if (this._resource)
      resource = this._resource.clone();
    if (this._meta)
      meta = this._meta.clone();
    let Ctor = <typeof ODataCollection>this.constructor;
    return new Ctor(this.models, {resource, meta});
  }

  // Iterable
  public [Symbol.iterator]() {
    let pointer = 0;
    let models = this._models;
    return {
      next(): IteratorResult<M> {
        return {
          done: pointer === models.length,
          value: models[pointer++].model
        };
      }
    }
  }

  // Requests
  private _request(resource: ODataCollectionResource<T>, obs$: Observable<ODataEntities<any>>): Observable<this> {
    this.request$.emit(obs$);
    return obs$.pipe(
      map(({ entities, meta }) => {
        this._meta = meta;
        this.assign(entities || [], {reset: true});
        this.sync$.emit();
        return this;
      }));
  }

  fetch(
    { skip, top, skiptoken, withCount = true, ...options }: HttpOptions & { skip?: number, top?: number, skiptoken?: string, withCount?: boolean } = {}
  ): Observable<this> {
    let obs$: Observable<ODataEntities<any>> = NEVER;
    const resource = this.resource();
    if (resource !== undefined) {
      if (skip !== undefined)
        resource.query.skip(skip);
      if (top !== undefined)
        resource.query.top(top);
      if (skiptoken !== undefined)
        resource.query.skiptoken(skiptoken);
      if (resource instanceof ODataEntitySetResource) {
        obs$ = resource.get(
          Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{ withCount }, options ));
      } else if (resource instanceof ODataNavigationPropertyResource) {
        obs$ = resource.get(
          Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{ responseType: 'entities', withCount }, options ));
      } else if (resource instanceof ODataPropertyResource) {
        obs$ = resource.get(
          Object.assign<HttpEntitiesOptions, HttpOptions>(<HttpEntitiesOptions>{ responseType: 'entities', withCount }, options ));
      }
      return this._request(resource, obs$);
    }
    return throwError("Resource Error");
  }
  fetchAll(options?: HttpOptions): Observable<this> {
    let obs$: Observable<any> = NEVER;
    const resource = this.resource();
    if (resource !== undefined) {
      if (resource instanceof ODataEntitySetResource || resource instanceof ODataNavigationPropertyResource) {
        obs$ = resource.fetchAll(options)
          .pipe(map(entities => ({ entities, meta: new ODataEntitiesMeta({}, { options: resource?.api.options }) })));
      }
      return this._request(resource, obs$);
    }
    return throwError("Resource Error");
  }

  add(model: M): Observable<this> {
    const obs$ = (this._resource instanceof ODataNavigationPropertyResource) ?
      this._resource.reference().add(model.resource() as ODataEntityResource<T>).pipe(map(() => model)) :
      of(model);
    return obs$.pipe(map((model) => {
      if (this._resource instanceof ODataEntitySetResource) {
        model.resource(this._resource.entity(model.toEntity()));
      } else if (this._resource instanceof ODataNavigationPropertyResource) {
        model.resource(this._resource.key(model.toEntity()));
      }
      this._models.push({ model, key: model.key(), subscriptions: this._subscribe(model) });
      this.add$.emit([model]);
      return this;
    }));
  }

  remove(model: M): Observable<this> {
    const key = model.key();
    const obs$ = (key !== undefined && this._resource instanceof ODataNavigationPropertyResource) ?
      this._resource.reference().remove(model.resource() as ODataEntityResource<T>).pipe(map(() => model)) :
      of(model);
    return obs$.pipe(map((model) => {
      const entry = this._models.find(m => m.model === model || (!Types.isEmpty(m.key) && Types.isEqual(m.key, key)));
      if (entry !== undefined) {
        const index = this._models.indexOf(entry);
        this._models.splice(index, 1);
        entry.subscriptions.forEach(s => s.unsubscribe());
        this.remove$.emit([model]);
      }
      return this;
    }));
  }

  create(attrs: T = {} as T) {
    const model = this._modelFactory(attrs);
    return (model.valid() ? model.save() : of(model))
      .pipe(tap(model => this.add(model)));
  }

  // Count
  count() {
    let obs$: Observable<number> = NEVER;
    const resource = this.resource();
    if (resource instanceof ODataEntitySetResource || resource instanceof ODataNavigationPropertyResource)
      obs$ = resource.count().fetch();
    return obs$;
  }

  assign(data: any[] = [], {reset = false}: { reset?: boolean } = {}) {
    if (reset) {
      this._models.forEach(e => e.subscriptions.forEach(s => s.unsubscribe()));
      const models = data.map(e => this._modelFactory(e, {reset}));
      this._models = models.map(model => {
        return { model, key: model.key(), subscriptions: this._subscribe(model) };
      });
      this.reset$.emit(models);
    } else {
      data.forEach(attrs => {
        const key = this.schema()?.resolveKey(attrs);
        const entry = this._models.find(e => (!Types.isEmpty(e.key) && Types.isEqual(e.key, key)));
        if (entry !== undefined) {
          entry.model.assign(attrs, {reset});
        } else {
          const model = this._modelFactory(attrs, {reset});
          this._models.push({ model, key: model.key(), subscriptions: this._subscribe(model) });
          this.add$.emit([model]);
        }
      });
    }
  }
  get query() {
    if (!this._resource)
      throw new Error(`Can't query without ODataResource`);
    return this._resource.query;
  }
  private _call<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R> | ODataActionResource<P, R>,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options?: HttpOptions
  ) {
    switch (responseType) {
      case 'property':
        return resource.callProperty(params, options);
      case 'model':
        return resource.callModel(params, options);
      case 'collection':
        return resource.callCollection(params, options);
      default:
        return resource.call(params, options);
    }
  }

  protected callFunction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options?: HttpOptions
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    if (this._resource instanceof ODataEntitySetResource) {
      const resource = this._resource.function<P, R>(name);
      return this._call(params, resource, responseType, options);
    }
    throw new Error(`Can't function without ODataEntitySetResource`);
  }

  protected callAction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options?: HttpOptions
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    if (this._resource instanceof ODataEntitySetResource) {
      const resource = this._resource.action<P, R>(name);
      return this._call(params, resource, responseType, options);
    }
    throw new Error(`Can't action without ODataEntitySetResource`);
  }

  private _subscribe<E>(model: M) {
    const subscriptions = [];
    subscriptions.push(
      model.change$.subscribe((event: { attribute: string, value: any, previous?: any }) => this.change$.emit([model]))
    );
    subscriptions.push(
      model.destroy$.subscribe(() => this.remove(model))
    );
    subscriptions.push(
      model.invalid$.subscribe((errors: { [name: string]: string[] }) => this.invalid$.emit(Object.assign({ model }, { errors })))
    );
    return subscriptions;
  }
}
