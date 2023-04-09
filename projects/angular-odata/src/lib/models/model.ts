import { EventEmitter } from '@angular/core';
import { forkJoin, NEVER, Observable, of, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { DEFAULT_VERSION } from '../constants';
import { ODataHelper } from '../helper';
import {
  EntityKey,
  ODataActionOptions,
  ODataEntity,
  ODataEntityAnnotations,
  ODataEntityResource,
  ODataFunctionOptions,
  ODataNavigationPropertyResource,
  ODataOptions,
  ODataPropertyResource,
  ODataQueryArgumentsOptions,
  ODataQueryOptionsHandler,
  ODataResource,
  ODataSingletonResource,
} from '../resources';
import { ODataStructuredType } from '../schema';
import { Objects, Strings, Types } from '../utils';
import { ODataCollection } from './collection';
import {
  INCLUDE_DEEP,
  INCLUDE_SHALLOW,
  ModelFieldOptions,
  ModelOptions,
  ODataModelEvent,
  ODataModelField,
  ODataModelOptions,
  ODataModelRelation,
} from './options';

// @dynamic
export class ODataModel<T> {
  // Properties
  static options: ModelOptions;
  static meta: ODataModelOptions<any>;
  static buildMeta<T>({
    options,
    schema,
  }: {
    options?: ModelOptions;
    schema: ODataStructuredType<T>;
  }) {
    if (options === undefined) {
      let fields = schema
        .fields({ include_navigation: true, include_parents: true })
        .reduce((acc, f) => {
          let name = f.name;
          // Prevent collision with reserved keywords
          while (RESERVED_FIELD_NAMES.includes(name)) {
            name = name + '_';
          }
          return Object.assign(acc, {
            [name]: {
              field: f.name,
              default: f.default,
              required: !f.nullable,
            },
          });
        }, {});
      options = { fields };
    }
    this.meta = new ODataModelOptions<T>({ options, schema });
  }
  // Parent
  _parent:
    | [
        ODataModel<any> | ODataCollection<any, ODataModel<any>>,
        ODataModelField<any> | null
      ]
    | null = null;
  _resource: ODataResource<T> | null = null;
  _resources: {
    parent:
      | [
          ODataModel<any> | ODataCollection<any, ODataModel<any>>,
          ODataModelField<any> | null
        ]
      | null;
    resource: ODataResource<T> | null;
  }[] = [];
  _attributes: Map<string, any> = new Map<string, any>();
  _changes: Map<string, any> = new Map<string, any>();
  _relations: Map<string, ODataModelRelation<any>> = new Map<
    string,
    ODataModelRelation<any>
  >();
  _annotations: ODataEntityAnnotations<T> | null = null;
  _remove: boolean = false;
  _reset: boolean = false;
  _reparent: boolean = false;
  _silent: boolean = false;
  _meta: ODataModelOptions<any>;
  // Events
  events$ = new EventEmitter<ODataModelEvent<T>>();

  constructor(
    data: Partial<T> | { [name: string]: any } = {},
    {
      parent,
      resource,
      annots,
      reset = false,
    }: {
      parent?: [
        ODataModel<any> | ODataCollection<any, ODataModel<any>>,
        ODataModelField<any> | null
      ];
      resource?: ODataResource<T>;
      annots?: ODataEntityAnnotations<T>;
      reset?: boolean;
    } = {}
  ) {
    const Klass = this.constructor as typeof ODataModel;
    if (Klass.meta === undefined)
      throw new Error(`ODataModel: Can't create model without metadata`);
    this._meta = Klass.meta;
    this._meta.bind(this, { parent, resource, annots });

    // Client Id
    (<any>this)[this._meta.cid] =
      (<any>data)[this._meta.cid] ||
      Strings.uniqueId({ prefix: `${Klass.meta.schema.name.toLowerCase()}-` });

    let attrs = this.annots().attributes(data, 'full');
    let defaults = this.defaults();

    this.assign(Objects.merge(defaults, attrs as { [name: string]: any }), {
      reset,
    });
  }

  //#region Resources
  resource():
    | ODataEntityResource<T>
    | ODataNavigationPropertyResource<T>
    | ODataPropertyResource<T>
    | ODataSingletonResource<T> {
    return ODataModelOptions.resource<T>(this) as
      | ODataEntityResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>
      | ODataSingletonResource<T>;
  }

  pushResource(
    resource:
      | ODataEntityResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>
      | ODataSingletonResource<T>
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

  navigationProperty<N>(
    name: keyof T | string
  ): ODataNavigationPropertyResource<N> {
    const field = this._meta.field(name);
    if (field === undefined || !field.navigation)
      throw Error(
        `navigationProperty: Can't find navigation property ${name as string}`
      );

    const resource = this.resource();
    if (!(resource instanceof ODataEntityResource) || !resource.hasKey())
      throw Error(
        "navigationProperty: Can't get navigation without ODataEntityResource with key"
      );

    return field.resourceFactory<T, N>(
      resource
    ) as ODataNavigationPropertyResource<N>;
  }

  property<N>(name: string): ODataPropertyResource<N> {
    const field = this._meta.field(name);
    if (field === undefined || field.navigation)
      throw Error(`property: Can't find property ${name}`);

    const resource = this.resource();
    if (!(resource instanceof ODataEntityResource) || !resource.hasKey())
      throw Error(
        "property: Can't get property without ODataEntityResource with key"
      );

    return field.resourceFactory<T, N>(resource) as ODataPropertyResource<N>;
  }

  attach(
    resource:
      | ODataEntityResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>
      | ODataSingletonResource<T>
  ) {
    return this._meta.attach(this, resource);
  }
  //#endregion

  schema() {
    return this._meta.schema;
  }

  annots() {
    return (
      this._annotations ??
      new ODataEntityAnnotations<T>(ODataHelper[DEFAULT_VERSION])
    );
  }

  key({
    field_mapping = false,
    resolve = true,
  }: { field_mapping?: boolean; resolve?: boolean } = {}):
    | EntityKey<T>
    | { [name: string]: any }
    | undefined {
    return this._meta.resolveKey(this, { field_mapping, resolve });
  }

  isOpenModel() {
    return this._meta.isOpenType();
  }

  isParentOf(
    child: ODataModel<any> | ODataCollection<any, ODataModel<any>>
  ): boolean {
    return (
      child !== this &&
      ODataModelOptions.chain(child).some((p) => p[0] === this)
    );
  }

  referential(
    field: ODataModelField<any>,
    {
      field_mapping = false,
      resolve = true,
    }: { field_mapping?: boolean; resolve?: boolean } = {}
  ): { [name: string]: any } | null | undefined {
    return this._meta.resolveReferential(this, field, {
      field_mapping,
      resolve,
    });
  }

  referenced(
    field: ODataModelField<any>,
    {
      field_mapping = false,
      resolve = true,
    }: { field_mapping?: boolean; resolve?: boolean } = {}
  ): { [name: string]: any } | null | undefined {
    return this._meta.resolveReferenced(this, field, {
      field_mapping,
      resolve,
    });
  }

  // Validation
  _errors?: { [key: string]: any };
  validate({
    method,
    navigation = false,
  }: {
    method?: 'create' | 'update' | 'modify';
    navigation?: boolean;
  } = {}) {
    return this._meta.validate(this, { method, navigation });
  }

  isValid({
    method,
    navigation = false,
  }: {
    method?: 'create' | 'update' | 'modify';
    navigation?: boolean;
  } = {}): boolean {
    this._errors = this.validate({ method, navigation });
    if (this._errors !== undefined)
      this.events$.emit(
        new ODataModelEvent('invalid', {
          model: this,
          value: this._errors,
          options: { method },
        })
      );
    return this._errors === undefined;
  }

  defaults() {
    return this._meta.defaults() || {};
  }

  toEntity({
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
  } = {}): T | { [name: string]: any } {
    return this._meta.toEntity(this, {
      client_id,
      include_navigation,
      include_concurrency,
      include_computed,
      include_key,
      include_non_field,
      changes_only,
      field_mapping,
      chain,
    });
  }

  toJSON() {
    return this.toEntity();
  }

  attributes({
    changes_only = false,
    include_concurrency = false,
    include_computed = false,
    include_non_field = false,
    field_mapping = false,
  }: {
    changes_only?: boolean;
    include_concurrency?: boolean;
    include_computed?: boolean;
    include_non_field?: boolean;
    field_mapping?: boolean;
  } = {}): { [name: string]: any } {
    return this._meta.attributes(this, {
      changes_only,
      include_concurrency,
      include_computed,
      include_non_field,
      field_mapping,
    });
  }

  set(path: string | string[], value: any, { type }: { type?: string } = {}) {
    const pathArray = (
      Types.isArray(path) ? path : (path as string).match(/([^[.\]])+/g)
    ) as any[];
    if (pathArray.length === 0) return undefined;
    if (pathArray.length > 1) {
      const model = (<any>this)[pathArray[0]];
      return model.set(pathArray.slice(1), value, {});
    }
    if (pathArray.length === 1) {
      return this._meta.set(this, pathArray[0], value, { type });
    }
  }

  get(path: string | string[]): any {
    const pathArray = (
      Types.isArray(path) ? path : (path as string).match(/([^[.\]])+/g)
    ) as any[];
    if (pathArray.length === 0) return undefined;
    const value = this._meta.get<any>(this, pathArray[0]);
    if (
      pathArray.length > 1 &&
      (value instanceof ODataModel || value instanceof ODataCollection)
    ) {
      return value.get(pathArray.slice(1));
    }
    return value;
  }

  has(path: string | string[]): boolean {
    const pathArray = (
      Types.isArray(path) ? path : (path as string).match(/([^[.\]])+/g)
    ) as any[];
    if (pathArray.length === 0) return false;
    const value = this._meta.get<any>(this, pathArray[0]);
    if (
      pathArray.length > 1 &&
      (value instanceof ODataModel || value instanceof ODataCollection)
    ) {
      return value.has(pathArray.slice(1));
    }
    return value !== undefined;
  }

  reset({
    path,
    silent = false,
  }: { path?: string | string[]; silent?: boolean } = {}) {
    const pathArray: string[] = (
      path === undefined
        ? []
        : Types.isArray(path)
        ? path
        : (path as string).match(/([^[.\]])+/g)
    ) as any[];
    const name = pathArray[0];
    const value = name !== undefined ? (<any>this)[name] : undefined;
    if (
      ODataModelOptions.isModel(value) ||
      ODataModelOptions.isCollection(value)
    ) {
      value.reset({ path: pathArray.slice(1), silent });
    } else {
      this._meta.reset(this, { name: pathArray[0], silent });
    }
  }

  clear({ silent = false }: { silent?: boolean } = {}) {
    this._attributes.clear();
    this._changes.clear();
    this._relations.clear();
    if (!silent) {
      this.events$.emit(
        new ODataModelEvent('update', {
          model: this,
        })
      );
    }
  }

  assign(
    entity: Partial<T> | { [name: string]: any },
    {
      remove = false,
      reset = false,
      reparent = false,
      silent = false,
    }: {
      remove?: boolean;
      reset?: boolean;
      reparent?: boolean;
      silent?: boolean;
    } = {}
  ) {
    return this._meta.assign(this, entity, { remove, reset, silent, reparent });
  }

  clone<M extends ODataModel<T>>() {
    let Ctor = <typeof ODataModel>this.constructor;
    return new Ctor(this.toEntity(INCLUDE_SHALLOW), {
      resource: this.resource() as ODataResource<T>,
      annots: this.annots(),
    }) as M;
  }

  private _request(
    obs$: Observable<ODataEntity<any>>,
    { remove }: { remove?: boolean } = {}
  ): Observable<this> {
    this.events$.emit(
      new ODataModelEvent('request', {
        model: this,
        options: { observable: obs$ },
      })
    );
    return obs$.pipe(
      map(({ entity, annots }) => {
        this._annotations = annots;
        this.assign(annots.attributes(entity || {}, 'full'), {
          reset: true,
          remove,
        });
        this.events$.emit(
          new ODataModelEvent('sync', {
            model: this,
            options: { entity, annots },
          })
        );
        return this;
      })
    );
  }

  fetch({
    remove,
    ...options
  }: ODataOptions & {
    remove?: boolean;
    options?: ODataOptions;
  } = {}): Observable<this> {
    let resource = this.resource();
    if (resource === undefined)
      return throwError(() => new Error('fetch: Resource is undefined'));

    let obs$: Observable<ODataEntity<T>>;
    if (resource instanceof ODataEntityResource) {
      obs$ = resource.fetch(options);
    } else if (resource instanceof ODataNavigationPropertyResource) {
      obs$ = resource.fetch({ responseType: 'entity', ...options });
    } else {
      obs$ = (resource as ODataPropertyResource<T>).fetch({
        responseType: 'entity',
        ...options,
      });
    }
    return this._request(obs$, { remove });
  }

  save({
    method,
    navigation = false,
    validate = true,
    ...options
  }: ODataOptions & {
    method?: 'create' | 'update' | 'modify';
    navigation?: boolean;
    validate?: boolean;
    options?: ODataOptions;
  } = {}): Observable<this> {
    let resource = this.resource();
    if (resource === undefined)
      return throwError(() => new Error('save: Resource is undefined'));
    if (
      !(
        resource instanceof ODataEntityResource ||
        resource instanceof ODataNavigationPropertyResource
      )
    )
      return throwError(
        () =>
          new Error(
            'save: Resource type ODataEntityResource/ODataNavigationPropertyResource needed'
          )
      );

    // Resolve method and resource key
    if (method === undefined && this.schema().isCompoundKey())
      return throwError(
        () =>
          new Error(
            'save: Composite key require a specific method, use create/update/modify'
          )
      );
    method = method || (!resource.hasKey() ? 'create' : 'update');
    if (
      resource instanceof ODataEntityResource &&
      (method === 'update' || method === 'modify') &&
      !resource.hasKey()
    )
      return throwError(
        () => new Error('save: Update/Patch require entity key')
      );
    if (
      resource instanceof ODataNavigationPropertyResource ||
      method === 'create'
    )
      resource.clearKey();

    if (validate && !this.isValid({ method, navigation })) {
      return throwError(() => new Error('save: Validation errors'));
    }
    const _entity = this.toEntity({
      changes_only: method === 'modify',
      field_mapping: true,
      include_concurrency: true,
      include_navigation: navigation,
    }) as T;
    return this._request(
      (method === 'create'
        ? resource.create(_entity, options)
        : method === 'modify'
        ? resource.modify(_entity, { etag: this.annots().etag, ...options })
        : resource.update(_entity, { etag: this.annots().etag, ...options })
      ).pipe(
        map(({ entity, annots }) => ({ entity: entity || _entity, annots }))
      )
    );
  }

  destroy({
    ...options
  }: ODataOptions & {
    options?: ODataOptions;
  } = {}): Observable<this> {
    let resource = this.resource();
    if (resource === undefined)
      return throwError(() => new Error('destroy: Resource is undefined'));
    if (
      !(
        resource instanceof ODataEntityResource ||
        resource instanceof ODataNavigationPropertyResource
      )
    )
      return throwError(
        () =>
          new Error(
            'destroy: Resource type ODataEntityResource/ODataNavigationPropertyResource needed'
          )
      );
    if (!resource.hasKey())
      return throwError(
        () => new Error("destroy: Can't destroy model without key")
      );

    const _entity = this.toEntity({ field_mapping: true }) as T;
    const obs$ = resource
      .destroy({ etag: this.annots().etag, ...options })
      .pipe(
        map(({ entity, annots }) => ({ entity: entity || _entity, annots }))
      );
    return this._request(obs$).pipe(
      tap(() =>
        this.events$.emit(new ODataModelEvent('destroy', { model: this }))
      )
    );
  }

  /**
   * Create an execution context for change the internal query of a resource
   * @param ctx Function to execute
   */
  query(
    ctx: (q: ODataQueryOptionsHandler<T>, s?: ODataStructuredType<T>) => void
  ) {
    return this._meta.query(this, this.resource(), ctx) as this;
  }

  /**
   * Perform a check on the internal state of the model and return true if the model is changed.
   * @param include_navigation Check in navigation properties
   * @returns true if the model has changed, false otherwise
   */
  hasChanged({
    include_navigation = false,
  }: { include_navigation?: boolean } = {}) {
    return this._meta.hasChanged(this, { include_navigation });
  }

  isNew() {
    return !this._meta.hasKey(this);
  }
  withResource<R>(resource: any, ctx: (model: this) => R): R {
    return this._meta.withResource(this, resource, ctx);
  }

  /**
   * Create an execution context for a given function, where the model is bound to its entity endpoint
   * @param ctx Context function
   * @returns The result of the context
   */
  asEntity<R>(ctx: (model: this) => R): R {
    return this._meta.asEntity(this, ctx);
  }

  callFunction<P, R>(
    name: string,
    params: P | null,
    responseType:
      | 'property'
      | 'model'
      | 'collection'
      | 'none'
      | 'blob'
      | 'arraybuffer',
    { ...options }: {} & ODataFunctionOptions<R> = {}
  ): Observable<
    | R
    | ODataModel<R>
    | ODataCollection<R, ODataModel<R>>
    | null
    | Blob
    | ArrayBuffer
  > {
    const resource = this.resource();
    if (!(resource instanceof ODataEntityResource) || !resource.hasKey())
      return throwError(
        () =>
          new Error(
            "callFunction: Can't call function without ODataEntityResource with key"
          )
      );

    const func = resource.function<P, R>(name).query((q) => q.apply(options));
    switch (responseType) {
      case 'property':
        return func.callProperty(params, options);
      case 'model':
        return func.callModel(params, options);
      case 'collection':
        return func.callCollection(params, options);
      case 'blob':
        return func.callBlob(params, options);
      case 'arraybuffer':
        return func.callArraybuffer(params, options);
      default:
        return func.call(params, { responseType, ...options });
    }
  }

  callAction<P, R>(
    name: string,
    params: P | null,
    responseType?:
      | 'property'
      | 'model'
      | 'collection'
      | 'none'
      | 'blob'
      | 'arraybuffer',
    { ...options }: {} & ODataActionOptions<R> = {}
  ): Observable<
    | R
    | ODataModel<R>
    | ODataCollection<R, ODataModel<R>>
    | null
    | Blob
    | ArrayBuffer
  > {
    const resource = this.resource();
    if (!(resource instanceof ODataEntityResource) || !resource.hasKey())
      return throwError(
        () =>
          new Error(
            "callAction: Can't call action without ODataEntityResource with key"
          )
      );

    const action = resource.action<P, R>(name).query((q) => q.apply(options));
    switch (responseType) {
      case 'property':
        return action.callProperty(params, options);
      case 'model':
        return action.callModel(params, options);
      case 'collection':
        return action.callCollection(params, options);
      case 'blob':
        return action.callBlob(params, options);
      case 'arraybuffer':
        return action.callArraybuffer(params, options);
      default:
        return action.call(params, { responseType, ...options });
    }
  }

  // Cast
  cast<S>(type: string) {
    //: ODataModel<S> {
    const resource = this.resource();
    if (!(resource instanceof ODataEntityResource))
      throw new Error(
        `cast: Can't cast to derived model without ODataEntityResource`
      );

    return resource
      .cast<S>(type)
      .asModel(this.toEntity(INCLUDE_DEEP) as { [name: string]: any }, {
        annots: this.annots() as any,
      });
  }

  fetchNavigationProperty<S>(
    name: keyof T | string,
    responseType: 'model' | 'collection',
    { ...options }: {} & ODataQueryArgumentsOptions<S> = {}
  ): Observable<ODataModel<S> | ODataCollection<S, ODataModel<S>> | null> {
    const nav = this.navigationProperty<S>(
      name
    ) as ODataNavigationPropertyResource<S>;
    nav.query((q) => q.apply(options));
    switch (responseType) {
      case 'model':
        return nav.fetchModel(options);
      case 'collection':
        return nav.fetchCollection(options);
    }
  }

  // Get Value
  getValue<P>(
    name: keyof T | string,
    options?: ODataOptions
  ): Observable<P | ODataModel<P> | ODataCollection<P, ODataModel<P>> | null> {
    const field = this._meta.field(name);
    if (field === undefined || field.navigation)
      throw Error(`getValue: Can't find property ${name as string}`);

    let value = (this as any)[name] as
      | P
      | ODataModel<P>
      | ODataCollection<P, ODataModel<P>>;
    if (value === undefined) {
      const prop = field.resourceFactory(
        this.resource()
      ) as ODataPropertyResource<P>;
      return field.collection
        ? prop
            .fetchCollection(options)
            .pipe(tap((c) => this.assign({ [name]: c }, { silent: true })))
        : field.isStructuredType()
        ? prop
            .fetchModel(options)
            .pipe(tap((c) => this.assign({ [name]: c }, { silent: true })))
        : prop
            .fetchProperty(options)
            .pipe(tap((c) => this.assign({ [name]: c }, { silent: true })));
    }
    return of(value as P);
  }

  // Set Reference
  setReference<N>(
    name: keyof T | string,
    model: ODataModel<N> | ODataCollection<N, ODataModel<N>> | null,
    options?: ODataOptions
  ): Observable<this> {
    const reference = (
      this.navigationProperty<N>(name) as ODataNavigationPropertyResource<N>
    ).reference();

    const etag = this.annots().etag;
    let obs$ = NEVER as Observable<any>;
    if (model instanceof ODataModel) {
      obs$ = reference.set(
        model._meta.entityResource(model) as ODataEntityResource<N>,
        { etag, ...options }
      );
    } else if (model instanceof ODataCollection) {
      obs$ = forkJoin(
        model
          .models()
          .map((m) =>
            reference.add(
              m._meta.entityResource(m) as ODataEntityResource<N>,
              options
            )
          )
      );
    } else if (model === null) {
      obs$ = reference.unset({ etag, ...options });
    }
    this.events$.emit(
      new ODataModelEvent('request', {
        model: this,
        options: { observable: obs$ },
      })
    );
    return obs$.pipe(
      map((model) => {
        this.assign({ [name]: model });
        this.events$.emit(new ODataModelEvent('sync', { model: this }));
        return this;
      })
    );
  }

  getReference<P>(
    name: keyof T | string
  ): ODataModel<P> | ODataCollection<P, ODataModel<P>> | null {
    const field = this._meta.field<P>(name);
    if (field === undefined || !field.navigation)
      throw Error(
        `getReference: Can't find navigation property ${name as string}`
      );

    let model = (this as any)[name] as
      | ODataModel<P>
      | ODataCollection<P, ODataModel<P>>
      | null;
    if (model === null) return null;
    if (model === undefined) {
      if (field.collection) {
        model = field.collectionFactory({ parent: this });
      } else {
        const value = this.referenced(field) as P;
        model =
          value === null ? null : field.modelFactory({ parent: this, value });
      }
      (this as any)[name] = model;
    }
    return model;
  }

  // Model functions
  equals(other: ODataModel<T>) {
    const thisKey = this.key();
    const otherKey = other.key();
    return (
      this === other ||
      (typeof this === typeof other &&
        ((<any>this)[this._meta.cid] === (<any>other)[this._meta.cid] ||
          (thisKey !== undefined &&
            otherKey !== undefined &&
            Types.isEqual(thisKey, otherKey))))
    );
  }

  get [Symbol.toStringTag]() {
    return 'Model';
  }

  collection() {
    return this._parent !== null &&
      ODataModelOptions.isCollection(this._parent[0])
      ? (this._parent[0] as ODataCollection<T, ODataModel<T>>)
      : undefined;
  }

  next(): ODataModel<T> | undefined {
    return this.collection()?.next(this);
  }

  prev(): ODataModel<T> | undefined {
    return this.collection()?.prev(this);
  }
}

export const RESERVED_FIELD_NAMES = Object.getOwnPropertyNames(
  ODataModel.prototype
);
