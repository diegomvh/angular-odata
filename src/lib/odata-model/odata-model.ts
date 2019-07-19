import { EventEmitter } from "@angular/core";
import { Observable, throwError } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { ODataResponse } from "../odata-response/odata-response";
import { ODataEntityService } from '../odata-service/odata-entity.service';

export interface Property {
  name: string;
  type: string;
  required: boolean;
  length: number;
  collection?: boolean;
}

export abstract class ODataModel<T> {
  protected abstract service(): ODataEntityService<T>;
  protected abstract properties() : Property[];
  protected abstract defaults() : T;

  error$ = new EventEmitter<any>();
  change$ = new EventEmitter<T>();
  destroy$ = new EventEmitter();
  protected entity: T;
  protected error: any;
  
  constructor(entity: any = <T> {}, options: any = {}) {
    entity = options.parse ? this.parse(entity, options) : {} as T;
    entity = Object.assign({}, this.defaults(), entity);
    this.set(entity, options);
  }

  parse(resp, options?) : T {
    return resp;
  }

  validate(entity, options) : any {
  }

  isNew() : boolean {
    return this.service().isNew(this.entity);
  }

  get(attr: string) : any {
    return this.entity[attr];
  }

  set(key: any, val: any, options: any = {}) : ODataModel<T> {
    if (key == null) return this;

    // Handle both `"key", value` and `{key: value}` -style arguments.
    let entity;
    if (typeof key === 'object') {
      entity = key;
      options = val;
    } else {
      (entity = {})[key] = val;
    }

    // Run validation.
    if (!this._validate(entity, options)) return this;

    // Extract attributes and options.
    let unset      = options.unset;
    let silent     = options.silent;

    let changed = {} as T;
    let current = this.entity;

    for (var prop in entity) {
      val = entity[prop];
      if (current[prop] !== val) {
        changed[prop] = val;
      }
      unset ? delete current[prop] : current[prop] = val;
    }

    if (!silent) {
      this.change$.emit(changed);
    }

    return this;
  }

  toJSON (options?: any) {
    return JSON.parse(JSON.stringify(this.entity));
  }

  unset(prop, options) {
    return this.set(prop, void 0, Object.assign({}, options, {unset: true}));
  }

  clear(options) {
    var entity = {} as T;
    for (var key in this.entity) entity[key] = void 0;
    return this.set(entity, Object.assign({}, options, {unset: true}));
  }

  fetch(options: any = {}) : Observable<ODataModel<T>> {
    options = Object.assign({parse: true}, options);
    return this.service().fetch(this.entity)
      .pipe(
        catchError(err => { this.error$.emit(err); return throwError(err); }),
        map(attrs => {
          let serverAttrs = options.parse ? this.parse(attrs, options) : attrs;
          return this.set(serverAttrs, options);
        })
      );
  }

  save(options: any = {}) : Observable<ODataModel<T>> {
    options = Object.assign({parse: true}, options);
    return this.service().save(this.entity)
      .pipe(
        catchError(err => { this.error$.emit(err); return throwError(err); }),
        map(attrs => { 
          if (options.wait) this.destroy$.emit();
          let serverAttrs = options.parse ? this.parse(attrs, options) : attrs;
          return this.set(serverAttrs, options);
        })
      );
  }

  destroy(options: {wait?: boolean} = {}) : Observable<ODataResponse> {
    if (!options.wait) this.destroy$.emit();
    return this.service().destroy(this.entity)
      .pipe(
        catchError(err => { this.error$.emit(err); return throwError(err); }),
        map(resp => { 
          if (options.wait) this.destroy$.emit();
          return resp;
        })
      );
  }

  has(prop: string) {
    return this.get(prop) != null;
  }

  _validate(entity, options) {
    if (!options.validate || !this.validate) return true;
    entity = Object.assign({}, this.entity, entity);
    var error = this.error = this.validate(entity, options) || null;
    if (!error) return true;
    return false;
  }
}
