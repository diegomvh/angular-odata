import { forkJoin, NEVER, Observable, throwError } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import {
  EntityKey,
  ODataActionOptions,
  ODataEntityResource,
  ODataFunctionOptions,
  ODataNavigationPropertyResource,
  ODataOptions,
  ODataPropertyResource,
  ODataQueryArguments,
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
  ModelOptions,
  ODataModelField,
  ODataModelOptions,
  ODataModelAttribute,
  ODataModelEventType,
  ODataModelEventEmitter,
  ModelFieldOptions,
} from './options';
import { EdmType, ParserOptions } from '../types';
import { ODataEntityAnnotations } from '../annotations';
import { ODataEntity } from '../resources/response';

export class ODataModel<T> {
  // Properties
  static options: ModelOptions;
  static meta: ODataModelOptions<any>;
  // Parent
  _parent:
    | [
        ODataModel<any> | ODataCollection<any, ODataModel<any>>,
        ODataModelField<any> | null,
      ]
    | null = null;
  _resource: ODataResource<T> | null = null;
  _resources: {
    parent:
      | [
          ODataModel<any> | ODataCollection<any, ODataModel<any>>,
          ODataModelField<any> | null,
        ]
      | null;
    resource: ODataResource<T> | null;
  }[] = [];
  _attributes: Map<string, ODataModelAttribute<any>> = new Map<
    string,
    ODataModelAttribute<any>
  >();
  _annotations!: ODataEntityAnnotations<T>;
  _meta: ODataModelOptions<any>;
  // Events
  events$: ODataModelEventEmitter<T>;

  static buildMetaOptions<T>({
    config,
    structuredType,
  }: {
    config?: ModelOptions;
    structuredType: ODataStructuredType<T>;
  }) {
    if (config === undefined) {
      const fields = structuredType
        .fields({ include_navigation: true, include_parents: true })
        .reduce((acc, field) => {
          let name = field.name;
          // Prevent collision with reserved keywords
          while (RESERVED_FIELD_NAMES.includes(name)) {
            name = name + '_';
          }
          return Object.assign(acc, {
            [name]: {
              field: field.name,
              default: field.default,
              required: !field.nullable,
            },
          });
        }, {});
      config = {
        fields: new Map<string, ModelFieldOptions>(Object.entries(fields)),
      };
    }
    return new ODataModelOptions<T>({ config, structuredType });
  }

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
        ODataModelField<any> | null,
      ];
      resource?: ODataResource<T> | null;
      annots?: ODataEntityAnnotations<T>;
      reset?: boolean;
    } = {},
  ) {
    const Klass = this.constructor as typeof ODataModel;
    if (Klass.meta === undefined)
      throw new Error(`Model: Can't create model without metadata`);
    this._meta = Klass.meta;
    this.events$ = new ODataModelEventEmitter<T>({ model: this });
    this._meta.bind(this, { parent, resource, annots });

    // Client Id
    (<any>this)[this._meta.cid] =
      (<any>data)[this._meta.cid] ||
      Strings.uniqueId({
        prefix: `${Klass.meta.structuredType.name.toLowerCase()}-`,
      });

    if (!reset)
      data = Objects.merge(
        this.defaults(),
        data as { [name: string]: any },
      ) as Partial<T>;

    this.assign(data, { reset });
  }

  //#region Resources
  resource():
    | ODataEntityResource<T>
    | ODataNavigationPropertyResource<T>
    | ODataPropertyResource<T>
    | ODataSingletonResource<T>
    | null {
    return ODataModelOptions.resource<T>(this) as
      | ODataEntityResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>
      | ODataSingletonResource<T>
      | null;
  }

  pushResource(
    resource:
      | ODataEntityResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>
      | ODataSingletonResource<T>
      | null,
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
    name: keyof T | string,
  ): ODataNavigationPropertyResource<N> {
    const field = this._meta.findField<N>(name);
    if (!field || !field.navigation)
      throw Error(
        `navigationProperty: Can't find navigation property ${name as string}`,
      );

    const resource = this.resource();
    if (!(resource instanceof ODataEntityResource) || !resource.hasKey())
      throw Error(
        "navigationProperty: Can't get navigation without ODataEntityResource with key",
      );

    return field.resourceFactory<T, N>(
      resource,
    ) as ODataNavigationPropertyResource<N>;
  }

  property<N>(name: string): ODataPropertyResource<N> {
    const field = this._meta.findField<N>(name);
    if (!field || field.navigation)
      throw Error(`property: Can't find property ${name}`);

    const resource = this.resource();
    if (!(resource instanceof ODataEntityResource) || !resource.hasKey())
      throw Error(
        "property: Can't get property without ODataEntityResource with key",
      );

    return field.resourceFactory<T, N>(resource) as ODataPropertyResource<N>;
  }

  attach(
    resource:
      | ODataEntityResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>
      | ODataSingletonResource<T>,
  ) {
    return this._meta.attach(this, resource);
  }
  //#endregion

  schema() {
    return this._meta.structuredType;
  }

  annots() {
    return this._annotations;
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
    child: ODataModel<any> | ODataCollection<any, ODataModel<any>>,
  ): boolean {
    return (
      child !== this &&
      ODataModelOptions.chain(child).some((p) => p[0] === this)
    );
  }

  referential(
    attr: ODataModelAttribute<any> | ODataModelField<any>,
    {
      field_mapping = false,
      resolve = true,
    }: { field_mapping?: boolean; resolve?: boolean } = {},
  ): { [name: string]: any } | null | undefined {
    return this._meta.resolveReferential(this, attr, {
      field_mapping,
      resolve,
    });
  }

  referenced(
    attr: ODataModelAttribute<any> | ODataModelField<any>,
    {
      field_mapping = false,
      resolve = true,
    }: { field_mapping?: boolean; resolve?: boolean } = {},
  ): { [name: string]: any } | null | undefined {
    return this._meta.resolveReferenced(this, attr, {
      field_mapping,
      resolve,
    });
  }

  // Validation
  _errors?: { [name: string]: any };
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
      this.events$.trigger(ODataModelEventType.Invalid, {
        value: this._errors,
        options: { method },
      });
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
  } = {}): T | { [name: string]: any } {
    return this._meta.toEntity(this, {
      client_id,
      include_navigation,
      include_concurrency,
      include_computed,
      include_key,
      include_id,
      include_non_field,
      changes_only,
      field_mapping,
      chain,
    });
  }

  toJson() {
    return this.toEntity(INCLUDE_DEEP);
  }

  set(
    path: keyof T | string | string[],
    value: any,
    { type }: { type?: EdmType | string } = {},
  ) {
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

  get(path: keyof T | string | string[]): any {
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

  has(path: keyof T | string | string[]): boolean {
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
  }: { path?: keyof T | string | string[]; silent?: boolean } = {}) {
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
    if (!silent) {
      this.events$.trigger(ODataModelEventType.Update);
    }
  }

  assign(
    entity: Partial<T> | { [name: string]: any },
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
    } = {},
  ) {
    return this._meta.assign(this, entity, {
      add,
      merge,
      remove,
      reset,
      silent,
      reparent,
    }) as this;
  }

  clone<M extends ODataModel<T>>() {
    return new (<typeof ODataModel>this.constructor)(
      this.toEntity(INCLUDE_DEEP),
      {
        resource: this.resource() as ODataResource<T>,
        annots: this.annots(),
      },
    ) as M;
  }

  private _request<T, R>(
    obs$: Observable<T>,
    mapCallback: (response: T) => R,
  ): Observable<R> {
    this.events$.trigger(ODataModelEventType.Request, {
      options: { observable: obs$ },
    });
    return obs$.pipe(
      map((response) => mapCallback(response)),
      finalize(() => this.events$.trigger(ODataModelEventType.Sync)),
    );
  }

  fetch({
    ...options
  }: ODataOptions & {
    options?: ODataOptions;
  } = {}): Observable<this> {
    const resource = this.resource();
    if (!resource)
      return throwError(() => new Error('fetch: Resource is null'));

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
    return this._request(obs$, ({ entity, annots }) => {
      this._annotations = annots;
      return this.assign(entity ?? {}, { reset: true });
    });
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
    const resource = this.resource();
    if (!resource) return throwError(() => new Error('save: Resource is null'));
    if (
      !(
        resource instanceof ODataEntityResource ||
        resource instanceof ODataNavigationPropertyResource
      )
    )
      return throwError(
        () =>
          new Error(
            'save: Resource type ODataEntityResource/ODataNavigationPropertyResource needed',
          ),
      );

    // Resolve method and resource key
    if (method === undefined && this.schema().isCompoundKey())
      return throwError(
        () =>
          new Error(
            'save: Composite key require a specific method, use create/update/modify',
          ),
      );
    method = method || (!resource.hasKey() ? 'create' : 'update');
    if (
      resource instanceof ODataEntityResource &&
      (method === 'update' || method === 'modify') &&
      !resource.hasKey()
    )
      return throwError(
        () => new Error('save: Update/Patch require entity key'),
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
    });
    const obs$ =
      method === 'create'
        ? resource.create(_entity as T, options)
        : method === 'modify'
          ? resource.modify(_entity as T, {
              etag: this.annots().etag,
              ...options,
            })
          : resource.update(_entity as T, {
              etag: this.annots().etag,
              ...options,
            });
    return this._request(obs$, ({ entity, annots }) => {
      this._annotations = annots;
      return this.assign(entity ?? (_entity as { [name: string]: any }), {
        reset: true,
      });
    });
  }

  destroy({
    ...options
  }: ODataOptions & {
    options?: ODataOptions;
  } = {}) {
    const resource = this.resource();
    if (!resource)
      return throwError(() => new Error('destroy: Resource is null'));

    if (
      !(
        resource instanceof ODataEntityResource ||
        resource instanceof ODataNavigationPropertyResource
      )
    )
      return throwError(
        () =>
          new Error(
            'destroy: Resource type ODataEntityResource/ODataNavigationPropertyResource needed',
          ),
      );
    if (!resource.hasKey())
      return throwError(
        () => new Error("destroy: Can't destroy model without key"),
      );

    const obs$ = resource.destroy({ etag: this.annots().etag, ...options });
    return this._request(obs$, (resp) => {
      this.events$.trigger(ODataModelEventType.Destroy);
      return resp;
    });
  }

  /**
   * Create an execution context for change the internal query of a resource
   * @param ctx Function to execute
   */
  query(
    ctx: (q: ODataQueryOptionsHandler<T>, s?: ODataStructuredType<T>) => void,
  ) {
    const resource = this.resource();
    return (resource ? this._meta.query(this, resource, ctx) : this) as this;
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

  encode<E>(name: keyof T, options?: ParserOptions) {
    const value = (<any>this)[name];
    if (value === undefined) return undefined;
    const field = this._meta.findField<E>(name);
    return field ? field.encode(value, options) : value;
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

  //#region Callables
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
    options: ODataFunctionOptions<R> = {},
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
            "callFunction: Can't call function without ODataEntityResource with key",
          ),
      );

    const func = resource.function<P, R>(name).query((q) => q.restore(options));
    switch (responseType) {
      case 'property':
        return this._request(
          func.callProperty(params, options),
          (resp) => resp,
        );
      case 'model':
        return this._request(func.callModel(params, options), (resp) => resp);
      case 'collection':
        return this._request(
          func.callCollection(params, options),
          (resp) => resp,
        );
      case 'blob':
        return this._request(func.callBlob(params, options), (resp) => resp);
      case 'arraybuffer':
        return this._request(
          func.callArraybuffer(params, options),
          (resp) => resp,
        );
      default:
        return this._request(
          func.call(params, { responseType, ...options }),
          (resp) => resp,
        );
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
    { ...options }: {} & ODataActionOptions<R> = {},
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
            "callAction: Can't call action without ODataEntityResource with key",
          ),
      );

    const action = resource.action<P, R>(name).query((q) => q.restore(options));
    switch (responseType) {
      case 'property':
        return this._request(
          action.callProperty(params, options),
          (resp) => resp,
        );
      case 'model':
        return this._request(action.callModel(params, options), (resp) => resp);
      case 'collection':
        return this._request(
          action.callCollection(params, options),
          (resp) => resp,
        );
      case 'blob':
        return this._request(action.callBlob(params, options), (resp) => resp);
      case 'arraybuffer':
        return this._request(
          action.callArraybuffer(params, options),
          (resp) => resp,
        );
      default:
        return this._request(
          action.call(params, { responseType, ...options }),
          (resp) => resp,
        );
    }
  }
  //#endregion

  // Cast
  cast<S>(type: string, ModelType?: typeof ODataModel) {
    //: ODataModel<S> {
    const resource = this.resource();
    if (!(resource instanceof ODataEntityResource))
      throw new Error(
        `cast: Can't cast to derived model without ODataEntityResource`,
      );

    return resource
      .cast<S>(type)
      .asModel(this.toEntity(INCLUDE_DEEP) as { [name: string]: any }, {
        annots: this.annots() as any,
        ModelType,
      });
  }

  fetchNavigationProperty<S>(
    name: keyof T | string,
    responseType: 'model' | 'collection',
    options: ODataQueryArgumentsOptions<S> = {},
  ): Observable<ODataModel<S> | ODataCollection<S, ODataModel<S>> | null> {
    const nav = this.navigationProperty<S>(
      name,
    ) as ODataNavigationPropertyResource<S>;
    nav.query((q) => q.restore(options));
    switch (responseType) {
      case 'model':
        return nav.fetchModel(options);
      case 'collection':
        return nav.fetchCollection(options);
    }
  }

  fetchAttribute<P>(
    name: keyof T | string,
    options: ODataQueryArgumentsOptions<P> = {},
  ): Observable<P | ODataModel<P> | ODataCollection<P, ODataModel<P>> | null> {
    const field = this._meta.findField<P>(name);
    if (!field)
      throw Error(`fetchAttribute: Can't find attribute ${name as string}`);

    if (field.isStructuredType() && field.collection) {
      const collection = field.collectionFactory<P>({ parent: this });
      collection.query((q) => q.restore(options as ODataQueryArguments<P>));
      return this._request(collection.fetch(options), () => {
        this.assign({ [name]: collection });
        return collection;
      });
    } else if (field.isStructuredType()) {
      const model = field.modelFactory<P>({ parent: this });
      model.query((q) => q.restore(options as ODataQueryArguments<P>));
      return this._request(model.fetch(options), () => {
        this.assign({ [name]: model });
        return model;
      });
    } else {
      const prop = field.resourceFactory<T, P>(
        this.resource()!,
      ) as ODataPropertyResource<P>;
      prop.query((q) => q.restore(options as ODataQueryArguments<P>));
      return this._request(prop.fetchProperty(options), (resp) => {
        this.assign({ [name]: resp });
        return resp;
      });
    }
  }

  getAttribute<P>(
    name: keyof T | string,
  ): P | ODataModel<P> | ODataCollection<P, ODataModel<P>> | null | undefined {
    const field = this._meta.findField<P>(name);
    if (!field)
      throw Error(`getAttribute: Can't find attribute ${name as string}`);

    let model = (this as any)[name] as
      | P
      | ODataModel<P>
      | ODataCollection<P, ODataModel<P>>
      | null;
    if (field.isStructuredType() && model === undefined) {
      if (field.collection) {
        model = field.collectionFactory({ parent: this });
      } else {
        const ref = field.navigation
          ? (this.referenced(field) as P)
          : undefined;
        model =
          ref === null
            ? null
            : field.modelFactory({ parent: this, value: ref });
      }
      (this as any)[name] = model;
    }
    return model;
  }

  setAttribute<N>(
    name: keyof T | string,
    model: ODataModel<N> | ODataCollection<N, ODataModel<N>> | null,
    options?: ODataOptions,
  ): Observable<this> {
    const reference = (
      this.navigationProperty<N>(name) as ODataNavigationPropertyResource<N>
    ).reference();

    const etag = this.annots().etag;
    let obs$ = NEVER as Observable<any>;
    if (model instanceof ODataModel) {
      obs$ = reference.set(
        model.asEntity((e) => e.resource()) as ODataEntityResource<N>,
        { etag, ...options },
      );
    } else if (model instanceof ODataCollection) {
      obs$ = forkJoin(
        model
          .models()
          .map((m) =>
            reference.add(
              m.asEntity((e) => e.resource()) as ODataEntityResource<N>,
              options,
            ),
          ),
      );
    } else if (model === null) {
      obs$ = reference.unset({ etag, ...options });
    }
    return this._request(obs$, (model) => this.assign({ [name]: model }));
  }

  setReference<N>(
    name: keyof T | string,
    model: ODataModel<N> | ODataCollection<N, ODataModel<N>> | null,
    options?: ODataOptions,
  ): Observable<this> {
    const reference = (
      this.navigationProperty<N>(name) as ODataNavigationPropertyResource<N>
    ).reference();

    const etag = this.annots().etag;
    let obs$ = NEVER as Observable<any>;
    if (model instanceof ODataModel) {
      obs$ = reference.set(
        model.asEntity((e) => e.resource()) as ODataEntityResource<N>,
        { etag, ...options },
      );
    } else if (model instanceof ODataCollection) {
      obs$ = forkJoin(
        model
          .models()
          .map((m) =>
            reference.add(
              m.asEntity((e) => e.resource()) as ODataEntityResource<N>,
              options,
            ),
          ),
      );
    } else if (model === null) {
      obs$ = reference.unset({ etag, ...options });
    }
    return this._request(obs$, (model) => this.assign({ [name]: model }));
  }

  //#region Model Identity
  get [Symbol.toStringTag]() {
    return 'Model';
  }
  equals(other: ODataModel<T>): boolean {
    if (this === other) return true;
    if (typeof this !== typeof other) return false;
    const meta = this._meta;
    const thisCid = (<any>this)[meta.cid];
    const otherCid = (<any>other)[meta.cid];
    if (
      thisCid !== undefined &&
      otherCid !== undefined &&
      Types.isEqual(thisCid, otherCid)
    )
      return true;
    if (meta.isEntityType()) {
      const thisKey = this.key();
      const otherKey = other.key();
      if (
        thisKey !== undefined &&
        otherKey !== undefined &&
        Types.isEqual(thisKey, otherKey)
      )
        return true;
    } else if (meta.isComplexType()) {
      const thisJson = this.toJson();
      const otherJson = other.toJson();
      if (Types.isEqual(thisJson, otherJson)) return true;
    }
    return false;
  }
  //#endregion

  //#region Collection Tools
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
  //#endregion
}

const RESERVED_FIELD_NAMES = Object.getOwnPropertyNames(ODataModel.prototype);
