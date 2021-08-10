import { EventEmitter } from '@angular/core';
import { Observable, throwError, forkJoin, NEVER } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import {
  ODataEntityResource,
  ODataNavigationPropertyResource,
  ODataPropertyResource,
  HttpOptions,
  ODataEntityAnnotations,
  ODataEntity,
  Select,
  Expand,
  EntityKey,
  OptionHandler,
  QueryArguments,
  HttpQueryOptions,
} from '../resources/index';

import { ODataCollection } from './collection';
import { Objects, Types } from '../utils';
import { ODataStructuredType } from '../schema';
import {
  ModelOptions,
  ODataModelEvent,
  ODataModelOptions,
  ODataModelRelation,
  ODataModelResource,
  ODataModelField,
  INCLUDE_ALL,
} from './options';

// @dynamic
export class ODataModel<T> {
  // Properties
  static options: ModelOptions;
  static meta: ODataModelOptions<any>;
  static buildMeta<T>(options: ModelOptions, schema: ODataStructuredType<T>) {
    this.meta = new ODataModelOptions<T>(options, schema);
  }
  // Parent
  _parent: [ODataModel<any>, ODataModelField<any>] | null = null;
  _attributes: { [name: string]: any } = {};
  _changes: { [name: string]: any } = {};
  _relations: { [name: string]: ODataModelRelation<any> } = {};
  _resource?: ODataModelResource<T>;
  _annotations!: ODataEntityAnnotations;
  _resetting: boolean = false;
  _silent: boolean = false;
  _meta: ODataModelOptions<T>;
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
      parent?: [ODataModel<any>, ODataModelField<any>];
      resource?: ODataModelResource<T>;
      annots?: ODataEntityAnnotations;
      reset?: boolean;
    } = {}
  ) {
    const Klass = this.constructor as typeof ODataModel;
    if (Klass.meta === undefined)
      throw new Error(`Can't create model without metadata`);
    this._meta = Klass.meta;
    this._meta.bind(this, { parent, resource, annots });

    // Client Id
    (<any>this)[this._meta.cid] =
      (<any>data)[this._meta.cid] || Objects.uniqueId('c');

    let attrs = this.annots().attributes<T>(data, 'full');
    let defaults = this.defaults();

    this.assign(Objects.merge(defaults, attrs), { reset });
  }

  get [Symbol.toStringTag]() { return "Model"; }

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

  resource() {
    return ODataModelOptions.resource<T>(this) as
      | ODataModelResource<T>
      | undefined;
  }

  attach(resource: ODataModelResource<T>) {
    return this._meta.attach(this, resource);
  }

  attachToEntity() {
    const resource = this._meta.modelResourceFactory({
      baseResource: this._resource,
      fromSet: true,
    });
    if (resource !== undefined) {
      this.attach(resource);
    }
  }

  schema() {
    return this._meta.schema;
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

  isNew() {
    return this.key() === undefined;
  }

  isParentOf(child: ODataModel<any>) {
    return child !== this && ODataModelOptions.chain(child).some((p) => p[0] === this);
  }

  referential(
    field: ODataModelField<any>,
    {
      field_mapping = false,
      resolve = true,
    }: { field_mapping?: boolean; resolve?: boolean } = {}
  ): { [name: string]: any } | undefined {
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
  ): { [name: string]: any } | undefined {
    return this._meta.resolveReferenced(this, field, {
      field_mapping,
      resolve,
    });
  }

  // Validation
  _errors?: { [key: string]: any };
  protected validate({
    method,
    navigation = false,
  }: {
    method?: 'create' | 'update' | 'patch';
    navigation?: boolean;
  } = {}) {
    return this._meta.validate(this, { method, navigation });
  }

  isValid({
    method,
    navigation = false,
  }: {
    method?: 'create' | 'update' | 'patch';
    navigation?: boolean;
  } = {}): boolean {
    this._errors = this.validate({ method, navigation });
    if (this._errors !== undefined)
      this.events$.emit({
        name: 'invalid',
        model: this,
        value: this._errors,
        options: { method },
      });
    return this._errors === undefined;
  }

  protected defaults() {
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
  }: {
    client_id?: boolean;
    include_navigation?: boolean;
    include_concurrency?: boolean;
    include_computed?: boolean;
    include_key?: boolean;
    include_non_field?: boolean;
    changes_only?: boolean;
    field_mapping?: boolean;
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
    });
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

  set(path: string | string[], value: any) {
    const pathArray = (
      Types.isArray(path) ? path : (path as string).match(/([^[.\]])+/g)
    ) as any[];
    if (pathArray.length === 0) return undefined;
    if (pathArray.length > 1) {
      const model = (<any>this)[pathArray[0]];
      return model.set(pathArray.slice(1), value);
    }
    if (pathArray.length === 1) {
      return ((<any>this)[pathArray[0]] = value);
    }
  }

  get(path: string | string[]): any {
    const pathArray = (
      Types.isArray(path) ? path : (path as string).match(/([^[.\]])+/g)
    ) as any[];
    if (pathArray.length === 0) return undefined;
    const value = (<any>this)[pathArray[0]];
    if (
      pathArray.length > 1 &&
      (value instanceof ODataModel || value instanceof ODataCollection)
    ) {
      return value.get(pathArray.slice(1));
    }
    return value;
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
    if (ODataModelOptions.isModel(value) || ODataModelOptions.isCollection(value)) {
      value.reset({ path: pathArray.slice(1), silent });
    } else {
      this._meta.reset(this, { name: pathArray[0], silent });
    }
  }

  assign(
    entity: Partial<T> | { [name: string]: any },
    {
      reset = false,
      silent = false,
    }: { reset?: boolean; silent?: boolean } = {}
  ) {
    return this._meta.assign(this, entity, { reset, silent });
  }

  clone() {
    let Ctor = <typeof ODataModel>this.constructor;
    return new Ctor(this.toEntity(INCLUDE_ALL), {
      resource: this.resource() as ODataModelResource<T> | undefined,
      annots: this.annots(),
    });
  }

  private _request(obs$: Observable<ODataEntity<any>>): Observable<this> {
    this.events$.emit({ name: 'request', model: this, value: obs$ });
    return obs$.pipe(
      map(({ entity, annots }) => {
        this._annotations = annots;
        this.assign(annots.attributes<T>(entity || {}, 'full'), {
          reset: true,
        });
        this.events$.emit({ name: 'sync', model: this });
        return this;
      })
    );
  }

  fetch({
    asEntity,
    ...options
  }: HttpOptions & {
    asEntity?: boolean;
    options?: HttpOptions;
  } = {}): Observable<this> {
    let resource = asEntity ? this._meta.entityResource(this) : this.resource();
    if (resource === undefined)
      return throwError('fetch: Resource is undefined');

    let obs$: Observable<ODataEntity<T>>;
    if (resource instanceof ODataEntityResource) {
      if (!resource.hasKey())
        return throwError("fetch: Can't fetch model without key");
      obs$ = resource.get(options);
    } else if (resource instanceof ODataNavigationPropertyResource) {
      obs$ = resource.get({ responseType: 'entity', ...options });
    } else {
      obs$ = (resource as ODataPropertyResource<T>).get({
        responseType: 'entity',
        ...options,
      });
    }
    return this._request(obs$);
  }

  save({
    asEntity,
    method,
    navigation = false,
    validate = true,
    ...options
  }: HttpOptions & {
    asEntity?: boolean;
    method?: 'create' | 'update' | 'patch';
    navigation?: boolean;
    validate?: boolean;
    options?: HttpOptions;
  } = {}): Observable<this> {
    let resource = asEntity ? this._meta.entityResource(this) : this.resource();
    if (resource === undefined)
      return throwError('save: Resource is undefined');
    if (!(resource instanceof ODataEntityResource))
      return throwError('save: Resource type ODataEntityResource needed');

    // Resolve method and resource key
    if (method === undefined) {
      if (this.schema().isCompoundKey())
        return throwError(
          'Composite key require a specific method, use create/update/patch'
        );
      method = !resource.hasKey() ? 'create' : 'update';
    } else {
      if ((method === 'update' || method === 'patch') && !resource.hasKey())
        return throwError('Update/Patch require entity key');
      if (method === 'create') resource.clearKey();
    }

    let obs$: Observable<ODataEntity<any>>;
    if (!validate || this.isValid({ method, navigation })) {
      const _entity = this.toEntity({
        changes_only: method === 'patch',
        field_mapping: true,
        include_concurrency: true,
        include_navigation: navigation,
      }) as T;
      obs$ = (
        method === 'create'
          ? resource.post(_entity, options)
          : method === 'patch'
          ? resource.patch(_entity, { etag: this.annots().etag, ...options })
          : resource.put(_entity, { etag: this.annots().etag, ...options })
      ).pipe(
        map(({ entity, annots }) => ({ entity: entity || _entity, annots }))
      );
    } else {
      obs$ = throwError(this._errors);
    }
    return this._request(obs$);
  }

  destroy({
    asEntity,
    ...options
  }: HttpOptions & {
    asEntity?: boolean;
    options?: HttpOptions;
  } = {}): Observable<this> {
    let resource = asEntity ? this._meta.entityResource(this) : this.resource();
    if (resource === undefined)
      return throwError('destroy: Resource is undefined');
    if (!(resource instanceof ODataEntityResource))
      return throwError('destroy: Resource type ODataEntityResource needed');
    if (!resource.hasKey())
      return throwError("destroy: Can't destroy model without key");

    const _entity = this.toEntity({ field_mapping: true }) as T;
    const obs$ = resource
      .delete({ etag: this.annots().etag, ...options })
      .pipe(
        map(({ entity, annots }) => ({ entity: entity || _entity, annots }))
      );
    return this._request(obs$).pipe(
      tap(() => this.events$.emit({ name: 'destroy', model: this }))
    );
  }

  query(
    func: (q: {
      select(opts?: Select<T>): OptionHandler<Select<T>>;
      expand(opts?: Expand<T>): OptionHandler<Expand<T>>;
      format(opts?: string): OptionHandler<string>;
      apply(query: QueryArguments<T>): void;
    }) => void
  ) {
    const resource = this.resource() as ODataModelResource<T> | undefined;
    if (resource !== undefined) return this._meta.query(this, resource, func);
  }

  hasChanged({
    include_navigation = false,
  }: { include_navigation?: boolean } = {}) {
    return this._meta.hasChanged(this, { include_navigation });
  }

  protected callFunction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    {
      asEntity,
      ...options
    }: {
      asEntity?: boolean;
    } & HttpQueryOptions<R> = {}
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = asEntity
      ? this._meta.entityResource(this)
      : this.resource();
    if (resource instanceof ODataEntityResource && resource.hasKey()) {
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
    return throwError(
      "Can't call function without ODataEntityResource with key"
    );
  }

  protected callAction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    {
      asEntity,
      ...options
    }: {
      asEntity?: boolean;
    } & HttpQueryOptions<R> = {}
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    const resource = asEntity
      ? this._meta.entityResource(this)
      : this.resource();
    if (resource instanceof ODataEntityResource && resource.hasKey()) {
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
    return throwError("Can't call action without ODataEntityResource with key");
  }

  // As Derived
  protected asDerived<S>(type: string): ODataModel<S> {
    const resource = this.resource();
    if (resource instanceof ODataEntityResource) {
      return resource
        .cast<S>(type)
        .asModel(this.toEntity(INCLUDE_ALL), { annots: this.annots() });
    }
    throw new Error(`Can't cast to derived model without ODataEntityResource`);
  }

  protected fetchNavigationProperty<S>(
    name: string,
    responseType: 'model' | 'collection',
    {
      asEntity,
      ...options
    }: {
      asEntity?: boolean;
    } & HttpQueryOptions<S> = {}
  ): Observable<ODataModel<S> | ODataCollection<S, ODataModel<S>> | null> {
    const resource = asEntity
      ? this._meta.entityResource(this)
      : this.resource();
    if (resource instanceof ODataEntityResource && resource.hasKey()) {
      const nav = resource.navigationProperty<S>(name);
      nav.query.apply(options);
      switch (responseType) {
        case 'model':
          return nav.fetchModel(options);
        case 'collection':
          return nav.fetchCollection(options);
      }
    }
    return throwError("Can't binding without ODataEntityResource with key");
  }

  // Set Reference
  protected setReference<P>(
    name: string,
    model: ODataModel<P> | ODataCollection<P, ODataModel<P>> | null,
    {
      asEntity,
      ...options
    }: {
      asEntity?: boolean;
    } & HttpOptions = {}
  ): Observable<this> {
    const field = this._meta
      .fields({ include_navigation: true })
      .find((p) => p.name === name);
    if (field === undefined || !field.navigation)
      return throwError(`Can't find navigation property ${name}`);

    const resource = asEntity
      ? this._meta.entityResource(this)
      : this.resource();
    if (resource instanceof ODataEntityResource && resource.hasKey()) {
      let reference = (
        field.resourceFactory<T, any>(
          resource
        ) as ODataNavigationPropertyResource<any>
      ).reference();
      const etag = this.annots().etag;
      let obs$ = NEVER as Observable<any>;
      if (model instanceof ODataModel) {
        obs$ = reference.set(
          model._meta.entityResource(model) as ODataEntityResource<P>,
          { etag, ...options }
        );
      } else if (model instanceof ODataCollection) {
        obs$ = forkJoin(
          model
            .models()
            .map((m) =>
              reference.add(
                m._meta.entityResource(m) as ODataEntityResource<P>,
                options
              )
            )
        );
      } else if (model === null) {
        obs$ = reference.unset({ etag, ...options });
      }
      this.events$.emit({ name: 'request', model: this, value: obs$ });
      return obs$.pipe(
        map(() => {
          this.assign({ [field.name]: model });
          this.events$.emit({ name: 'sync', model: this });
          return this;
        })
      );
    }
    return throwError(
      "Can't set reference without ODataEntityResource with key"
    );
  }

  protected getReference<P>(
    name: string,
    {
      asEntity,
      ...options
    }: {
      asEntity?: boolean;
    } & HttpQueryOptions<P> = {}
  ): Observable<ODataModel<P>> | Observable<ODataCollection<P, ODataModel<P>>> {
    const field = this._meta
      .fields({ include_navigation: true })
      .find((p) => p.name === name);
    if (field === undefined || !field.navigation)
      return throwError(`Can't find navigation property ${name}`);

    let model: ODataModel<P> | ODataCollection<P, ODataModel<P>> | undefined;
    if (!field.collection && asEntity) {
      var ref = this.referenced(field);
      if (ref !== undefined) {
        const resource = field.meta?.modelResourceFactory({
          fromSet: asEntity,
        }) as ODataModelResource<P>;
        model = field.modelCollectionFactory<T, P>({
          parent: this,
          value: ref,
        }) as ODataModel<P>;
        if (resource !== undefined) {
          model.attach(resource);
        }
      }
    } else {
      model = field.modelCollectionFactory<T, P>({ parent: this }) as
        | ODataModel<P>
        | ODataCollection<P, ODataModel<P>>
        | undefined;
    }
    if (model !== undefined) {
      this.assign({ [field.name]: model });
      model.query(q => q.apply(options));
      return model.fetch(options);
    }
    return throwError("Can't get reference without ODataEntityResource");
  }
}
