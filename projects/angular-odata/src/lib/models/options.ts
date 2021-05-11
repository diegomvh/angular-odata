import { Subscription } from "rxjs";
import { ODataStructuredTypeFieldParser } from "../parsers";
import { Expand, ODataEntitiesMeta, ODataEntityMeta, ODataEntityResource, ODataEntitySetResource, ODataNavigationPropertyResource, ODataPropertyResource, ODataSingletonResource, OptionHandler, Select } from "../resources";
import { ODataStructuredType } from "../schema";
import { EntityKey, OptionsHelper, StructuredTypeConfig } from "../types";
import { Objects, Types } from "../utils";
import { ODataCollection } from "./collection";
import { CID, ODataModel } from "./model";

export type ODataModelResource<T> = ODataEntityResource<T> | ODataSingletonResource<T> | ODataNavigationPropertyResource<T> | ODataPropertyResource<T>;
export type ODataCollectionResource<T> = ODataEntitySetResource<T> | ODataNavigationPropertyResource<T> | ODataPropertyResource<T>;

export type ODataModelEvent<T> = {
  name: 'change' | 'reset' | 'update' | 'destroy' | 'add' | 'remove' | 'invalid' | 'request' | 'sync' | 'attach'
  model?: ODataModel<T>
  collection?: ODataCollection<T, ODataModel<T>>
  path?: string  // Property.Collection[1].Collection[3].Property
  value?: any
  previous?: any
  options?: any
}

export const BUBBLING = ['change', 'reset', 'update', 'destroy', 'add', 'remove'];

export enum ODataModelState {
  Added,
  Removed,
  Changed,
  Unchanged,
}

export type ModelOptions = {
  name?: string,
  field?: string,
  default?: any,
  required?: boolean,
  maxLength?: number,
  minLength?: number,
  min?: number,
  max?: number,
};

export type ModelFieldOptions = {
  name?: string,
  field?: string,
  default?: any,
  required?: boolean,
  maxLength?: number,
  minLength?: number,
  min?: number,
  max?: number,
};

export function Model(options: ModelOptions = {}) {
  return <T extends { new (...args: any[]): {}}>(constructor: T) => {
    return constructor;
  }
}

export function ModelField(options: ModelFieldOptions = {}) {
  return (target: any, propertyKey: string): void => {
    const Klass = target.constructor as typeof ODataModel;
    const fields = Klass.fields = ((Klass.hasOwnProperty("fields")) ? Klass.fields : []);
    fields.push(Object.assign(options, { name: propertyKey, field: options.name || propertyKey}));
  }
}

export type ODataModelFieldOptions<F> = ModelFieldOptions & { name: string, field: string, parser: ODataStructuredTypeFieldParser<F> };

export class ODataModelField<F> {
  name: string;
  field: string;
  parser: ODataStructuredTypeFieldParser<F>;
  options?: ODataModelOptions<any>;
  opts: {
    default?: any,
    required?: boolean,
    maxLength?: number,
    minLength?: number,
    min?: number,
    max?: number,
    pattern?: RegExp,
  };
  constructor({name, field, parser, ...options}: ODataModelFieldOptions<F>) {
    this.name = name;
    this.field = field;
    this.opts = options;
    this.parser = parser;
  }

  get default() {
    return this.opts.default || this.parser.default;
  }

  get navigation() {
    return Boolean(this.parser.navigation);
  }

  get collection() {
    return Boolean(this.parser.collection);
  }

  configure(settings: {
    findOptionsForType: (type: string) => ODataModelOptions<any> | undefined,
    options: OptionsHelper
  }) {
    this.options = settings.findOptionsForType(this.parser.type);
  }

  validate(value: any, { create = false, patch = false }: { create?: boolean, patch?: boolean } = {}) {
    if (this.navigation && value instanceof ODataModel) {
      return !value.valid({create, patch}) ? value.errors : undefined;
    } else if (value instanceof ODataCollection) {
      return value.models().some(m => !m.valid({create, patch})) ? value.models().map(m => m.errors) : undefined;
    } else {
      let errors = this.parser?.validate(value, {create, patch}) || [];
      if (
        this.opts.required &&
        (value === null || (value === undefined && !patch)) // Is null or undefined without patch flag?
      ) {
        errors.push(`required`);
      }
      if (this.opts.maxLength !== undefined && typeof value === 'string' && value.length > this.opts.maxLength) {
        errors.push(`maxlength`);
      }
      if (this.opts.minLength !== undefined && typeof value === 'string' && value.length < this.opts.minLength) {
        errors.push(`minlength`);
      }
      if (this.opts.min !== undefined && typeof value === 'number' && value < this.opts.min) {
        errors.push(`min`);
      }
      if (this.opts.max !== undefined && typeof value === 'number' && value > this.opts.max) {
        errors.push(`max`);
      }
      if (this.opts.pattern !== undefined && typeof value === 'string' && !this.opts.pattern.test(value)) {
        errors.push(`pattern`);
      }
      return !Types.isEmpty(errors) ? errors : undefined;
    }
  }

  resourceFactory<T, F>(resource: ODataModelResource<T>): ODataNavigationPropertyResource<F> | ODataPropertyResource<F> | undefined {
    return (resource instanceof ODataEntityResource || resource instanceof ODataNavigationPropertyResource || resource instanceof ODataPropertyResource) ?
      (this.navigation ? resource?.navigationProperty<F>(this.parser.name) : resource?.property<F>(this.parser.name)) :
      undefined;
  }

  metaFactory(meta: ODataEntityMeta): ODataEntityMeta | ODataEntitiesMeta | undefined {
    return this.parser.collection ?
        new ODataEntitiesMeta({ data: meta.property(this.parser.name) || {}, options: meta.options }) :
        new ODataEntityMeta({ data: meta.property(this.parser.name) || {}, options: meta.options });
  }

  schemaFactory<T, F>(schema: ODataStructuredType<T>): ODataStructuredType<F> | undefined {
    return schema.api.findStructuredTypeForType(this.parser.type);
  }

  modelCollectionFactory<T, F>(
    { value, reset, baseResource, baseSchema, baseMeta}: {
    value?: F | F[] | {[name: string]: any} | {[name: string]: any}[],
    reset?: boolean,
    baseResource?: ODataModelResource<T>,
    baseSchema: ODataStructuredType<T>,
    baseMeta: ODataEntityMeta
  }): ODataModel<F> | ODataCollection<F, ODataModel<F>> {

    const meta = this.metaFactory(baseMeta);
    if (baseResource !== undefined && baseResource.hasKey()) {
      // Build for Resource
      const resource = this.resourceFactory<T, F>(baseResource) as ODataNavigationPropertyResource<F> | ODataPropertyResource<F>;
      return this.parser.collection ?
          resource.asCollection((value || []) as (F | {[name: string]: any})[], { reset, meta: meta as ODataEntitiesMeta }) :
          resource.asModel((value || {}) as F | {[name: string]: any}, { reset, meta: meta as ODataEntityMeta });
    } else {
      // Build for Schema
      const schema = this.schemaFactory<T, F>(baseSchema);
      const Model = schema?.model || ODataModel;
      const Collection = schema?.collection || ODataCollection;
      return this.parser.collection ?
        new Collection((value || []) as (F | {[name: string]: any})[], { meta: meta as ODataEntitiesMeta, reset }) as ODataCollection<F, ODataModel<F>> :
        new Model((value || {}) as F | {[name: string]: any}, { meta: meta as ODataEntityMeta, reset }) as ODataModel<F>;
    }
  }
}

export type ODataModelRelation = {
  state: ODataModelState,
  model: ODataModel<any> | ODataCollection<any, ODataModel<any>> | null,
  property: ODataModelField<any>,
  subscription: Subscription | null
};

export class ODataModelOptions<T> {
  private name: string;
  private base?: string;
  private open?: boolean;
  private _fields: ODataModelField<any>[] = [];
  private _schema: ODataStructuredType<T>;
  private parent?: ODataModelOptions<any>;
  private children: ODataModelOptions<any>[] = [];

  constructor(config: StructuredTypeConfig<T>, fields: ModelFieldOptions[], schema: ODataStructuredType<T>) {
    this.name = config.name;
    this.base = config.base;
    this.open = config.open;
    this._schema = schema;
    const schemaFields = this._schema.fields({include_navigation: true});
    this._fields = fields.map(prop => {
      const { name, field, ...opts} = prop;
      if (field === undefined || name === undefined) throw new Error("Model Properties need name and field")
      const parser = schemaFields.find(f => f.name === field);
      if (parser === undefined) throw new Error(`No parser for ${field} with name = ${name}`);
      return new ODataModelField<T>({name, field, parser, ...opts});
    });
  }

  get api() {
    return this._schema.api;
  }

  type() {
    return this._schema.type();
  }

  isTypeOf(type: string) {
    return this._schema.isTypeOf(type);
  }

  bla() {
    let entitySet = this.api.findEntitySetForEntityType(this.type())
    return entitySet;
  }

  find(predicate: (p: ODataModelOptions<any>) => boolean): ODataModelOptions<any> | undefined {
    if (predicate(this))
      return this;
    let match: ODataModelOptions<any> | undefined;
    for (let ch of this.children) {
      match = ch.find(predicate);
      if (match !== undefined) break;
    }
    return match;
  }

  configure({findOptionsForType, options}: {
    findOptionsForType: (type: string) => ODataModelOptions<any> | undefined,
    options: OptionsHelper
  }) {
    if (this.base) {
      const parent = findOptionsForType(this.base) as ODataModelOptions<any>;
      parent.children.push(this);
      this.parent = parent;
    }
    this._fields.forEach(p => p.configure({findOptionsForType, options}));
  }

  fields({include_navigation = false, include_parents = true}: {
    include_parents?: boolean,
    include_navigation?: boolean
  } = {}): ODataModelField<any>[] {
    return [
      ...((include_parents && this.parent !== undefined) ? this.parent.fields({include_navigation, include_parents}) : []),
      ...this._fields.filter(prop => include_navigation || !prop.navigation)
    ];
  }

  attach(self: ODataModel<T>, resource: ODataModelResource<T>) {
    if (self._resource !== undefined && resource.type() !== self._resource.type() && !resource.isSubtypeOf(self._resource))
      throw new Error(`Can't reattach ${resource.type()} to ${self._resource.type()}`);

    const key = self.key({field_mapping: true}) as EntityKey<T>;
    if (key !== undefined)
      resource = resource.key(key);

    // Attach relations
    Object.values(self._relations).forEach(({ property, model }) => {
      if (model !== null) {
        const mr = model.resource();
        const pr = property.resourceFactory<T, any>(resource);
        if (mr === undefined || pr === undefined || !mr.isEqualTo(pr))
          model.resource(pr);
      }
    });

    const current = self._resource;
    if (current === undefined || !current.isEqualTo(resource)) {
      self._resource = resource;
      self.events$.emit({ name: 'attach', model: self, previous: current, value: resource });
    }
  }

  resource(self: ODataModel<T>): ODataModelResource<T> | undefined {
    let resource = self._resource?.clone() as ODataModelResource<T> | undefined;
    if (resource !== undefined) {
      const key = self.key({field_mapping: true}) as EntityKey<T>;
      if (key !== undefined)
        resource = resource.key(key);
    }
    return resource;
  }

  bind(self: ODataModel<T>) {
    const values: any = {};
    for (let prop of this.fields({include_navigation: true, include_parents: true})) {
      let value = (<any>self)[prop.name];
      if (value !== undefined) {
        delete (<any>self)[prop.name];
        values[prop.name] = value;
      }
      Object.defineProperty(self, prop.name, {
        configurable: true,
        get: () => this._get(self, prop as ODataModelField<any>),
        set: (value: any) => this._set(self, prop as ODataModelField<any>, value)
      });
    }
    if (!Types.isEmpty(values))
      self.assign(values, {silent: true});
  }

  schema(): ODataStructuredType<T> {
    return this._schema;
  }

  query(self: ODataModel<T>, resource: ODataModelResource<T>, func: (q:
    { select(opts?: Select<T>): OptionHandler<Select<T>>;
      expand(opts?: Expand<T>): OptionHandler<Expand<T>>;
      format(opts?: string): OptionHandler<string>;
    }) => void) {
    func(resource.query);
    self.resource(resource);
  }

  resolveKey(value: ODataModel<T> | T | {[name: string]: any}, {field_mapping = false, resolve = true}: {field_mapping?: boolean, resolve?: boolean} = {}): EntityKey<T> | {[name: string]: any} | undefined {
    const keys = this._schema.keys({ include_parents: true });
    const key: any = {};
    for (var k of keys) {
      let model = value as any;
      let options = this as ODataModelOptions<any>;
      let prop: ODataModelField<any> | undefined;
      for (let name of k.ref.split('/')) {
        if (options === null) break;
        prop = options.fields({include_parents: true}).find((p: any) => p.field === name);
        if (prop !== undefined && prop.options !== undefined) {
          model = model[prop.name];
          options = prop.options as ODataModelOptions<any>;
        }
      }
      if (prop === undefined) return undefined;
      let name = field_mapping ? prop.field : prop.name;
      if (k.alias !== undefined)
        name = k.alias;
      key[name] = model[prop.name];
    }
    return resolve ? Objects.resolveKey(key) : key;
  }

  validate(self: ODataModel<T>, { create = false, patch = false }: { create?: boolean, patch?: boolean } = {}): {[name: string]: string[]} | undefined {
    let errors = this.fields({include_parents: true, include_navigation: true}).reduce((acc, prop) => {
      let value = (self as any)[prop.name];
      let errs = prop.validate(value, {create, patch});
      return (errs !== undefined) ?
        Object.assign(acc, {[prop.name]: errs}) :
        acc;
    }, {});
    return !Types.isEmpty(errors) ? errors : undefined;
  }

  hasChanged(self: ODataModel<T>): boolean {
    return !Types.isEmpty(self._changes) ||
      Object.values(self._relations).some(r => r.state === ODataModelState.Changed || (r.model !== null && r.model.hasChanged()));
  }

  defaults(self: ODataModel<T>) {
    return this.fields({include_navigation: true, include_parents: true}).reduce((acc, prop) => {
      let value = prop.default;
      return (value !== undefined) ?
        Object.assign(acc, {[prop.name]: value}) :
        acc;
    }, {});
  }

  toEntity(self: ODataModel<T>, {
    client_id = false,
    include_key = false,
    include_navigation = false,
    changes_only = false,
    field_mapping = false
  }: {
    client_id?: boolean,
    include_key?: boolean,
    include_navigation?: boolean,
    changes_only?: boolean,
    field_mapping?: boolean
  } = {}): T | {[name: string]: any} {
    let attrs = this.attributes(self, { changes_only, field_mapping });

    let relations = Object.entries(self._relations)
      .filter(([, {model, state}]) => !changes_only || (changes_only && (state === ODataModelState.Changed || (model !== null && model.hasChanged()))))
      .filter(([, {property, model}]) => {
        if (include_navigation && property.navigation) {
          const r1 = model?.resource();
          const r2 = self.resource();
          return r1 === undefined || r2 === undefined || !r1.isParentOf(r2);
        }
        return !property.navigation;
      })
      .map(([k, {model, property, state}]) => {
        let changesOnly = changes_only && state !== ODataModelState.Changed && !!property.navigation;
        let includeKey = include_key && !!property.navigation;
        if (model instanceof ODataModel) {
          return [k, model.toEntity({ client_id, include_navigation, field_mapping, changes_only: changesOnly, include_key: includeKey })];
        } else if (model instanceof ODataCollection) {
          return [k, model.toEntities({ client_id, include_navigation, field_mapping, changes_only: changesOnly, include_key: includeKey })];
        }
        return [k, model];
      })
      .reduce((acc, [k, v]) => {
        const name = field_mapping ? this.fields().find(p => p.name === k)?.field || k : k;
        return Object.assign(acc, { [name]: v });
      }, {});

    // Create entity
    let entity = Object.assign(attrs, relations);

    // Add client_id
    if (client_id)
      entity[CID] = self[CID];

    // Add key
    if (include_key)
      entity = Object.assign(entity, self.key({field_mapping, resolve: false}));

    return entity;
  }

  attributes(self: ODataModel<T>, {
    changes_only = false,
    field_mapping = false
  }: {
    changes_only?: boolean,
    field_mapping?: boolean
  } = {}): {[name: string]: any} {
    return Object.entries(changes_only ? self._changes : Object.assign({}, self._attributes, self._changes))
      .reduce((acc, [k, v]) => {
        const name = field_mapping ? this.fields().find(p => p.name === k)?.field || k : k;
        return Object.assign(acc, {[name]: v});
      }, {});
  }

  assign(self: ODataModel<T>, entity: Partial<T> | {[name: string]: any}, { reset = false, silent = false }: { reset?: boolean, silent?: boolean } = {}) {
    self._resetting = reset;
    self._silent = silent;
    if (self._resetting) {
      // Apply current changes and start new tracking
      Object.assign(self._attributes, self._changes);
      self._changes = {} as T;
    }
    for (let key in entity) {
      const value = (<any>entity)[key];
      const name = self._resetting ? this.fields().find(p => p.field === key)?.name || key : key;
      if (value !== null && Types.isObject(value)) {
        const current = (self as any)[name];
        if (
          (!(value instanceof ODataModel) && current instanceof ODataModel) ||
          (!(value instanceof ODataCollection) && current instanceof ODataCollection)) {
          current.assign(value, {reset, silent});
        } else {
          (self as any)[name] = value;
        }
      } else {
        const current = (self as any)[name];
        if (current !== value)
          (self as any)[name] = value;
      }
    }
    if (!self._silent)
      self.events$.emit({ name: self._resetting ? 'reset' : 'update', model: self });
    self._resetting = false;
    self._silent = false;
  }

  private _modelCollectionFactory<P>(self: ODataModel<T>, property: ODataModelField<P>,
    value?: P | P[] | {[name: string]: any} | {[name: string]: any}[]
  ): ODataModel<P> | ODataCollection<P, ODataModel<P>> {

    const baseResource = self.resource();
    const baseMeta = self.meta();
    const baseSchema = self.schema();
    const reset = self._resetting;
    if (baseSchema !== undefined) {
      // Build for Resource or Schema
      return property.modelCollectionFactory<T, P>({value, reset, baseResource, baseSchema, baseMeta});
    }

    const meta = property.metaFactory(baseMeta);
    // Build by Magic
    return property.collection ?
      new ODataCollection((value || []) as (P | {[name: string]: any})[], { reset, meta: meta as ODataEntitiesMeta }) as ODataCollection<P, ODataModel<P>>:
      new ODataModel((value || {}) as P | {[name: string]: any}, { reset, meta: meta as ODataEntityMeta }) as ODataModel<P>;
  }

  private _get<F>(self: ODataModel<T>, property: ODataModelField<F>): F | ODataModel<F> | ODataCollection<F, ODataModel<F>> | null | undefined {
    const name = property.name;
    const parser = property.parser;

    if (parser.isStructuredType()) {
      if (self._resetting && self._resource !== undefined && !(name in self._relations)) {
        const newModel = this._modelCollectionFactory<F>(self, property);
        self._relations[name] = {
          state: ODataModelState.Unchanged,
          property,
          model: newModel,
          subscription: this._subscribe<F>(self, property, newModel)
        };
      }
      return (name in self._relations) ? self._relations[name].model : undefined;
    }
    const attrs = this.attributes(self);
    return attrs[name];
  }

  private _set<F>(self: ODataModel<T>, property: ODataModelField<F>, value: F | ODataModel<F> | ODataCollection<F, ODataModel<F>> | null) {
    const name = property.name;
    const parser = property.parser;

    if (parser.isStructuredType()) {
      let newModel = value as ODataModel<F> | ODataCollection<F, ODataModel<F>> | null;
      const relation = self._relations[name];
      if (relation !== undefined && relation.subscription !== null) {
        relation.subscription.unsubscribe();
      }
      const currentModel = relation?.model as ODataModel<any> | ODataCollection<any, ODataModel<any>> | null;
      if (newModel !== null) {
        const selfResource = self.resource();
        const selfSchema = self.schema();
        const selfMeta = self.meta();
        if (!(newModel instanceof ODataModel || newModel instanceof ODataCollection)) {
          newModel = this._modelCollectionFactory(self, property, value as F);
        } else if (newModel.resource() === undefined && selfResource !== undefined && selfResource.hasKey()) {
          const resource = property.resourceFactory<T, F>(selfResource);
          const meta = property.metaFactory(selfMeta);
          newModel.resource(resource);
          if (newModel instanceof ODataModel)
            newModel.meta(meta as ODataEntityMeta);
          else if (newModel instanceof ODataCollection)
            newModel.meta(meta as ODataEntitiesMeta);
        }

        const newModelResource = newModel.resource();
        if (newModelResource !== undefined && newModelResource.type() !== parser.type)
          throw new Error(`Can't set ${newModelResource.type()} to ${parser.type}`);
      }
      self._relations[name] = {
        state: self._resetting ? ODataModelState.Unchanged : ODataModelState.Changed,
        model: newModel,
        property,
        subscription: newModel && this._subscribe(self, property, newModel)
      };
      if (!self._silent)
        self.events$.emit({ name: 'change', path: property.name, model: self, value: newModel, previous: currentModel});
    } else {
      const attrs = this.attributes(self);
      const currentValue = attrs[name];
      if (!Types.isEqual(currentValue, value)) {
        if (self._resetting)
          self._attributes[name] = value;
        else if (Types.isEqual(value, self._attributes[name]))
          delete self._changes[name];
        else
          self._changes[name] = value;
        if (!self._silent)
          self.events$.emit({ name: 'change', path: property.name, model: self, value, previous: currentValue});
      }
    }
  }

  private _subscribe<F>(self: ODataModel<T>, property: ODataModelField<F>, value: ODataModel<F> | ODataCollection<F, ODataModel<F>>) {
    const mr = self.resource();
    const vr = value.resource();
    const bubbling = mr === undefined || vr === undefined || !vr.isParentOf(mr);
    return value.events$.subscribe((event: ODataModelEvent<any>) => {
      if (bubbling && BUBBLING.indexOf(event.name) !== -1) {
        let path = property.name;
        if (value instanceof ODataModel && event.path)
          path = `${path}.${event.path}`;
        else if (value instanceof ODataCollection && event.path) {
          path = `${path}${event.path}`;
        }
        self.events$.emit({...event, path});
      }
    });
  }
}
