import { Subscription } from "rxjs";
import { ODataStructuredTypeFieldParser } from "../parsers";
import { Expand, ODataEntitiesMeta, ODataEntityMeta, ODataEntityResource, ODataEntitySetResource, ODataNavigationPropertyResource, ODataPropertyResource, ODataSingletonResource, OptionHandler, Select } from "../resources";
import { ODataStructuredType } from "../schema";
import { EntityKey } from "../types";
import { Types } from "../utils";
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

export function ODataModelField(options: ModelFieldOptions = {}) {
  return (target: any, propertyKey: string): void => {
    const properties = target._properties = (target.hasOwnProperty("_properties")) ? target._properties :
      (target.__proto__.hasOwnProperty("_properties")) ? [...target.__proto__._properties] :
      [];
    properties.push(Object.assign(options, { name: propertyKey, field: options.name || propertyKey}));
  }
}

export type ModelFieldOptions = {
  name?: string,
  default?: any,
  required?: boolean,
  maxLength?: number,
  minLength?: number,
  min?: number,
  max?: number,
};
export type ModelPropertyOptions = ModelFieldOptions & { name: string, field: string };

export class ODataModelProperty<F> {
  name: string;
  field: string;
  options: {
    default?: any,
    required?: boolean,
    maxLength?: number,
    minLength?: number,
    min?: number,
    max?: number,
    pattern?: RegExp,
  };
  parser?: ODataStructuredTypeFieldParser<F>;
  constructor({name, field, ...options}: ModelPropertyOptions) {
    this.name = name;
    this.field = field;
    this.options = options;
  }

  get default() {
    return this.options.default || this.parser?.default;
  }

  get navigation() {
    return Boolean(this.parser?.navigation);
  }

  get collection() {
    return Boolean(this.parser?.collection);
  }

  validate(value: any, { create = false, patch = false }: { create?: boolean, patch?: boolean } = {}) {
    if (this.navigation && value instanceof ODataModel) {
      return !value.valid({create, patch}) ? value.errors : undefined;
    } else if (value instanceof ODataCollection) {
      return value.models().some(m => m.valid({create, patch})) ? value.models().map(m => m.errors) : undefined;
    } else {
      let errors = this.parser?.validate(value, {create, patch}) || [];
      if (
        this.options.required &&
        (value === null || (value === undefined && !patch)) // Is null or undefined without patch flag?
      ) {
        errors.push(`required`);
      }
      if (this.options.maxLength !== undefined && typeof value === 'string' && value.length > this.options.maxLength) {
        errors.push(`maxlength`);
      }
      if (this.options.minLength !== undefined && typeof value === 'string' && value.length < this.options.minLength) {
        errors.push(`minlength`);
      }
      if (this.options.min !== undefined && typeof value === 'number' && value < this.options.min) {
        errors.push(`min`);
      }
      if (this.options.max !== undefined && typeof value === 'number' && value > this.options.max) {
        errors.push(`max`);
      }
      if (this.options.pattern !== undefined && typeof value === 'string' && !this.options.pattern.test(value)) {
        errors.push(`pattern`);
      }
      return !Types.isEmpty(errors) ? errors : undefined;
    }
  }

  resourceFactory<T, F>(resource: ODataModelResource<T>): ODataNavigationPropertyResource<F> | ODataPropertyResource<F> | undefined {
    return (
      this.parser !== undefined &&
      (resource instanceof ODataEntityResource || resource instanceof ODataNavigationPropertyResource || resource instanceof ODataPropertyResource)
    ) ?
      this.navigation ? resource?.navigationProperty<F>(this.parser.name) : resource?.property<F>(this.parser.name) :
      undefined;
  }

  metaFactory(meta: ODataEntityMeta): ODataEntityMeta | ODataEntitiesMeta | undefined {
    return (this.parser !== undefined) ?
      this.parser.collection ?
        new ODataEntitiesMeta({ data: meta.property(this.parser.name) || {}, options: meta.options }) :
        new ODataEntityMeta({ data: meta.property(this.parser.name) || {}, options: meta.options }) :
        undefined;
  }

  schemaFactory<T, F>(schema: ODataStructuredType<T>): ODataStructuredType<F> | undefined {
    return (this.parser !== undefined) ?
      schema.api.findStructuredTypeForType(this.parser.type) : undefined;
  }

  modelCollectionFactory<T, F>(
    { value, reset, baseResource, baseSchema, baseMeta}: {
    value?: F | F[] | {[name: string]: any} | {[name: string]: any}[],
    reset?: boolean,
    baseResource?: ODataModelResource<T>,
    baseSchema: ODataStructuredType<T>,
    baseMeta: ODataEntityMeta
  }): ODataModel<F> | ODataCollection<F, ODataModel<F>> {

    if (this.parser === undefined) {
      throw new Error("No Parser");
    }
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
        new Collection((value || []) as (F | {[name: string]: any})[], { schema, meta, reset }) :
        new Model((value || {}) as F | {[name: string]: any}, { schema, meta, reset });
    }
  }
}

type ODataModelRelation = {
  state: ODataModelState,
  model: ODataModel<any> | ODataCollection<any, ODataModel<any>> | null,
  property: ODataModelProperty<any>,
  subscription: Subscription | null
};

export class ODataModelOptions<T> {
  private _attributes: {[name: string]: any} = {};
  private _changes: {[name: string]: any} = {};
  private _properties: ODataModelProperty<any>[] = [];
  private _relations: { [name: string]: ODataModelRelation } = {};
  private _resource?: ODataModelResource<T>;
  private _schema?: ODataStructuredType<T>;
  private _meta: ODataEntityMeta;
  private _resetting: boolean = false;
  private _silent: boolean = false;
  constructor(props: ModelPropertyOptions[]) {
    this._meta = new ODataEntityMeta();
    this._properties = props.map(prop => new ODataModelProperty(prop));
  }

  attach(self: ODataModel<T>, resource: ODataModelResource<T>) {
    if (this._resource !== undefined && resource.type() !== this._resource.type() && !resource.isSubtypeOf(this._resource))
      throw new Error(`Can't reattach ${resource.type()} to ${this._resource.type()}`);

    const schema = resource.schema;
    if (schema !== undefined)
      this.bind(self, schema);

    const key = self.key({field_mapping: true}) as EntityKey<T>;
    if (key !== undefined)
      resource = resource.key(key);

    // Attach relations
    Object.values(this._relations).forEach(({ property, model }) => {
      const field = property.parser;
      if (field === undefined) {
        throw new Error("No Field");
      }
      if (model !== null) {
        const mr = model.resource();
        const pr = property.resourceFactory<T, any>(resource);
        if (mr === undefined || pr === undefined || !mr.isEqualTo(pr))
          model.resource(pr);
      }
    });

    const current = this._resource;
    if (current === undefined || !current.isEqualTo(resource)) {
      this._resource = resource;
      self.events$.emit({ name: 'attach', model: self, previous: current, value: resource });
    }
  }

  resource(self: ODataModel<T>): ODataModelResource<T> | undefined {
    let resource = this._resource?.clone() as ODataModelResource<T> | undefined;
    if (resource !== undefined) {
      const key = self.key({field_mapping: true}) as EntityKey<T>;
      if (key !== undefined)
        resource = resource.key(key);
    }
    return resource;
  }

  findProperty(predicate: (p: ODataModelProperty<any>) => boolean) {
    return this._properties.find(predicate);
  }

  bind(self: ODataModel<T>, schema: ODataStructuredType<T>) {
    if (this._schema === undefined || schema.type() !== this._schema.type()) {
      // Bind Properties
      const fields = schema.fields({ include_navigation: true, include_parents: true });
      const values: any = {};
      for (var field of fields) {
        let prop = this.findProperty(p => p.field === field.name);
        if (prop === undefined) {
          prop = new ODataModelProperty({name: field.name, field: field.name});
          this._properties.push(prop);
        }
        prop.parser = field;
        let value = (<any>self)[prop.name];
        if (value !== undefined) {
          delete (<any>self)[prop.name];
          values[prop.name] = value;
        }
        Object.defineProperty(self, prop.name, {
          configurable: true,
          get: () => this._get(self, prop as ODataModelProperty<any>),
          set: (value: any) => this._set(self, prop as ODataModelProperty<any>, value)
        });
      }
      this._schema = schema;
      if (!Types.isEmpty(values))
        self.assign(values, {silent: true});
    }
  }

  schema(self: ODataModel<T>): ODataStructuredType<T> | undefined {
    return this._schema;
  }

  annotate(self: ODataModel<T>, meta: ODataEntityMeta) {
    if (meta.type !== undefined && meta.type !== this._resource?.type()) {
      const schema = this._resource?.api.findStructuredTypeForType<any>(meta.type);
      if (schema !== undefined) this.bind(self, schema);
    }
    this._meta = meta;
  }

  meta(self: ODataModel<T>) {
    return this._meta?.clone();
  }

  query(self: ODataModel<T>, resource: ODataModelResource<T>, func: (q:
    { select(opts?: Select<T>): OptionHandler<Select<T>>;
      expand(opts?: Expand<T>): OptionHandler<Expand<T>>;
      format(opts?: string): OptionHandler<string>;
    }) => void) {
    func(resource.query);
    self.resource(resource);
  }

  validate(self: ODataModel<T>, { create = false, patch = false }: { create?: boolean, patch?: boolean } = {}): {[name: string]: string[]} | undefined {
    let errors = this._properties.reduce((acc, prop) => {
      let value = (self as any)[prop.name];
      let errs = prop.validate(value, {create, patch});
      return (errs !== undefined) ?
        Object.assign(acc, {[prop.name]: errs}) :
        acc;
    }, {});
    return !Types.isEmpty(errors) ? errors : undefined;
  }

  hasChanged(): boolean {
    return !Types.isEmpty(this._changes) ||
      Object.values(this._relations).some(r => r.state === ODataModelState.Changed || (r.model !== null && r.model.hasChanged()));
  }

  defaults(self: ODataModel<T>) {
    return this._properties.reduce((acc, prop) => {
      var value = prop.default;
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

    let relations = Object.entries(this._relations)
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
        const name = field_mapping ? this.findProperty(p => p.name === k)?.field || k : k;
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
    return Object.entries(changes_only ? this._changes : Object.assign({}, this._attributes, this._changes))
      .reduce((acc, [k, v]) => {
        const name = field_mapping ? this.findProperty(p => p.name === k)?.field || k : k;
        return Object.assign(acc, {[name]: v});
      }, {});
  }

  assign(self: ODataModel<T>, entity: Partial<T> | {[name: string]: any}, { reset = false, silent = false }: { reset?: boolean, silent?: boolean } = {}) {
    this._resetting = reset;
    this._silent = silent;
    if (this._resetting) {
      // Apply current changes and start new tracking
      Object.assign(this._attributes, this._changes);
      this._changes = {} as T;
    }
    for (let key in entity) {
      const value = (<any>entity)[key];
      const name = this._resetting ? this.findProperty(p => p.field === key)?.name || key : key;
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
    if (!this._silent)
      self.events$.emit({ name: this._resetting ? 'reset' : 'update', model: self });
    this._resetting = false;
    this._silent = false;
  }

  private _modelCollectionFactory<P>(self: ODataModel<T>, property: ODataModelProperty<P>,
    value?: P | P[] | {[name: string]: any} | {[name: string]: any}[]
  ): ODataModel<P> | ODataCollection<P, ODataModel<P>> {

    const baseResource = this.resource(self);
    const baseMeta = this.meta(self);
    const baseSchema = this.schema(self);
    const reset = this._resetting;
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

  private _get<F>(self: ODataModel<T>, property: ODataModelProperty<F>): F | ODataModel<F> | ODataCollection<F, ODataModel<F>> | null | undefined {
    const name = property.name;
    const field = property.parser;
    if (field === undefined)
      throw new Error("No Field");
    if (field.isStructuredType()) {
      if (this._resetting && this._resource !== undefined && !(name in this._relations)) {
        const newModel = this._modelCollectionFactory<F>(self, property);
        this._relations[name] = {
          state: ODataModelState.Unchanged,
          property,
          model: newModel,
          subscription: this._subscribe<F>(self, property, newModel)
        };
      }
      return (name in this._relations) ? this._relations[name].model : undefined;
    }
    const attrs = this.attributes(self);
    return attrs[name];
  }

  private _set<F>(self: ODataModel<T>, property: ODataModelProperty<F>, value: F | ODataModel<F> | ODataCollection<F, ODataModel<F>> | null) {
    const name = property.name;
    const field = property.parser;
    if (field === undefined)
      throw new Error("No Field");

    if (field.isStructuredType()) {
      let newModel = value as ODataModel<F> | ODataCollection<F, ODataModel<F>> | null;
      const relation = this._relations[name];
      if (relation !== undefined && relation.subscription !== null) {
        relation.subscription.unsubscribe();
      }
      const currentModel = relation?.model as ODataModel<any> | ODataCollection<any, ODataModel<any>> | null;
      if (newModel !== null) {
        if (!(newModel instanceof ODataModel || newModel instanceof ODataCollection)) {
          newModel = this._modelCollectionFactory(self, property, value as F);
        } else if (newModel.resource() === undefined && this._resource !== undefined && this._resource.hasKey()) {
          const resource = property.resourceFactory<T, F>(this._resource);
          const meta = property.metaFactory(this._meta);
          newModel.resource(resource);
          if (newModel instanceof ODataModel)
            newModel.meta(meta as ODataEntityMeta);
          else if (newModel instanceof ODataCollection)
            newModel.meta(meta as ODataEntitiesMeta);
        } else if (newModel.schema() === undefined && this._schema !== undefined) {
          const schema = property.schemaFactory<T, F>(this._schema);
          newModel.schema(schema);
          const meta = property.metaFactory(this._meta);
          if (newModel instanceof ODataModel)
            newModel.meta(meta as ODataEntityMeta);
          else if (newModel instanceof ODataCollection)
            newModel.meta(meta as ODataEntitiesMeta);
        }
        const resource = newModel.resource();
        if (resource !== undefined && resource.type() !== field.type)
          throw new Error(`Can't set ${resource.type()} to ${field.type}`);
      }
      this._relations[name] = {
        state: this._resetting ? ODataModelState.Unchanged : ODataModelState.Changed,
        model: newModel,
        property,
        subscription: newModel && this._subscribe(self, property, newModel)
      };
      if (!this._silent)
        self.events$.emit({ name: 'change', path: property.name, model: self, value: newModel, previous: currentModel});
    } else {
      const attrs = this.attributes(self);
      const currentValue = attrs[name];
      if (!Types.isEqual(currentValue, value)) {
        if (this._resetting)
          this._attributes[name] = value;
        else if (Types.isEqual(value, this._attributes[name]))
          delete this._changes[name];
        else
          this._changes[name] = value;
        if (!this._silent)
          self.events$.emit({ name: 'change', path: property.name, model: self, value, previous: currentValue});
      }
    }
  }

  private _subscribe<F>(self: ODataModel<T>, property: ODataModelProperty<F>, value: ODataModel<F> | ODataCollection<F, ODataModel<F>>) {
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
