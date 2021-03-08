import { map, tap } from 'rxjs/operators';
import { Observable, NEVER, of, Subscription, merge, throwError } from 'rxjs';

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
  ODataEntityMeta,
} from '../resources/index';

import { EventEmitter } from '@angular/core';
import { ODataStructuredType } from '../schema/structured-type';
import { EntityKey } from '../types';
import { Types } from '../utils/types';
import { ODataModel } from './model';
import {
  ODataCallableHttpOptions,
  ODataCollectionResource,
  ODataModelEvent,
} from './options';

export class ODataCollection<T, M extends ODataModel<T>>
  implements Iterable<M> {
  private _resource?: ODataCollectionResource<T>;
  private _schema?: ODataStructuredType<T>;
  private _meta: ODataEntitiesMeta;
  private _models: {
    model: M;
    key?: EntityKey<T>;
    subscription: Subscription;
  }[] = [];

  get models() {
    return this._models.map((m) => m.model);
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
  event$ = new EventEmitter<ODataModelEvent<T>>();
  constructor(
    data: any = {},
    {
      resource,
      schema,
      meta,
      reset = false,
    }: {
      resource?: ODataCollectionResource<T>;
      schema?: ODataStructuredType<T>;
      meta?: ODataEntitiesMeta;
      reset?: boolean;
    } = {}
  ) {
    this.resource(resource);
    this.schema(schema);
    this._meta =
      meta || new ODataEntitiesMeta(data, { options: resource?.api.options });
    if (!Array.isArray(data)) data = this.meta().data(data) || [];
    this.assign(data, { reset });
  }

  resource(resource?: ODataCollectionResource<T>) {
    if (resource !== undefined) {
      if (
        this._resource !== undefined &&
        this._resource.type() !== resource.type() &&
        !resource.isSubtypeOf(this._resource)
      )
        throw new Error(
          `Can't reattach ${resource.type()} to ${this._resource.type()}`
        );

      const schema = resource.schema;
      if (schema !== undefined) this.schema(schema);

      this._models.forEach(({ model }) => {
        if (resource instanceof ODataEntitySetResource) {
          const er = resource.entity(
            model.toEntity({ field_mapping: true }) as T
          );
          model.resource(er);
        } else if (resource instanceof ODataNavigationPropertyResource) {
          const er = resource.key(
            schema?.resolveKey(
              model.toEntity({ field_mapping: true })
            ) as EntityKey<T>
          );
          model.resource(er);
        }
      });

      this._resource = resource;
    }
    return this._resource?.clone();
  }

  schema(schema?: ODataStructuredType<T>) {
    if (schema !== undefined) this._schema = schema;
    return this._schema;
  }

  meta(meta?: ODataEntitiesMeta) {
    if (meta !== undefined) this._meta = meta;
    return this._meta;
  }

  private _modelFactory(
    data: T,
    { reset = false }: { reset?: boolean } = {}
  ): M {
    const meta = new ODataEntityMeta(data, { options: this._meta.options });
    const attrs = meta.attributes<T>(data);
    const schema = this.schema();
    const resource = this.resource();
    if (resource instanceof ODataEntitySetResource) {
      return resource.entity(data).asModel(attrs, { meta, reset });
    } else if (resource instanceof ODataNavigationPropertyResource) {
      return resource
        .key(schema?.resolveKey(data) as EntityKey<T>)
        .asModel(attrs, { meta, reset });
    } else if (resource !== undefined) {
      return resource.asModel(attrs, { meta, reset });
    }
    const Model = schema?.model || ODataModel;
    return new Model(attrs, { schema, meta, parse: reset }) as M;
  }

  toEntities({
    include_navigation = false,
    changes_only = false,
    field_mapping = false,
  }: {
    include_navigation?: boolean;
    changes_only?: boolean;
    field_mapping?: boolean;
  } = {}) {
    return this._models.map((m) =>
      m.model.toEntity({ include_navigation, changes_only, field_mapping })
    );
  }

  clone() {
    let resource: ODataCollectionResource<T> | undefined;
    let meta: ODataEntitiesMeta | undefined;
    if (this._resource) resource = this._resource.clone();
    if (this._meta) meta = this._meta.clone();
    let Ctor = <typeof ODataCollection>this.constructor;
    return new Ctor(this.models, { resource, meta });
  }

  // Requests
  private _request(obs$: Observable<ODataEntities<any>>): Observable<this> {
    this.event$.emit({ topic: 'request', collection: this, value: obs$ });
    return obs$.pipe(
      map(({ entities, meta }) => {
        this._meta = meta;
        this.assign(entities || [], { reset: true });
        this.event$.emit({ topic: 'sync', collection: this });
        return this;
      })
    );
  }

  fetch(
    { skip, top, skiptoken, withCount = true, ...options }: HttpOptions & { skip?: number; top?: number; skiptoken?: string; withCount?: boolean; } = {}
  ): Observable<this> {
    let obs$: Observable<ODataEntities<any>> = NEVER;
    const resource = this.resource();
    if (resource !== undefined) {
      if (skip !== undefined) resource.query.skip(skip);
      if (top !== undefined) resource.query.top(top);
      if (skiptoken !== undefined) resource.query.skiptoken(skiptoken);
      if (resource instanceof ODataEntitySetResource) {
        obs$ = resource.get(
          Object.assign<HttpEntitiesOptions, HttpOptions>(
            <HttpEntitiesOptions>{ withCount },
            options
          )
        );
      } else if (resource instanceof ODataNavigationPropertyResource) {
        obs$ = resource.get(
          Object.assign<HttpEntitiesOptions, HttpOptions>(
            <HttpEntitiesOptions>{ responseType: 'entities', withCount },
            options
          )
        );
      } else if (resource instanceof ODataPropertyResource) {
        obs$ = resource.get(
          Object.assign<HttpEntitiesOptions, HttpOptions>(
            <HttpEntitiesOptions>{ responseType: 'entities', withCount },
            options
          )
        );
      }
      return this._request(obs$);
    }
    return throwError('Resource Error');
  }
  fetchAll(options?: HttpOptions): Observable<this> {
    let obs$: Observable<any> = NEVER;
    const resource = this.resource();
    if (resource !== undefined) {
      if (
        resource instanceof ODataEntitySetResource ||
        resource instanceof ODataNavigationPropertyResource
      ) {
        obs$ = resource
          .fetchAll(options)
          .pipe(
            map((entities) => ({
              entities,
              meta: new ODataEntitiesMeta(
                {},
                { options: resource?.api.options }
              ),
            }))
          );
      }
      return this._request(obs$);
    }
    return throwError('Resource Error');
  }

  add(model: M): Observable<this> {
    let obs$: Observable<this> = of(this);
    if (this._resource instanceof ODataNavigationPropertyResource) {
      var target = model.resource() as ODataEntityResource<T>;
      target.clearQuery();
      obs$ = this._resource
        .reference()
        .add(target)
        .pipe(map(() => this));
    }
    return obs$.pipe(
      map(col => {
        if (this._resource instanceof ODataEntitySetResource) {
          model.resource(
            this._resource.entity(model.toEntity({ field_mapping: true }) as T)
          );
        } else if (this._resource instanceof ODataNavigationPropertyResource) {
          model.resource(
            this._resource.key(model.toEntity({ field_mapping: true }) as T)
          );
        }
        const index = this._models.length;
        this._models.push({
          model,
          key: model.key(),
          subscription: this._subscribe(model),
        });
        model.event$.emit({ topic: 'add', model, collection: this });
        this.event$.emit({ topic: 'update', collection: this });
        return col;
      })
    );
  }

  remove(model: M): Observable<this> {
    const key = model.key();
    let obs$: Observable<this> = of(this);
    if (
      key !== undefined &&
      this._resource instanceof ODataNavigationPropertyResource
    ) {
      var target = model.resource() as ODataEntityResource<T>;
      target.clearQuery();
      obs$ = this._resource
        .reference()
        .remove(target)
        .pipe(map(() => this));
    }
    const index = this.indexOf(model);
    if (index !== -1) {
      obs$ = obs$.pipe(
        map(col => {
            const entry = this._models[index];
            // Emit Event
            model.event$.emit({ topic: 'remove', model, collection: this });
            // Now remove
            this._models.splice(index, 1);
            entry.subscription.unsubscribe();
            this.event$.emit({ topic: 'update', collection: this });
            return col;
        })
      );
    }
    return obs$;
  }

  create(attrs: T = {} as T) {
    const model = this._modelFactory(attrs);
    return (model.valid() ? model.save() : of(model)).pipe(
      tap((model) => this.add(model))
    );
  }

  // Count
  count() {
    let obs$: Observable<number> = NEVER;
    const resource = this.resource();
    if (
      resource instanceof ODataEntitySetResource ||
      resource instanceof ODataNavigationPropertyResource
    )
      obs$ = resource.count().fetch();
    return obs$;
  }

  assign(data: any[] = [], { reset = false }: { reset?: boolean } = {}) {
    if (reset) {
      this._models.forEach((e) =>
        e.subscription.unsubscribe()
      );
      const models = data.map((e) => this._modelFactory(e, { reset }));
      this._models = models.map((model, index) => {
        return {
          model,
          key: model.key(),
          subscription: this._subscribe(model),
        };
      });
      this.event$.emit({ topic: 'reset', collection: this });
    } else {
      data.forEach((attrs) => {
        const key = this.schema()?.resolveKey(attrs);
        const entry = this._models.find(
          (e) => !Types.isEmpty(e.key) && Types.isEqual(e.key, key)
        );
        if (entry !== undefined) {
          entry.model.assign(attrs, { reset });
        } else {
          const model = this._modelFactory(attrs, { reset });
          const index = this._models.length;
          this._models.push({
            model,
            key: model.key(),
            subscription: this._subscribe(model),
          });
          model.event$.emit({ topic: 'add', model, collection: this});
        }
      });
    }
    this.event$.emit({ topic: 'update', collection: this });
  }
  get query() {
    if (!this._resource) throw new Error(`Can't query without ODataResource`);
    return this._resource.query;
  }
  private _call<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R> | ODataActionResource<P, R>,
    responseType: 'property' | 'model' | 'collection' | 'none',
    { expand, select, ...options }: ODataCallableHttpOptions<R> = {}
  ) {
    if (expand !== undefined) resource.query.expand(expand);
    if (select !== undefined) resource.query.select(select);
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
    { expand, select, ...options }: ODataCallableHttpOptions<R> = {}
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    if (this._resource instanceof ODataEntitySetResource) {
      const resource = this._resource.function<P, R>(name);
      return this._call(params, resource, responseType, {
        expand,
        select,
        ...options,
      });
    }
    throw new Error(`Can't function without ODataEntitySetResource`);
  }

  protected callAction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    { expand, select, ...options }: ODataCallableHttpOptions<R> = {}
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    if (this._resource instanceof ODataEntitySetResource) {
      const resource = this._resource.action<P, R>(name);
      return this._call(params, resource, responseType, {
        expand,
        select,
        ...options,
      });
    }
    throw new Error(`Can't action without ODataEntitySetResource`);
  }

  private _subscribe(value: M) {
    const bind = (model: M) => (event: ODataModelEvent<T>) => {
      var newEvent = {...event};
      newEvent.path = event.path ? `[${this.indexOf(model)}].${event.path}` : `[${this.indexOf(model)}]`;
      if (event.topic === 'destroy' && event.model === model)
        this.remove(model).toPromise();
      if (event.topic === 'change' && event.model === model) {
        let entry = this._models.find(m => m.model == model);
        if (entry !== undefined) entry.key === model.key();
      }
      this.event$.emit(newEvent);
    };
    return value.event$.subscribe(bind(value));
  }

  //#region Collection functions
  // Iterable
  public [Symbol.iterator]() {
    let pointer = 0;
    let models = this._models;
    return {
      next(): IteratorResult<M> {
        return {
          done: pointer === models.length,
          value: models[pointer++].model,
        };
      },
    };
  }

  // IndexOf
  public indexOf(model: M) {
    const key = model.key();
    const entry = this._models.find(e => {
      let byModel = e.model === model;
      let byKey = !Types.isEmpty(e.key) && Types.isEqual(e.key, key);
      return byModel || byKey;
    });
    return (entry !== undefined) ? this._models.indexOf(entry) : -1;
  }
  //#endregion
}
