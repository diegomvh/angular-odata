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
  name: 'change' | 'add' | 'remove' | 'reset' | 'update' | 'invalid' | 'request' | 'sync' | 'attach' | 'destroy'
  model?: ODataModel<T>
  collection?: ODataCollection<T, ODataModel<T>>
  path?: string  // Property.Collection[1].Collection[3].Property
  value?: any
  previous?: any
  options?: any
}

export enum ODataModelState {
  Added,
  Removed,
  Changed,
  Unchanged,
}

export function ODataModelField(options: ModelFieldOptions = {}) {
  return (target: any, propertyKey: string): void => {
    const properties = target._properties = (target._properties || []) as ModelPropertyOptions[];
    properties.push(Object.assign(options, { name: propertyKey, field: options.name || propertyKey}));
  }
}

export type ModelFieldOptions = {
  name?: string,
  default?: any,
  nullable?: boolean,
  maxLength?: number,
  minLength?: number,
};
export type ModelPropertyOptions = ModelFieldOptions & { name: string, field: string };

export class ODataModelProperty<F> {
  name: string;
  field: string;
  options: {
    default?: any,
    nullable?: boolean,
    maxLength?: number,
    minLength?: number,
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

  resourceFactory<T, F>(resource: ODataModelResource<T>): ODataNavigationPropertyResource<F> | ODataPropertyResource<F> | undefined {
    return (
      this.parser !== undefined &&
      (resource instanceof ODataEntityResource || resource instanceof ODataNavigationPropertyResource || resource instanceof ODataPropertyResource)
    ) ?
      this.parser.isNavigation() ? resource?.navigationProperty<F>(this.parser.name) : resource?.property<F>(this.parser.name) :
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
  attach(model: ODataModel<T>, resource: ODataModelResource<T>) {
    if (this._resource !== undefined && resource.type() !== this._resource.type() && !resource.isSubtypeOf(this._resource))
      throw new Error(`Can't reattach ${resource.type()} to ${this._resource.type()}`);

    const current = this._resource;
    const schema = resource.schema;
    if (schema !== undefined)
      this.bind(model, schema);

    const key = model.key({field_mapping: true}) as EntityKey<T>;
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
        if (mr === undefined || !mr.isParentOf(resource))
          model.resource(property.resourceFactory<T, any>(resource));
      }
    });

    this._resource = resource;
    model.events$.emit({ name: 'attach', model, previous: current, value: resource });
  }

  resource(model: ODataModel<T>): ODataModelResource<T> | undefined {
    let resource = this._resource?.clone() as ODataModelResource<T> | undefined;
    if (resource !== undefined) {
      const key = model.key({field_mapping: true}) as EntityKey<T>;
      if (key !== undefined)
        resource = resource.key(key);
    }
    return resource;
  }

  findProperty(predicate: (p: ODataModelProperty<any>) => boolean) {
    return this._properties.find(predicate);
  }

  bind(model: ODataModel<T>, schema: ODataStructuredType<T>) {
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
        let value = (<any>model)[prop.name];
        if (value !== undefined) {
          delete (<any>model)[prop.name];
          values[prop.name] = value;
        }
        Object.defineProperty(model, prop.name, {
          configurable: true,
          get: () => this._get(model, prop as ODataModelProperty<any>),
          set: (value: any) => this._set(model, prop as ODataModelProperty<any>, value)
        });
      }
      this._schema = schema;
      if (!Types.isEmpty(values))
        model.assign(values, {silent: true});
    }
  }

  schema(model: ODataModel<T>): ODataStructuredType<T> | undefined {
    return this._schema;
  }

  annotate(model: ODataModel<T>, meta: ODataEntityMeta) {
    if (meta.type !== undefined && meta.type !== this._resource?.type()) {
      const schema = this._resource?.api.findStructuredTypeForType<any>(meta.type);
      if (schema !== undefined) this.bind(model, schema);
    }
    this._meta = meta;
  }

  meta(model: ODataModel<T>) {
    return this._meta?.clone();
  }

  query(model: ODataModel<T>, resource: ODataModelResource<T>, func: (q:
    { select(opts?: Select<T>): OptionHandler<Select<T>>;
      expand(opts?: Expand<T>): OptionHandler<Expand<T>>;
      format(opts?: string): OptionHandler<string>;
    }) => void) {
    func(resource.query);
    model.resource(resource);
  }

  validate(model: ODataModel<T>, { create = false, patch = false }: { create?: boolean, patch?: boolean } = {}) {
    //TODO: field_mapping
    return this.schema(model)?.validate(model.toEntity({field_mapping: true}) as T, { create, patch });
  }

  hasChanged(): boolean {
    return !Types.isEmpty(this._changes) ||
      Object.values(this._relations).some(r => r.state === ODataModelState.Changed || (r.model !== null && r.model.hasChanged()));
  }

  defaults(model: ODataModel<T>) {
    return this._properties.reduce((acc, prop) => {
      var value = prop.default;
      return (value !== undefined) ?
        Object.assign(acc, {[prop.name]: value}) :
        acc;
    }, {});
  }

  toEntity(model: ODataModel<T>, {
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
    let attrs = this.attributes(model, { changes_only, field_mapping });

    let relations = Object.entries(this._relations)
      .filter(([, v]) => !changes_only || (changes_only && (v.state === ODataModelState.Changed || (v.model !== null && v.model.hasChanged()))))
      .filter(([, v]) => {
        if (include_navigation && v.property.parser?.isNavigation()) {
          const r1 = v.model?.resource();
          const r2 = model.resource();
          return r1 === undefined || r2 === undefined || !r1.isParentOf(r2);
        }
        return !v.property.parser?.isNavigation();
      })
      .map(([k, v]) => {
        if (v.model instanceof ODataModel) {
          return [k, v.model.toEntity({ client_id, changes_only, include_navigation, field_mapping })];
        } else if (v.model instanceof ODataCollection) {
          return [k, v.model.toEntities({ client_id, changes_only, include_navigation, field_mapping })];
        }
        return [k, v.model];
      })
      .reduce((acc, [k, v]) => {
        const name = field_mapping ? this.findProperty(p => p.name === k)?.field || k : k;
        return Object.assign(acc, { [name]: v });
      }, {});

    // Create entity
    let entity = Object.assign(attrs, relations);

    // Add client_id
    if (client_id)
      entity[CID] = model[CID];

    return entity;
  }

  attributes(model: ODataModel<T>, {
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

  assign(model: ODataModel<T>, entity: Partial<T> | {[name: string]: any}, { reset = false, silent = false }: { reset?: boolean, silent?: boolean } = {}) {
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
        const current = (model as any)[name];
        if (
          (!(value instanceof ODataModel) && current instanceof ODataModel) ||
          (!(value instanceof ODataCollection) && current instanceof ODataCollection)) {
          current.assign(value, {reset, silent});
        } else {
          (model as any)[name] = value;
        }
      } else {
        const current = (model as any)[name];
        if (current !== value)
          (model as any)[name] = value;
      }
    }
    if (!this._silent)
      model.events$.emit({ name: this._resetting ? 'reset' : 'update', model });
    this._resetting = false;
    this._silent = false;
  }

  private _modelCollectionFactory<P>(model: ODataModel<T>, property: ODataModelProperty<P>,
    value?: P | P[] | {[name: string]: any} | {[name: string]: any}[]
  ): ODataModel<P> | ODataCollection<P, ODataModel<P>> {

    const baseResource = this.resource(model);
    const baseMeta = this.meta(model);
    const baseSchema = this.schema(model);
    const reset = this._resetting;
    if (baseSchema !== undefined) {
      // Build for Resource or Schema
      return property.modelCollectionFactory<T, P>({value, reset, baseResource, baseSchema, baseMeta});
    }

    const meta = property.metaFactory(baseMeta);
    // Build by Magic
    return property.parser?.collection ?
      new ODataCollection((value || []) as (P | {[name: string]: any})[], { reset, meta: meta as ODataEntitiesMeta }) as ODataCollection<P, ODataModel<P>>:
      new ODataModel((value || {}) as P | {[name: string]: any}, { reset, meta: meta as ODataEntityMeta }) as ODataModel<P>;
  }

  private _get<F>(model: ODataModel<T>, property: ODataModelProperty<F>): F | ODataModel<F> | ODataCollection<F, ODataModel<F>> | null | undefined {
    const name = property.name;
    const field = property.parser;
    if (field === undefined)
      throw new Error("No Field");
    if (field.isComplexType() || field.isNavigation()) {
      if (this._resetting && this._resource !== undefined && !(name in this._relations)) {
        const newModel = this._modelCollectionFactory<F>(model, property);
        this._relations[name] = {
          state: ODataModelState.Unchanged,
          property,
          model: newModel,
          subscription: this._subscribe<F>(model, property, newModel)
        };
      }
      return (name in this._relations) ? this._relations[name].model : undefined;
    }
    const attrs = this.attributes(model);
    return attrs[name];
  }

  private _set<F>(model: ODataModel<T>, property: ODataModelProperty<F>, value: F | ODataModel<F> | ODataCollection<F, ODataModel<F>> | null) {
    const name = property.name;
    const field = property.parser;
    if (field === undefined)
      throw new Error("No Field");

    if (field.isComplexType() || field.isNavigation()) {
      let newModel = value as ODataModel<F> | ODataCollection<F, ODataModel<F>> | null;
      const relation = this._relations[name];
      if (relation !== undefined && relation.subscription !== null) {
        relation.subscription.unsubscribe();
      }
      const currentModel = relation?.model as ODataModel<any> | ODataCollection<any, ODataModel<any>> | null;
      if (newModel !== null) {
        if (!(newModel instanceof ODataModel || newModel instanceof ODataCollection)) {
          newModel = this._modelCollectionFactory(model, property, value as F);
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
        subscription: newModel && this._subscribe(model, property, newModel)
      };
      if (!this._silent)
        model.events$.emit({ name: 'change', path: property.name, model, value: newModel, previous: currentModel});
    } else {
      const attrs = this.attributes(model);
      const currentValue = attrs[name];
      if (!Types.isEqual(currentValue, value)) {
        if (this._resetting)
          this._attributes[name] = value;
        else if (Types.isEqual(value, this._attributes[name]))
          delete this._changes[name];
        else
          this._changes[name] = value;
        if (!this._silent)
          model.events$.emit({ name: 'change', path: property.name, model, value, previous: currentValue});
      }
    }
  }

  private _subscribe<F>(self: ODataModel<T>, property: ODataModelProperty<F>, value: ODataModel<F> | ODataCollection<F, ODataModel<F>>) {
    const mr = self.resource();
    const vr = value.resource();
    const bubbling = mr === undefined || vr === undefined || !vr.isParentOf(mr);
    return value.events$.subscribe((event: ODataModelEvent<any>) => {
      if (bubbling) {
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
