import { forkJoin, Observable, of, throwError } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';
import { DEFAULT_VERSION } from '../constants';
import { ODataHelper } from '../helper';
import {
  EntityKey,
  ODataActionOptions,
  ODataEntities,
  ODataEntitiesAnnotations,
  ODataEntityAnnotations,
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
  INCLUDE_SHALLOW,
  ModelFieldOptions,
  ODataModelEntry,
  ODataModelEvent,
  ODataModelEventEmitter,
  ODataModelEventType,
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
      ODataModelField<any> | null,
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
      ODataModelField<any> | null,
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
      resource?: ODataResource<T>;
      annots?: ODataEntitiesAnnotations<T>;
      model?: typeof ODataModel;
      reset?: boolean;
    } = {},
  ) {
    const Klass = this.constructor as typeof ODataCollection;
    if (model === undefined && Klass.model !== null) model = Klass.model;
    if (model === undefined)
      throw new Error('Collection: Collection need model');
    this._model = model;

    // Events
    this.events$ = new ODataModelEventEmitter<T>({ collection: this });
    this.events$.subscribe(e => model!.meta.events$.emit(e));

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
        | ODataNavigationPropertyResource<T>,
      );
    }

    // Annotations
    this._annotations =
      annots ||
      new ODataEntitiesAnnotations(
        ODataHelper[resource?.api?.options.version || DEFAULT_VERSION],
      );

    entities = entities || [];
    this.assign(entities, { reset });
  }

  isParentOf(
    child: ODataModel<any> | ODataCollection<any, ODataModel<any>>,
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

  pushResource(
    resource:
      | ODataEntitySetResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>,
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
      | ODataPropertyResource<T>,
  ) {
    if (
      this._resource !== null &&
      this._resource.type() !== resource.type() &&
      !this._resource.isSubtypeOf(resource)
    )
      throw new Error(
        `attach: Can't reattach ${this._resource.type()} to ${resource.type()}`,
      );

    this._entries.forEach(({ model }) => {
      const modelResource = this._model.meta.modelResourceFactory(
        resource.cloneQuery<T>(),
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
      | ODataPropertyResource<T>,
    ctx: (collection: this) => R,
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
    const query = this._resource?.cloneQuery<T>();
    let resource = this._model.meta.collectionResourceFactory(query);
    if (resource === undefined)
      throw new Error(
        'asEntitySet: Collection does not have associated EntitySet endpoint',
      );
    return this.withResource(resource, ctx);
  }

  annots() {
    return this._annotations;
  }

  private modelFactory(
    data: Partial<T> | { [name: string]: any },
    { reset = false }: { reset?: boolean } = {},
  ): M {
    let Model = this._model;
    const annots = new ODataEntityAnnotations(this._annotations.helper);
    annots.update(data);

    if (annots?.type !== undefined && Model.meta !== null) {
      let schema = Model.meta.findChildOptions((o) =>
        o.isTypeOf(annots.type as string),
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
  } = {}): (Partial<T> | { [name: string]: any })[] {
    return this._entries
      .filter(
        ({ model, state }) =>
          state !== ODataModelState.Removed && chain.every((c) => c !== model),
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

  private _request<T, R>(obs$: Observable<T>, mapCallback: (response: T) => R): Observable<R> {
    this.events$.trigger(
      ODataModelEventType.Request, {
      options: { observable: obs$ },
    });
    return obs$.pipe(map(response => {
      let parse = mapCallback(response);
      this.events$.trigger(ODataModelEventType.Sync, { options: response });
      return parse;
    }));
  }

  fetch({
    withCount,
    remove,
    ...options
  }: ODataOptions & {
    remove?: boolean;
    withCount?: boolean;
  } = {}): Observable<M[]> {
    const resource = this.resource();

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
      const models = (entities || []).map(
        (entity) => this.modelFactory(entity, { reset: true }) as M,
      ) as M[];
      this.assign(models, { reset: true, remove: remove ?? true });
      return models;
    });
  }

  fetchAll({
    withCount,
    remove,
    ...options
  }: ODataOptions & {
    remove?: boolean;
    withCount?: boolean;
  } = {}): Observable<M[]> {
    const resource = this.resource();

    const obs$ = resource.fetchAll({ withCount, ...options });

    return this._request(obs$, ({ entities, annots }) => {
      this._annotations = annots;
      const models = (entities || []).map(
        (entity) => this.modelFactory(entity, { reset: true }) as M,
      ) as M[];
      this.assign(models, { reset: true, remove: remove ?? true });
      return models;
    });
  }

  fetchMany(
    top: number,
    {
      withCount,
      remove,
      ...options
    }: ODataOptions & {
      remove?: boolean;
      withCount?: boolean;
    } = {},
  ): Observable<M[]> {
    const resource = this.resource();
    resource.query((q) =>
      remove || this.length == 0 ? q.skip().clear() : q.skip(this.length),
    );

    const obs$ = resource.fetchMany(top, { withCount, ...options });

    return this._request(obs$, ({ entities, annots }) => {
      this._annotations = annots;
      const models = (entities || []).map((entity) => this.modelFactory(entity, { reset: true }) as M) as M[];
      this.assign(models, { reset: true, remove: remove ?? false });
      return models;
    });
  }

  fetchOne({
    withCount,
    remove,
    ...options
  }: ODataOptions & {
    remove?: boolean;
    withCount?: boolean;
  } = {}) {
    return this.fetchMany(1, { withCount, remove, ...options }).pipe(
      map((models) => models[0]),
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
        () => new Error('save: Resource is ODataPropertyResource'),
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
          m.asEntity((e) => e.save({ method: 'create', ...options })),
        ),
        ...toAddReference.map((m) => this.addReference(m, options)),
        ...toCreateContained.map((m) =>
          m.save({ method: 'create', ...options }),
        ),
        ...toUpdateEntity.map((m) =>
          m.asEntity((e) => e.save({ method, ...options })),
        ),
        ...toUpdateContained.map((m) => m.save({ method, ...options })),
      ]);
      this.events$.trigger(ODataModelEventType.Request, {
        options: { observable: obs$ },
      });
      return obs$.pipe(
        map(() => {
          this._entries = this._entries
            .filter((entry) => entry.state !== ODataModelState.Removed)
            .map((entry) => ({ ...entry, state: ODataModelState.Unchanged }));
          this.events$.trigger(ODataModelEventType.Sync);
          return this;
        }),
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
          options,
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
      merge = false,
      position = -1,
    }: {
      silent?: boolean;
      reset?: boolean;
      reparent?: boolean;
      merge?: boolean;
      position?: number;
    } = {},
  ): M {
    const key = model.key();
    let entry = this._findEntry({
      model,
      key,
      cid: (<any>model)[this._model.meta.cid],
    });
    if (entry !== undefined && entry.state !== ODataModelState.Removed) {
      if (merge) {
        entry.model.assign(model.toEntity() as T);
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
    // Now add
    if (position >= 0) this._entries.splice(position, 0, entry);
    else this._entries.push(entry);

    if (!silent) {
      model.events$.trigger(ODataModelEventType.Add, { collection: this });
    }
    return entry.model;
  }

  private addModel(
    model: M,
    {
      silent = false,
      reset = false,
      reparent = false,
      merge = false,
      position = -1,
    }: {
      silent?: boolean;
      reset?: boolean;
      reparent?: boolean;
      merge?: boolean;
      position?: number;
    } = {},
  ): M {
    if (position < 0) position = this._bisect(model);
    const added = this._addModel(model, {
      silent,
      reset,
      merge,
      position,
      reparent,
    });
    if (!silent && added !== undefined) {
      this.events$.trigger(ODataModelEventType.Update, {
        options: { added: [added], removed: [], merged: [] },
      });
    }
    return added;
  }

  add(
    model: M,
    {
      silent = false,
      reparent = false,
      server = true,
      merge = false,
      position = -1,
    }: {
      silent?: boolean;
      reparent?: boolean;
      server?: boolean;
      merge?: boolean;
      position?: number;
    } = {},
  ): Observable<M> {
    if (server) {
      return this.addReference(model).pipe(
        map((model) => {
          return this.addModel(model, {
            silent,
            position,
            reparent,
            merge,
            reset: true,
          });
        }),
      );
    } else {
      return of(this.addModel(model, { silent, position, merge, reparent }));
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
    }: { silent?: boolean; reset?: boolean } = {},
  ): M {
    const key = model.key();
    let entry = this._findEntry({
      model,
      key,
      cid: (<any>model)[this._model.meta.cid],
    });
    if (entry === undefined || entry.state === ODataModelState.Removed) {
      return model;
    }

    // Trigger Event
    if (!silent)
      model.events$.trigger(ODataModelEventType.Remove, { collection: this });

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
    }: { silent?: boolean; reset?: boolean } = {},
  ): M {
    const removed = this._removeModel(model, { silent, reset });
    if (!silent && removed !== undefined) {
      this.events$.trigger(ODataModelEventType.Update, {
        options: { added: [], removed: [removed], merged: [] },
      });
    }
    return removed;
  }

  remove(
    model: M,
    {
      silent = false,
      server = true,
    }: { silent?: boolean; server?: boolean } = {},
  ): Observable<M> {
    if (server) {
      return this.removeReference(model).pipe(
        map((model) => this.removeModel(model, { silent, reset: true })),
      );
    } else {
      return of(this.removeModel(model, { silent }));
    }
  }

  private _moveModel(model: M, position: number): M {
    const key = model.key();
    let entry = this._findEntry({
      model,
      key,
      cid: (<any>model)[this._model.meta.cid],
    });
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
    }: { silent?: boolean; server?: boolean } = {},
  ) {
    const model = this.modelFactory(attrs);
    return (model.isValid() && server ? model.save() : of(model)).pipe(
      switchMap((model) => this.add(model, { silent, server })),
      map(() => model),
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
          value.toEntity({ client_id: true, ...INCLUDE_DEEP }),
        );
        if (entry.model.hasChanged()) toChange.push(model);
      } else {
        // Add
        this._addModel(value, { reparent: true });
        toAdd.push(model);
      }
      this.events$.trigger(ODataModelEventType.Update, {
        options: { added: toAdd, removed: toRemove, changed: toChange },
      });
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
          const entry = this._findEntry({ model }) as ODataModelEntry<T, M>;
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
        (e) => e.state === ODataModelState.Unchanged && e.model.hasChanged(),
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
    let toRemove: M[] = this.models();
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
      remove = true,
      reset = false,
      reparent = false,
      silent = false,
    }: {
      remove?: boolean;
      reset?: boolean;
      reparent?: boolean;
      silent?: boolean;
    } = {},
  ) {
    const Model = this._model;
    const offset = remove ? 0 : this.length;

    let toAdd: [M, number][] = [];
    let toChange: [M, number][] = [];
    let toRemove: [M, number][] = [];
    let toSort: [M, number][] = [];
    let modelMap: string[] = [];
    objects.forEach((obj, index) => {
      const isModel = ODataModelOptions.isModel(obj);
      const position = index + offset;
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
            const annots = new ODataEntityAnnotations<T>(
              helper,
              helper.annotations(obj),
            );
            const entity = annots.attributes(obj, 'full');
            model._annotations = annots;
            model.assign(entity, { reset, silent });
          }
          // Model Change?
          if (model.hasChanged()) toChange.push([model, position]);
        }
        if (reset) entry.state = ODataModelState.Unchanged;
        // Has Sort or Index Change?
        if (toSort.length > 0 || position !== this.models().indexOf(model)) {
          toSort.push([model, position]);
        }
      } else {
        // Add
        model = isModel
          ? (obj as M)
          : this.modelFactory(obj as Partial<T> | { [name: string]: any }, {
            reset,
          });
        toAdd.push([model, position]);
      }
      modelMap.push((<any>model)[Model.meta.cid]);
    });

    if (remove) {
      this._entries.forEach((entry, position) => {
        if (modelMap.indexOf((<any>entry.model)[Model.meta.cid]) === -1)
          toRemove.push([entry.model, position]);
      });
    }

    // Apply remove, add and sort
    toRemove.forEach(([model, position]) => {
      this._removeModel(model, { silent, reset });
    });
    toAdd.forEach(([model, position]) => {
      this._addModel(model, { silent, reset, reparent, position });
    });
    toSort.forEach(([model, position]) => {
      this._moveModel(model, position);
    });

    if (
      (!silent &&
        (toAdd.length > 0 ||
          toRemove.length > 0 ||
          toChange.length > 0 ||
          toSort.length > 0)) ||
      reset
    ) {
      this._sortBy = null;
      this.events$.trigger(
        reset ? ODataModelEventType.Reset : ODataModelEventType.Update,
        {
          options: {
            added: toAdd,
            removed: toRemove,
            changed: toChange,
            sorted: toSort,
          },
        },
      );
    }
  }

  query(
    ctx: (q: ODataQueryOptionsHandler<T>, s?: ODataStructuredType<T>) => void,
  ) {
    const resource = this.resource();
    resource.query(ctx);
    this.attach(resource);
    return this;
  }

  callFunction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options: ODataFunctionOptions<R> = {},
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = this.resource();
    if (!(resource instanceof ODataEntityResource))
      return throwError(
        () =>
          new Error(
            "callFunction: Can't call function without ODataEntitySetResource",
          ),
      );

    const func = resource.function<P, R>(name).query((q) => q.apply(options));
    switch (responseType) {
      case 'property':
        return this._request(func.callProperty(params, options), (resp) => resp);
      case 'model':
        return this._request(func.callModel(params, options), (resp) => resp);
      case 'collection':
        return this._request(func.callCollection(params, options), (resp) => resp);
      default:
        return this._request(func.call(params, { responseType, ...options }), (resp) => resp);
    }
  }

  callAction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options: ODataActionOptions<R> = {},
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = this.resource();
    if (!(resource instanceof ODataEntitySetResource)) {
      return throwError(
        () =>
          new Error(`callAction: Can't call action without ODataEntitySetResource`),
      );
    }
    const action = resource.action<P, R>(name).query((q) => q.apply(options));
    switch (responseType) {
      case 'property':
        return this._request(action.callProperty(params, options), (resp) => resp);
      case 'model':
        return this._request(action.callModel(params, options), (resp) => resp);
      case 'collection':
        return this._request(action.callCollection(params, options), (resp) => resp);
      default:
        return this._request(action.call(params, { responseType, ...options }), (resp) => resp);
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
            if (event.name === ODataModelEventType.Destroy) {
              this.removeModel(entry.model, { reset: true });
            } else if (event.name === ODataModelEventType.Change && event.options?.key) {
              entry.key = entry.model.key();
            }
          }

          const index = this.models().indexOf(entry.model);
          this.events$.emit(event.push(this, index));
        }
      },
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
  equals(other: ODataCollection<T, ODataModel<T>>): boolean {
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
    thisArg?: any,
  ): M[] {
    return this.models().filter(predicate);
  }

  map<U>(
    callbackfn: (value: M, index: number, array: M[]) => U,
    thisArg?: any,
  ): U[] {
    return this.models().map(callbackfn, thisArg);
  }

  find(
    predicate: (value: M, index: number, obj: M[]) => unknown,
    thisArg?: any,
  ): M | undefined {
    return this.models().find(predicate);
  }

  reduce<U>(
    callbackfn: (
      previousValue: U,
      currentValue: M,
      currentIndex: number,
      array: M[],
    ) => U,
    initialValue: U,
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

  isEmpty() {
    // Local length and if exists remote length
    return this.length === 0;
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
    index: number,
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
    { silent }: { silent?: boolean } = {},
  ) {
    this._sortBy = by;
    this._entries = this._entries.sort(
      (e1: ODataModelEntry<T, M>, e2: ODataModelEntry<T, M>) =>
        this._compare(e1, e2, by, 0),
    );
    if (!silent) {
      this.events$.trigger(ODataModelEventType.Update);
    }
  }
  //#endregion
}
