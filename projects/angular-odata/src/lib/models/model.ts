import { Observable, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import {
  ODataEntityResource,
  ODataNavigationPropertyResource,
  HttpOptions,
  ODataEntityMeta,
  ODataEntity,
  ODataActionResource,
  ODataFunctionResource,
  Select,
  Expand,
  OptionHandler,
  HttpCallableOptions} from '../resources/index';

import { ODataCollection } from './collection';
import { Objects, Types } from '../utils';
import { EventEmitter } from '@angular/core';
import { ModelFieldOptions, ODataModelEvent, ODataModelOptions, ODataModelRelation, ODataModelResource } from './options';
import { EntityKey } from '../types';

export const CID = "_cid";
export class ODataModel<T> {
  // Properties
  static fields: ModelFieldOptions[] = [];
  static options: ODataModelOptions<any> | null = null;
  // Events
  [CID]: string;
  _attributes: {[name: string]: any} = {};
  _changes: {[name: string]: any} = {};
  _relations: { [name: string]: ODataModelRelation } = {};
  _resource?: ODataModelResource<T>;
  _meta!: ODataEntityMeta;
  _resetting: boolean = false;
  _silent: boolean = false;
  events$ = new EventEmitter<ODataModelEvent<T>>();
  constructor(data: Partial<T> | {[name: string]: any} = {}, { resource, meta, reset = false }: {
    resource?: ODataModelResource<T>,
    meta?: ODataEntityMeta,
    reset?: boolean
  } = {}) {

    this[CID] = (<any>data)[CID] || Objects.uniqueId("c");

    const Klass = this.constructor as typeof ODataModel;
    if (Klass.options !== null) Klass.options.bind(this);

    this.resource(resource);
    this.meta(meta || new ODataEntityMeta());

    let attrs = this.meta().attributes<T>(data);
    let defaults = this.defaults();

    this.assign(Objects.merge(defaults, attrs), { reset });
  }

  equals(other: ODataModel<T>) {
    const thisKey = this.key();
    const otherKey = other.key();
    return this === other || this[CID] === other[CID] || (thisKey !== undefined && otherKey !== undefined && Types.isEqual(thisKey, otherKey));
  }

  resource(resource?: ODataModelResource<T>) {
    const Klass = this.constructor as typeof ODataModel;
    if (Klass.options === null) throw new Error(`Can't get resource from model without metadata`);
    if (resource !== undefined)
      Klass.options.attach(this, resource);
    return Klass.options.resource(this);
  }

  schema() {
    const Klass = this.constructor as typeof ODataModel;
    if (Klass.options === null) throw new Error(`Can't get schema from model without metadata`);
    return Klass.options.schema();
  }

  meta(meta?: ODataEntityMeta) {
    if (meta !== undefined) this._meta = meta;
    return this._meta;
  }

  key({field_mapping = false, resolve = true}: {field_mapping?: boolean, resolve?: boolean} = {}): EntityKey<T> | {[name: string]: any} | undefined {
    const Klass = this.constructor as typeof ODataModel;
    return (Klass.options !== null) ? Klass.options.resolveKey(this, {field_mapping, resolve}) : undefined;
  }

  // Validation
  errors?: { [key: string]: any };
  protected validate({ create = false, patch = false }: { create?: boolean, patch?: boolean } = {}) {
    const Klass = this.constructor as typeof ODataModel;
    return (Klass.options !== null) ? Klass.options.validate(this, {create, patch}) : undefined;
  }

  valid({ create = false, patch = false }: { create?: boolean, patch?: boolean } = {}): boolean {
    this.errors = this.validate({create, patch});
    if (this.errors !== undefined)
      this.events$.emit({name: 'invalid', model: this, value: this.errors, options: {create, patch}});
    return this.errors === undefined;
  }

  protected defaults() {
    const Klass = this.constructor as typeof ODataModel;
    return (Klass.options !== null) ? Klass.options.defaults(this) : {};
  }

  toEntity({
    client_id = false,
    include_navigation = false,
    include_key = false,
    changes_only = false,
    field_mapping = false
  }: {
    client_id?: boolean,
    include_navigation?: boolean,
    include_key?: boolean,
    changes_only?: boolean,
    field_mapping?: boolean
  } = {}): T | {[name: string]: any} {
    const Klass = this.constructor as typeof ODataModel;
    return (Klass.options !== null) ?
      Klass.options.toEntity(this, { client_id, include_navigation, include_key, changes_only, field_mapping}) :
      {};
  }

  attributes({ changes_only = false }: { changes_only?: boolean } = {}): {[name: string]: any} {
    const Klass = this.constructor as typeof ODataModel;
    return (Klass.options !== null) ? Klass.options.attributes(this, { changes_only }) : {};
  }

  set(path: string | string[], value: any) {
    const pathArray = (Types.isArray(path) ? path : (path as string).match(/([^[.\]])+/g)) as any[];
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
    const pathArray = (Types.isArray(path) ? path : (path as string).match(/([^[.\]])+/g)) as any[];
    if (pathArray.length === 0) return undefined;
    const value = (<any>this)[pathArray[0]];
    if (pathArray.length > 1 && (value instanceof ODataModel || value instanceof ODataCollection)) {
      return value.get(pathArray.slice(1));
    }
    return value;
  }

  assign(entity: Partial<T> | {[name: string]: any}, { reset = false, silent = false }: { reset?: boolean, silent?: boolean } = {}) {
    const Klass = this.constructor as typeof ODataModel;
    if (Klass.options !== null)
      Klass.options.assign(this, entity, { reset, silent });
  }
  clone() {
    let Ctor = <typeof ODataModel>this.constructor;
    return new Ctor(this.toEntity({ include_navigation: true }), { resource: this.resource(), meta: this.meta() });
  }
  private _request(obs$: Observable<ODataEntity<any>>): Observable<this> {
    this.events$.emit({ name: 'request', model: this, value: obs$ });
    return obs$.pipe(
      map(({ entity, meta }) => {
        this.meta(meta);
        this.assign(meta.attributes<T>(entity || {}), { reset: true });
        this.events$.emit({name: 'sync', model: this });
        return this;
      }));
  }

  fetch(options?: HttpOptions): Observable<this> {
    let resource = this.resource();
    if (resource === undefined)
      return throwError("fetch: Resource is undefined");

    let obs$: Observable<ODataEntity<any>>;
    if (resource instanceof ODataEntityResource) {
      if (!resource.hasKey())
        return throwError("fetch: Can't fetch model without key");
      obs$ = resource.get(options);
    } else if (resource instanceof ODataNavigationPropertyResource) {
      obs$ = resource.get({responseType: 'entity', ...options});
    } else {
      obs$ = resource.get({responseType: 'entity', ...options});
    }
    return this._request(obs$);
  }

  save(
    { patch = false, include_navigation = false, validate = true, ...options }: HttpOptions & { patch?: boolean, include_navigation?: boolean, validate?: boolean, options?: HttpOptions } = {}
  ): Observable<this> {
    let resource = this.resource();
    if (resource === undefined)
      return throwError("save: Resource is undefined");
    if (!(resource instanceof ODataEntityResource))
      return throwError("save: Resource type ODataEntityResource needed");

    let obs$: Observable<ODataEntity<any>>;
    if (!validate || this.valid({create: !resource.hasKey(), patch})) {
      const _entity = this.toEntity({ changes_only: patch, field_mapping: true, include_navigation }) as T;
      obs$ = (!resource.hasKey() ?
        resource.post(_entity, options) :
        patch ?
          resource.patch(_entity, options) :
          resource.put(_entity, options)
      ).pipe(map(({ entity, meta }) => ({ entity: entity || _entity, meta })));
    } else {
      obs$ = throwError(this.errors);
    }
    return this._request(obs$);
  }

  destroy(options?: HttpOptions): Observable<this> {
    let resource = this.resource();
    if (resource === undefined)
      return throwError("destroy: Resource is undefined");
    if (!(resource instanceof ODataEntityResource))
      return throwError("destroy: Resource type ODataEntityResource needed");
    if (!resource.hasKey())
      return throwError("destroy: Can't destroy model without key");

    const _entity = this.toEntity({field_mapping: true}) as T;
    const obs$ = resource.delete(Object.assign({ etag: this.meta().etag }, options || {})).pipe(
      map(({ entity, meta }) => ({ entity: entity || _entity, meta })));
    return this._request(obs$).pipe(tap(() => this.events$.emit({name: 'destroy', model: this})));
  }

  query(func: (q:
    { select(opts?: Select<T>): OptionHandler<Select<T>>;
      expand(opts?: Expand<T>): OptionHandler<Expand<T>>;
      format(opts?: string): OptionHandler<string>;
    }) => void) {
    const Klass = this.constructor as typeof ODataModel;
    const resource = this.resource();
    if (Klass.options === null || resource === undefined)
      throw new Error(`Can't query without ODataResource`);
    return Klass.options.query(this, resource, func);
  }

  hasChanged() {
    const Klass = this.constructor as typeof ODataModel;
    return (Klass.options !== null) ? Klass.options.hasChanged(this) : false;
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
    let resource = this.resource();
    if (resource instanceof ODataEntityResource && resource.hasKey()) {
      return this._call(params, resource.function<P, R>(name), responseType, options);
    }
    return throwError("Can't call function without ODataEntityResource with key");
  }

  protected callAction<P, R>(
    name: string,
    params: P | null,
    responseType: 'property' | 'model' | 'collection' | 'none',
    options?: HttpCallableOptions<R>
  ): Observable<R | ODataModel<R> | ODataCollection<R, ODataModel<R>> | null> {
    let resource = this.resource();
    if (resource instanceof ODataEntityResource && resource.hasKey()) {
      return this._call(params, resource.action<P, R>(name), responseType, options);
    }
    return throwError("Can't call action without ODataEntityResource with key");
  }

  // As Derived
  protected asDerived<S>(type: string): ODataModel<S> {
    const resource = this.resource();
    if (resource instanceof ODataEntityResource) {
      return resource.cast<S>(type).asModel(this.toEntity({ include_navigation: true }), {meta: this.meta()});
    }
    throw new Error(`Can't cast to derived model without ODataEntityResource`);
  }

  protected getBinding<S>(
    path: string,
    responseType: 'model' | 'collection',
    options?: HttpOptions
  ): Observable<ODataModel<S> | ODataCollection<S, ODataModel<S>> | null> {
    let resource = this.resource();
    if (resource instanceof ODataEntityResource && resource.hasKey()) {
      const nav = resource.navigationProperty<S>(path);
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
    model: ODataModel<P> | null,
    options?: HttpOptions
  ): Observable<this> {
    const Klass = this.constructor as typeof ODataModel;
    const prop = (Klass.options !== null)? Klass.options.fields().find(p => p.name === name) : undefined;
    if (prop === undefined)
      throw new Error(`Can't find property ${name}`);
    if (prop.parser?.collection)
      throw new Error(`Can't set ${prop.name} to collection, use add`);

    const resource = this.resource();
    if (resource instanceof ODataEntityResource && resource.hasKey()) {
      let ref = resource.navigationProperty(prop.field).reference();
      const etag = this.meta().etag;
      const opts = Object.assign({ etag }, options || {});
      const obs$ = (model instanceof ODataModel) ?
        ref.set(model.resource() as ODataEntityResource<P>, opts) :
        ref.unset(opts);
      this.events$.emit({name: 'request', model: this, value: obs$ });
      return obs$.pipe(
        map(() => {
          let attrs: any = { [name]: model };
          if (prop.field !== undefined) {
            attrs[prop.field] = (model instanceof ODataModel) ? model.key() : model;
          }
          this.assign(attrs, { reset: true });
          this.events$.emit({name: 'sync', model: this});
          return this;
        }
        ));
      }
    return throwError("Can't binding without ODataEntityResource with key");
  }
}
