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
import { ODataStructuredType } from '../schema';
import { ODataModelEvent, ODataModelOptions, ODataModelProperty, ODataModelResource } from './options';
import { EntityKey } from '../types';

export const CID = "_cid";
export class ODataModel<T> {
  //Events
  public [CID]: string = Objects.uniqueId("c");
  public _options: ODataModelOptions<T>;
  events$ = new EventEmitter<ODataModelEvent<T>>();
  constructor(entity: Partial<T> | {[name: string]: any} = {}, { resource, schema, meta, reset = false }: {
    resource?: ODataModelResource<T>,
    schema?: ODataStructuredType<T>,
    meta?: ODataEntityMeta,
    reset?: boolean
  } = {}) {
    this._options = new ODataModelOptions((<any>this)._properties || []);

    this.resource(resource);
    this.schema(schema);
    this.meta(meta);

    this.assign(Objects.merge(this.defaults(), entity), { reset });
  }

  resource(resource?: ODataModelResource<T>) {
    if (resource !== undefined)
      this._options.attach(this, resource);
    return this._options.resource(this);
  }

  schema(schema?: ODataStructuredType<T>) {
    if (schema !== undefined)
      this._options.bind(this, schema);
    return this._options.schema(this);
  }

  meta(meta?: ODataEntityMeta) {
    if (meta !== undefined)
      this._options.annotate(this, meta);
    return this._options.meta(this);
  }

  key({field_mapping = false}: {field_mapping?: boolean} = {}): EntityKey<T> | {[name: string]: any} | undefined {
    let schema = this.schema();
    if (schema === undefined) return undefined;
    const keys = schema.keys({ include_parents: true });
    const key: any = {};
    for (var k of keys) {
      let model = this as any;
      let prop: ODataModelProperty<any> | undefined;
      for (let n of k.ref.split('/')) {
        prop = model._options.findProperty((p: any) => p.field === n);
        if (prop !== undefined && model[prop.name] instanceof ODataModel)
          model = model[prop.name];
      }
      if (prop === undefined) return undefined;
      let name = field_mapping ? prop.field : prop.name;
      if (k.alias !== undefined)
        name = k.alias;
      key[name] = model[prop.name];
    }
    return Objects.resolveKey(key);
  }

  // Validation
  errors?: { [key: string]: any };
  protected validate({ create = false, patch = false }: { create?: boolean, patch?: boolean } = {}) {
    return this._options.validate(this, {create, patch});
  }

  valid({ create = false, patch = false }: { create?: boolean, patch?: boolean } = {}): boolean {
    this.errors = this.validate({create, patch});
    if (this.errors !== undefined)
      this.events$.emit({name: 'invalid', model: this, value: this.errors, options: {create, patch}});
    return this.errors === undefined;
  }

  protected defaults() {
    return this._options.defaults(this);
  }

  toEntity({
    client_id = false,
    include_navigation = false,
    changes_only = false,
    field_mapping = false
  }: {
    client_id?: boolean,
    include_navigation?: boolean,
    changes_only?: boolean,
    field_mapping?: boolean
  } = {}): T | {[name: string]: any} {
    return this._options.toEntity(this, { client_id, include_navigation, changes_only, field_mapping});
  }

  attributes({ changes_only = false }: { changes_only?: boolean } = {}): {[name: string]: any} {
    return this._options.attributes(this, { changes_only });
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
    this._options.assign(this, entity, { reset, silent });
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
    const resource = this.resource();
    if (resource === undefined)
      throw new Error(`Can't query without ODataResource`);
    return this._options.query(this, resource, func);
  }

  hasChanged() {
    return this._options.hasChanged();
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
    const prop = this._options.findProperty(p => p.name === name);
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
