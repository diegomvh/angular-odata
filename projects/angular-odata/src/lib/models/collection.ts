import { forkJoin, Observable, of, throwError } from 'rxjs';
import { defaultIfEmpty, finalize, map, switchMap } from 'rxjs/operators';
import { DEFAULT_VERSION } from '../constants';
import { ODataHelper } from '../helper';
import {
  ODataActionOptions,
  ODataEntityResource,
  ODataEntitySetResource,
  ODataFunctionOptions,
  ODataNavigationPropertyResource,
  ODataOptions,
  ODataPropertyResource,
  ODataQueryOptionsHandler,
  ODataResource,
} from '../resources';
import { ODataStructuredType } from '../schema/structured-type';
import { Types } from '../utils/types';
import { ODataModel } from './model';
import {
  INCLUDE_DEEP,
  ModelFieldOptions,
  ODataModelEntry,
  ODataModelEvent,
  ODataModelEventEmitter,
  ODataModelEventType,
  ODataModelField,
  ODataModelOptions,
  ODataModelState,
} from './options';
import { ODataEntitiesAnnotations, ODataEntityAnnotations } from '../annotations';

export class ODataCollection<T, M extends ODataModel<T>>
  implements Iterable<M> {
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
  _resources: {
    parent:
    | [
      ODataModel<any> | ODataCollection<any, ODataModel<any>>,
      ODataModelField<any> | null
    ]
    | null;
    resource:
    | ODataEntitySetResource<T>
    | ODataNavigationPropertyResource<T>
    | ODataPropertyResource<T>
    | null;
  }[] = [];
  _annotations!: ODataEntitiesAnnotations<T>;
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
  events$: ODataModelEventEmitter<T>;
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
      resource?: ODataResource<T> | null;
      annots?: ODataEntitiesAnnotations<T>;
      model?: typeof ODataModel;
      reset?: boolean;
    } = {}
  ) {
    const Klass = this.constructor as typeof ODataCollection;
    if (!model && Klass.model !== null) model = Klass.model;
    if (!model) throw new Error('Collection: Collection need model');

    this._model = model;

    // Events
    this.events$ = new ODataModelEventEmitter<T>({ collection: this });
    this.events$.subscribe((e) => model!.meta.events$.emit(e));

    // Parent
    if (parent !== undefined) {
      this._parent = parent;
    }

    // Resource
    if (this._parent === null && !resource)
      resource = this._model.meta.collectionResourceFactory() as
        | ODataEntitySetResource<T>
        | ODataPropertyResource<T>
        | ODataNavigationPropertyResource<T>
        | undefined;
    if (resource) {
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
        ODataHelper[resource?.api?.options.version || DEFAULT_VERSION]
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
    | ODataPropertyResource<T>
    | null {
    return ODataModelOptions.resource<T>(this) as
      | ODataEntitySetResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>
      | null;
  }

  pushResource(
    resource:
      | ODataEntitySetResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>
      | null
  ) {
    // Push current parent and resource
    this._resources.push({ parent: this._parent, resource: this._resource });
    // Replace parent and resource
    this._parent = null;
    this._resource = resource;
  }

  popResource() {
    // Pop parent and resource
    const pop = this._resources.pop();
    if (pop !== undefined) {
      const current = { parent: this._parent, resource: this._resource };
      this._parent = pop.parent;
      this._resource = pop.resource;
      return current;
    }
    return undefined;
  }

  attach(
    resource:
      | ODataEntitySetResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>
  ) {
    if (
      this._resource !== null &&
      this._resource.outgoingType() !== resource.outgoingType() &&
      !this._resource.isSubtypeOf(resource)
    )
      throw new Error(
        `attach: Can't reattach ${this._resource.outgoingType()} to ${resource.outgoingType()}`
      );

    this._entries.forEach(({ model }) => {
      const modelResource = this._model.meta.modelResourceFactory(
        resource.cloneQuery<T>()
      ) as ODataEntityResource<T>;
      if (modelResource !== undefined) model.attach(modelResource);
    });

    const current = this._resource;
    if (current === null || !current.isEqualTo(resource)) {
      this._resource = resource;
      this.events$.trigger(ODataModelEventType.Attach, {
        previous: current,
        value: resource,
      });
    }
  }
  withResource<R>(
    resource:
      | ODataEntitySetResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>
      | null,
    ctx: (collection: this) => R
  ): R {
    // Push
    this.pushResource(resource);
    // Execute
    const result = ctx(this);
    if (result instanceof Observable) {
      return (result as any).pipe(finalize(() => this.popResource()));
    } else {
      // Pop
      this.popResource();
      return result;
    }
  }

  asEntitySet<R>(ctx: (collection: this) => R): R {
    // Build new resource
    const resource = this._model.meta.collectionResourceFactory(
      this._resource?.cloneQuery<T>()
    ) as ODataEntitySetResource<T> | ODataNavigationPropertyResource<T> | ODataPropertyResource<T>;
    return this.withResource(resource, ctx);
  }

  annots() {
    return this._annotations;
  }

  private modelFactory(
    data: Partial<T> | { [name: string]: any },
    { reset = false }: { reset?: boolean } = {}
  ): M {
    let Model = this._model;
    const annots = new ODataEntityAnnotations(this._annotations.helper);
    annots.update(data);

    if (annots?.type !== undefined && Model.meta !== null) {
      const schema = Model.meta.findChildOptions((o) =>
        o.isTypeOf(annots.type as string)
      )?.structuredType;
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
    include_id = false,
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
    include_id?: boolean;
    include_non_field?: boolean;
    changes_only?: boolean;
    field_mapping?: boolean;
    chain?: (ODataModel<any> | ODataCollection<any, ODataModel<any>>)[];
  } = {}): (Partial<T> | { [name: string]: any })[] {
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
          include_id,
          include_non_field,
          field_mapping,
          changes_only: changesOnly,
          chain: [this, ...chain],
        });
      });
  }

  toJson() {
    return this.toEntities(INCLUDE_DEEP);
  }

  hasChanged({ include_navigation }: { include_navigation?: boolean } = {}) {
    return (
      this._entries.some((e) => e.state !== ODataModelState.Unchanged) ||
      this.models().some((m) => m.hasChanged({ include_navigation }))
    );
  }

  clone<C extends ODataCollection<T, M>>() {
    return new (<typeof ODataCollection>this.constructor)(this.toEntities(INCLUDE_DEEP), {
      resource: this.resource(),
      annots: this.annots(),
    }) as C;
  }

  private _request<T, R>(
    obs$: Observable<T>,
    mapCallback: (response: T) => R
  ): Observable<R> {
    this.events$.trigger(ODataModelEventType.Request, {
      options: { observable: obs$ },
    });
    return obs$.pipe(
      map((response) => mapCallback(response)),
      finalize(() => this.events$.trigger(ODataModelEventType.Sync))
    );
  }

  fetch({
    add,
    merge,
    remove,
    withCount,
    ...options
  }: ODataOptions & {
    add?: boolean;
    merge?: boolean;
    remove?: boolean;
    withCount?: boolean;
  } = {}): Observable<M[]> {
    const resource = this.resource();
    if (!resource)
      return throwError(() => new Error('fetch: Resource is null'));

    const obs$ =
      resource instanceof ODataEntitySetResource
        ? resource.fetch({ withCount, ...options })
        : resource.fetch({
          responseType: 'entities',
          withCount,
          ...options,
        });

    return this._request(obs$, ({ entities, annots }) => {
      this._annotations = annots;
      return (entities !== null) ?
        this.assign(entities, {
          reset: true,
          add: add ?? true,
          merge: merge ?? true,
          remove: remove ?? true
        }) : [];
    });
  }

  fetchAll({
    add,
    merge,
    remove,
    withCount,
    ...options
  }: ODataOptions & {
    add?: boolean;
    merge?: boolean;
    remove?: boolean;
    withCount?: boolean;
  } = {}): Observable<M[]> {
    const resource = this.resource();
    if (!resource)
      return throwError(() => new Error('fetchAll: Resource is null'));

    const obs$ = resource.fetchAll({ withCount, ...options });

    return this._request(obs$, ({ entities, annots }) => {
      this._annotations = annots;
      return (entities !== null) ?
        this.assign(entities, {
          reset: true,
          add: add ?? true,
          merge: merge ?? true,
          remove: remove ?? true
        }) : [];
    });
  }

  fetchMany(
    top: number,
    {
      add,
      merge,
      remove,
      withCount,
      ...options
    }: ODataOptions & {
      add?: boolean;
      merge?: boolean;
      remove?: boolean;
      withCount?: boolean;
    } = {}
  ): Observable<M[]> {
    const resource = this.resource();
    if (!resource)
      return throwError(() => new Error('fetchMany: Resource is null'));

    resource.query((q) =>
      remove || this.length == 0 ? q.skip().clear() : q.skip(this.length)
    );

    const obs$ = resource.fetchMany(top, { withCount, ...options });

    return this._request(obs$, ({ entities, annots }) => {
      this._annotations = annots;
      return (entities !== null) ?
        this.assign(entities, {
          reset: true,
          add: add ?? true,
          merge: merge ?? true,
          remove: remove ?? false
        }) : [];
    });
  }

  fetchOne({
    add,
    merge,
    remove,
    withCount,
    ...options
  }: ODataOptions & {
    add?: boolean;
    merge?: boolean;
    remove?: boolean;
    withCount?: boolean;
  } = {}) {
    const resource = this.resource();
    if (!resource)
      return throwError(() => new Error('fetchOne: Resource is null'));

    resource.query((q) =>
      remove || this.length == 0 ? q.skip().clear() : q.skip(this.length)
    );

    const obs$ = resource.fetchOne({ withCount, ...options });

    return this._request(obs$, ({ entity, annots }) => {
      this._annotations = annots;
      return (entity !== null) ?
        this.assign([entity], {
          reset: true,
          add: add ?? true,
          merge: merge ?? true,
          remove: remove ?? false
        })[0] : null;
    });
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
  } = {}): Observable<M[]> {
    const resource = this.resource();
    if (resource instanceof ODataPropertyResource)
      return throwError(
        () => new Error('save: Resource is ODataPropertyResource')
      );

    const toDestroyEntity: M[] = [];
    const toRemoveReference: M[] = [];
    const toDestroyContained: M[] = [];
    const toCreateEntity: M[] = [];
    const toAddReference: M[] = [];
    const toCreateContained: M[] = [];
    const toUpdateEntity: M[] = [];
    const toUpdateContained: M[] = [];

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
    const obs$ = forkJoin([
      ...toDestroyEntity.map((m) => m.asEntity((e) => e.destroy(options))),
      ...toRemoveReference.map((m) =>
        (this._model.meta.api.options.deleteRefBy === 'path'
          ? (resource as ODataNavigationPropertyResource<T>).key(m.key())
          : (resource as ODataNavigationPropertyResource<T>)
        )
          .reference()
          .remove(
            this._model.meta.api.options.deleteRefBy === 'id'
              ? (m.asEntity((e) => e.resource()) as ODataEntityResource<T>)
              : undefined,
            options
          )
      ),
      ...toDestroyContained.map((m) => m.destroy(options)),
      ...toCreateEntity.map((m) =>
        m.asEntity((e) => e.save({ method: 'create', ...options }))
      ),
      ...toAddReference.map((m) =>
        (resource as ODataNavigationPropertyResource<T>)
          .reference()
          .add(
            m.asEntity((e) => e.resource()) as ODataEntityResource<T>,
            options
          )
      ),
      ...toCreateContained.map((m) =>
        m.save({ method: 'create', ...options })
      ),
      ...toUpdateEntity.map((m) =>
        m.asEntity((e) => e.save({ method, ...options }))
      ),
      ...toUpdateContained.map((m) => m.save({ method, ...options })),
    ]).pipe(
      defaultIfEmpty(null)
    );
    return this._request(obs$, () => {
      this._entries = this._entries
        .filter((entry) => entry.state !== ODataModelState.Removed)
        .map((entry) => ({ ...entry, state: ODataModelState.Unchanged }));
      return this.models();
    });
  }

  private _addServer(model: M, options?: ODataOptions): Observable<M> {
    const resource = this.resource();
    if (resource instanceof ODataNavigationPropertyResource) {
      if (!model.isNew()) {
        // Add Reference
        return resource
          .reference()
          .add(
            model.asEntity((e) => e.resource()) as ODataEntityResource<T>,
            options
          )
          .pipe(map(() => model));
      } else {
        // Create Contained
        return resource.create(model.toEntity() as Partial<T>, options).pipe(
          map(({ entity }) => {
            if (entity) {
              model.assign(entity);
            }
            return model;
          })
        );
      }
    } else if (resource instanceof ODataEntitySetResource) {
      return model.asEntity((e) => e.save({ method: 'create', ...options }));
    } else {
      return of(model);
    }
  }

  private _addModel(
    model: M,
    {
      silent = false,
      reset = false,
      reparent = false,
      merge = false,
      position,
    }: {
      silent?: boolean;
      reset?: boolean;
      reparent?: boolean;
      merge?: boolean;
      position?: number;
    } = {}
  ): M {
    let entry = this._findEntry(model);
    if (entry !== undefined && entry.state !== ODataModelState.Removed) {
      if (merge) {
        entry.model.assign(model.toEntity(INCLUDE_DEEP) as T);
      }
      return entry.model;
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

    // If position is undefined and the collection is sorted, find the right position
    if (position === undefined && this._sortBy !== null) {
      for (let index = 0; index < this._entries.length; index++) {
        if (this._compare(model, this._entries[index], this._sortBy, 0) < 0) {
          position = index;
          break;
        }
      }
    }

    // Now add
    if (position !== undefined) this._entries.splice(position, 0, entry);
    else this._entries.push(entry);

    if (!silent) {
      model.events$.trigger(ODataModelEventType.Add, {
        collection: this,
        options: { index: position },
      });
    }

    return entry.model;
  }

  add(
    model: M,
    {
      silent = false,
      reparent = false,
      server = true,
      merge = false,
      position,
      reset,
    }: {
      silent?: boolean;
      reparent?: boolean;
      server?: boolean;
      merge?: boolean;
      position?: number;
      reset?: boolean;
    } = {}
  ): Observable<M> {
    const _addModel = (m: M, reset: boolean) =>
      this._addModel(m, { silent, position, merge, reparent, reset });
    return server
      ? this._request(this._addServer(model), (model) =>
        _addModel(model, reset ?? true)
      )
      : of(_addModel(model, reset ?? false));
  }

  private _removeServer(model: M, options?: ODataOptions): Observable<M> {
    let resource = this.resource();
    if (resource instanceof ODataNavigationPropertyResource) {
      if (!model.isNew()) {
        // Remove Reference
        const target =
          this._model.meta.api.options.deleteRefBy === 'id'
            ? (model.asEntity((e) => e.resource()) as ODataEntityResource<T>)
            : undefined;
        if (this._model.meta.api.options.deleteRefBy === 'path') {
          resource = resource.key(model.key());
        }
        return resource
          .reference()
          .remove(target, options)
          .pipe(map(() => model));
      } else {
        // Remove Contained
        return resource.destroy(options).pipe(map(() => model));
      }
    } else if (resource instanceof ODataEntitySetResource) {
      return model.asEntity((e) => e.destroy(options));
    } else {
      return of(model);
    }
  }

  private _removeModel(
    model: M,
    {
      silent = false,
      reset = false,
    }: { silent?: boolean; reset?: boolean } = {}
  ): M {
    const entry = this._findEntry(model);
    if (entry === undefined || entry.state === ODataModelState.Removed) {
      return model;
    }

    // Now remove
    const index = this._entries.indexOf(entry);
    this._entries.splice(index, 1);
    if (!(reset || entry.state === ODataModelState.Added)) {
      // Move to end of array and mark as removed
      entry.state = ODataModelState.Removed;
      this._entries.push(entry);
    }

    // Trigger Event
    if (!silent) {
      model.events$.trigger(ODataModelEventType.Remove, {
        collection: this,
        options: { index: index },
      });
    }

    this._unlink(entry);
    return entry.model;
  }

  remove(
    model: M,
    {
      silent = false,
      server = true,
      reset,
    }: { silent?: boolean; server?: boolean; reset?: boolean } = {}
  ): Observable<M> {
    const _removeModel = (m: M, reset: boolean) =>
      this._removeModel(m, { silent, reset });
    return server
      ? this._request(this._removeServer(model), (model) =>
        _removeModel(model, reset ?? true)
      )
      : of(_removeModel(model, reset ?? false));
  }

  private _moveModel(model: M, position: number): M {
    const entry = this._findEntry(model);
    if (entry === undefined || entry.state === ODataModelState.Removed) {
      return model;
    }

    // Now remove
    const index = this._entries.indexOf(entry);
    this._entries.splice(index, 1);
    this._entries.splice(position, 0, entry);

    return entry.model;
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

  set(path: string | string[], value: any, { }: {} & ModelFieldOptions) {
    const pathArray = (
      Types.isArray(path) ? path : (path as string).match(/([^[.\]])+/g)
    ) as any[];
    if (pathArray.length === 0) return undefined;
    if (pathArray.length > 1) {
      const model = this._entries[Number(pathArray[0])].model;
      return model.set(pathArray.slice(1), value, {});
    }
    if (pathArray.length === 1 && ODataModelOptions.isModel(value)) {
      const models = this.models();
      const index = Number(pathArray[0]);
      models[index] = value;
      this.assign(models, { reparent: true });
      return value;
    }
  }

  get(path: number): M | undefined;
  get(path: string | string[]): any;
  get(path: any): any {
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

  has(path: number | string | string[]): boolean {
    const pathArray = (
      Types.isArray(path) ? path : `${path}`.match(/([^[.\]])+/g)
    ) as any[];
    if (pathArray.length === 0) return false;
    const value = this.models()[Number(pathArray[0])];
    if (pathArray.length > 1 && ODataModelOptions.isModel(value)) {
      return value.has(pathArray.slice(1));
    }
    return value !== undefined;
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
          const entry = this._findEntry(model) as ODataModelEntry<T, M>;
          if (
            entry.state === ODataModelState.Unchanged &&
            entry.model.hasChanged()
          ) {
            toChange = [entry];
          }
          path = pathArray.slice(1);
        }
      }
    } else {
      // Reset all
      toAdd = this._entries.filter((e) => e.state === ODataModelState.Removed);
      toChange = this._entries.filter(
        (e) => e.state === ODataModelState.Unchanged && e.model.hasChanged()
      );
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
    if (
      !silent &&
      (toAdd.length > 0 || toRemove.length > 0 || toChange.length > 0)
    ) {
      this.events$.trigger(ODataModelEventType.Reset, {
        options: {
          added: toAdd.map((e) => e.model),
          removed: toRemove.map((e) => e.model),
          changed: toChange.map((e) => e.model),
        },
      });
    }
  }

  clear({ silent = false }: { silent?: boolean } = {}) {
    const toRemove: M[] = this.models();
    toRemove.forEach((m) => {
      this._removeModel(m, { silent });
    });
    this._entries = [];
    if (!silent) {
      this.events$.trigger(ODataModelEventType.Update, {
        options: { removed: toRemove },
      });
    }
  }

  assign(
    objects: Partial<T>[] | { [name: string]: any }[] | M[],
    {
      add = true,
      merge = true,
      remove = true,
      reset = false,
      reparent = false,
      silent = false,
    }: {
      add?: boolean;
      merge?: boolean;
      remove?: boolean;
      reset?: boolean;
      reparent?: boolean;
      silent?: boolean;
    } = {}
  ) {
    const offset = remove ? 0 : this.length;

    const models: M[] = [];
    const toAdd: M[] = [];
    const toMerge: M[] = [];
    const toRemove: M[] = [];
    objects.forEach((obj, index) => {
      const model = ODataModelOptions.isModel(obj) ?
        obj as M : this.modelFactory(obj as Partial<T> | { [name: string]: any }, { reset }) as M;
      const position = index + offset;
      // Try find entry
      const entry = this._findEntry(model);

      if (merge && entry !== undefined) {
        if (entry.model !== model) {
          entry.model.assign(model.toEntity({
            client_id: true,
            ...INCLUDE_DEEP,
          }) as { [name: string]: any; },
            { add, merge, remove, reset, silent });
          // Model Change?
          if (entry.model.hasChanged()) toMerge.push(entry.model);
        }
        if (reset) entry.state = ODataModelState.Unchanged;
        if (!models.includes(entry.model)) {
          models.push(entry.model);
        }
      } else if (add) {
        // Add
        toAdd.push(model);
        this._addModel(model, { silent, reset, reparent, position });
        models.push(model);
      }
    });

    if (remove) {
      [...this._entries].forEach((entry) => {
        const model = entry.model;
        if (!models.includes(model)) {
          this._removeModel(model, { silent, reset });
          toRemove.push(model);
        }
      });
    }

    if (this.models().slice(offset).some((m, i) => m !== models[i])) {
      models.forEach((m, i) => this._moveModel(m, i));
      this.events$.trigger(ODataModelEventType.Sort);
    }

    if (
      (!silent && (toAdd.length > 0 || toRemove.length > 0 || toMerge.length > 0))
    ) {
      this.events$.trigger(
        reset ? ODataModelEventType.Reset : ODataModelEventType.Update,
        {
          options: {
            added: toAdd,
            removed: toRemove,
            merged: toMerge,
          },
        }
      );
    }
    return models;
  }

  query(
    ctx: (q: ODataQueryOptionsHandler<T>, s?: ODataStructuredType<T>) => void
  ) {
    const resource = this.resource();
    if (resource) {
      resource.query(ctx);
      this.attach(resource);
    }
    return this;
  }

  callFunction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options: ODataFunctionOptions<R> = {}
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = this.resource();
    if (!(resource instanceof ODataEntitySetResource))
      return throwError(
        () =>
          new Error(
            "callFunction: Can't call function without ODataEntitySetResource"
          )
      );

    const func = resource.function<P, R>(name).query((q) => q.restore(options));
    switch (responseType) {
      case 'property':
        return this._request(
          func.callProperty(params, options),
          (resp) => resp
        );
      case 'model':
        return this._request(
          func.callModel(params, options), 
          (resp) => resp
        );
      case 'collection':
        return this._request(
          func.callCollection(params, options),
          (resp) => resp
        );
      default:
        return this._request(
          func.call(params, { responseType, ...options }),
          (resp) => resp
        );
    }
  }

  callAction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options: ODataActionOptions<R> = {}
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = this.resource();
    if (!(resource instanceof ODataEntitySetResource)) {
      return throwError(
        () =>
          new Error(
            `callAction: Can't call action without ODataEntitySetResource`
          )
      );
    }
    const action = resource.action<P, R>(name).query((q) => q.restore(options));
    switch (responseType) {
      case 'property':
        return this._request(
          action.callProperty(params, options),
          (resp) => resp
        );
      case 'model':
        return this._request(
          action.callModel(params, options), 
          (resp) => resp
        );
      case 'collection':
        return this._request(
          action.callCollection(params, options),
          (resp) => resp
        );
      default:
        return this._request(
          action.call(params, { responseType, ...options }),
          (resp) => resp
        );
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
        if (event.canContinueWith(this)) {
          if (event.model === entry.model) {
            if (event.type === ODataModelEventType.Destroy) {
              this._removeModel(entry.model, { reset: true });
            } else if (
              event.type === ODataModelEventType.Change &&
              event.options?.key
            ) {
              entry.key = entry.model.key();
            }
          }

          const index =
            event.options?.index ?? this.models().indexOf(entry.model);
          this.events$.emit(event.push(this, index));
        }
      }
    );
  }

  private _findEntry(model: ODataModel<T>) {
    return this._entries.find((entry) => (
      entry.key !== undefined &&
      model.key() !== undefined &&
      Types.isEqual(entry.key, model.key())
    ) || entry.model.equals(model));
  }

  // Collection functions
  equals(other: ODataCollection<T, ODataModel<T>>): boolean {
    return this === other;
  }

  get [Symbol.toStringTag]() {
    return 'Collection';
  }

  public [Symbol.iterator]() {
    let pointer = 0;
    const models = this.models();
    return {
      next(): IteratorResult<M> {
        return {
          done: pointer === models.length,
          value: models[pointer++],
        };
      },
    } as Iterator<M>;
  }

  filter(
    predicate: (value: M, index: number, array: M[]) => unknown,
    thisArg?: any
  ): M[] {
    return this.models().filter(predicate, thisArg);
  }

  map<U>(
    callbackfn: (value: M, index: number, array: M[]) => U,
    thisArg?: any
  ): U[] {
    return this.models().map(callbackfn, thisArg);
  }

  find(
    predicate: (value: M, index: number, obj: M[]) => unknown
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

  includes(model: M, start: number = 0) {
    return this.some((m, i) => i >= start && m.equals(model));
  }

  indexOf(model: M): number {
    const models = this.models();
    const m = models.find((m) => m.equals(model));
    return !m ? -1 : models.indexOf(m);
  }

  forEach(
    predicate: (value: M, index: number, array: M[]) => void,
    thisArg?: any
  ): void {
    return this.models().forEach(predicate, thisArg);
  }

  isEmpty() {
    // Local length == 0 and if exist remote count is 0 or undefined
    return this.length === 0 && !this.annots().count;
  }

  //#region Sort
  private _compare(
    e1: ODataModelEntry<T, M> | M,
    e2: ODataModelEntry<T, M> | M,
    by: { field: string | keyof T; order?: 1 | -1 }[],
    index: number
  ): number {
    const m1 = ODataModelOptions.isModel(e1)
      ? (e1 as M)
      : (e1 as ODataModelEntry<T, M>).model;
    const m2 = ODataModelOptions.isModel(e2)
      ? (e2 as M)
      : (e2 as ODataModelEntry<T, M>).model;
    const value1 = m1.get(by[index].field as string);
    const value2 = m2.get(by[index].field as string);
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
      this.events$.trigger(ODataModelEventType.Sort);
    }
  }
  //#endregion
}
