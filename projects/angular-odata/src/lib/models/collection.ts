import { map, tap } from 'rxjs/operators';
import { Observable, of, Subscription, throwError } from 'rxjs';

import {
  ODataEntitySetResource,
  ODataEntityResource,
  ODataNavigationPropertyResource,
  ODataEntitiesAnnotations,
  HttpOptions,
  ODataEntities,
  ODataPropertyResource,
  ODataActionResource,
  ODataFunctionResource,
  ODataEntityAnnotations,
  Select,
  Expand,
  OptionHandler,
  Transform,
  Filter,
  OrderBy,
  HttpCallableOptions,
} from '../resources/index';

import { EventEmitter } from '@angular/core';
import { EntityKey } from '../types';
import { Types } from '../utils/types';
import { ODataModel } from './model';
import {
  BUBBLING,
  ODataCollectionResource,
  ODataModelEvent,
  ODataModelState
} from './options';

export class ODataCollection<T, M extends ODataModel<T>> implements Iterable<M> {
  static model: typeof ODataModel | null = null;
  _resource?: ODataCollectionResource<T>;
  _annotations!: ODataEntitiesAnnotations;
  _entries: {
    state: ODataModelState,
    model: M;
    key?: EntityKey<T> | {[name: string]: any};
    subscription: Subscription;
  }[] = [];
  _model: typeof ODataModel;

  models() {
    return this._entries.filter(e => e.state !== ODataModelState.Removed).map((e) => e.model);
  }

  get length(): number {return this.models().length;}

  //Events
  events$ = new EventEmitter<ODataModelEvent<T>>();
  constructor(
    entities: Partial<T>[] | {[name: string]: any}[] = [],
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
    if (model === undefined) throw new Error("Collection need model");
    this._model = model;

    this.resource(resource);
    this.annots(annots || new ODataEntitiesAnnotations({ options: resource?.api.options }));
    entities = entities || [];

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

      this._entries.forEach(({ model }) => {
        const mr = model.resource();
        const er = this._model.meta.modelResourceFactory(resource);
        if (er !== undefined && (mr === undefined || !mr.isEqualTo(er))) {
          model.resource(er);
        }
      });

      const current = this._resource;
      if (current === undefined || !current.isEqualTo(resource)) {
        this._resource = resource;
        this.events$.emit({ name: 'attach', collection: this, previous: current, value: resource });
      }
    }
    return this._resource?.clone();
  }

  annots(annots?: ODataEntitiesAnnotations) {
    if (annots !== undefined) this._annotations = annots;
    return this._annotations;
  }

  private modelFactory(
    data: Partial<T> | {[name: string]: any},
    { reset = false }: { reset?: boolean } = {}
  ): M {
    const annots = new ODataEntityAnnotations({data, options: this._annotations.options });
    let Model = this._model;

    if (annots?.type !== undefined && Model.meta !== null) {
      let schema = Model.meta.find(o => o.isTypeOf(annots.type as string))?.schema;
      if (schema !== undefined && schema.model !== undefined)
        // Change to child model
        Model = schema.model;
    }

    const resource = Model.meta.modelResourceFactory(this.resource(), {fromSet: !reset});

    return new Model(data, { resource, annots, reset }) as M;
  }

  toEntities({
    client_id = false,
    include_navigation = false,
    include_concurrency = false,
    include_key = false,
    changes_only = false,
    field_mapping = false
  }: {
    client_id?: boolean;
    include_navigation?: boolean;
    include_concurrency?: boolean;
    include_key?: boolean;
    changes_only?: boolean;
    field_mapping?: boolean;
  } = {}): (T | { [name: string]: any; })[] {
    return this._entries.filter(e => e.state !== ODataModelState.Removed)
    .map(entry => {
      var changesOnly = changes_only && entry.state !== ODataModelState.Added;
      return entry.model.toEntity({
        client_id,
        include_navigation,
        include_concurrency,
        field_mapping,
        include_key,
        changes_only: changesOnly
      });
    });
  }

  hasChanged() {
    return this._entries.some(e => e.state !== ODataModelState.Unchanged) || this.models().some(m => m.hasChanged());
  }

  clone() {
    let resource: ODataCollectionResource<T> | undefined;
    let annots: ODataEntitiesAnnotations | undefined;
    if (this._resource) resource = this._resource.clone();
    if (this._annotations) annots = this._annotations.clone();
    let Ctor = <typeof ODataCollection>this.constructor;
    return new Ctor(this.toEntities({include_navigation: true}), { resource, annots });
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
      map(({ entities, annots }) => {
        this.annots(annots);
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
        this.annots(new ODataEntitiesAnnotations({ options: resource?.api.options }));
        this.assign(entities || [], { reset: true });
        this.events$.emit({ name: 'sync', collection: this });
        return this;
      }));
  }

  add(model: M, {silent = false, server = true}: {silent?: boolean, server?: boolean} = {}): Observable<this> {
    const key = model.key();
    let resource = this.resource();
    let entry = this._findEntry({model, key, cid: (<any>model)[this._model.meta.cid]});
    if (entry !== undefined && entry.state !== ODataModelState.Removed) return of(this);

    const server$ = (
      server &&
      key !== undefined &&
      resource !== undefined &&
      resource instanceof ODataNavigationPropertyResource
    ) ? resource
          .reference()
          .add(model._meta.resource(model, {entity: true}) as ODataEntityResource<T>)
          .pipe(map(() => this)) : of(this);

    const add = () => {
      if (model.resource() === undefined) {
        model.resource(this._model.meta.modelResourceFactory(resource));
      }
      if (entry !== undefined && entry.state === ODataModelState.Removed) {
        const index = this._entries.indexOf(entry);
        this._entries.splice(index, 1);
      }
      this._entries.push({
        state: ODataModelState.Added,
        model,
        key: model.key(),
        subscription: this._subscribe(model),
      });

      if (!silent) {
        model.events$.emit({ name: 'add', model, collection: this });
        this.events$.emit({ name: 'update', collection: this });
      }
      return this;
    };

    return server$.pipe(map(add));
  }

  remove(model: M, {silent = false, server = true}: {silent?: boolean, server?: boolean} = {}): Observable<this> {
    const key = model.key();
    let resource = this.resource();
    let entry = this._findEntry({model, key, cid: (<any>model)[this._model.meta.cid]});
    if (entry === undefined || entry.state === ODataModelState.Removed) return of(this);

    const server$ = (
      server &&
      key !== undefined &&
      resource !== undefined &&
      resource instanceof ODataNavigationPropertyResource
    ) ? resource
          .reference()
          .remove(model._meta.resource(model, {entity: true}) as ODataEntityResource<T>)
          .pipe(map(() => this)) :
        of(this);

    const remove = () => {
      // Emit Event
      if (!silent)
        model.events$.emit({ name: 'remove', model, collection: this });
      // Now remove
      (entry as any).state = ODataModelState.Removed;
      (entry as any).subscription.unsubscribe();
      if (!silent)
        this.events$.emit({ name: 'update', collection: this });
      return this;
    };

    return server$.pipe(map(remove));
  }

  create(attrs: T = {} as T, {silent = false, server = true}: {silent?: boolean, server?: boolean} = {}) {
    const model = this.modelFactory(attrs);
    return ((model.valid() && server) ? model.save() : of(model)).pipe(
      tap((model) => this.add(model, {silent, server}))
    );
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
      let index = Number(pathArray[0]);
      const model = this.models()[index];
      const entry = this._findEntry({model});
      if (entry !== undefined) {
        entry.state = ODataModelState.Removed;
        model.events$.emit({ name: 'remove', model, collection: this });
        entry.subscription.unsubscribe();
        index = this._entries.indexOf(entry);
      }
      this._entries[index] = {
        state: ODataModelState.Added,
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

  assign(objects: Array<Partial<T> | {[name: string]: any} | M>, { reset = false, silent = false }: { reset?: boolean, silent?: boolean } = {}) {
    if (reset) {
      this._entries.forEach((e) => e.subscription.unsubscribe());
      const models = objects.map(obj => !(obj instanceof ODataModel) ? this.modelFactory(obj as Partial<T> | {[name: string]: any}, { reset }) : obj as M);
      this._entries = models.map(model => ({
        state: ODataModelState.Unchanged,
        model,
        key: model.key(),
        subscription: this._subscribe(model),
      }));
      if (!silent)
        this.events$.emit({ name: 'reset', collection: this });
    } else {
      const Model = this._model;

      let modelMap: string[] = [];
      objects.forEach(obj => {
        const key = (Model !== null && Model.meta)? Model.meta.resolveKey(obj) : undefined;
        const cid = (this._model.meta.cid in obj) ? (<any>obj)[this._model.meta.cid] : undefined;
        // Try find entry
        const entry = (obj instanceof ODataModel) ?
          this._findEntry({model: obj as M}) : // By Model
          this._findEntry({cid, key}); // By Cid or Key

        let model: M;
        if (entry !== undefined) {
          // Assign
          model = entry.model;
          if (model !== obj) model.assign(obj, {reset, silent});
        } else {
          // Add
          model = !(obj instanceof ODataModel) ? this.modelFactory(obj as Partial<T> | {[name: string]: any}, { reset }) : obj as M;
          this.add(model, {silent}).toPromise();
        }
        modelMap.push((<any>model)[this._model.meta.cid]);
      });
      this._entries.filter(e => modelMap.indexOf((<any>e.model)[this._model.meta.cid]) === -1).forEach(entry => {
        this.remove(entry.model, {silent}).toPromise();
      });
      if (!silent)
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
      if (bubbling && BUBBLING.indexOf(event.name) !== -1) {
        const index = this.models().indexOf(model);
        let path = `[${index}]`;
        if (event.path)
          path = `${path}.${event.path}`;
        if (event.name === 'destroy' && event.model === model)
          this.remove(model, {server: false}).toPromise();
        if (event.name === 'change' && event.model === model) {
          let entry = this._findEntry({model});
          if (entry !== undefined) entry.key = model.key();
        }
        this.events$.emit({...event, path});
      }
    });
  }

  private _findEntry({model, cid, key}: {model?: ODataModel<T>, cid?: string, key?: EntityKey<T> | {[name: string]: any}} = {}) {
    return this._entries.find((entry) => {
      const byModel = model !== undefined && entry.model.equals(model);
      const byCid = cid !== undefined && (<any>entry.model)[this._model.meta.cid] === cid;
      const byKey = key !== undefined && entry.key !== undefined && Types.isEqual(entry.key, key);
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
    return
  }
  //#endregion
}
