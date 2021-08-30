import { map, switchMap } from 'rxjs/operators';
import { forkJoin, Observable, of, throwError } from 'rxjs';

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
  HttpQueryOptions,
} from '../resources/index';

import { EventEmitter } from '@angular/core';
import { Types } from '../utils/types';
import { ODataModel } from './model';
import {
  BUBBLING,
  ODataModelResource,
  ODataCollectionResource,
  ODataModelOptions,
  ODataModelEvent,
  ODataModelField,
  ODataModelState,
  ODataModelEntry,
  INCLUDE_ALL,
} from './options';

export class ODataCollection<T, M extends ODataModel<T>>
  implements Iterable<M>
{
  static model: typeof ODataModel | null = null;
  _parent:
    | [
        ODataModel<any> | ODataCollection<any, ODataModel<any>>,
        ODataModelField<any> | null
      ]
    | null = null;
  _resource?: ODataCollectionResource<T>;
  _annotations!: ODataEntitiesAnnotations;
  _entries: ODataModelEntry<T, M>[] = [];
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
      parent,
      resource,
      annots,
      model,
      reset = false,
    }: {
      parent?: [ODataModel<any>, ODataModelField<any>];
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

    // Parent
    if (parent !== undefined) {
      this._parent = parent;
    } else {
      // Resource
      resource = resource || this._model.meta.collectionResourceFactory();
      if (resource === undefined)
        throw new Error(`Can't create collection without resource`);
      this.attach(resource);
    }

    // Annotations
    this._annotations =
      annots ||
      new ODataEntitiesAnnotations({ options: resource?.api.options });

    entities = entities || [];
    this.assign(entities, { reset });
  }

  isParentOf(
    child: ODataModel<any> | ODataCollection<any, ODataModel<any>>
  ): boolean {
    return (
      child !== this &&
      ODataModelOptions.chain(child).some((p) => p[0] === this)
    );
  }

  resource(): ODataCollectionResource<T> {
    return ODataModelOptions.resource<T>(this) as ODataCollectionResource<T>;
  }

  attach(resource: ODataCollectionResource<T>) {
    if (
      this._resource !== undefined &&
      this._resource.type() !== resource.type() &&
      !resource.isSubtypeOf(this._resource)
    )
      throw new Error(
        `Can't reattach ${resource.type()} to ${this._resource.type()}`
      );

    this._entries.forEach(({ model }) => {
      const mr = this._model.meta.modelResourceFactory({
        baseResource: resource,
      }) as ODataModelResource<T>;
      model.attach(mr);
    });

    const current = this._resource;
    if (current === undefined || !current.isEqualTo(resource)) {
      if (resource instanceof ODataEntitySetResource) {
        this._parent = null;
      }
      this._resource = resource;
      this.events$.emit(
        new ODataModelEvent('attach', {
          collection: this,
          previous: current,
          value: resource,
        })
      );
    }
  }

  /*
  attachToEntitySet() {
    this.attach(
      this._model.meta.collectionResourceFactory({
        baseResource: this._resource,
      })
    );
  }
  */

  asEntitySet<R>(func: (collection: this) => Observable<R>): Observable<R> {
    const parent = this._parent;
    this._parent = null;
    const ret = func(this);
    this._parent = parent;
    return ret;
  }

  annots() {
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
      let schema = Model.meta.findChildOptions((o) =>
        o.isTypeOf(annots.type as string)
      )?.schema;
      if (schema !== undefined && schema.model !== undefined)
        // Change to child model
        Model = schema.model;
    }

    return new Model(data, {
      annots,
      reset,
      parent: [this, null],
    }) as M;
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
    chain = [],
  }: {
    client_id?: boolean;
    include_navigation?: boolean;
    include_concurrency?: boolean;
    include_computed?: boolean;
    include_key?: boolean;
    include_non_field?: boolean;
    changes_only?: boolean;
    field_mapping?: boolean;
    chain?: (ODataModel<any> | ODataCollection<any, ODataModel<any>>)[];
  } = {}): (T | { [name: string]: any })[] {
    return this._entries
      .filter(
        ({ model, state }) =>
          state !== ODataModelState.Removed && chain.every((c) => c !== model)
      )
      .map(({ model, state }) => {
        var changesOnly = changes_only && state !== ODataModelState.Added;
        return model.toEntity({
          client_id,
          include_navigation,
          include_concurrency,
          include_computed,
          include_key,
          include_non_field,
          field_mapping,
          changes_only: changesOnly,
          chain: [this, ...chain],
        });
      });
  }

  hasChanged({ include_navigation }: { include_navigation?: boolean } = {}) {
    return (
      this._entries.some((e) => e.state !== ODataModelState.Unchanged) ||
      this.models().some((m) => m.hasChanged({ include_navigation }))
    );
  }

  clone() {
    let Ctor = <typeof ODataCollection>this.constructor;
    return new Ctor(this.toEntities(INCLUDE_ALL), {
      resource: this.resource() as ODataCollectionResource<T>,
      annots: this.annots(),
    });
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
    this.events$.emit(
      new ODataModelEvent('request', { collection: this, value: obs$ })
    );
    return obs$.pipe(
      map(({ entities, annots }) => {
        this._annotations = annots;
        this.assign(entities || [], { reset: true });
        this.events$.emit(new ODataModelEvent('sync', { collection: this }));
        return this;
      })
    );
  }

  fetchAll(options?: HttpOptions): Observable<this> {
    const resource = this.resource() as ODataCollectionResource<T> | undefined;
    if (resource === undefined)
      return throwError('fetchAll: Resource is undefined');

    if (resource instanceof ODataPropertyResource)
      return throwError('fetchAll: Resource is ODataPropertyResource');

    const obs$ = resource.fetchAll(options);
    this.events$.emit(
      new ODataModelEvent('request', {
        collection: this,
        options: { observable: obs$ },
      })
    );
    return obs$.pipe(
      map((entities) => {
        this._annotations = new ODataEntitiesAnnotations({
          options: resource?.api.options,
        });
        this.assign(entities || [], { reset: true });
        this.events$.emit(
          new ODataModelEvent('sync', {
            collection: this,
            options: { entities },
          })
        );
        return this;
      })
    );
  }

  /**
   * Save all models in the collection
   * @param relModel The model is relationship
   * @param method The method to use
   * @param options HttpOptions
   */
  save({
    relModel = false,
    method,
    ...options
  }: HttpOptions & {
    relModel?: boolean;
    method?: 'update' | 'patch';
  } = {}): Observable<this> {
    const resource = this.resource();
    if (resource === undefined)
      return throwError('saveAll: Resource is undefined');

    if (resource instanceof ODataPropertyResource)
      return throwError('fetchAll: Resource is ODataPropertyResource');

    let toDestroy: M[] = [];
    let toCreate: M[] = [];
    let toUpdate: M[] = [];

    this._entries.forEach((entry) => {
      const model = entry.model;
      if (entry.state === ODataModelState.Removed) {
        toDestroy.push(entry.model);
      } else if (entry.state === ODataModelState.Added) {
        toCreate.push(entry.model);
      } else if (model.hasChanged()) {
        toUpdate.push(entry.model);
      }
    });
    if (toDestroy.length > 0 || toCreate.length > 0 || toUpdate.length > 0) {
      const obs$ = forkJoin([
        ...toDestroy.map((m) =>
          relModel
            ? m.asEntity((e) => e.destroy(options))
            : this.removeReference(m, options)
        ),
        ...toCreate.map((m) =>
          relModel
            ? m.asEntity((e) => e.save({ method: 'create', ...options }))
            : m
                .asEntity((e) =>
                  e.save({ method: m.isNew() ? 'create' : method, ...options })
                )
                .pipe(switchMap((r) => this.addReference(r, options)))
        ),
        ...toUpdate.map((m) =>
          m.asEntity((e) => e.save({ method, ...options }))
        ),
      ]);
      this.events$.emit(
        new ODataModelEvent('request', {
          collection: this,
          options: { observable: obs$ },
        })
      );
      return obs$.pipe(
        map(() => {
          this._entries = this._entries
            .filter((entry) => entry.state !== ODataModelState.Removed)
            .map((entry) =>
              Object.assign(entry, { state: ODataModelState.Unchanged })
            );
          this.events$.emit(new ODataModelEvent('sync', { collection: this }));
          return this;
        })
      );
    }
    return of(this);
  }

  private addReference(model: M, options?: HttpOptions): Observable<M> {
    const resource = this.resource();
    if (!model.isNew() && resource instanceof ODataNavigationPropertyResource) {
      return resource
        .reference()
        .add(
          model._meta.entityResource(model) as ODataEntityResource<T>,
          options
        )
        .pipe(map(() => model));
    }
    return of(model);
  }

  private _addModel(
    model: M,
    {
      silent = false,
      reset = false,
      position = -1,
    }: { silent?: boolean; reset?: boolean; position?: number } = {}
  ): M | undefined {
    const key = model.key();
    let entry = this._findEntry({
      model,
      key,
      cid: (<any>model)[this._model.meta.cid],
    });
    if (entry === undefined || entry.state === ODataModelState.Removed) {
      if (entry !== undefined && entry.state === ODataModelState.Removed) {
        const index = this._entries.indexOf(entry);
        this._entries.splice(index, 1);
      }

      // Create Entry
      entry = {
        state: reset ? ODataModelState.Unchanged : ODataModelState.Added,
        model,
        key: model.key(),
        subscription: null,
      };
      // Subscribe
      this._subscribe(entry);
      // Now add
      if (position >= 0) this._entries.splice(position, 0, entry);
      else this._entries.push(entry);

      if (!silent) {
        model.events$.emit(
          new ODataModelEvent('add', { model, collection: this })
        );
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
      this.events$.emit(
        new ODataModelEvent('update', {
          collection: this,
          options: { added: [added], removed: [], merged: [] },
        })
      );
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

  private removeReference(model: M, options?: HttpOptions): Observable<M> {
    const resource = this.resource();
    if (!model.isNew() && resource instanceof ODataNavigationPropertyResource) {
      return resource
        .reference()
        .remove(
          model._meta.entityResource(model) as ODataEntityResource<T>,
          options
        )
        .pipe(map(() => model));
    }
    return of(model);
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
        model.events$.emit(
          new ODataModelEvent('remove', { model, collection: this })
        );

      // Now remove
      const index = this._entries.indexOf(entry);
      this._entries.splice(index, 1);
      if (!(reset || entry.state === ODataModelState.Added)) {
        // Move to end of array and mark as removed
        entry.state = ODataModelState.Removed;
        this._entries.push(entry);
      }
      this._unsubscribe(entry);
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
      this.events$.emit(
        new ODataModelEvent('update', {
          collection: this,
          options: { added: [], removed: [removed], merged: [] },
        })
      );
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
    return (
      model.isValid() && server ? model.asEntity((m) => m.save()) : of(model)
    ).pipe(
      switchMap((model) => this.add(model, { silent, server })),
      map(() => model)
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
    if (pathArray.length === 1 && ODataModelOptions.isModel(value)) {
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
      this.events$.emit(
        new ODataModelEvent('update', {
          collection: this,
          options: { added: toAdd, removed: toRemove, merged: toMerge },
        })
      );
      return value;
    }
  }

  get(path: string | string[] | number): any {
    const Model = this._model;
    const pathArray = (
      Types.isArray(path) ? path : `${path}`.match(/([^[.\]])+/g)
    ) as any[];
    if (pathArray.length === 0) return undefined;
    const value = this.models()[Number(pathArray[0])];
    if (pathArray.length > 1 && ODataModelOptions.isModel(value)) {
      return value.get(pathArray.slice(1));
    }
    return value;
  }

  reset({
    path,
    silent = false,
  }: { path?: string | string[]; silent?: boolean } = {}) {
    if (Types.isEmpty(path)) {
      this.models().forEach((m) => m.reset({ silent }));
    } else {
      const Model = this._model;
      const pathArray = (
        Types.isArray(path) ? path : `${path}`.match(/([^[.\]])+/g)
      ) as any[];
      const value = this.models()[Number(pathArray[0])];
      if (ODataModelOptions.isModel(value)) {
        value.reset({ path: pathArray.slice(1), silent });
      }
    }
  }

  assign(
    objects: Partial<T>[] | { [name: string]: any }[] | M[],
    {
      reset = false,
      silent = false,
    }: { reset?: boolean; silent?: boolean } = {}
  ) {
    const Model = this._model;

    let toAdd: M[] = [];
    let toMerge: M[] = [];
    let toRemove: M[] = [];
    let toSort: [M, number][] = [];
    let modelMap: string[] = [];
    objects.forEach((obj, index) => {
      const isModel = ODataModelOptions.isModel(obj);
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
          // Get entity from model
          if (isModel) {
            const entity = (obj as M).toEntity({
              client_id: true,
              ...INCLUDE_ALL,
            });
            model.assign(entity, { reset, silent });
          } else {
            const annots = new ODataEntityAnnotations({
              data: obj,
              options: this._annotations.options,
            });
            const entity = annots.attributes<T>(obj, 'full');
            model._annotations = annots;
            model.assign(entity, { reset, silent });
          }
          // Model Change?
          if (model.hasChanged()) toMerge.push(model);
        }
        // Has Sort or Index Change?
        if (toSort.length > 0 || index !== this.models().indexOf(model)) {
          toSort.push([model, index]);
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

    toRemove.forEach((m) => this._removeModel(m, { silent: silent, reset }));
    toAdd.forEach((m) => this._addModel(m, { silent: silent, reset }));
    toSort.forEach((m) => {
      this._removeModel(m[0], { silent: true, reset });
      this._addModel(m[0], { silent: true, reset, position: m[1] });
    });

    if (
      !silent &&
      (toAdd.length > 0 ||
        toRemove.length > 0 ||
        toMerge.length > 0 ||
        toSort.length > 0)
    ) {
      this.events$.emit(
        new ODataModelEvent(reset ? 'reset' : 'update', {
          collection: this,
          options: {
            added: toAdd,
            removed: toRemove,
            merged: toMerge,
            sorted: toSort,
          },
        })
      );
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
    const resource = this.resource() as ODataCollectionResource<T> | undefined;
    if (resource === undefined)
      throw new Error(`Can't query without ODataResource`);
    func(resource.query);
    this.attach(resource);
  }

  protected callFunction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    { ...options }: {} & HttpQueryOptions<R> = {}
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = this.resource();
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
    { ...options }: {} & HttpQueryOptions<R> = {}
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = this.resource();
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

  private _unsubscribe(entry: ODataModelEntry<T, M>) {
    if (entry.subscription !== null) {
      entry.model._parent = null;
      entry.subscription.unsubscribe();
      entry.subscription = null;
    }
  }

  private _subscribe(entry: ODataModelEntry<T, M>) {
    if (entry.subscription !== null) {
      throw new Error('Subscription already exists');
    }
    // Set Parent
    entry.model._parent = [this, null];
    entry.subscription = entry.model.events$.subscribe(
      (event: ODataModelEvent<T>) => {
        if (
          BUBBLING.indexOf(event.name) !== -1 &&
          event.bubbling &&
          !event.visited(this)
        ) {
          if (event.model === entry.model) {
            if (event.name === 'destroy') {
              this.removeModel(entry.model, { reset: true });
            } else if (event.name === 'change' && event.options?.key) {
              entry.key = entry.model.key();
            }
          }

          const index = this.models().indexOf(entry.model);
          event.push(this, index);
          this.events$.emit(event);
        }
      }
    );
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

  // Collection functions
  get [Symbol.toStringTag]() {
    return 'Collection';
  }

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

  //#region Sort
  private _sort(
    e1: ODataModelEntry<T, M>,
    e2: ODataModelEntry<T, M>,
    by: { field: string | keyof T; order?: 1 | -1 }[],
    index: number
  ): number {
    let value1 = e1.model.get(by[index].field as string);
    let value2 = e2.model.get(by[index].field as string);
    let result: number = 0;

    if (value1 == null && value2 != null) result = -1;
    else if (value1 != null && value2 == null) result = 1;
    else if (value1 == null && value2 == null) result = 0;
    else if (typeof value1 == 'string' || value1 instanceof String) {
      if (value1.localeCompare && value1 != value2) {
        return (by[index].order || 1) * value1.localeCompare(value2);
      }
    } else {
      result = value1 < value2 ? -1 : 1;
    }

    if (value1 == value2) {
      return by.length - 1 > index ? this._sort(e1, e2, by, index + 1) : 0;
    }

    return (by[index].order || 1) * result;
  }

  sort(
    by: { field: string | keyof T; order?: 1 | -1 }[],
    { silent }: { silent?: boolean } = {}
  ) {
    this._entries = this._entries.sort(
      (e1: ODataModelEntry<T, M>, e2: ODataModelEntry<T, M>) =>
        this._sort(e1, e2, by, 0)
    );
    if (!silent) {
      this.events$.emit(
        new ODataModelEvent('update', {
          collection: this,
        })
      );
    }
  }
  //#endregion
}
