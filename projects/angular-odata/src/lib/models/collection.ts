import { EventEmitter } from '@angular/core';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';
import { DEFAULT_VERSION } from '../constants';
import { ODataHelper } from '../helper';
import {
  EntityKey,
  ODataEntitiesAnnotations,
  ODataEntityAnnotations,
  ODataEntityResource,
  ODataEntitySetResource,
  ODataNavigationPropertyResource,
  ODataOptions,
  ODataPropertyResource,
  ODataQueryArgumentsOptions,
  ODataQueryOptionsHandler,
  ODataResource,
} from '../resources';
import { Types } from '../utils/types';
import { ODataModel } from './model';
import {
  BUBBLING,
  INCLUDE_DEEP,
  INCLUDE_SHALLOW,
  ODataModelEntry,
  ODataModelEvent,
  ODataModelField,
  ODataModelOptions,
  ODataModelState,
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
  _resource:
    | ODataEntitySetResource<T>
    | ODataNavigationPropertyResource<T>
    | ODataPropertyResource<T>
    | null = null;
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
      resource?: ODataResource<T>;
      annots?: ODataEntitiesAnnotations;
      model?: typeof ODataModel;
      reset?: boolean;
    } = {}
  ) {
    const Klass = this.constructor as typeof ODataCollection;
    if (model === undefined && Klass.model !== null) model = Klass.model;
    if (model === undefined)
      throw new Error('Collection: Collection need model');
    this._model = model;

    // Parent
    if (parent !== undefined) {
      this._parent = parent;
    }

    // Resource
    if (this._parent === null && resource === undefined)
      resource = this._model.meta.collectionResourceFactory() as
        | ODataEntitySetResource<T>
        | ODataPropertyResource<T>
        | ODataNavigationPropertyResource<T>
        | undefined;
    if (resource !== undefined) {
      this.attach(
        resource as
          | ODataEntitySetResource<T>
          | ODataPropertyResource<T>
          | ODataNavigationPropertyResource<T>
      );
    }

    // Annotations
    this._annotations =
      annots ||
      new ODataEntitiesAnnotations(
        resource?.api.options.helper || ODataHelper[DEFAULT_VERSION]
      );

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

  resource():
    | ODataEntitySetResource<T>
    | ODataNavigationPropertyResource<T>
    | ODataPropertyResource<T> {
    return ODataModelOptions.resource<T>(this) as
      | ODataEntitySetResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>;
  }

  attach(
    resource:
      | ODataEntitySetResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>
  ) {
    if (
      this._resource !== null &&
      this._resource.type() !== resource.type() &&
      !this._resource.isSubtypeOf(resource)
    )
      throw new Error(
        `attach: Can't reattach ${this._resource.type()} to ${resource.type()}`
      );

    this._entries.forEach(({ model }) => {
      const mr = this._model.meta.modelResourceFactory(
        resource.cloneQuery<T>()
      ) as ODataEntityResource<T>;
      model.attach(mr);
    });

    const current = this._resource;
    if (current === null || !current.isEqualTo(resource)) {
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

  asEntitySet<R>(func: (collection: this) => R): R {
    // Build new resource
    const query = this.resource().cloneQuery<T>();
    let resource = this._model.meta.collectionResourceFactory(query);
    if (resource === undefined)
      throw new Error(
        'asEntitySet: Collection does not have associated EntitySet endpoint'
      );
    // Store parent and resource
    const store = { parent: this._parent, resource: this._resource };
    // Replace parent and resource
    this._parent = null;
    this._resource = resource;
    // Execute
    const result = func(this);
    if (result instanceof Observable) {
      return (result as any).pipe(
        finalize(() => {
          // Restore
          this._parent = store.parent;
          this._resource = store.resource;
        })
      );
    } else {
      // Restore
      this._parent = store.parent;
      this._resource = store.resource;
      return result;
    }
  }

  annots() {
    return this._annotations;
  }

  private modelFactory(
    data: Partial<T> | { [name: string]: any },
    { reset = false }: { reset?: boolean } = {}
  ): M {
    let Model = this._model;
    const helper = this._annotations.helper;
    const annots = new ODataEntityAnnotations(helper, helper.annotations(data));

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

  toJSON() {
    return this.toEntities();
  }

  hasChanged({ include_navigation }: { include_navigation?: boolean } = {}) {
    return (
      this._entries.some((e) => e.state !== ODataModelState.Unchanged) ||
      this.models().some((m) => m.hasChanged({ include_navigation }))
    );
  }

  clone<C extends ODataCollection<T, M>>() {
    let Ctor = <typeof ODataCollection>this.constructor;
    return new Ctor(this.toEntities(INCLUDE_SHALLOW), {
      resource: this.resource(),
      annots: this.annots(),
    }) as C;
  }

  fetch({
    withCount,
    ...options
  }: ODataOptions & {
    withCount?: boolean;
  } = {}): Observable<this> {
    const resource = this.resource();

    const obs$ =
      resource instanceof ODataEntitySetResource
        ? resource.fetch({ withCount, ...options })
        : resource.fetch({
            responseType: 'entities',
            withCount,
            ...options,
          });

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

  fetchAll(options?: ODataOptions): Observable<this> {
    const resource = this.resource();
    if (resource instanceof ODataPropertyResource)
      return throwError(
        () => new Error('fetchAll: Resource is ODataPropertyResource')
      );

    const obs$ = resource.fetchAll(options);
    this.events$.emit(
      new ODataModelEvent('request', {
        collection: this,
        options: { observable: obs$ },
      })
    );
    return obs$.pipe(
      map((entities) => {
        this._annotations = new ODataEntitiesAnnotations(
          resource?.api.options.helper
        );
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
  }: ODataOptions & {
    relModel?: boolean;
    method?: 'update' | 'modify';
  } = {}): Observable<this> {
    const resource = this.resource();
    if (resource instanceof ODataPropertyResource)
      return throwError(
        () => new Error('save: Resource is ODataPropertyResource')
      );

    let toDestroyEntity: M[] = [];
    let toRemoveReference: M[] = [];
    let toDestroyContained: M[] = [];
    let toCreateEntity: M[] = [];
    let toAddReference: M[] = [];
    let toCreateContained: M[] = [];
    let toUpdateEntity: M[] = [];
    let toUpdateContained: M[] = [];

    this._entries.forEach(({ model, state }) => {
      if (state === ODataModelState.Removed) {
        if (relModel) {
          toDestroyEntity.push(model);
        } else if (!model.isNew()) {
          toRemoveReference.push(model);
        } else {
          toDestroyContained.push(model);
        }
      } else if (state === ODataModelState.Added) {
        if (relModel) {
          toCreateEntity.push(model);
        } else if (!model.isNew()) {
          toAddReference.push(model);
        } else {
          toCreateContained.push(model);
        }
      } else if (model.hasChanged()) {
        toUpdateEntity.push(model);
      }
    });
    if (
      toDestroyEntity.length > 0 ||
      toRemoveReference.length > 0 ||
      toDestroyContained.length > 0 ||
      toCreateEntity.length > 0 ||
      toAddReference.length > 0 ||
      toCreateContained.length > 0 ||
      toUpdateEntity.length > 0 ||
      toUpdateContained.length > 0
    ) {
      const obs$ = forkJoin([
        ...toDestroyEntity.map((m) => m.asEntity((e) => e.destroy(options))),
        ...toRemoveReference.map((m) => this.removeReference(m, options)),
        ...toDestroyContained.map((m) => m.destroy(options)),
        ...toCreateEntity.map((m) =>
          m.asEntity((e) => e.save({ method: 'create', ...options }))
        ),
        ...toAddReference.map((m) => this.addReference(m, options)),
        ...toCreateContained.map((m) =>
          m.save({ method: 'create', ...options })
        ),
        ...toUpdateEntity.map((m) =>
          m.asEntity((e) => e.save({ method, ...options }))
        ),
        ...toUpdateContained.map((m) => m.save({ method, ...options })),
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
            .map((entry) => ({ ...entry, state: ODataModelState.Unchanged }));
          this.events$.emit(new ODataModelEvent('sync', { collection: this }));
          return this;
        })
      );
    }
    return of(this);
  }

  private addReference(model: M, options?: ODataOptions): Observable<M> {
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
      reparent = false,
      position = -1,
    }: {
      silent?: boolean;
      reset?: boolean;
      reparent?: boolean;
      position?: number;
    } = {}
  ): M | undefined {
    const key = model.key();
    let entry = this._findEntry({
      model,
      key,
      cid: (<any>model)[this._model.meta.cid],
    });
    if (entry !== undefined && entry.state !== ODataModelState.Removed) {
      return undefined;
    }

    if (entry !== undefined && entry.state === ODataModelState.Removed) {
      const index = this._entries.indexOf(entry);
      this._entries.splice(index, 1);
    }

    // Create Entry
    entry = {
      state: reset ? ODataModelState.Unchanged : ODataModelState.Added,
      model,
      key: model.key(),
    };
    // Set Parent
    if (reparent) model._parent = [this, null];
    // Subscribe
    this._link(entry);
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

  private addModel(
    model: M,
    {
      silent = false,
      reset = false,
      reparent = false,
      position = -1,
    }: {
      silent?: boolean;
      reset?: boolean;
      reparent?: boolean;
      position?: number;
    } = {}
  ) {
    if (position < 0) position = this._bisect(model);
    const added = this._addModel(model, { silent, reset, position, reparent });
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
      reparent = false,
      server = true,
      position = -1,
    }: {
      silent?: boolean;
      reparent?: boolean;
      server?: boolean;
      position?: number;
    } = {}
  ): Observable<this> {
    if (server) {
      return this.addReference(model).pipe(
        map((model) => {
          this.addModel(model, { silent, position, reparent, reset: true });
          return this;
        })
      );
    } else {
      this.addModel(model, { silent, position, reparent });
      return of(this);
    }
  }

  private removeReference(model: M, options?: ODataOptions): Observable<M> {
    let resource = this.resource();
    if (!model.isNew() && resource instanceof ODataNavigationPropertyResource) {
      let target =
        this._model.meta.api.options.deleteRefBy === 'id'
          ? (model._meta.entityResource(model) as ODataEntityResource<T>)
          : undefined;
      if (this._model.meta.api.options.deleteRefBy === 'path') {
        resource = resource.key(model.key());
      }
      return resource
        .reference()
        .remove(target, options)
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
    if (entry === undefined || entry.state === ODataModelState.Removed) {
      return undefined;
    }

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
    this._unlink(entry);
    return entry.model;
  }

  private removeModel(
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
    return (model.isValid() && server ? model.save() : of(model)).pipe(
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
      let toChange: M[] = [];
      let toRemove: M[] = [];
      let index = Number(pathArray[0]);
      const model = this.models()[index];
      const entry = this._findEntry({ model });
      if (entry !== undefined) {
        //TODO: Remove/Add or Merge?
        // Merge
        entry.model.assign(
          value.toEntity({ client_id: true, ...INCLUDE_DEEP })
        );
        if (entry.model.hasChanged()) toChange.push(model);
      } else {
        // Add
        this._addModel(value, { reparent: true });
        toAdd.push(model);
      }
      this.events$.emit(
        new ODataModelEvent('update', {
          collection: this,
          options: { added: toAdd, removed: toRemove, changed: toChange },
        })
      );
      return value;
    }
  }

  get(path: number): M | undefined;
  get(path: string | string[]): any;
  get(path: any): any {
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
    let toAdd: ODataModelEntry<T, M>[] = [];
    let toChange: ODataModelEntry<T, M>[] = [];
    let toRemove: ODataModelEntry<T, M>[] = [];

    if (path !== undefined) {
      // Reset by path 
      const pathArray = (
        Types.isArray(path) ? path : `${path}`.match(/([^[.\]])+/g)
      ) as any[];
      const index = Number(pathArray[0]);
      if (!Number.isNaN(index)) {
        const model = this.models()[index];
        if (ODataModelOptions.isModel(model)) {
          const entry = this._findEntry({model}) as ODataModelEntry<T, M>;
          if (entry.state === ODataModelState.Changed || (entry.state === ODataModelState.Unchanged && entry.model.hasChanged())) {
            toChange = [entry];
          }
          path = pathArray.slice(1);
        }
      }
    } else {
      // Reset all
      toAdd = this._entries.filter((e) => e.state === ODataModelState.Removed);
      toChange = this._entries.filter((e) => 
        e.state === ODataModelState.Changed || (e.state === ODataModelState.Unchanged && e.model.hasChanged()));
      toRemove = this._entries.filter((e) => e.state === ODataModelState.Added);
    }

    toRemove.forEach((entry) => {
      this._removeModel(entry.model, { silent });
    });
    toAdd.forEach((entry) => {
      this._addModel(entry.model, { silent });
    });
    toChange.forEach((entry) => {
      entry.model.reset({ path, silent }); 
      entry.state = ODataModelState.Unchanged;
    });
    if (!silent && (toAdd.length > 0 || toRemove.length > 0 || toChange.length > 0)) {
      this.events$.emit(
        new ODataModelEvent('reset', {
          collection: this,
          options: {
            added: toAdd.map(e => e.model),
            removed: toRemove.map(e => e.model),
            changed: toChange.map(e => e.model),
          },
        })
      );
    }
  }
  
  clear({ silent = false, }: { silent?: boolean } = {}) {
    let toRemove: M[] = this.models();
    toRemove.forEach(m => {
      this._removeModel(m, {silent});
    });
    this._entries = [];
    if (!silent) {
      this.events$.emit(
        new ODataModelEvent('update', {
          collection: this,
          options: { removed: toRemove },
        })
      );
    }
  }

  assign(
    objects: Partial<T>[] | { [name: string]: any }[] | M[],
    {
      reset = false,
      reparent = false,
      silent = false,
    }: { reset?: boolean; reparent?: boolean; silent?: boolean } = {}
  ) {
    const Model = this._model;

    let toAdd: [M, number][] = [];
    let toChange: M[] = [];
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
              ...INCLUDE_DEEP,
            });
            model.assign(entity, { reset, silent });
          } else {
            const helper = this._annotations.helper;
            const annots = new ODataEntityAnnotations(
              helper,
              helper.annotations(obj)
            );
            const entity = annots.attributes<T>(obj, 'full');
            model._annotations = annots;
            model.assign(entity, { reset, silent });
          }
          // Model Change?
          if (model.hasChanged()) toChange.push(model);
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
        toAdd.push([model, index]);
      }
      modelMap.push((<any>model)[Model.meta.cid]);
    });

    this._entries
      .filter((e) => modelMap.indexOf((<any>e.model)[Model.meta.cid]) === -1)
      .forEach((entry) => {
        toRemove.push(entry.model);
      });

    toRemove.forEach((m) => {
      this._removeModel(m, { silent, reset });
    });
    toAdd.forEach((m) => {
      this._addModel(m[0], { silent, reset, reparent, position: m[1] });
    });
    toSort.forEach((m) => {
      this._removeModel(m[0], { silent: true, reset });
      this._addModel(m[0], { silent: true, reset, position: m[1], reparent });
    });

    if (
      (!silent && (toAdd.length > 0 || toRemove.length > 0 || toChange.length > 0 || toSort.length > 0)) ||
      reset
    ) {
      this._sortBy = null;
      this.events$.emit(
        new ODataModelEvent(reset ? 'reset' : 'update', {
          collection: this,
          options: {
            added: toAdd,
            removed: toRemove,
            changed: toChange,
            sorted: toSort,
          },
        })
      );
    }
  }

  query(func: (q: ODataQueryOptionsHandler<T>) => void) {
    const resource = this.resource();
    resource.query(func);
    this.attach(resource);
    return this;
  }

  callFunction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    { ...options }: {} & ODataQueryArgumentsOptions<R> = {}
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = this.resource();
    if (resource instanceof ODataEntitySetResource) {
      const func = resource.function<P, R>(name);
      func.query((q) => q.apply(options));
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
    return throwError(
      () =>
        new Error(`callFunction: Can't function without ODataEntitySetResource`)
    );
  }

  callAction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    { ...options }: {} & ODataQueryArgumentsOptions<R> = {}
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = this.resource();
    if (!(resource instanceof ODataEntitySetResource)) {
      return throwError(
        () =>
          new Error(`callAction: Can't action without ODataEntitySetResource`)
      );
    }
    const action = resource.action<P, R>(name);
    action.query((q) => q.apply(options));
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

  private _unlink(entry: ODataModelEntry<T, M>) {
    if (entry.subscription) {
      entry.subscription.unsubscribe();
      entry.subscription = undefined;
    }
  }

  private _link(entry: ODataModelEntry<T, M>) {
    if (entry.subscription) {
      throw new Error('Collection: Subscription already exists');
    }
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
  equals(other: ODataCollection<T, ODataModel<T>>) {
    return this === other;
  }

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

  filter(
    predicate: (value: M, index: number, array: M[]) => unknown,
    thisArg?: any
  ): M[] {
    return this.models().filter(predicate);
  }

  map<U>(
    callbackfn: (value: M, index: number, array: M[]) => U,
    thisArg?: any
  ): U[] {
    return this.models().map(callbackfn, thisArg);
  }

  find(
    predicate: (value: M, index: number, obj: M[]) => unknown,
    thisArg?: any
  ): M | undefined {
    return this.models().find(predicate);
  }

  reduce<U>(
    callbackfn: (
      previousValue: U,
      currentValue: M,
      currentIndex: number,
      array: M[]
    ) => U,
    initialValue: U
  ): U {
    return this.models().reduce(callbackfn, initialValue);
  }

  first(): M | undefined {
    return this.models()[0];
  }

  last(): M | undefined {
    const models = this.models();
    return models[models.length - 1];
  }

  next(model: M): M | undefined {
    const index = this.indexOf(model);
    if (index === -1 || index === this.length - 1) {
      return undefined;
    }
    return this.get(index + 1);
  }

  prev(model: M): M | undefined {
    const index = this.indexOf(model);
    if (index <= 0) {
      return undefined;
    }
    return this.get(index - 1);
  }

  every(predicate: (m: M, index: number) => boolean): boolean {
    return this.models().every(predicate);
  }

  some(predicate: (m: M, index: number) => boolean): boolean {
    return this.models().some(predicate);
  }

  contains(model: M) {
    return this.some((m) => m.equals(model));
  }

  indexOf(model: M): number {
    const models = this.models();
    const m = models.find((m) => m.equals(model));
    return m === undefined ? -1 : models.indexOf(m);
  }

  //#region Sort
  private _bisect(model: M) {
    let index = -1;
    if (this._sortBy !== null) {
      for (index = 0; index < this._entries.length; index++) {
        if (this._compare(model, this._entries[index], this._sortBy, 0) < 0) {
          return index;
        }
      }
    }
    return index;
  }

  private _compare(
    e1: ODataModelEntry<T, M> | M,
    e2: ODataModelEntry<T, M> | M,
    by: { field: string | keyof T; order?: 1 | -1 }[],
    index: number
  ): number {
    let m1 = ODataModelOptions.isModel(e1)
      ? (e1 as M)
      : (e1 as ODataModelEntry<T, M>).model;
    let m2 = ODataModelOptions.isModel(e2)
      ? (e2 as M)
      : (e2 as ODataModelEntry<T, M>).model;
    let value1 = m1.get(by[index].field as string);
    let value2 = m2.get(by[index].field as string);
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
      return by.length - 1 > index ? this._compare(e1, e2, by, index + 1) : 0;
    }

    return (by[index].order || 1) * result;
  }

  _sortBy: { field: string | keyof T; order?: 1 | -1 }[] | null = null;
  isSorted() {
    return this._sortBy !== null;
  }

  sort(
    by: { field: string | keyof T; order?: 1 | -1 }[],
    { silent }: { silent?: boolean } = {}
  ) {
    this._sortBy = by;
    this._entries = this._entries.sort(
      (e1: ODataModelEntry<T, M>, e2: ODataModelEntry<T, M>) =>
        this._compare(e1, e2, by, 0)
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
