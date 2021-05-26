import { Subscription } from 'rxjs';
import { COMPUTED, OPTIMISTIC_CONCURRENCY } from '../constants';
import { ODataStructuredTypeFieldParser } from '../parsers';
import {
  Expand,
  ODataEntitiesAnnotations,
  ODataEntityAnnotations,
  ODataEntityResource,
  ODataEntitySetResource,
  ODataNavigationPropertyResource,
  ODataPathSegments,
  ODataPropertyResource,
  ODataQueryOptions,
  ODataResource,
  ODataSingletonResource,
  OptionHandler,
  Select,
} from '../resources';
import { ODataEntitySet, ODataStructuredType } from '../schema';
import { EntityKey, OptionsHelper } from '../types';
import { Objects, Types } from '../utils';
import { ODataCollection } from './collection';
import { ODataModel } from './model';

export const CID = '_cid';
export type ODataModelResource<T> =
  | ODataEntityResource<T>
  | ODataSingletonResource<T>
  | ODataNavigationPropertyResource<T>
  | ODataPropertyResource<T>;
export type ODataCollectionResource<T> =
  | ODataEntitySetResource<T>
  | ODataNavigationPropertyResource<T>
  | ODataPropertyResource<T>;

export type ODataModelEvent<T> = {
  name:
    | 'change'
    | 'reset'
    | 'update'
    | 'destroy'
    | 'add'
    | 'remove'
    | 'invalid'
    | 'request'
    | 'sync'
    | 'attach';
  model?: ODataModel<T>;
  collection?: ODataCollection<T, ODataModel<T>>;
  path?: string; // Property.Collection[1].Collection[3].Property
  value?: any;
  previous?: any;
  options?: any;
};

export const BUBBLING = [
  'change',
  'reset',
  'update',
  'destroy',
  'add',
  'remove',
];

export enum ODataModelState {
  Added,
  Removed,
  Changed,
  Unchanged,
}

export type ModelOptions = {
  cid?: string;
  fields: { [name: string]: ModelFieldOptions };
};

export type ModelFieldOptions = {
  field?: string;
  default?: any;
  required?: boolean;
  concurrency?: boolean;
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
};

export function Model({ cid = CID }: { cid?: string } = {}) {
  return <T extends { new (...args: any[]): {} }>(constructor: T) => {
    const Klass = (<any>constructor) as typeof ODataModel;
    if (!Klass.hasOwnProperty('options'))
      Klass.options = { fields: {} } as ModelOptions;
    Klass.options.cid = cid;
    return constructor;
  };
}

export function ModelField({
  name,
  ...options
}: { name?: string } & ModelFieldOptions = {}) {
  return (target: any, propertyKey: string): void => {
    const Klass = target.constructor as typeof ODataModel;
    if (!Klass.hasOwnProperty('options'))
      Klass.options = { fields: {} } as ModelOptions;
    options.field = name || propertyKey;
    Klass.options.fields[propertyKey] = options;
  };
}

export type ODataModelFieldOptions<F> = ModelFieldOptions & {
  name: string;
  field: string;
  parser: ODataStructuredTypeFieldParser<F>;
};

export class ODataModelField<F> {
  name: string;
  field: string;
  parser: ODataStructuredTypeFieldParser<F>;
  meta?: ODataModelOptions<any>;
  options: {
    default?: any;
    required?: boolean;
    concurrency?: boolean;
    maxLength?: number;
    minLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
  };
  constructor({ name, field, parser, ...options }: ODataModelFieldOptions<F>) {
    this.name = name;
    this.field = field;
    this.parser = parser;
    this.options = options;
  }

  get type() {
    return this.parser.type;
  }

  get default() {
    return this.options.default || this.parser.default;
  }

  get navigation() {
    return Boolean(this.parser.navigation);
  }

  get collection() {
    return Boolean(this.parser.collection);
  }

  get concurrency() {
    return Boolean(this.options.concurrency);
  }

  get computed() {
    return Boolean(
      this.parser.findAnnotation((a) => a.type === COMPUTED)?.bool
    );
  }

  get referential() {
    // TODO: Resolve reference
    return this.parser.referential;
  }

  get referenced() {
    // TODO: Resolve reference
    return this.parser.referenced;
  }

  configure({
    findOptionsForType,
    concurrency,
    options,
  }: {
    findOptionsForType: (type: string) => ODataModelOptions<any> | undefined;
    concurrency: boolean;
    options: OptionsHelper;
  }) {
    this.meta = findOptionsForType(this.parser.type);
    if (concurrency) this.options.concurrency = concurrency;
  }

  isStructuredType() {
    return this.parser.isStructuredType();
  }

  validate(
    value: any,
    {
      create = false,
      patch = false,
      navigation = false,
    }: {
      create?: boolean;
      patch?: boolean;
      navigation?: boolean;
    } = {}
  ) {
    if (value instanceof ODataModel) {
      return !value.valid({ create, patch, navigation })
        ? value._errors
        : undefined;
    } else if (value instanceof ODataCollection) {
      return value.models().some((m) => !m.valid({ create, patch, navigation }))
        ? value.models().map((m) => m.errors)
        : undefined;
    } else {
      let errors =
        this.parser?.validate(value, { create, patch, navigation }) || [];
      if (
        this.options.required &&
        (value === null || (value === undefined && !patch)) // Is null or undefined without patch flag?
      ) {
        errors.push(`required`);
      }
      if (
        this.options.maxLength !== undefined &&
        typeof value === 'string' &&
        value.length > this.options.maxLength
      ) {
        errors.push(`maxlength`);
      }
      if (
        this.options.minLength !== undefined &&
        typeof value === 'string' &&
        value.length < this.options.minLength
      ) {
        errors.push(`minlength`);
      }
      if (
        this.options.min !== undefined &&
        typeof value === 'number' &&
        value < this.options.min
      ) {
        errors.push(`min`);
      }
      if (
        this.options.max !== undefined &&
        typeof value === 'number' &&
        value > this.options.max
      ) {
        errors.push(`max`);
      }
      if (
        this.options.pattern !== undefined &&
        typeof value === 'string' &&
        !this.options.pattern.test(value)
      ) {
        errors.push(`pattern`);
      }
      return !Types.isEmpty(errors) ? errors : undefined;
    }
  }

  resourceFactory<T, F>(
    resource: ODataModelResource<T>
  ): ODataNavigationPropertyResource<F> | ODataPropertyResource<F> | undefined {
    return resource instanceof ODataEntityResource ||
      resource instanceof ODataNavigationPropertyResource ||
      resource instanceof ODataPropertyResource
      ? this.navigation
        ? resource?.navigationProperty<F>(this.parser.name)
        : resource?.property<F>(this.parser.name)
      : undefined;
  }

  annotationsFactory(
    annots: ODataEntityAnnotations
  ): ODataEntityAnnotations | ODataEntitiesAnnotations | undefined {
    return this.parser.collection
      ? new ODataEntitiesAnnotations({
          data: annots.property(this.parser.name) || {},
          options: annots.options,
        })
      : new ODataEntityAnnotations({
          data: annots.property(this.parser.name) || {},
          options: annots.options,
        });
  }

  schemaFactory<T, F>(
    schema: ODataStructuredType<T>
  ): ODataStructuredType<F> | undefined {
    return schema.api.findStructuredTypeForType(this.parser.type);
  }

  modelCollectionFactory<T, F>({
    value,
    reset,
    baseResource,
    baseSchema,
    baseAnnots,
  }: {
    value?: F | F[] | { [name: string]: any } | { [name: string]: any }[];
    reset?: boolean;
    baseResource?: ODataModelResource<T>;
    baseSchema: ODataStructuredType<T>;
    baseAnnots: ODataEntityAnnotations;
  }): ODataModel<F> | ODataCollection<F, ODataModel<F>> {
    const annots = this.annotationsFactory(baseAnnots);
    if (baseResource !== undefined && baseResource.hasKey()) {
      // Build for Resource
      const resource = this.resourceFactory<T, F>(baseResource) as
        | ODataNavigationPropertyResource<F>
        | ODataPropertyResource<F>;
      return this.parser.collection
        ? resource.asCollection(
            (value || []) as (F | { [name: string]: any })[],
            { reset, annots: annots as ODataEntitiesAnnotations }
          )
        : resource.asModel((value || {}) as F | { [name: string]: any }, {
            reset,
            annots: annots as ODataEntityAnnotations,
          });
    } else {
      // Build for Schema
      const schema = this.schemaFactory<T, F>(baseSchema);
      const Model = schema?.model || ODataModel;
      const Collection = schema?.collection || ODataCollection;
      return this.parser.collection
        ? (new Collection((value || []) as (F | { [name: string]: any })[], {
            annots: annots as ODataEntitiesAnnotations,
            reset,
          }) as ODataCollection<F, ODataModel<F>>)
        : (new Model((value || {}) as F | { [name: string]: any }, {
            annots: annots as ODataEntityAnnotations,
            reset,
          }) as ODataModel<F>);
    }
  }
}

export type ODataModelRelation = {
  state: ODataModelState;
  model: ODataModel<any> | ODataCollection<any, ODataModel<any>> | null;
  property: ODataModelField<any>;
  subscription: Subscription | null;
};

export class ODataModelOptions<T> {
  name: string;
  cid: string;
  base?: string;
  open?: boolean;
  private _fields: ODataModelField<any>[];
  schema: ODataStructuredType<T>;
  entitySet?: ODataEntitySet;
  // Hierarchy
  parent?: ODataModelOptions<any>;
  children: ODataModelOptions<any>[] = [];

  constructor(options: ModelOptions, schema: ODataStructuredType<T>) {
    this.name = schema.name;
    this.base = schema.base;
    this.open = schema.open;
    this.schema = schema;
    this.cid = options.cid || CID;
    const schemaFields = this.schema.fields({ include_navigation: true });
    this._fields = Object.entries(options.fields).map(([name, options]) => {
      const { field, ...opts } = options;
      if (field === undefined || name === undefined)
        throw new Error('Model Properties need name and field');
      const parser = schemaFields.find((f) => f.name === field);
      if (parser === undefined)
        throw new Error(`No parser for ${field} with name = ${name}`);
      return new ODataModelField<T>({ name, field, parser, ...opts });
    });
  }

  get api() {
    return this.schema.api;
  }

  type() {
    return this.schema.type();
  }

  isTypeOf(type: string) {
    return this.schema.isTypeOf(type);
  }

  collectionResourceFactory({
    fromSet = false,
    baseResource,
  }: { fromSet?: boolean; baseResource?: ODataResource<T> } = {}):
    | ODataCollectionResource<T>
    | undefined {
    if (fromSet && this.entitySet !== undefined)
      return ODataEntitySetResource.factory<T>(
        this.api,
        this.entitySet.name,
        this.type(),
        new ODataPathSegments(),
        baseResource?.cloneQuery() || new ODataQueryOptions()
      );
    return baseResource?.clone() as ODataCollectionResource<T> | undefined;
  }

  modelResourceFactory({
    fromSet = false,
    baseResource,
  }: { fromSet?: boolean; baseResource?: ODataResource<T> } = {}):
    | ODataModelResource<T>
    | undefined {
    const resource = this.collectionResourceFactory({ baseResource, fromSet });
    if (resource instanceof ODataEntitySetResource) return resource.entity();
    return resource as ODataModelResource<T> | undefined;
  }

  find(
    predicate: (p: ODataModelOptions<any>) => boolean
  ): ODataModelOptions<any> | undefined {
    if (predicate(this)) return this;
    let match: ODataModelOptions<any> | undefined;
    for (let ch of this.children) {
      match = ch.find(predicate);
      if (match !== undefined) break;
    }
    return match;
  }

  configure({
    findOptionsForType,
    options,
  }: {
    findOptionsForType: (type: string) => ODataModelOptions<any> | undefined;
    options: OptionsHelper;
  }) {
    if (this.base) {
      const parent = findOptionsForType(this.base) as ODataModelOptions<any>;
      parent.children.push(this);
      this.parent = parent;
    }
    this.entitySet = this.api.findEntitySetForEntityType(this.type());
    let concurrencyFields: string[] = [];
    if (this.entitySet !== undefined) {
      concurrencyFields =
        this.entitySet.findAnnotation((a) => a.type === OPTIMISTIC_CONCURRENCY)
          ?.properties || [];
    }
    this._fields.forEach((field) => {
      let concurrency = concurrencyFields.indexOf(field.field) !== -1;
      field.configure({
        findOptionsForType,
        concurrency,
        options,
      });
    });
  }

  fields({
    include_navigation = false,
    include_parents = true,
  }: {
    include_parents?: boolean;
    include_navigation?: boolean;
  } = {}): ODataModelField<any>[] {
    return [
      ...(include_parents && this.parent !== undefined
        ? this.parent.fields({ include_navigation, include_parents })
        : []),
      ...this._fields.filter((prop) => include_navigation || !prop.navigation),
    ];
  }

  attach(self: ODataModel<T>, resource: ODataModelResource<T>) {
    if (
      self._resource !== undefined &&
      resource.type() !== self._resource.type() &&
      !resource.isSubtypeOf(self._resource)
    )
      throw new Error(
        `Can't reattach ${resource.type()} to ${self._resource.type()}`
      );

    const key = self.key({ field_mapping: true }) as EntityKey<T>;
    if (key !== undefined) resource = resource.key(key);

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
      self.events$.emit({
        name: 'attach',
        model: self,
        previous: current,
        value: resource,
      });
    }
  }

  resource(
    self: ODataModel<T>,
    {
      toEntity
    }: {
      toEntity?: boolean
    } = {}): ODataModelResource<T> | undefined {
    let resource = self._resource?.clone() as ODataModelResource<T> | undefined;
    if (toEntity)
      resource = this.modelResourceFactory({
        baseResource: resource,
        fromSet: true,
      });
    if (resource !== undefined) {
      const key = self.key({ field_mapping: true }) as EntityKey<T>;
      if (key !== undefined) resource = resource.key(key);
    }
    return resource;
  }

  bind(self: ODataModel<T>) {
    const values: any = {};
    for (let prop of this.fields({
      include_navigation: true,
      include_parents: true,
    })) {
      let value = (<any>self)[prop.name];
      if (value !== undefined) {
        delete (<any>self)[prop.name];
        values[prop.name] = value;
      }
      Object.defineProperty(self, prop.name, {
        configurable: true,
        get: () => this._get(self, prop as ODataModelField<any>),
        set: (value: any) =>
          this._set(self, prop as ODataModelField<any>, value),
      });
    }
    if (!Types.isEmpty(values)) self.assign(values, { silent: true });
  }

  query(
    self: ODataModel<T>,
    resource: ODataModelResource<T>,
    func: (q: {
      select(opts?: Select<T>): OptionHandler<Select<T>>;
      expand(opts?: Expand<T>): OptionHandler<Expand<T>>;
      format(opts?: string): OptionHandler<string>;
    }) => void
  ) {
    func(resource.query);
    self.resource(resource);
  }

  resolveKey(
    value: ODataModel<T> | T | { [name: string]: any },
    {
      field_mapping = false,
      resolve = true,
    }: { field_mapping?: boolean; resolve?: boolean } = {}
  ): EntityKey<T> | { [name: string]: any } | undefined {
    const keys = this.schema.keys({ include_parents: true });
    const key: any = {};
    for (var k of keys) {
      let model = value as any;
      let options = this as ODataModelOptions<any>;
      let prop: ODataModelField<any> | undefined;
      for (let name of k.ref.split('/')) {
        if (options === null) break;
        prop = options
          .fields({ include_parents: true })
          .find((p: any) => p.field === name);
        if (prop !== undefined && prop.meta !== undefined) {
          model = model[prop.name];
          options = prop.meta as ODataModelOptions<any>;
        }
      }
      if (prop === undefined) return undefined;
      let name = field_mapping ? prop.field : prop.name;
      if (k.alias !== undefined) name = k.alias;
      key[name] = model[prop.name];
    }
    return resolve ? Objects.resolveKey(key) : key;
  }

  validate(
    self: ODataModel<T>,
    {
      create = false,
      patch = false,
      navigation = false,
    }: {
      create?: boolean;
      patch?: boolean;
      navigation?: boolean;
    } = {}
  ): { [name: string]: string[] } | undefined {
    let errors = this.fields({
      include_parents: true,
      include_navigation: navigation,
    }).reduce((acc, prop) => {
      let value = (self as any)[prop.name];
      let errs = prop.validate(value, { create, patch });
      return errs !== undefined
        ? Object.assign(acc, { [prop.name]: errs })
        : acc;
    }, {});
    return !Types.isEmpty(errors) ? errors : undefined;
  }

  hasChanged(self: ODataModel<T>): boolean {
    return (
      !Types.isEmpty(self._changes) ||
      Object.values(self._relations).some(
        (r) =>
          r.state === ODataModelState.Changed ||
          (r.model !== null && r.model.hasChanged())
      )
    );
  }

  defaults(self: ODataModel<T>) {
    return this.fields({
      include_navigation: true,
      include_parents: true,
    }).reduce((acc, prop) => {
      let value = prop.default;
      return value !== undefined
        ? Object.assign(acc, { [prop.name]: value })
        : acc;
    }, {});
  }

  toEntity(
    self: ODataModel<T>,
    {
      client_id = false,
      include_key = true,
      include_navigation = false,
      include_concurrency = false,
      include_computed = false,
      changes_only = false,
      field_mapping = false,
    }: {
      client_id?: boolean;
      include_key?: boolean;
      include_navigation?: boolean;
      include_concurrency?: boolean;
      include_computed?: boolean;
      changes_only?: boolean;
      field_mapping?: boolean;
    } = {}
  ): T | { [name: string]: any } {
    let attrs = self.attributes({
      changes_only,
      field_mapping,
      include_concurrency,
      include_computed
    });

    let relations = Object.entries(self._relations)
      .filter(
        ([, { model, state }]) =>
          !changes_only ||
          (changes_only &&
            (state === ODataModelState.Changed ||
              (model !== null && model.hasChanged())))
      )
      .filter(([, { property, model }]) => {
        if (include_navigation && property.navigation) {
          const r1 = model?.resource();
          const r2 = self.resource();
          return r1 === undefined || r2 === undefined || !r1.isParentOf(r2);
        }
        return !property.navigation;
      })
      .map(([k, { model, property, state }]) => {
        let changesOnly =
          changes_only &&
          state !== ODataModelState.Changed &&
          !!property.navigation;
        let includeKey = include_key && !!property.navigation;
        if (model instanceof ODataModel) {
          return [
            k,
            model.toEntity({
              client_id,
              include_navigation,
              include_concurrency,
              field_mapping,
              changes_only: changesOnly,
              include_key: includeKey,
            }),
          ];
        } else if (model instanceof ODataCollection) {
          return [
            k,
            model.toEntities({
              client_id,
              include_navigation,
              include_concurrency,
              field_mapping,
              changes_only: changesOnly,
              include_key: includeKey,
            }),
          ];
        }
        return [k, model];
      })
      .reduce((acc, [k, v]) => {
        const name = field_mapping
          ? this.fields().find((p) => p.name === k)?.field || k
          : k;
        return Object.assign(acc, { [name]: v });
      }, {});

    // Create entity
    let entity = Object.assign(attrs, relations);

    // Add client_id
    if (client_id) {
      entity[this.cid] = (<any>self)[this.cid];
    }

    // Add key
    if (include_key) {
      entity = Object.assign(
        entity,
        this.resolveKey(self, { field_mapping, resolve: false })
      );
    }

    return entity;
  }

  attributes(
    self: ODataModel<T>,
    {
      changes_only = false,
      include_concurrency = false,
      include_computed = false,
      field_mapping = false,
    }: {
      changes_only?: boolean;
      include_concurrency?: boolean;
      include_computed?: boolean;
      field_mapping?: boolean;
    } = {}
  ): { [name: string]: any } {
    return this.fields().reduce((acc, f) => {
      const isChanged = f.name in self._changes;
      const name = (field_mapping) ? f.field : f.name;
      const value = isChanged ? self._changes[f.name] : self._attributes[f.name];
      if (f.concurrency && include_concurrency) {
        return Object.assign(acc, { [name]: value });
      } else if (f.computed && include_computed) {
        return Object.assign(acc, { [name]: value });
      } else if (changes_only && isChanged) {
        return Object.assign(acc, { [name]: value });
      } else if (!changes_only && !f.concurrency && !f.computed) {
        return Object.assign(acc, { [name]: value });
      } else {
        return acc;
      }
    }, {});
  }

  assign(
    self: ODataModel<T>,
    entity: Partial<T> | { [name: string]: any },
    {
      reset = false,
      silent = false,
    }: { reset?: boolean; silent?: boolean } = {}
  ) {
    self._resetting = reset;
    self._silent = silent;
    if (self._resetting) {
      // Apply current changes and start new tracking
      Object.assign(self._attributes, self._changes);
      self._changes = {} as T;
      Object.values(self._relations).forEach(rel => rel.state = ODataModelState.Unchanged);
    }
    for (let key in entity) {
      const value = (<any>entity)[key];
      const name = self._resetting
        ? this.fields().find((p) => p.field === key)?.name || key
        : key;
      if (value !== null && Types.isObject(value)) {
        const current = (self as any)[name];
        if (
          (!(value instanceof ODataModel) && current instanceof ODataModel) ||
          (!(value instanceof ODataCollection) &&
            current instanceof ODataCollection)
        ) {
          current.assign(value, { reset, silent });
        } else {
          (self as any)[name] = value;
        }
      } else {
        const current = (self as any)[name];
        if (current !== value) (self as any)[name] = value;
      }
    }
    if (!self._silent)
      self.events$.emit({
        name: self._resetting ? 'reset' : 'update',
        model: self,
      });
    self._resetting = false;
    self._silent = false;
  }

  private _get<F>(
    self: ODataModel<T>,
    field: ODataModelField<F>
  ): F | ODataModel<F> | ODataCollection<F, ODataModel<F>> | null | undefined {
    if (field.isStructuredType()) {
      if (self._resetting && !(field.name in self._relations)) {
        const selfResource = self.resource();
        const selfSchema = self.schema();
        const selfAnnots = self.annots();
        const newModel = field.modelCollectionFactory<T, F>({
          reset: self._resetting,
          baseResource: selfResource,
          baseSchema: selfSchema,
          baseAnnots: selfAnnots,
        });
        self._relations[field.name] = {
          state: ODataModelState.Unchanged,
          property: field,
          model: newModel,
          subscription: this._subscribe<F>(self, field, newModel),
        };
      }
      return field.name in self._relations
        ? self._relations[field.name].model
        : undefined;
    }
    const attrs = this.attributes(self, { include_concurrency: true, include_computed: true });
    return attrs[field.name];
  }

  private _set<F>(
    self: ODataModel<T>,
    field: ODataModelField<F>,
    value: F | ODataModel<F> | ODataCollection<F, ODataModel<F>> | null
  ) {
    if (field.isStructuredType()) {
      let newModel = value as
        | ODataModel<F>
        | ODataCollection<F, ODataModel<F>>
        | null;
      const relation = self._relations[field.name];
      if (relation !== undefined && relation.subscription !== null) {
        relation.subscription.unsubscribe();
      }
      const currentModel = relation?.model as
        | ODataModel<any>
        | ODataCollection<any, ODataModel<any>>
        | null;
      if (newModel !== null) {
        const selfResource = self.resource();
        const selfSchema = self.schema();
        const selfAnnots = self.annots();
        if (
          !(
            newModel instanceof ODataModel ||
            newModel instanceof ODataCollection
          )
        ) {
          newModel = field.modelCollectionFactory<T, F>({
            value: value as F,
            reset: self._resetting,
            baseResource: selfResource,
            baseSchema: selfSchema,
            baseAnnots: selfAnnots,
          });
        } else if (
          newModel.resource() === undefined &&
          selfResource !== undefined &&
          selfResource.hasKey()
        ) {
          const resource = field.resourceFactory<T, F>(selfResource);
          const annots = field.annotationsFactory(selfAnnots);
          newModel.resource(resource);
          if (newModel instanceof ODataModel)
            newModel.annots(annots as ODataEntityAnnotations);
          else if (newModel instanceof ODataCollection)
            newModel.annots(annots as ODataEntitiesAnnotations);
        }

        const newModelResource = newModel.resource();
        if (
          newModelResource !== undefined &&
          newModelResource.type() !== field.type
        )
          throw new Error(
            `Can't set ${newModelResource.type()} to ${field.type}`
          );
      }
      self._relations[field.name] = {
        state: self._resetting
          ? ODataModelState.Unchanged
          : ODataModelState.Changed,
        model: newModel,
        property: field,
        subscription: newModel && this._subscribe(self, field, newModel),
      };
      if (!self._silent)
        self.events$.emit({
          name: 'change',
          path: field.name,
          model: self,
          value: newModel,
          previous: currentModel,
        });
    } else {
      const attrs = this.attributes(self, {include_computed: true, include_concurrency: true});
      const currentValue = attrs[field.name];
      if (!Types.isEqual(currentValue, value)) {
        if (self._resetting)
          self._attributes[field.name] = value;
        else if (Types.isEqual(value, self._attributes[field.name]))
          delete self._changes[field.name];
        else self._changes[field.name] = value;
        if (!self._silent)
          self.events$.emit({
            name: 'change',
            path: field.name,
            model: self,
            value,
            previous: currentValue,
          });
      }
    }
  }

  private _subscribe<F>(
    self: ODataModel<T>,
    field: ODataModelField<F>,
    value: ODataModel<F> | ODataCollection<F, ODataModel<F>>
  ) {
    const mr = self.resource();
    const vr = value.resource();
    const bubbling = mr === undefined || vr === undefined || !vr.isParentOf(mr);
    return value.events$.subscribe((event: ODataModelEvent<any>) => {
      if (bubbling && BUBBLING.indexOf(event.name) !== -1) {
        let path = field.name;
        if (value instanceof ODataModel && event.path)
          path = `${path}.${event.path}`;
        else if (value instanceof ODataCollection && event.path) {
          path = `${path}${event.path}`;
        }
        self.events$.emit({ ...event, path });
      }
    });
  }
}
