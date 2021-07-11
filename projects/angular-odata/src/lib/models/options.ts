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
  EntityKey,
  ODataResource,
  ODataSingletonResource,
  OptionHandler,
  QueryArguments,
  Select,
} from '../resources';
import { ODataEntitySet, ODataStructuredType } from '../schema';
import { OptionsHelper } from '../types';
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

export const INCLUDE_ALL = {
  include_navigation: true,
  include_concurrency: true,
  include_computed: true,
  include_key: true,
  include_non_field: true,
};

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
  modelOptions: ODataModelOptions<any>;
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
  optionsHelper?: OptionsHelper;
  constructor(
    modelOptions: ODataModelOptions<any>,
    { name, field, parser, ...options }: ODataModelFieldOptions<F>
  ) {
    this.modelOptions = modelOptions;
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
    this.optionsHelper = options;
  }

  isKey() {
    return this.parser.isKey();
  }

  hasReferentials() {
    return this.parser.hasReferentials();
  }

  get referentials() {
    return this.parser.referentials;
  }

  isStructuredType() {
    return this.parser.isStructuredType();
  }

  validate(
    value: any,
    {
      method,
      navigation = false,
    }: {
      method?: 'create' | 'update' | 'patch';
      navigation?: boolean;
    } = {}
  ) {
    if (value instanceof ODataModel) {
      return !value.isValid({ method, navigation }) ? value._errors : undefined;
    } else if (value instanceof ODataCollection) {
      return value.models().some((m) => !m.valid({ method, navigation }))
        ? value.models().map((m) => m.errors)
        : undefined;
    } else {
      let errors = this.parser?.validate(value, { method, navigation }) || [];
      if (
        this.options.required &&
        (value === null || (value === undefined && method !== 'patch')) // Is null or undefined without patch?
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
  encode(value: any): any {
    return this.parser.encode(value, this.optionsHelper);
  }
  resourceFactory<T, F>(
    resource: ODataModelResource<T>
  ): ODataNavigationPropertyResource<F> | ODataPropertyResource<F> {
    if (
      !(
        resource instanceof ODataEntityResource ||
        resource instanceof ODataNavigationPropertyResource ||
        resource instanceof ODataPropertyResource
      )
    )
      throw new Error("Can't build resource for non compatible base type");
    return this.navigation
      ? resource.navigationProperty<F>(this.parser.name)
      : resource.property<F>(this.parser.name);
  }

  annotationsFactory(
    annots: ODataEntityAnnotations
  ): ODataEntityAnnotations | ODataEntitiesAnnotations {
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
    parent,
    value,
    reset,
  }: {
    parent: ODataModel<any>;
    value?: F | F[] | { [name: string]: any } | { [name: string]: any }[];
    reset?: boolean;
  }): ODataModel<F> | ODataCollection<F, ODataModel<F>> {
    const schema = this.schemaFactory<T, F>(parent.schema());
    const annots = this.annotationsFactory(parent.annots());

    const Model = schema?.model || ODataModel;
    const Collection = schema?.collection || ODataCollection;
    return this.parser.collection
      ? (new Collection((value || []) as (F | { [name: string]: any })[], {
          annots: annots as ODataEntitiesAnnotations,
          parent: [parent, this],
          reset,
        }) as ODataCollection<F, ODataModel<F>>)
      : (new Model((value || {}) as F | { [name: string]: any }, {
          annots: annots as ODataEntityAnnotations,
          parent: [parent, this],
          reset,
        }) as ODataModel<F>);
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
      return new ODataModelField<T>(this, { name, field, parser, ...opts });
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

  field(name: string) {
    return this.fields({
      include_parents: true,
      include_navigation: true,
    }).find((f) => f.name === name);
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

    const current = self._resource;
    if (current === undefined || !current.isEqualTo(resource)) {
      if (resource instanceof ODataEntityResource) {
        self._parent = null;
      }
      self._resource = resource;
      self.events$.emit({
        name: 'attach',
        model: self,
        previous: current,
        value: resource,
      });
    }
  }

  //# region Resource
  static resource<T>(model: ODataModel<T> | ODataCollection<T, ODataModel<T>>) {
    const path = [] as any[];
    let tuple:
      | [
          ODataModel<any> | ODataCollection<any, ODataModel<any>>,
          ODataModelField<any> | null
        ]
      | null = [model, null];
    while (tuple !== null) {
      path.splice(0, 0, tuple);
      tuple = tuple[0]._parent;
    }
    let resource:
      | ODataModelResource<any>
      | ODataCollectionResource<any>
      | undefined = undefined;
    for (let [model, field] of path) {
      resource = resource || model._resource;
      if (model instanceof ODataModel) {
        let key = (model as ODataModel<any>).key({
          field_mapping: true,
        }) as EntityKey<any>;
        if (key !== undefined)
          resource = (resource as ODataModelResource<any>).key(key);
      }
      if (field === null) continue;
      if (resource === undefined) break;
      resource = (field as ODataModelField<any>).resourceFactory<any, any>(
        resource as ODataModelResource<any>
      );
    }
    return resource;
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

  entityResource(self: ODataModel<T>): ODataModelResource<T> {
    let resource = self._resource?.clone();
    resource = this.modelResourceFactory({
      baseResource: resource,
      fromSet: true,
    });
    const key = self.key({ field_mapping: true }) as EntityKey<T>;
    if (resource !== undefined && key !== undefined) return resource.key(key);
    return resource as ODataModelResource<T>;
  }
  //#endregion

  bind(
    self: ODataModel<T>,
    {
      parent,
      resource,
      annots,
    }: {
      parent?: [ODataModel<any>, ODataModelField<any>];
      resource?: ODataModelResource<T>;
      annots?: ODataEntityAnnotations;
    } = {}
  ) {
    // Parent
    if (parent !== undefined) {
      self._parent = parent;
    } else {
      // Resource
      resource = resource || this.modelResourceFactory({ fromSet: true });
      if (resource !== undefined) this.attach(self, resource);
    }

    // Annotations
    self._annotations = annots || new ODataEntityAnnotations();

    const fields = this.fields({
      include_navigation: true,
      include_parents: true,
    });
    for (let field of fields) {
      Object.defineProperty(self, field.name, {
        configurable: true,
        get: () => this._get(self, field as ODataModelField<any>),
        set: (value: any) =>
          this._set(self, field as ODataModelField<any>, value),
      });
    }
  }

  query(
    self: ODataModel<T>,
    resource: ODataModelResource<T>,
    func: (q: {
      select(opts?: Select<T>): OptionHandler<Select<T>>;
      expand(opts?: Expand<T>): OptionHandler<Expand<T>>;
      format(opts?: string): OptionHandler<string>;
      apply(query: QueryArguments<T>): void;
    }) => void
  ) {
    func(resource.query);
    this.attach(self, resource);
  }

  resolveKey(
    value: any,
    {
      field_mapping = false,
      resolve = true,
    }: { field_mapping?: boolean; resolve?: boolean } = {}
  ): EntityKey<T> | { [name: string]: any } | undefined {
    const keyTypes = this.schema.keys({ include_parents: true });
    const key: any = {};
    for (var kt of keyTypes) {
      let v = value as any;
      let options = this as ODataModelOptions<any>;
      let prop: ODataModelField<any> | undefined;
      for (let name of kt.name.split('/')) {
        if (options === undefined) break;
        prop = options
          .fields({ include_parents: true })
          .find((p: any) => p.field === name);
        if (prop !== undefined) {
          v = Types.isObject(v) || v instanceof ODataModel ? v[prop.name] : v;
          options = prop.meta as ODataModelOptions<any>;
        }
      }
      if (prop === undefined) return undefined;
      let name = field_mapping ? prop.field : prop.name;
      if (kt.alias !== undefined) name = kt.alias;
      key[name] = v;
    }
    if (Types.isEmpty(key)) return undefined;
    return resolve ? Objects.resolveKey(key) : key;
  }

  resolveReferential(
    self: ODataModel<T> | T | { [name: string]: any },
    field: ODataModelField<any>,
    {
      field_mapping = false,
      resolve = true,
    }: { field_mapping?: boolean; resolve?: boolean } = {}
  ): { [name: string]: any } | undefined {
    const referential: any = {};
    for (var ref of field.referentials) {
      let from = this.fields({ include_parents: true }).find(
        (p: any) => p.field === ref.referencedProperty
      );
      let to = field.modelOptions
        .fields({ include_parents: true })
        .find((p: any) => p.field === ref.property);
      if (from !== undefined && to !== undefined) {
        let name = field_mapping ? to.field : to.name;
        referential[name] = (self as any)[from.name];
      }
    }
    if (Types.isEmpty(referential)) return undefined;
    return resolve
      ? Objects.resolveKey(referential, { single: false })
      : referential;
  }

  resolveReferenced(
    self: ODataModel<T> | T | { [name: string]: any },
    field: ODataModelField<any>,
    {
      field_mapping = false,
      resolve = true,
    }: { field_mapping?: boolean; resolve?: boolean } = {}
  ): { [name: string]: any } | undefined {
    const referenced: any = {};
    for (var ref of field.referentials) {
      let from = this.fields({ include_parents: true }).find(
        (p: any) => p.field === ref.property
      );
      let to = field.modelOptions
        .fields({ include_parents: true })
        .find((p: any) => p.field === ref.referencedProperty);
      if (from !== undefined && to !== undefined) {
        let name = field_mapping ? to.field : to.name;
        referenced[name] = (self as any)[from.name];
      }
    }
    if (Types.isEmpty(referenced)) return undefined;
    return resolve
      ? Objects.resolveKey(referenced, { single: false })
      : referenced;
  }

  validate(
    self: ODataModel<T>,
    {
      method,
      navigation = false,
    }: {
      method?: 'create' | 'update' | 'patch';
      navigation?: boolean;
    } = {}
  ): { [name: string]: string[] } | undefined {
    let errors = this.fields({
      include_parents: true,
      include_navigation: navigation,
    }).reduce((acc, prop) => {
      let value = (self as any)[prop.name];
      let errs = prop.validate(value, { method });
      return errs !== undefined
        ? Object.assign(acc, { [prop.name]: errs })
        : acc;
    }, {});
    return !Types.isEmpty(errors) ? errors : undefined;
  }

  hasChanged(
    self: ODataModel<T>,
    { include_navigation = false }: { include_navigation?: boolean } = {}
  ): boolean {
    return (
      !Types.isEmpty(self._changes) ||
      Object.values(self._relations)
        .filter(({ property }) => !property.navigation || include_navigation)
        .some(
          ({ property, state, model }) =>
            (!include_navigation || property.navigation) &&
            (state === ODataModelState.Changed ||
              (model !== null && model.hasChanged({ include_navigation })))
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
    } = {}
  ): T | { [name: string]: any } {
    let attrs = self.attributes({
      changes_only,
      field_mapping,
      include_concurrency,
      include_computed,
      include_non_field,
    });

    let relations = Object.entries(self._relations)
      .filter(
        ([, { model, state }]) =>
          !changes_only ||
          (changes_only &&
            (state === ODataModelState.Changed ||
              (model !== null && model.hasChanged({ include_navigation }))))
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
        if (this.isModel(model)) {
          return [
            k,
            (model as ODataModel<any>).toEntity({
              client_id,
              include_navigation,
              include_concurrency,
              include_non_field,
              field_mapping,
              changes_only: changesOnly,
              include_key: includeKey,
            }),
          ];
        } else if (this.isCollection(model)) {
          return [
            k,
            (model as ODataCollection<any, ODataModel<any>>).toEntities({
              client_id,
              include_navigation,
              include_concurrency,
              include_non_field,
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
      include_non_field = false,
      field_mapping = false,
    }: {
      changes_only?: boolean;
      include_concurrency?: boolean;
      include_computed?: boolean;
      include_non_field?: boolean;
      field_mapping?: boolean;
    } = {}
  ): { [name: string]: any } {
    // Attributes by fields (attributes for the model type)
    const fieldAttrs = this.fields().reduce((acc, f) => {
      const isChanged = f.name in self._changes;
      const name = field_mapping ? f.field : f.name;
      const value = isChanged
        ? self._changes[f.name]
        : self._attributes[f.name];
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
    if (!include_non_field) return fieldAttrs;
    const names = Object.keys(fieldAttrs);
    // Attributes from object (attributes for object)
    const nonFieldAttrs = Object.entries(self)
      .filter(
        ([k]) =>
          names.indexOf(k) === -1 && !k.startsWith('_') && !k.endsWith('$')
      )
      .reduce((acc, [k, v]) => Object.assign(acc, { [k]: v }), {});
    return { ...fieldAttrs, ...nonFieldAttrs };
  }

  reset(
    self: ODataModel<T>,
    { name, silent = false }: { name?: string; silent?: boolean } = {}
  ) {
    if (!Types.isEmpty(name) && (name as string) in self._changes) {
      const value = self._attributes[name as string];
      const previous = self._changes[name as string];
      delete self._changes[name as string];
      if (!silent) {
        self.events$.emit({
          name: 'change',
          path: name as string,
          model: self,
          value,
          previous,
        });
      }
    } else if (Types.isEmpty(name)) {
      const entries = Object.entries(self._changes);
      self._changes = {};
      if (!silent) {
        entries.forEach((e) => {
          self.events$.emit({
            name: 'change',
            path: e[0],
            model: self,
            value: self._attributes[e[0]],
            previous: e[1],
          });
        });
      }
    }
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

    const changes: string[] = [];

    // Apply entity
    const model = self as any;
    Object.entries(entity).forEach(([key, value]) => {
      const field = this.fields({
        include_parents: true,
        include_navigation: true,
      }).find((p) => (self._resetting && p.field === key) || p.name === key);
      const name = field?.name || key;

      value = this.isModel(value)
        ? (value as ODataModel<any>).toEntity(INCLUDE_ALL)
        : this.isCollection(value)
        ? (value as ODataCollection<any, ODataModel<any>>).toEntities(
            INCLUDE_ALL
          )
        : value;
      const current = model[name];
      if (this.isCollection(current) && Types.isArray(value)) {
        current._annotations = field?.annotationsFactory(self.annots());
        current.assign(value, { reset: self._resetting, silent: self._silent });
        if (current.hasChanged()) changes.push(name);
      } else if (this.isModel(current) && Types.isObject(value)) {
        current._annotations = field?.annotationsFactory(self.annots());
        current.assign(value, { reset: self._resetting, silent: self._silent });
        if (current.hasChanged()) changes.push(name);
      } else {
        model[name] = value;
        if (!Types.isEqual(current, value)) changes.push(name);
      }
    });

    if (!self._silent && changes.length > 0) {
      self.events$.emit({
        name: self._resetting ? 'reset' : 'update',
        model: self,
        options: { changes },
      });
    }
    self._resetting = false;
    self._silent = false;
  }

  isModel(obj: any) {
    return obj instanceof ODataModel;
  }

  isCollection(obj: any) {
    return obj instanceof ODataCollection;
  }

  private _get<F>(
    self: ODataModel<T>,
    field: ODataModelField<F>
  ): F | ODataModel<F> | ODataCollection<F, ODataModel<F>> | null | undefined {
    if (field.isStructuredType()) {
      return self._relations[field.name]?.model;
    } else {
      return this.attributes(self, {
        include_concurrency: true,
        include_computed: true,
      })[field.name];
    }
  }

  private _set<F>(
    self: ODataModel<T>,
    field: ODataModelField<F>,
    value:
      | F
      | F[]
      | { [name: string]: any }
      | ODataModel<F>
      | ODataCollection<F, ODataModel<F>>
      | null
  ) {
    if (field.isStructuredType()) {
      if (!(field.name in self._relations)) {
        self._relations[field.name] = {
          state: ODataModelState.Unchanged,
          model: null,
          property: field,
          subscription: null,
        };
      }
      const relation = self._relations[field.name];
      const data = (
        this.isModel(value)
          ? (value as ODataModel<F>).toEntity(INCLUDE_ALL)
          : this.isCollection(value)
          ? (value as ODataCollection<F, ODataModel<F>>).toEntities(INCLUDE_ALL)
          : value
      ) as F | F[] | null;
      if (data === null && relation.subscription !== null) {
        relation.subscription.unsubscribe();
        relation.subscription = null;
      }
      const currentModel = relation.model as
        | ODataModel<any>
        | ODataCollection<any, ODataModel<any>>
        | null;
      if (data !== null) {
        if (this.isCollection(currentModel) && Types.isArray(data)) {
          // Current is collection
          (currentModel as ODataCollection<F, ODataModel<F>>)._annotations =
            field.annotationsFactory(self.annots()) as ODataEntitiesAnnotations;
          (currentModel as ODataCollection<F, ODataModel<F>>).assign(
            data as F[],
            { reset: self._resetting, silent: self._silent }
          );
          if ((currentModel as ODataCollection<F, ODataModel<F>>).hasChanged())
            relation.state = self._resetting
              ? ODataModelState.Unchanged
              : ODataModelState.Changed;
        } else if (this.isModel(currentModel) && Types.isObject(data)) {
          // Current is model
          (currentModel as ODataModel<F>)._annotations =
            field.annotationsFactory(self.annots()) as ODataEntityAnnotations;
          (currentModel as ODataModel<F>).assign(data as F, {
            reset: self._resetting,
            silent: self._silent,
          });
          if ((currentModel as ODataModel<F>).hasChanged())
            relation.state = self._resetting
              ? ODataModelState.Unchanged
              : ODataModelState.Changed;
        } else if (
          currentModel === null &&
          (Types.isArray(data) || Types.isObject(data))
        ) {
          relation.model = field.modelCollectionFactory<T, F>({
            parent: self,
            value: data,
            reset: self._resetting,
          });
          relation.state = self._resetting
            ? ODataModelState.Unchanged
            : ODataModelState.Changed;
          relation.subscription = this._subscribe(
            self,
            field,
            relation.model as ODataModel<F> | ODataCollection<F, ODataModel<F>>
          );
          if (this.isModel(relation.model)) {
            var ref = (relation.model as ODataModel<F>).referential(field);
            if (ref !== undefined) {
              Object.assign(self, ref);
            }
          }
        }
      }
      if (
        !self._silent &&
        relation.model !== currentModel &&
        (relation.model === null || currentModel === null)
      ) {
        self.events$.emit({
          name: 'change',
          path: field.name,
          model: self,
          value: relation.model,
          previous: currentModel,
        });
      }
    } else {
      const attrs = this.attributes(self, {
        include_concurrency: true,
        include_computed: true,
      });
      const currentValue = attrs[field.name];
      const equal = Types.isEqual(currentValue, value);
      if (self._resetting) {
        delete self._changes[field.name];
        self._attributes[field.name] = value;
      } else if (Types.isEqual(value, self._attributes[field.name])) {
        delete self._changes[field.name];
      } else if (!equal) {
        self._changes[field.name] = value;
      }
      if (!equal) {
        if (!self._silent)
          self.events$.emit({
            name: 'change',
            path: field.name,
            model: self,
            value,
            previous: currentValue,
            options: { key: field.isKey() },
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
        if (event.model === value) {
          if (
            event.name === 'change' &&
            field.navigation &&
            event.options?.key
          ) {
            var ref = value.referential(field);
            if (ref !== undefined) {
              Object.assign(self, ref);
            }
          }
        }

        let path = field.name;
        if (this.isModel(value) && event.path) path = `${path}.${event.path}`;
        else if (this.isCollection(value) && event.path) {
          path = `${path}${event.path}`;
        }
        self.events$.emit({ ...event, path });
      }
    });
  }
}
