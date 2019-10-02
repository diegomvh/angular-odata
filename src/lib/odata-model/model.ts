import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { Utils } from '../utils/utils';
import { ODataModelService, ODataEntityService } from '../odata-service';
import { PlainObject, ODataRequest, Expand, ODataEntityRequest } from '../odata-request';

import { Collection } from './collection';
import { ODataClient } from '../client';

export interface Key {
  name: string;
  resolve?: (model: Model) => number | string | PlainObject;
}

export interface Field {
  name: string;
  type: string;
  required?: boolean;
  length?: number;
  ctor?: boolean;
  navigation?: boolean;
  field?: string;
  ref?: string;
  collection?: boolean;
  default?: any;
}

export class Schema {
  keys: Key[];
  fields: Field[];

  static create(opts: { keys?: Key[], fields?: Field[] }) {
    var keys = opts.keys || [];
    var fields = opts.fields || [];
    return Object.assign(new Schema(), { keys, fields });
  }

  extend(opts: { keys?: Key[], fields?: Field[] }) {
    var keys = [...this.keys, ...(opts.keys || [])];
    var fields = [...this.fields, ...(opts.fields || [])];
    return Object.assign(new Schema(), { keys, fields });
  }

  resolveKey(model: Model) {
    let ctor = <typeof Model>model.constructor;
    let schema = ctor.schema;
    let keys = schema.keys
      .map(key => [key.name, (key.resolve) ? key.resolve(model) : model[key.name]]);
    let key = keys.length === 1 ?
      keys[0][1] :
      keys.reduce((acc, key) => Object.assign(acc, { [key[0]]: key[1] }), {});
    if (!Utils.isEmpty(key))
      return key;
  }

  isNew(model: Model) {
    return !this.resolveKey(model);
  }

  get navigations():Field[] {
    return this.fields.filter(f => f.navigation);
  }

  get properties():Field[] {
    return this.fields.filter(f => !f.navigation);
  }
}

export enum ModelState {
  Added,
  Modified,
  Deleted,
  Unchanged,
  Detached
}

export class Model {
  // Statics
  static set: string = "";
  static type: string = "";
  static schema: Schema = null;
  static service: ODataModelService = null;
  static query: ODataEntityRequest<Model> = null;
  query: ODataEntityRequest<Model>;
  state: ModelState;
  relationships: { [name: string]: Model | Collection<Model> }

  constructor(attrs: PlainObject, query?: ODataEntityRequest<Model>) {
    let ctor = <typeof Model>this.constructor;
    this.query = query || ctor.query.clone();
    this.assign(attrs);
  }

  setState(state: ModelState) {
    this.state = state;
  }

  isNew() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.isNew(this);
  }

  assign(attrs: PlainObject, query?: ODataEntityRequest<Model>) {
    let ctor = <typeof Model>this.constructor;
    ctor.service.deserialize(this, attrs);
    ctor.service.relationships(this, attrs);
  }

  resolveKey() {
    let ctor = <typeof Model>this.constructor;
    return ctor.schema.resolveKey(this);
  }

  toJSON() {
    let ctor = <typeof Model>this.constructor;
    return ctor.service.serialize(this);
  }

  clone() {
    let ctor = <typeof Model>this.constructor;
    let klass = ctor.service.model(ctor.type);
    return new klass(this.toJSON());
  }
}

export class ODataModel extends Model {
  assign(attrs: PlainObject) {
    super.assign(attrs);
  }

  fetch(options?: any): Observable<this> {
    if (this.isNew())
      throw new Error(`Can't fetch without entity key`);
    let query = this.query.clone() as ODataEntityRequest<Model>;
    query.key(this.resolveKey());
    return query.get()
      .pipe(
        map(entity => { this.assign(entity); return this })
      );
  }

  private batchSave(options?: any): Observable<this> {
    let query = this.query.clone() as ODataEntityRequest<Model>;
    let batch = null; //query.batch();
    if (!this.isNew()) {
      let key = this.resolveKey();
      query.key(key);
      batch.put(query, this.toJSON());
    } else {
      batch.post(query, this.toJSON(), options);
    }
    let changes = Object.keys(this.relationships)
      .filter(k => this.relationships[k] === null || this.relationships[k] instanceof Model);
    // Relations 
    changes.forEach(name => {
      let model = this.relationships[name] as Model;
      let q = query.clone() as ODataEntityRequest<Model>;
      q.key(this.resolveKey());
      let ref = q.navigationProperty(name).ref();
      if (model === null) {
        batch.delete(q);
      } else {
        let target = model.query.clone() as ODataEntityRequest<Model>;
        target.key(model.resolveKey())
        let refurl = ""; //this._context.createEndpointUrl(target);
        batch.put(q, { [ODataClient.ODATA_ID]: refurl });
      }
    });
    return batch.execute(options)
      .pipe(
        map(resp => { this.assign(resp); return this })
      );
  }

  private forkSave(options?: any): Observable<this> {
    let query = this.query.clone() as ODataEntityRequest<Model>;
    let obs$ = of(this.toJSON());
    let changes = Object.keys(this.relationships)
      .filter(k => this.relationships[k] === null || this.relationships[k] instanceof Model);
    changes.forEach(name => {
      let model = this.relationships[name] as Model;
      let q = query.clone() as ODataEntityRequest<Model>;
      q.key(this.resolveKey());
      let ref = q.navigationProperty(name).ref();
      if (model === null) {
        // Delete 
        obs$ = obs$.pipe(switchMap((attrs: PlainObject) =>
          q.delete(attrs[ODataClient.ODATA_ETAG], options)
            .pipe(map(resp =>
              Object.assign(attrs, { [ODataClient.ODATA_ETAG]: resp[ODataClient.ODATA_ETAG] })
            ))
        ));
      } else {
        // Create
        let target = model.query.clone() as ODataEntityRequest<Model>;
        target.key(model.resolveKey())
        let refurl = ""; //this._context.createEndpointUrl(target);
        obs$ = obs$.pipe(switchMap((attrs: PlainObject) =>
          ref.put({ [ODataClient.ODATA_ID]: refurl }, attrs[ODataClient.ODATA_ETAG], options)
            .pipe(map(resp =>
              Object.assign(attrs, { [ODataClient.ODATA_ETAG]: resp[ODataClient.ODATA_ETAG] })
            ))
        ));
      }
    });
    if (this.isNew()) {
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.post(attrs as Model)));
    } else {
      let key = this.resolveKey();
      query.key(key);
      obs$ = obs$.pipe(switchMap((attrs: PlainObject) => query.put(attrs as Model, attrs[ODataClient.ODATA_ETAG])));
    }
    return obs$.pipe(
      map(attrs => { console.log(attrs); this.assign(attrs); return this; })
    );
  }

  save(options?: any): Observable<this> {
    return (false) ?
      this.batchSave(options) :
      this.forkSave(options);
  }

  destroy(options?: any): Observable<any> {
    if (this.isNew())
      throw new Error(`Can't destroy without entity key`);
    let query = this.query.clone() as ODataEntityRequest<Model>;
    query.key(this.resolveKey());
    return query.delete(this[ODataClient.ODATA_ETAG], options);
  }

  protected createODataModelRef(name: string, target: ODataRequest, options?) {
    let query = this.query.clone() as ODataEntityRequest<Model>;
    query.key(this.resolveKey());
    let ref = query.navigationProperty(name).ref();
    //let refurl = this.context.createEndpointUrl(target);
    let refurl = "";
    return ref.put({ [ODataClient.ODATA_ID]: refurl }, this[ODataClient.ODATA_ETAG], options);
  }

  protected deleteODataModelRef(name: string, target: ODataRequest, options?) {
    let query = this.query.clone() as ODataEntityRequest<Model>;
    query.key(this.resolveKey());
    let ref = query.navigationProperty(name).ref();
    //let refurl = this.context.createEndpointUrl(target);
    return ref.delete(this[ODataClient.ODATA_ETAG], options);
  }

  protected createODataCollectionRef(name: string, target: ODataRequest, options?) {
    let query = this.query.clone() as ODataEntityRequest<Model>;
    query.key(this.resolveKey());
    let ref = query.navigationProperty(name).ref();
    //let refurl = this.context.createEndpointUrl(target);
    let refurl = "";
    return ref.post({ [ODataClient.ODATA_ID]: refurl }, options);
  }

  protected deleteODataCollectionRef(name: string, target: ODataRequest, options?) {
    let query = this.query.clone() as ODataEntityRequest<Model>;
    query.key(this.resolveKey());
    let ref = query.navigationProperty(name).ref();
    //let refurl = this.context.createEndpointUrl(target);
    let refurl = "";
    //options = this.context.assignOptions(options || {}, { params: { "$id": refurl } });
    return ref.delete(this[ODataClient.ODATA_ETAG], options);
  }

  // Mutate query
  select(select?: string | string[]) {
    return this.query.select(select);
  }

  expand(expand?: Expand) {
    return this.query.expand(expand);
  }
}
