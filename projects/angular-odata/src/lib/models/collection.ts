import { defaultIfEmpty, map, switchMap, tap } from 'rxjs/operators';
import { forkJoin, Observable, of, Subscription, throwError } from 'rxjs';

import {
  ODataEntitySetResource,
  ODataEntityResource,
  ODataNavigationPropertyResource,
  ODataEntitiesAnnotations,
  HttpOptions,
  ODataEntities,
  ODataPropertyResource,
  ODataEntityAnnotations,
  Select,
  Expand,
  OptionHandler,
  Transform,
  Filter,
  OrderBy,
  EntityKey,
  QueryArguments,
} from '../resources/index';

import { HttpActionOptions, HttpFunctionOptions } from '../services/index';

import { EventEmitter } from '@angular/core';
import { Types } from '../utils/types';
import { ODataModel } from './model';
import {
  BUBBLING,
  ODataCollectionResource,
  ODataModelEvent,
  ODataModelState,
  INCLUDE_ALL,
} from './options';

export class ODataCollection<T, M extends ODataModel<T>>
  implements Iterable<M>
{
  static model: typeof ODataModel | null = null;
  _resource?: ODataCollectionResource<T>;
  _annotations!: ODataEntitiesAnnotations;
  _entries: {
    state: ODataModelState;
    model: M;
    key?: EntityKey<T> | { [name: string]: any };
    subscription: Subscription;
  }[] = [];
  _model: typeof ODataModel;

  models() {
    return this._entries
      .filter((e) => e.state !== ODataModelState.Removed)
      .map((e) => e.model);
  }

  get length(): number {
    return this.models().length;
  }

  //Events
  events$ = new EventEmitter<ODataModelEvent<T>>();
  constructor(
    entities: Partial<T>[] | { [name: string]: any }[] = [],
    {
      resource,
      annots,
      model,
      reset = false,
    }: {
      resource?: ODataCollectionResource<T>;
      annots?: ODataEntitiesAnnotations;
      model?: typeof ODataModel;
      reset?: boolean;
    } = {}
  ) {
    const Klass = this.constructor as typeof ODataCollection;
    if (model === undefined && Klass.model !== null) model = Klass.model;
    if (model === undefined) throw new Error('Collection need model');
    this._model = model;

    this.resource(
      resource || this._model.meta.collectionResourceFactory({ fromSet: true })
    );
    this.annots(
      annots || new ODataEntitiesAnnotations({ options: resource?.api.options })
    );
    entities = entities || [];

    this.assign(entities, { reset, server: false });
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

      this._entries.forEach(({ model }) => {
        const mr = model.resource();
        const er = this._model.meta.modelResourceFactory({
          baseResource: resource,
        });
        if (er !== undefined && (mr === undefined || !mr.isEqualTo(er))) {
          model.resource(er);
        }
      });

      const current = this._resource;
      if (current === undefined || !current.isEqualTo(resource)) {
        this._resource = resource;
        this.events$.emit({
          name: 'attach',
          collection: this,
          previous: current,
          value: resource,
        });
      }
    }
    return this._resource?.clone();
  }

  annots(annots?: ODataEntitiesAnnotations) {
    if (annots !== undefined) this._annotations = annots;
    return this._annotations;
  }

  private modelFactory(
    data: Partial<T> | { [name: string]: any },
    { reset = false }: { reset?: boolean } = {}
  ): M {
    let Model = this._model;
    const annots = new ODataEntityAnnotations({
      data,
      options: this._annotations.options,
    });

    if (annots?.type !== undefined && Model.meta !== null) {
      let schema = Model.meta.find((o) =>
        o.isTypeOf(annots.type as string)
      )?.schema;
      if (schema !== undefined && schema.model !== undefined)
        // Change to child model
        Model = schema.model;
    }

    const resource = Model.meta.modelResourceFactory({
      baseResource: this.resource(),
      fromSet: !reset,
    });

    return new Model(data, { resource, annots, reset }) as M;
  }

  toEntities({
    client_id = false,
    include_navigation = false,
    include_concurrency = false,
    include_computed = false,
    include_key = true,
    include_non_field = false,
    changes_only = false,
    field_mapping = false,
  }: {
    client_id?: boolean;
    include_navigation?: boolean;
    include_concurrency?: boolean;
    include_computed?: boolean;
    include_key?: boolean;
    include_non_field?: boolean;
    changes_only?: boolean;
    field_mapping?: boolean;
  } = {}): (T | { [name: string]: any })[] {
    return this._entries
      .filter((e) => e.state !== ODataModelState.Removed)
      .map((entry) => {
        var changesOnly = changes_only && entry.state !== ODataModelState.Added;
        return entry.model.toEntity({
          client_id,
          include_navigation,
          include_concurrency,
          include_computed,
          include_key,
          include_non_field,
          field_mapping,
          changes_only: changesOnly,
        });
      });
  }

  hasChanged() {
    //TODO: Can remove every test over models ?
    return (
      this._entries.some((e) => e.state !== ODataModelState.Unchanged) ||
      this.models().some((m) => m.hasChanged())
    );
  }

  clone() {
    let resource: ODataCollectionResource<T> | undefined;
    let annots: ODataEntitiesAnnotations | undefined;
    if (this._resource) resource = this._resource.clone();
    if (this._annotations) annots = this._annotations.clone();
    let Ctor = <typeof ODataCollection>this.constructor;
    return new Ctor(this.toEntities(INCLUDE_ALL), { resource, annots });
  }

  fetch({
    withCount,
    ...options
  }: HttpOptions & {
    withCount?: boolean;
  } = {}): Observable<this> {
    const resource = this.resource();
    if (resource === undefined)
      return throwError('fetch: Resource is undefined');

    let obs$: Observable<ODataEntities<any>>;
    if (resource instanceof ODataEntitySetResource) {
      obs$ = resource.get({ withCount, ...options });
    } else if (resource instanceof ODataNavigationPropertyResource) {
      obs$ = resource.get({ responseType: 'entities', withCount, ...options });
    } else {
      obs$ = resource.get({ responseType: 'entities', withCount, ...options });
    }
    this.events$.emit({ name: 'request', collection: this, value: obs$ });
    return obs$.pipe(
      map(({ entities, annots }) => {
        this.annots(annots);
        this.assign(entities || [], { reset: true, server: false });
        this.events$.emit({ name: 'sync', collection: this });
        return this;
      })
    );
  }

  fetchAll(options?: HttpOptions): Observable<this> {
    const resource = this.resource();
    if (resource === undefined)
      return throwError('fetchAll: Resource is undefined');

    if (resource instanceof ODataPropertyResource)
      return throwError('fetchAll: Resource is ODataPropertyResource');

    const obs$ = resource.fetchAll(options);
    this.events$.emit({ name: 'request', collection: this, value: obs$ });
    return obs$.pipe(
      map((entities) => {
        this.annots(
          new ODataEntitiesAnnotations({ options: resource?.api.options })
        );
        this.assign(entities || [], { reset: true, server: false });
        this.events$.emit({ name: 'sync', collection: this });
        return this;
      })
    );
  }

  save({
    asModel = false,
    method,
    ...options
  }: HttpOptions & {
    asModel?: boolean;
    method?: 'update' | 'patch';
  } = {}): Observable<this> {
    const resource = this.resource();
    if (resource === undefined)
      return throwError('saveAll: Resource is undefined');

    if (resource instanceof ODataPropertyResource)
      return throwError('fetchAll: Resource is ODataPropertyResource');

    let changes = this._entries.map((entry) => {
      const model = entry.model;
      if (entry.state === ODataModelState.Removed) {
        return asModel
          ? model.destroy({ asEntity: true, ...options })
          : this.removeReference(model, options);
      } else if (entry.state === ODataModelState.Added) {
        return asModel
          ? model.save({ asEntity: true, method: 'create', ...options })
          : this.addReference(model, options);
      }
      return asModel && model.hasChanged()
        ? model.save({ asEntity: true, method, ...options })
        : of(model);
    });
    return forkJoin(changes).pipe(
      map(() => {
        this._entries = this._entries
          .filter((entry) => entry.state !== ODataModelState.Removed)
          .map((entry) =>
            Object.assign(entry, { state: ODataModelState.Unchanged })
          );
        return this;
      }),
      defaultIfEmpty(this)
    );
  }

  protected addReference(model: M, options?: HttpOptions): Observable<M> {
    const resource = this.resource();
    if (
      model.key() === undefined ||
      !(resource instanceof ODataNavigationPropertyResource)
    )
      return throwError("addReference: Can't add reference");
    return resource
      .reference()
      .add(
        model._meta.resource(model, {
          toEntity: true,
        }) as ODataEntityResource<T>,
        options
      )
      .pipe(map(() => model));
  }

  private _addModel(
    model: M,
    {
      silent = false,
      reset = false,
    }: { silent?: boolean; reset?: boolean } = {}
  ): M | undefined {
    const key = model.key();
    let entry = this._findEntry({
      model,
      key,
      cid: (<any>model)[this._model.meta.cid],
    });
    if (entry === undefined || entry.state === ODataModelState.Removed) {
      if (model.resource() === undefined) {
        model.resource(
          this._model.meta.modelResourceFactory({
            baseResource: this.resource(),
          })
        );
      }
      if (entry !== undefined && entry.state === ODataModelState.Removed) {
        const index = this._entries.indexOf(entry);
        this._entries.splice(index, 1);
      }

      entry = {
        state: reset ? ODataModelState.Unchanged : ODataModelState.Added,
        model,
        key: model.key(),
        subscription: this._subscribe(model),
      };

      this._entries.push(entry);

      if (!silent) {
        model.events$.emit({ name: 'add', model, collection: this });
      }
      return entry.model;
    }
    return undefined;
  }
  protected addModel(
    model: M,
    {
      silent = false,
      reset = false,
    }: { silent?: boolean; reset?: boolean } = {}
  ) {
    const added = this._addModel(model, { silent, reset });
    if (!silent && added !== undefined) {
      this.events$.emit({
        name: 'update',
        collection: this,
        options: { added: [added], removed: [], merged: [] },
      });
    }
  }

  add(
    model: M,
    {
      silent = false,
      server = true,
    }: { silent?: boolean; server?: boolean } = {}
  ): Observable<this> {
    if (server) {
      return this.addReference(model).pipe(
        map((model) => {
          this.addModel(model, { silent, reset: true });
          return this;
        })
      );
    } else {
      this.addModel(model, { silent });
      return of(this);
    }
  }

  protected removeReference(model: M, options?: HttpOptions): Observable<M> {
    const resource = this.resource();
    if (
      model.key() === undefined ||
      !(resource instanceof ODataNavigationPropertyResource)
    )
      return throwError("removeReference: Can't remove reference");
    return resource
      .reference()
      .remove(
        model._meta.resource(model, {
          toEntity: true,
        }) as ODataEntityResource<T>,
        options
      )
      .pipe(map(() => model));
  }

  private _removeModel(
    model: M,
    {
      silent = false,
      reset = false,
    }: { silent?: boolean; reset?: boolean } = {}
  ): M | undefined {
    const key = model.key();
    let entry = this._findEntry({
      model,
      key,
      cid: (<any>model)[this._model.meta.cid],
    });
    if (entry !== undefined && entry.state !== ODataModelState.Removed) {
      // Emit Event
      if (!silent)
        model.events$.emit({ name: 'remove', model, collection: this });

      // Now remove
      if (reset || entry.state === ODataModelState.Added) {
        const index = this._entries.indexOf(entry);
        this._entries.splice(index, 1);
      } else {
        entry.state = ODataModelState.Removed;
      }
      entry.subscription.unsubscribe();
      return entry.model;
    }
    return undefined;
  }
  protected removeModel(
    model: M,
    {
      silent = false,
      reset = false,
    }: { silent?: boolean; reset?: boolean } = {}
  ) {
    const removed = this._removeModel(model, { silent, reset });
    if (!silent && removed !== undefined) {
      this.events$.emit({
        name: 'update',
        collection: this,
        options: { added: [], removed: [removed], merged: [] },
      });
    }
  }

  remove(
    model: M,
    {
      silent = false,
      server = true,
    }: { silent?: boolean; server?: boolean } = {}
  ): Observable<this> {
    if (server) {
      return this.removeReference(model).pipe(
        map((model) => {
          this.removeModel(model, { silent, reset: true });
          return this;
        })
      );
    } else {
      this.removeModel(model, { silent });
      return of(this);
    }
  }

  create(
    attrs: T = {} as T,
    {
      silent = false,
      server = true,
    }: { silent?: boolean; server?: boolean } = {}
  ) {
    const model = this.modelFactory(attrs);
    return (model.valid() && server ? model.save() : of(model)).pipe(
      tap((model) => this.add(model, { silent, server }))
    );
  }

  set(path: string | string[], value: any) {
    const Model = this._model;
    const pathArray = (
      Types.isArray(path) ? path : (path as string).match(/([^[.\]])+/g)
    ) as any[];
    if (pathArray.length === 0) return undefined;
    if (pathArray.length > 1) {
      const model = this._entries[Number(pathArray[0])].model;
      return model.set(pathArray.slice(1), value);
    }
    if (pathArray.length === 1 && Model.meta.isModel(value)) {
      let toAdd: M[] = [];
      let toMerge: M[] = [];
      let toRemove: M[] = [];
      let index = Number(pathArray[0]);
      const model = this.models()[index];
      const entry = this._findEntry({ model });
      if (entry !== undefined) {
        //TODO: Remove/Add or Merge?
        // Merge
        entry.model.assign(value.toEntity({ client_id: true, ...INCLUDE_ALL }));
        if (entry.model.hasChanged()) toMerge.push(model);
      } else {
        // Add
        this._addModel(value);
        toAdd.push(model);
      }
      this.events$.emit({
        name: 'update',
        collection: this,
        options: { added: toAdd, removed: toRemove, merged: toMerge },
      });
      return value;
    }
  }

  get(path: string | string[] | number): any {
    const Model = this._model;
    const pathArray = (
      Types.isArray(path) ? path : `${path}`.match(/([^[.\]])+/g)
    ) as any[];
    if (pathArray.length === 0) return undefined;
    const value = this._entries[Number(pathArray[0])].model;
    if (pathArray.length > 1 && Model.meta.isModel(value)) {
      return value.get(pathArray.slice(1));
    }
    return value;
  }

  assign(
    objects: Array<Partial<T> | { [name: string]: any } | M>,
    {
      reset = false,
      silent = false,
    }: { server?: boolean; reset?: boolean; silent?: boolean } = {}
  ) {
    const Model = this._model;

    let toAdd: M[] = [];
    let toMerge: M[] = [];
    let toRemove: M[] = [];
    let modelMap: string[] = [];
    objects.forEach((obj) => {
      const isModel = Model.meta.isModel(obj);
      const key =
        Model !== null && Model.meta ? Model.meta.resolveKey(obj) : undefined;
      const cid =
        Model.meta.cid in obj ? (<any>obj)[Model.meta.cid] : undefined;
      // Try find entry
      const entry = isModel
        ? this._findEntry({ model: obj as M }) // By Model
        : this._findEntry({ cid, key }); // By Cid or Key

      let model: M;
      if (entry !== undefined) {
        // Merge
        model = entry.model;
        if (model !== obj) {
          // TODO: annots ?
          // Get entity from model
          const entity = isModel
            ? (obj as M).toEntity({ client_id: true, ...INCLUDE_ALL })
            : model.annots().attributes<T>(obj, 'full');
          model.assign(entity, { reset, silent });
          if (model.hasChanged()) toMerge.push(model);
        }
      } else {
        // Add
        model = isModel
          ? (obj as M)
          : this.modelFactory(obj as Partial<T> | { [name: string]: any }, {
              reset,
            });
        toAdd.push(model);
      }
      modelMap.push((<any>model)[Model.meta.cid]);
    });
    this._entries
      .filter((e) => modelMap.indexOf((<any>e.model)[Model.meta.cid]) === -1)
      .forEach((entry) => {
        toRemove.push(entry.model);
      });

    toRemove.forEach((m) => this._removeModel(m, { silent, reset }));
    toAdd.forEach((m) => this._addModel(m, { silent, reset }));

    if (
      !silent &&
      (toAdd.length > 0 || toRemove.length > 0 || toMerge.length > 0)
    ) {
      this.events$.emit({
        name: reset ? 'reset' : 'update',
        collection: this,
        options: { added: toAdd, removed: toRemove, merged: toMerge },
      });
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
      paging({
        skip,
        skiptoken,
        top,
      }: {
        skip?: number;
        skiptoken?: string;
        top?: number;
      }): void;
      clearPaging(): void;
      apply(query: QueryArguments<T>): void;
    }) => void
  ) {
    const resource = this.resource();
    if (resource === undefined)
      throw new Error(`Can't query without ODataResource`);
    func(resource.query);
    this.resource(resource);
  }

  protected callFunction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    {
      asEntitySet,
      ...options
    }: {
      asEntitySet?: boolean;
    } & HttpFunctionOptions<R> = {}
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = this._model.meta.collectionResourceFactory({
      baseResource: this._resource,
      fromSet: asEntitySet,
    });
    if (resource instanceof ODataEntitySetResource) {
      const func = resource.function<P, R>(name);
      func.query.apply(options);
      switch (responseType) {
        case 'property':
          return func.callProperty(params, options);
        case 'model':
          return func.callModel(params, options);
        case 'collection':
          return func.callCollection(params, options);
        default:
          return func.call(params, { responseType, ...options });
      }
    }
    return throwError(`Can't function without ODataEntitySetResource`);
  }

  protected callAction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    {
      asEntitySet,
      ...options
    }: {
      asEntitySet?: boolean;
    } & HttpActionOptions<R> = {}
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = this._model.meta.collectionResourceFactory({
      baseResource: this._resource,
      fromSet: asEntitySet,
    });
    if (resource instanceof ODataEntitySetResource) {
      const action = resource.action<P, R>(name);
      action.query.apply(options);
      switch (responseType) {
        case 'property':
          return action.callProperty(params, options);
        case 'model':
          return action.callModel(params, options);
        case 'collection':
          return action.callCollection(params, options);
        default:
          return action.call(params, { responseType, ...options });
      }
    }
    return throwError(`Can't action without ODataEntitySetResource`);
  }

  private _subscribe(model: M) {
    const cr = this.resource();
    const mr = model.resource();
    const bubbling = mr === undefined || cr === undefined || !mr.isParentOf(cr);
    return model.events$.subscribe((event: ODataModelEvent<T>) => {
      if (bubbling && BUBBLING.indexOf(event.name) !== -1) {
        if (event.model === model) {
          if (event.name === 'destroy') {
            this.removeModel(model, { reset: true });
          } else if (event.name === 'change' && event.options?.key) {
            let entry = this._findEntry({ model });
            if (entry !== undefined) entry.key = model.key();
          }
        }

        const index = this.models().indexOf(model);
        let path = `[${index}]`;
        if (event.path) path = `${path}.${event.path}`;
        this.events$.emit({ ...event, path });
      }
    });
  }

  private _findEntry({
    model,
    cid,
    key,
  }: {
    model?: ODataModel<T>;
    cid?: string;
    key?: EntityKey<T> | { [name: string]: any };
  } = {}) {
    return this._entries.find((entry) => {
      const byModel = model !== undefined && entry.model.equals(model);
      const byCid =
        cid !== undefined && (<any>entry.model)[this._model.meta.cid] === cid;
      const byKey =
        key !== undefined &&
        entry.key !== undefined &&
        Types.isEqual(entry.key, key);
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

  contains(model: M) {
    return this.models().some((m) => m.equals(model));
  }

  filter(predicate: (m: M) => boolean): M[] {
    return this.models().filter(predicate);
  }
  //#endregion
}
