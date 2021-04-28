import { map, tap } from 'rxjs/operators';
import { Observable, NEVER, of, Subscription, merge, throwError, EMPTY } from 'rxjs';

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
  Select,
  Expand,
  OptionHandler,
  Transform,
  Filter,
  OrderBy,
  HttpCallableOptions,
} from '../resources/index';

import { ApplicationRef, EventEmitter } from '@angular/core';
import { ODataStructuredType } from '../schema/structured-type';
import { EntityKey } from '../types';
import { Types } from '../utils/types';
import { CID, ODataModel } from './model';
import {
  EntitySelect,
  ODataCollectionResource,
  ODataModelEvent,
} from './options';

export class ODataCollection<T, M extends ODataModel<T>>
  implements Iterable<M> {
  private _resource?: ODataCollectionResource<T>;
  private _schema?: ODataStructuredType<T>;
  private _meta!: ODataEntitiesMeta;
  private _entries: {
    model: M;
    key?: EntityKey<T> | {[name: string]: any};
    subscription: Subscription;
  }[] = [];

  models() {
    return this._entries.map((m) => m.model);
  }

  get length(): number {return this._entries.length;}

  //Events
  events$ = new EventEmitter<ODataModelEvent<T>>();
  constructor(
    entities: Partial<T>[] | {[name: string]: any}[] = [],
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
    entities = entities || [];

    this.resource(resource);
    this.schema(schema);
    this.meta(meta || new ODataEntitiesMeta({ options: resource?.api.options }));
    this.assign(entities, { reset });
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

      const current = this._resource;
      const schema = resource.schema;
      if (schema !== undefined) this.schema(schema);

      this._entries.forEach(({ model }) => {
        const mr = model.resource();
        if (mr === undefined || !mr.isParentOf(resource)) {
          const er = resource.entity( model.toEntity({ field_mapping: true }) as T);
          model.resource(er);
        }
      });

      this._resource = resource;
      this.events$.emit({ name: 'attach', collection: this, previous: current, value: resource });
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
    entity: Partial<T> | {[name: string]: any},
    { reset = false }: { reset?: boolean } = {}
  ): M {
    const meta = new ODataEntityMeta({data: entity, options: this._meta.options });
    const attrs = meta.attributes<T>(entity);
    let schema = this.schema();
    const resource = this.resource();
    if (resource instanceof ODataEntitySetResource) {
      return resource.entity(entity as EntityKey<T>).asModel(attrs, { meta, reset });
    } else if (resource instanceof ODataNavigationPropertyResource) {
      return resource
        .key(schema?.resolveKey(entity) as EntityKey<T>)
        .asModel(attrs, { meta, reset });
    } else if (resource !== undefined) {
      resource.api
      return resource.asModel(attrs, { meta, reset });
    }
    if (meta?.type !== undefined) {
      schema = schema?.schema.api.findStructuredTypeForType(meta.type);
    }
    const Model = schema?.model || ODataModel;
    return new Model(attrs, { schema, meta, parse: reset }) as M;
  }

  toEntities({
    client_id = false,
    include_navigation = false,
    changes_only = false,
    field_mapping = false,
    select,
  }: {
    client_id?: boolean;
    include_navigation?: boolean;
    changes_only?: boolean;
    field_mapping?: boolean;
    select?: EntitySelect<T>;
  } = {}) {
    return this._entries.map(({model}) =>
      model.toEntity({
        client_id,
        include_navigation,
        changes_only,
        field_mapping,
        select,
      })
    );
  }

  clone() {
    let resource: ODataCollectionResource<T> | undefined;
    let meta: ODataEntitiesMeta | undefined;
    if (this._resource) resource = this._resource.clone();
    if (this._meta) meta = this._meta.clone();
    let Ctor = <typeof ODataCollection>this.constructor;
    return new Ctor(this.toEntities({include_navigation: true}), { resource, meta });
  }
  fetch({
    withCount = true,
    ...options
  }: HttpOptions & {
    withCount?: boolean;
  } = {}): Observable<this> {
    const resource = this.resource();
    if (resource === undefined)
      return throwError("fetch: Resource is undefined");

    let obs$: Observable<ODataEntities<any>>;
    if (resource instanceof ODataEntitySetResource) {
      obs$ = resource.get({withCount, ...options});
    } else if (resource instanceof ODataNavigationPropertyResource) {
      obs$ = resource.get({responseType: 'entities', withCount, ...options});
    } else {
      obs$ = resource.get({responseType: 'entities', withCount, ...options});
    }
    this.events$.emit({ name: 'request', collection: this, value: obs$ });
    return obs$.pipe(
      map(({ entities, meta }) => {
        this.meta(meta);
        this.assign(entities || [], { reset: true });
        this.events$.emit({ name: 'sync', collection: this });
        return this;
      })
    );
  }
  fetchAll(options?: HttpOptions): Observable<this> {
    const resource = this.resource();
    if (resource === undefined)
      return throwError("fetchAll: Resource is undefined");

    if (resource instanceof ODataPropertyResource)
      return throwError("fetchAll: Resource is ODataPropertyResource");

    const obs$ = resource.fetchAll(options);
    this.events$.emit({ name: 'request', collection: this, value: obs$ });
    return obs$.pipe(
      map((entities) => {
        this.meta(new ODataEntitiesMeta({ options: resource?.api.options }));
        this.assign(entities || [], { reset: true });
        this.events$.emit({ name: 'sync', collection: this });
        return this;
      }));
  }
  add(model: M): Observable<this> {
    const key = model.key();
    let obs$: Observable<this> = of(this);
    let resource = this.resource();
    if (
      key !== undefined &&
      resource !== undefined &&
      resource instanceof ODataNavigationPropertyResource
    ) {
      var target = model.resource() as ODataEntityResource<T>;
      target.clearQuery();
      obs$ = resource
        .reference()
        .add(target)
        .pipe(map(() => this));
    }
    return obs$.pipe(
      map((col) => {
        if (model.resource() === undefined && resource !== undefined) {
          model.resource(
            resource.entity(model.toEntity({ field_mapping: true }) as T)
          );
        }
        this._entries.push({
          model,
          key: model.key(),
          subscription: this._subscribe(model),
        });
        model.events$.emit({ name: 'add', model, collection: this });
        this.events$.emit({ name: 'update', collection: this });
        return col;
      })
    );
  }
  remove(model: M): Observable<this> {
    const key = model.key();
    let obs$: Observable<this> = of(this);
    let resource = this.resource();
    if (
      key !== undefined &&
      resource !== undefined &&
      resource instanceof ODataNavigationPropertyResource
    ) {
      var target = model.resource() as ODataEntityResource<T>;
      target.clearQuery();
      obs$ = resource
        .reference()
        .remove(target)
        .pipe(map(() => this));
    }
    const index = this.indexOf(model);
    if (index !== -1) {
      obs$ = obs$.pipe(
        map((col) => {
          const entry = this._entries[index];
          // Emit Event
          model.events$.emit({ name: 'remove', model, collection: this });
          // Now remove
          this._entries.splice(index, 1);
          entry.subscription.unsubscribe();
          this.events$.emit({ name: 'update', collection: this });
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
  _count() {
    let obs$: Observable<number> = NEVER;
    const resource = this.resource();
    if (
      resource instanceof ODataEntitySetResource ||
      resource instanceof ODataNavigationPropertyResource
    )
      obs$ = resource.count().fetch();
    return obs$;
  }

  set(path: string | string[], value: any) {
    const pathArray = (Types.isArray(path)
      ? path
      : (path as string).match(/([^[.\]])+/g)) as any[];
    if (pathArray.length === 0) return undefined;
    if (pathArray.length > 1) {
      const model = this._entries[Number(pathArray[0])].model;
      return model.set(pathArray.slice(1), value);
    }
    if (pathArray.length === 1 && value instanceof ODataModel) {
      const index = Number(pathArray[0]);
      const entry = this._entries[index];
      if (entry !== undefined) {
        var model = entry.model;
        model.events$.emit({ name: 'remove', model, collection: this });
        entry.subscription.unsubscribe();
      }
      this._entries[index] = {
        key: value.key() as EntityKey<T>,
        model: value as M,
        subscription: this._subscribe(value as M),
      };
      value.events$.emit({ name: 'add', model: value, collection: this });
      this.events$.emit({ name: 'update', collection: this });
      return value;
    }
  }

  get(path: string | string[] | number): any {
    const pathArray = (Types.isArray(path)
      ? path
      : (`${path}`).match(/([^[.\]])+/g)) as any[];
    if (pathArray.length === 0) return undefined;
    const value = this._entries[Number(pathArray[0])].model;
    if (pathArray.length > 1 && value instanceof ODataModel) {
      return value.get(pathArray.slice(1));
    }
    return value;
  }

  assign(entities: Array<Partial<T> | {[name: string]: any}>, { reset = false, silent = false }: { reset?: boolean, silent?: boolean } = {}) {
    if (reset) {
      this._entries.forEach((e) => e.subscription.unsubscribe());
      const models = entities.map(entity => this._modelFactory(entity as Partial<T> | {[name: string]: any}, { reset }));
      this._entries = models.map(model => {
        return {
          model,
          key: model.key(),
          subscription: this._subscribe(model),
        };
      });
      if (!silent)
        this.events$.emit({ name: 'reset', collection: this });
    } else {
      let modelMap: string[] = [];
      entities.forEach((attrs) => {
        const key = this.schema()?.resolveKey(attrs);
        const cid = (<any>attrs)[CID];
        const entry = this._findEntry({cid, key});
        if (entry !== undefined) {
          // Assign
          entry.model.assign(attrs, {reset, silent});
          modelMap.push(entry.model[CID]);
        } else {
          // Add
          const model = this._modelFactory(attrs, {reset});
          this._entries.push({
            model,
            key: model.key(),
            subscription: this._subscribe(model)
          });
          modelMap.push(model[CID]);
          if (!silent)
            model.events$.emit({name: 'add', model, collection: this});
        }
      });
      this._entries.filter(e => modelMap.indexOf(e.model[CID]) === -1).forEach(entry => {
        const model = entry.model;
        const index = this._entries.indexOf(entry);
        // Emit Event
        model.events$.emit({ name: 'remove', model, collection: this });
        // Now remove
        this._entries.splice(index, 1);
        entry.subscription.unsubscribe();
      });
      this.events$.emit({ name: 'update', collection: this });
    }
  }

  query(
    func: (q: {
      select(opts?: Select<T>): OptionHandler<Select<T>>;
      expand(opts?: Expand<T>): OptionHandler<Expand<T>>;
      transform(opts?: Transform<T>): OptionHandler<Transform<T>>;
      search(opts?: string): OptionHandler<string>;
      filter(opts?: Filter): OptionHandler<Filter>;
      orderBy(opts?: OrderBy<T>): OptionHandler<OrderBy<T>>;
      format(opts?: string): OptionHandler<string>;
      top(opts?: number): OptionHandler<number>;
      skip(opts?: number): OptionHandler<number>;
      skiptoken(opts?: string): OptionHandler<string>;
    }) => void
  ) {
    const resource = this.resource();
    if (resource === undefined)
      throw new Error(`Can't query without ODataResource`);
    func(resource.query);
    this.resource(resource);
  }
  private _call<P, R>(
    params: P | null,
    resource: ODataFunctionResource<P, R> | ODataActionResource<P, R>,
    responseType: 'property' | 'model' | 'collection' | 'none',
    { expand, select, ...options }: HttpCallableOptions<R> = {}
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
    options?: HttpCallableOptions<R>
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
    options?: HttpCallableOptions<R>
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    if (this._resource instanceof ODataEntitySetResource) {
      const resource = this._resource.action<P, R>(name);
      return this._call(params, resource, responseType, options);
    }
    throw new Error(`Can't action without ODataEntitySetResource`);
  }

  private _subscribe(model: M) {
    const cr = this.resource();
    const mr = model.resource();
    const bubbling = mr === undefined || cr === undefined || !mr.isParentOf(cr);
    return model.events$.subscribe((event: ODataModelEvent<T>) => {
      if (bubbling) {
        const index = this.indexOf(model);
        let path = `[${index}]`;
        if (event.path)
          path = `${path}.${event.path}`;
        if (event.name === 'destroy' && event.model === model)
          this.remove(model).toPromise();
        if (event.name === 'change' && event.model === model) {
          let entry = this._entries.find((m) => m.model === model);
          if (entry !== undefined) entry.key = model.key();
        }
        this.events$.emit({...event, path});
      }
    });
  }

  private _findEntry({model, cid, key}: {model?: M, cid?: string, key?: EntityKey<T> | {[name: string]: any}} = {}) {
    return this._entries.find((e) => {
      const byKey = !Types.isEmpty(e.key) && Types.isEqual(e.key, key);
      const byCid = e.model[CID] === cid;
      const byModel = e.model === model;
      return byModel || byCid || byKey;
    });
  }

  //#region Collection functions
  // Iterable
  public [Symbol.iterator]() {
    let pointer = 0;
    let models = this.models();
    return {
      next(): IteratorResult<M> {
        return {
          done: pointer === models.length,
          value: models[pointer++],
        };
      },
    };
  }

  // IndexOf
  public indexOf(model: M) {
    const entry = this._findEntry({model, cid: model[CID], key: model.key()});
    return entry !== undefined ? this._entries.indexOf(entry) : -1;
  }
  //#endregion
}
