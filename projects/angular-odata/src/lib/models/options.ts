import { Observable, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  CID_FIELD_NAME,
  COMPUTED,
  DEFAULT_VERSION,
  OPTIMISTIC_CONCURRENCY,
} from '../constants';
import { ODataHelper } from '../helper';
import {
  EntityKey,
  ODataEntitiesAnnotations,
  ODataEntityAnnotations,
  ODataEntityResource,
  ODataEntitySetResource,
  ODataNavigationPropertyResource,
  ODataPropertyResource,
  ODataQueryOptions,
  ODataQueryOptionsHandler,
  ODataResource,
  ODataSingletonResource,
} from '../resources';
import {
  ODataEntitySet,
  ODataStructuredType,
  ODataStructuredTypeFieldParser,
} from '../schema';
import { Parser, ParserOptions } from '../types';
import { Objects, Types } from '../utils';
import type { ODataCollection } from './collection';
import type { ODataModel } from './model';

export type ODataModelEventType =
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
export class ODataModelEvent<T> {
  name: ODataModelEventType;
  value?: any;
  previous?: any;
  options?: any;

  constructor(
    name: ODataModelEventType,
    {
      model,
      collection,
      previous,
      value,
      field,
      options,
    }: {
      model?: ODataModel<T>;
      collection?: ODataCollection<T, ODataModel<T>>;
      field?: ODataModelField<any> | number;
      previous?: any;
      value?: any;
      options?: any;
    } = {}
  ) {
    this.name = name;
    this.model = model;
    this.collection = collection;
    this.previous = previous;
    this.value = value;
    this.options = options;
    this.chain = [
      [
        (this.collection || this.model) as
          | ODataModel<any>
          | ODataCollection<any, ODataModel<any>>,
        field || null,
      ],
    ];
  }

  bubbling: boolean = true;
  stopPropagation() {
    this.bubbling = false;
  }

  chain: [
    ODataModel<any> | ODataCollection<any, ODataModel<any>>,
    ODataModelField<any> | number | null
  ][];

  push(
    model: ODataModel<any> | ODataCollection<any, ODataModel<any>>,
    field: ODataModelField<any> | number
  ) {
    let event = new ODataModelEvent(this.name, {
      model: this.model,
      collection: this.collection,
      previous: this.previous,
      value: this.value,
      options: this.options,
    });
    event.chain = [...this.chain];
    event.chain.splice(0, 0, [model, field]);
    return event;
  }

  visited(model: ODataModel<any> | ODataCollection<any, ODataModel<any>>) {
    return (
      this.chain.some((c) => c[0] === model) &&
      this.chain[this.chain.length - 1][0] !== model
    );
  }

  get path() {
    return this.chain
      .map(([, field], index) =>
        typeof field === 'number'
          ? `[${field}]`
          : field instanceof ODataModelField
          ? index === 0
            ? field.name
            : `.${field.name}`
          : ''
      )
      .join('');
  }

  //Reference to the model which the event was dispatched
  model?: ODataModel<T>;
  //Identifies the current model for the event
  get currentModel(): ODataModel<any> | undefined {
    const link = this.chain.find((c) => ODataModelOptions.isModel(c[0]));
    return link !== undefined ? (link[0] as ODataModel<any>) : undefined;
  }

  //Reference to the collection which the event was dispatched
  collection?: ODataCollection<T, ODataModel<T>>;
  //Identifies the current collection for the event
  get currentCollection(): ODataCollection<any, ODataModel<any>> | undefined {
    const link = this.chain.find((c) => ODataModelOptions.isCollection(c[0]));
    return link !== undefined
      ? (link[0] as ODataCollection<any, ODataModel<any>>)
      : undefined;
  }
}

export const BUBBLING = [
  'change',
  'reset',
  'update',
  'destroy',
  'add',
  'remove',
];

export const INCLUDE_SHALLOW = {
  include_concurrency: true,
  include_computed: true,
  include_key: true,
};

export const INCLUDE_DEEP = {
  include_navigation: true,
  include_non_field: true,
  ...INCLUDE_SHALLOW,
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

export function Model({ cid = CID_FIELD_NAME }: { cid?: string } = {}) {
  return <T extends { new (...args: any[]): {} }>(constructor: T) => {
    const Klass = <any>constructor;
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
  return (target: any, key: string): void => {
    const Klass = target.constructor;
    if (!Klass.hasOwnProperty('options'))
      Klass.options = { fields: {} } as ModelOptions;
    options.field = name || key;
    Klass.options.fields[key] = options;
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
  options: ODataModelOptions<any>;
  meta?: ODataModelOptions<any>;
  default?: any;
  required: boolean;
  concurrency: boolean;
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  parserOptions?: ParserOptions;

  constructor(
    options: ODataModelOptions<any>,
    { name, field, parser, ...opts }: ODataModelFieldOptions<F>
  ) {
    this.options = options;
    this.name = name;
    this.field = field;
    this.parser = parser;
    this.default = opts.default || parser.default;
    this.required = Boolean(opts.required || !parser.nullable);
    this.concurrency = Boolean(opts.concurrency);
    this.maxLength = opts.maxLength || parser.maxLength;
    this.minLength = opts.minLength;
    this.min = opts.min;
    this.max = opts.max;
    this.pattern = opts.pattern;
  }

  get api() {
    return this.options.api;
  }

  get type() {
    return this.parser.type;
  }

  get navigation() {
    return Boolean(this.parser.navigation);
  }

  get collection() {
    return Boolean(this.parser.collection);
  }

  annotatedValue<T>(term: string | RegExp) {
    return this.parser.annotatedValue<T>(term);
  }

  configure({
    findOptionsForType,
    concurrency,
    options,
  }: {
    findOptionsForType: (type: string) => ODataModelOptions<any> | undefined;
    concurrency: boolean;
    options: ParserOptions;
  }) {
    this.meta = findOptionsForType(this.parser.type);
    this.parserOptions = options;
    if (concurrency) this.concurrency = concurrency;
    if (this.default !== undefined)
      this.default = this.deserialize(this.default, options);
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

  structured() {
    let structuredType = this.api.findStructuredTypeForType<F>(
      this.parser.type
    );
    //Throw error if not found
    if (!structuredType)
      throw new Error(`Could not find structured type for ${this.parser.type}`);
    return structuredType;
  }

  isEnumType() {
    return this.parser.isEnumType();
  }

  enum() {
    let enumType = this.api.findEnumTypeForType<F>(this.parser.type);
    //Throw error if not found
    if (!enumType)
      throw new Error(`Could not find enum type for ${this.parser.type}`);
    return enumType;
  }

  validate(
    value: any,
    {
      method,
      navigation = false,
    }: {
      method?: 'create' | 'update' | 'modify';
      navigation?: boolean;
    } = {}
  ) {
    /*
    if ('isValid' in value && typeof value.isValid === 'function') {
      return !value.isValid({ method, navigation }) ? value._errors : undefined;
    } else if ('models' in value && typeof value.models === 'function') {
      */
    if (ODataModelOptions.isModel(value)) {
      return !value.isValid({ method, navigation }) ? value._errors : undefined;
    } else if (ODataModelOptions.isCollection(value)) {
      return value
        .models()
        .some((m: ODataModel<any>) => !m.isValid({ method, navigation }))
        ? value.models().map((m: ODataModel<any>) => m._errors)
        : undefined;
    } else {
      const computed = this.annotatedValue<boolean>(COMPUTED);
      let errors = this.parser?.validate(value, { method, navigation }) || [];
      if (
        this.required &&
        (value === null || (value === undefined && method !== 'modify')) && // Is null or undefined without patch?
        !(computed && method === 'create') // Not (Is Computed field and create) ?
      ) {
        errors['push'](`required`);
      }
      if (
        this.maxLength !== undefined &&
        typeof value === 'string' &&
        value.length > this.maxLength
      ) {
        errors['push'](`maxlength`);
      }
      if (
        this.minLength !== undefined &&
        typeof value === 'string' &&
        value.length < this.minLength
      ) {
        errors['push'](`minlength`);
      }
      if (
        this.min !== undefined &&
        typeof value === 'number' &&
        value < this.min
      ) {
        errors['push'](`min`);
      }
      if (
        this.max !== undefined &&
        typeof value === 'number' &&
        value > this.max
      ) {
        errors['push'](`max`);
      }
      if (
        this.pattern !== undefined &&
        typeof value === 'string' &&
        !this.pattern.test(value)
      ) {
        errors['push'](`pattern`);
      }
      return !Types.isEmpty(errors) ? errors : undefined;
    }
  }

  defaults(): any {
    return this.isStructuredType() && this.meta !== undefined
      ? this.meta.defaults()
      : this.default;
  }

  deserialize(value: any, options?: ParserOptions): F {
    const parserOptions = options || this.parserOptions;
    return this.parser.deserialize(value, parserOptions);
  }

  serialize(value: F, options?: ParserOptions): any {
    const parserOptions = options || this.parserOptions;
    return this.parser.serialize(value, parserOptions);
  }

  encode(value: F, options?: ParserOptions): any {
    const parserOptions = options || this.parserOptions;
    return this.parser.encode(value, parserOptions);
  }

  resourceFactory<T, F>(
    base: ODataResource<T>
  ): ODataNavigationPropertyResource<F> | ODataPropertyResource<F> {
    if (
      !(
        base instanceof ODataEntityResource ||
        base instanceof ODataNavigationPropertyResource ||
        base instanceof ODataPropertyResource
      )
    )
      throw new Error("Can't build resource for non compatible base type");
    return this.navigation
      ? (base as ODataEntityResource<T>).navigationProperty<F>(this.parser.name)
      : (base as ODataEntityResource<T>).property<F>(this.parser.name);
  }

  annotationsFactory<T, F>(
    base: ODataEntityAnnotations<T>
  ): ODataEntityAnnotations<F> | ODataEntitiesAnnotations<F> {
    return this.parser.collection
      ? base.property(this.parser.name as keyof T, 'collection')
      : base.property(this.parser.name as keyof T, 'single');
  }

  schemaFactory<T, F>(
    base: ODataStructuredType<T>
  ): ODataStructuredType<F> | undefined {
    return this.api.findStructuredTypeForType(this.parser.type);
  }

  modelFactory<F>({
    parent,
    value,
    reset,
  }: {
    parent: ODataModel<any>;
    value?: Partial<F> | { [name: string]: any };
    reset?: boolean;
  }): ODataModel<F> {
    // Model
    const annots = this.annotationsFactory(
      parent.annots()
    ) as ODataEntityAnnotations<F>;
    let Model = this.api.modelForType(this.parser.type);
    if (Model === undefined) throw Error(`No Model type for ${this.name}`);
    if (value !== undefined) {
      annots.update(value);
    }

    if (annots?.type !== undefined && Model.meta !== null) {
      let schema = Model.meta.findChildOptions((o) =>
        o.isTypeOf(annots.type as string)
      )?.schema;
      if (schema !== undefined && schema.model !== undefined)
        // Change to child model
        Model = schema.model;
    }

    return new Model((value || {}) as Partial<F> | { [name: string]: any }, {
      annots,
      reset,
      parent: [parent, this],
    });
  }

  collectionFactory<F>({
    parent,
    value,
    reset,
  }: {
    parent: ODataModel<any>;
    value?: Partial<F>[] | { [name: string]: any }[];
    reset?: boolean;
  }): ODataCollection<F, ODataModel<F>> {
    // Collection Factory
    const annots = this.annotationsFactory(
      parent.annots()
    ) as ODataEntitiesAnnotations<F>;
    const Collection = this.api.collectionForType(this.parser.type);
    if (Collection === undefined)
      throw Error(`No Collection type for ${this.name}`);
    return new Collection(
      (value || []) as Partial<F>[] | { [name: string]: any }[],
      {
        annots: annots,
        parent: [parent, this],
        reset,
      }
    );
  }
}

export type ODataModelRelation<T> = {
  state: ODataModelState;
  model?: ODataModel<T> | ODataCollection<T, ODataModel<T>> | null;
  field: ODataModelField<T>;
  subscription?: Subscription;
};

export type ODataModelEntry<T, M extends ODataModel<T>> = {
  state: ODataModelState;
  model: M;
  key?: EntityKey<T> | { [name: string]: any };
  subscription?: Subscription;
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

  constructor({
    options,
    schema,
  }: {
    options: ModelOptions;
    schema: ODataStructuredType<T>;
  }) {
    this.name = schema.name;
    this.base = schema.base;
    this.open = schema.open;
    this.schema = schema;
    this.cid = options?.cid || CID_FIELD_NAME;
    this._fields = Object.entries(options.fields).map(([name, options]) => {
      const { field, ...opts } = options;
      if (field === undefined || name === undefined)
        throw new Error('Model Properties need name and field');
      const parser = this.schema.field<T>(field as keyof T);
      if (parser === undefined)
        throw new Error(`No parser for ${field} with name = ${name}`);
      return new ODataModelField<T>(this, { name, field, parser, ...opts });
    });
  }

  get api() {
    return this.schema.api;
  }

  type({ alias = false }: { alias?: boolean } = {}) {
    return this.schema.type({ alias });
  }

  isTypeOf(type: string) {
    return this.schema.isTypeOf(type);
  }

  isModelFor(entity: T | { [name: string]: any }) {
    // Resolve By Type
    let type = this.api.options.helper.type(entity as { [name: string]: any });
    if (type && this.isTypeOf(type)) return true;
    // Resolve By fields
    let keys = Object.keys(entity as { [name: string]: any });
    let names = this.fields({
      include_navigation: true,
      include_parents: true,
    }).map((f) => f.name);
    return keys.every((key) => names.includes(key));
  }

  findChildOptions(
    predicate: (options: ODataModelOptions<any>) => boolean
  ): ODataModelOptions<any> | undefined {
    if (predicate(this)) return this;
    let match: ODataModelOptions<any> | undefined;
    for (let ch of this.children) {
      match = ch.findChildOptions(predicate);
      if (match !== undefined) break;
    }
    return match;
  }

  configure({
    options,
    parserForType,
    findOptionsForType,
  }: {
    options: ParserOptions;
    parserForType: (type: string) => Parser<any>;
    findOptionsForType: (type: string) => ODataModelOptions<any> | undefined;
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
        this.entitySet.annotatedValue<string[]>(OPTIMISTIC_CONCURRENCY) || [];
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
    include_navigation,
    include_parents,
  }: {
    include_parents: boolean;
    include_navigation: boolean;
  }): ODataModelField<any>[] {
    return [
      ...(include_parents && this.parent !== undefined
        ? this.parent.fields({ include_navigation, include_parents })
        : []),
      ...this._fields.filter(
        (field) => include_navigation || !field.navigation
      ),
    ];
  }

  field<F>(name: keyof T | string) {
    let field = this.fields({
      include_parents: true,
      include_navigation: true,
    }).find(
      (modelField: ODataModelField<F>) =>
        modelField.name === name || modelField.field === name
    );
    //Throw error if not found
    if (field === undefined)
      throw new Error(`No field with name ${name as string}`);
    return field as ODataModelField<F>;
  }

  attach(
    self: ODataModel<T>,
    resource:
      | ODataEntityResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>
      | ODataSingletonResource<T>
  ) {
    if (
      self._resource !== null &&
      resource.type() !== self._resource.type() &&
      !self._resource.isSubtypeOf(resource)
    )
      throw new Error(
        `Can't attach ${resource.type()} to ${self._resource.type()}`
      );

    const current = self._resource;
    if (current === null || !current.isEqualTo(resource)) {
      self._resource = resource;
      self.events$.emit(
        new ODataModelEvent('attach', {
          model: self,
          previous: current,
          value: resource,
        })
      );
    }
  }

  //# region Resource
  static chain(
    child: ODataModel<any> | ODataCollection<any, ODataModel<any>>
  ): [
    ODataModel<any> | ODataCollection<any, ODataModel<any>>,
    ODataModelField<any> | null
  ][] {
    const chain = [] as any[];
    let tuple:
      | [
          ODataModel<any> | ODataCollection<any, ODataModel<any>>,
          ODataModelField<any> | null
        ]
      | null = [child, null];
    while (tuple !== null) {
      const parent = tuple as [
        ODataModel<any> | ODataCollection<any, ODataModel<any>>,
        ODataModelField<any> | null
      ];
      if (chain.some((p) => p[0] === parent[0])) break;
      chain.splice(0, 0, parent);
      tuple = tuple[0]._parent;
    }
    return chain;
  }

  static resource<T>(
    child: ODataModel<T> | ODataCollection<T, ODataModel<T>>
  ): ODataResource<T> {
    let resource: ODataResource<any> | null = null;
    let prevField: ODataModelField<any> | null = null;
    for (let [model, field] of ODataModelOptions.chain(child)) {
      resource = resource || (model._resource as ODataResource<T>);
      if (resource === null) break;
      if (
        ODataModelOptions.isModel(model) &&
        (prevField === null || prevField.collection)
      ) {
        // Resolve key
        let modelKey = (model as ODataModel<any>).key({
          field_mapping: true,
        }) as EntityKey<any>;
        if (modelKey !== undefined)
          resource =
            resource instanceof ODataEntitySetResource
              ? resource.entity(modelKey)
              : (resource as ODataEntityResource<T>).key(modelKey);
      }
      prevField = field;
      if (field === null) {
        // Apply the query from model to new resource
        const query = model._resource?.cloneQuery<T>().toQueryArguments();
        if (query !== undefined) resource.query((q) => q.apply(query));
        continue;
      }
      resource = field.resourceFactory<any, any>(resource);
    }
    if (resource === null)
      throw new Error(`resource: Can't build resource for ${child}`);
    return resource;
  }

  collectionResourceFactory(
    query?: ODataQueryOptions<T>
  ):
    | ODataEntitySetResource<T>
    | ODataNavigationPropertyResource<T>
    | ODataPropertyResource<T>
    | undefined {
    if (this.entitySet === undefined) return undefined;
    return ODataEntitySetResource.factory<T>(this.api, {
      path: this.entitySet.name,
      schema: this.schema,
      query,
    });
  }

  modelResourceFactory(
    query?: ODataQueryOptions<T>
  ):
    | ODataEntityResource<T>
    | ODataNavigationPropertyResource<T>
    | ODataPropertyResource<T>
    | ODataSingletonResource<T>
    | undefined {
    const resource = this.collectionResourceFactory(query);
    if (resource instanceof ODataEntitySetResource) return resource.entity();
    return resource as
      | ODataEntityResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>
      | ODataSingletonResource<T>
      | undefined;
  }

  entityResource(self: ODataModel<T>): ODataResource<T> {
    let resource = this.modelResourceFactory(
      self._resource !== null ? self._resource.cloneQuery() : undefined
    );
    if (resource === undefined)
      throw new Error(`entityResource: Can't build resource for ${self}`);
    const key = self.key({ field_mapping: true }) as EntityKey<T>;
    if (key !== undefined) return resource.key(key);
    return resource as ODataResource<T>;
  }
  //#endregion

  bind(
    self: ODataModel<T>,
    {
      parent,
      resource,
      annots,
    }: {
      parent?: [
        ODataModel<any> | ODataCollection<any, ODataModel<any>>,
        ODataModelField<any> | null
      ];
      resource?: ODataResource<T>;
      annots?: ODataEntityAnnotations<T>;
    } = {}
  ) {
    // Parent
    if (parent !== undefined) {
      self._parent = parent;
    }

    // Resource
    if (self._parent === null && resource === undefined)
      resource = this.modelResourceFactory();
    if (resource !== undefined) {
      this.attach(
        self,
        resource as
          | ODataEntityResource<T>
          | ODataPropertyResource<T>
          | ODataNavigationPropertyResource<T>
          | ODataSingletonResource<T>
      );
    }

    // Annotations
    self._annotations =
      annots || new ODataEntityAnnotations(ODataHelper[DEFAULT_VERSION]);

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
    resource:
      | ODataEntityResource<T>
      | ODataPropertyResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataSingletonResource<T>,
    func: (q: ODataQueryOptionsHandler<T>, s?: ODataStructuredType<T>) => void
  ) {
    resource.query(func);
    this.attach(self, resource);
    return self;
  }

  resolveKey(
    value: ODataModel<T> | T | { [name: string]: any },
    {
      field_mapping = false,
      resolve = true,
      single = true,
    }: { field_mapping?: boolean; resolve?: boolean; single?: boolean } = {}
  ): EntityKey<T> | { [name: string]: any } | undefined {
    const keyTypes = this.schema.keys({ include_parents: true });
    const key = new Map<string, any>();
    for (let kt of keyTypes) {
      let v = value as any;
      let options = this as ODataModelOptions<any>;
      let field: ODataModelField<any> | undefined;
      for (let name of kt.name.split('/')) {
        if (options === undefined) break;
        field = options
          .fields({ include_navigation: false, include_parents: true })
          .find((field: ODataModelField<any>) => field.field === name);
        if (field !== undefined) {
          v =
            Types.isPlainObject(v) || ODataModelOptions.isModel(v)
              ? v[field.name]
              : v;
          options = field.meta as ODataModelOptions<any>;
        }
      }
      if (field === undefined) return undefined;
      let name = field_mapping ? field.field : field.name;
      if (kt.alias !== undefined) name = kt.alias;
      key.set(name, v);
    }
    if (key.size === 0) return undefined;
    return resolve
      ? Objects.resolveKey(key, { single })
      : Object.fromEntries(key);
  }

  resolveReferential(
    value: ODataModel<T> | T | { [name: string]: any } | null,
    field: ODataModelField<any>,
    {
      field_mapping = false,
      resolve = true,
      single = false,
    }: { field_mapping?: boolean; resolve?: boolean; single?: boolean } = {}
  ): { [name: string]: any } | null | undefined {
    const referential = new Map<string, any>();
    for (let ref of field.referentials) {
      let from = this.fields({
        include_navigation: false,
        include_parents: true,
      }).find((p: any) => p.field === ref.referencedProperty);
      let to = field.options
        .fields({ include_navigation: false, include_parents: true })
        .find((field: ODataModelField<any>) => field.field === ref.property);
      if (from !== undefined && to !== undefined) {
        let name = field_mapping ? to.field : to.name;
        referential.set(name, value && (value as any)[from.name]);
      }
    }
    if (referential.size === 0) return undefined;
    if (referential.size === 1 && Array.from(referential.values())[0] === null)
      return null;
    return resolve
      ? Objects.resolveKey(referential, { single })
      : Object.fromEntries(referential);
  }

  resolveReferenced(
    value: ODataModel<T> | T | { [name: string]: any } | null,
    field: ODataModelField<any>,
    {
      field_mapping = false,
      resolve = true,
      single = false,
    }: { field_mapping?: boolean; resolve?: boolean; single?: boolean } = {}
  ): { [name: string]: any } | null | undefined {
    const referenced = new Map<string, any>();
    for (let ref of field.referentials) {
      let from = this.fields({
        include_navigation: false,
        include_parents: true,
      }).find((field: ODataModelField<any>) => field.field === ref.property);
      let to = (field.meta as ODataModelOptions<any>)
        .fields({ include_navigation: false, include_parents: true })
        .find(
          (field: ODataModelField<any>) =>
            field.field === ref.referencedProperty
        );
      if (from !== undefined && to !== undefined) {
        let name = field_mapping ? to.field : to.name;
        referenced.set(name, value && (value as any)[from.name]);
      }
    }
    if (referenced.size === 0) return undefined;
    if (referenced.size === 1 && Array.from(referenced.values())[0] === null)
      return null;
    return resolve
      ? Objects.resolveKey(referenced, { single })
      : Object.fromEntries(referenced);
  }

  validate(
    self: ODataModel<T>,
    {
      method,
      navigation = false,
    }: {
      method?: 'create' | 'update' | 'modify';
      navigation?: boolean;
    } = {}
  ): { [name: string]: string[] } | undefined {
    const errors = this.fields({
      include_parents: true,
      include_navigation: navigation,
    }).reduce((acc, field) => {
      let value = (self as any)[field.name];
      let errs = field.validate(value, { method });
      return errs !== undefined
        ? Object.assign(acc, { [field.name]: errs })
        : acc;
    }, {});
    return !Types.isEmpty(errors) ? errors : undefined;
  }

  defaults(): T | { [name: string]: any } | undefined {
    const defs = this.fields({
      include_navigation: false,
      include_parents: true,
    }).reduce((acc, field) => {
      let value = field.defaults();
      return value !== undefined
        ? Object.assign(acc, { [field.name]: value })
        : acc;
    }, {});
    return !Types.isEmpty(defs) ? defs : undefined;
  }

  hasChanged(
    self: ODataModel<T>,
    { include_navigation = false }: { include_navigation?: boolean } = {}
  ): boolean {
    return (
      self._changes.size != 0 ||
      [...self._relations.values()]
        .filter(({ field }) => !field.navigation || include_navigation)
        .some(
          ({ field, state, model }) =>
            (!include_navigation || field.navigation) &&
            (state === ODataModelState.Changed ||
              (model != undefined && model.hasChanged({ include_navigation })))
        )
    );
  }

  hasKey(self: ODataModel<T>) {
    return this.resolveKey(self) !== undefined;
  }
  asEntity<R, M extends ODataModel<T>>(self: M, func: (model: M) => R): R {
    // Build new resource
    const query = self._resource?.cloneQuery<T>();
    let resource = this.modelResourceFactory(query);
    if (resource === undefined)
      throw new Error('Model does not have associated Entity endpoint');
    // Push
    self.pushResource(resource);
    // Execute function
    const result = func(self);
    if (result instanceof Observable) {
      return (result as any).pipe(
        finalize(() => {
          // Pop
          self.popResource();
        })
      );
    } else {
      // Pop
      self.popResource();
      return result;
    }
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
      chain = [],
    }: {
      client_id?: boolean;
      include_navigation?: boolean;
      include_concurrency?: boolean;
      include_computed?: boolean;
      include_key?: boolean;
      include_non_field?: boolean;
      changes_only?: boolean;
      field_mapping?: boolean;
      chain?: (ODataModel<any> | ODataCollection<any, ODataModel<any>>)[];
    } = {}
  ): T | { [name: string]: any } {
    let attrs = self.attributes({
      changes_only,
      field_mapping,
      include_concurrency,
      include_computed,
      include_non_field,
    });

    let relations = [...self._relations.entries()]
      .filter(
        // Chain
        ([, { model }]) => chain.every((c) => c !== model)
      )
      .filter(
        // Changes only
        ([, { model, state }]) =>
          !changes_only ||
          (changes_only &&
            (state === ODataModelState.Changed ||
              (model != undefined && model.hasChanged({ include_navigation }))))
      )
      .filter(
        ([, { field, model }]) =>
          // Navigation
          (include_navigation && field.navigation && model !== null) ||
          !field.navigation
      )
      .map(([k, { model, field, state }]) => {
        let changesOnly =
          changes_only &&
          state !== ODataModelState.Changed &&
          !!field.navigation;
        let includeKey = include_key && !!field.navigation;
        if (ODataModelOptions.isModel(model)) {
          return [
            k,
            (model as ODataModel<any>).toEntity({
              client_id,
              include_navigation,
              include_concurrency,
              include_computed,
              include_non_field,
              field_mapping,
              changes_only: changesOnly,
              include_key: includeKey,
              chain: [self, ...chain],
            }),
          ];
        } else if (ODataModelOptions.isCollection(model)) {
          return [
            k,
            (model as ODataCollection<any, ODataModel<any>>).toEntities({
              client_id,
              include_navigation,
              include_concurrency,
              include_computed,
              include_non_field,
              field_mapping,
              changes_only: changesOnly,
              include_key: includeKey,
              chain: [self, ...chain],
            }),
          ];
        }
        return [k, model];
      })
      .reduce((acc, [k, v]) => {
        const name = field_mapping
          ? this.fields({
              include_navigation: false,
              include_parents: true,
            }).find((field: ODataModelField<any>) => field.name === k)?.field ||
            k
          : k;
        return Object.assign(acc, { [name]: v });
      }, {});

    // Create entity
    let entity: T | { [name: string]: any } = { ...attrs, ...relations };

    // Add client_id
    if (client_id) {
      (<any>entity)[this.cid] = (<any>self)[this.cid];
    }

    // Add key
    if (include_key) {
      entity = {
        ...entity,
        ...(this.resolveKey(self, { field_mapping, resolve: false }) as {}),
      };
    }

    // Add type
    if (
      self._parent !== null &&
      ((ODataModelOptions.isModel(self._parent[0]) &&
        (self._parent[1] as ODataModelField<any>).meta !== self._meta) ||
        (ODataModelOptions.isCollection(self._parent[0]) &&
          (self._parent[0] as ODataCollection<any, ODataModel<any>>)._model
            .meta !== self._meta))
    ) {
      entity[this.api.options.helper.ODATA_TYPE] = `#${this.schema.type()}`;
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
    const fieldAttrs = this.fields({
      include_navigation: false,
      include_parents: true,
    }).reduce((acc, f) => {
      const isChanged = self._changes.has(f.name);
      const name = field_mapping ? f.field : f.name;
      const computed = f.annotatedValue<boolean>(COMPUTED);
      const value = isChanged
        ? self._changes.get(f.name)
        : self._attributes.get(f.name);
      if (f.concurrency && include_concurrency) {
        return Object.assign(acc, { [name]: value });
      } else if (computed && include_computed) {
        return Object.assign(acc, { [name]: value });
      } else if (changes_only && isChanged) {
        return Object.assign(acc, { [name]: value });
      } else if (!changes_only && !f.concurrency && !computed) {
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
    let changes: string[] = [];
    if (name !== undefined) {
      // Reset value
      const value = self._attributes.get(name);
      const change = self._changes.get(name);
      if (value !== change) changes = [name];
      self._relations.delete(name);
      self._changes.delete(name);
    } else {
      // reset all
      changes = [...self._changes.keys()];
      self._relations.clear();
      self._changes.clear();
    }
    if (!silent && changes.length > 0) {
      self.events$.emit(
        new ODataModelEvent('reset', {
          model: self,
          options: { changes },
        })
      );
    }
  }

  assign(
    self: ODataModel<T>,
    entity: Partial<T> | { [name: string]: any },
    {
      reset = false,
      reparent = false,
      silent = false,
    }: { reset?: boolean; reparent?: boolean; silent?: boolean } = {}
  ) {
    self._reset = reset;
    self._reparent = reparent;
    self._silent = silent;

    const changes: string[] = [];

    // Apply entity
    const model = self as any;
    Object.entries(entity)
      .filter(([, value]) => value !== undefined) // Filter undefined
      .forEach(([key, value]) => {
        const field = this.fields({
          include_parents: true,
          include_navigation: true,
        }).find(
          (field: ODataModelField<any>) =>
            (self._reset && field.field === key) || field.name === key
        );

        if (field !== undefined) {
          // Delegated to private setter
          if (this._set(self, field, value)) {
            changes.push(field.name);
          }
        } else {
          // Basic assignment
          const current = model[key];
          model[key] = value;
          if (current !== value) changes.push(key);
        }
      });

    if ((!self._silent && changes.length > 0) || self._reset) {
      self.events$.emit(
        new ODataModelEvent(self._reset ? 'reset' : 'update', {
          model: self,
          options: { changes },
        })
      );
    }
    self._reset = false;
    self._reparent = false;
    self._silent = false;
  }

  static isModel(obj: any) {
    return Types.rawType(obj) === 'Model';
  }

  static isCollection(obj: any) {
    return Types.rawType(obj) === 'Collection';
  }

  private updateCollection<F>(
    self: ODataModel<T>,
    field: ODataModelField<F>,
    collection: ODataCollection<F, ODataModel<F>>,
    value: Partial<T>[] | { [name: string]: any }[]
  ) {
    collection._annotations = field.annotationsFactory(
      self.annots()
    ) as ODataEntitiesAnnotations<F>;
    collection.assign(value as Partial<T>[] | { [name: string]: any }[], {
      reset: self._reset,
      reparent: self._reparent,
      silent: self._silent,
    });
    return collection.hasChanged();
  }
  private updateModel<F>(
    self: ODataModel<T>,
    field: ODataModelField<F>,
    model: ODataModel<F>,
    value: F | { [name: string]: any }
  ) {
    model._annotations = field.annotationsFactory(
      self.annots()
    ) as ODataEntityAnnotations<F>;
    model.assign(value as F | { [name: string]: any }, {
      reset: self._reset,
      reparent: self._reparent,
      silent: self._silent,
    });
    return model.hasChanged();
  }

  _get<F>(
    self: ODataModel<T>,
    field: ODataModelField<F>
  ): F | ODataModel<F> | ODataCollection<F, ODataModel<F>> | null | undefined {
    if (field.isStructuredType()) {
      const relation = self._relations.get(field.name);
      if (
        field.navigation &&
        (relation?.model === null || ODataModelOptions.isModel(relation?.model))
      ) {
        // Check for reference
        const referenced = this.resolveReferenced(self, field);
        if (
          relation?.model !== null &&
          referenced !== null &&
          referenced !== undefined
        ) {
          (relation!.model as ODataModel<F>).assign(referenced as Partial<F>, {
            silent: true,
          });
        } else if (relation?.model !== null && referenced === null) {
          this._unlink(self, relation as ODataModelRelation<F>);
          // New value is null
          (relation as ODataModelRelation<F>).model = null;
        } else if (relation?.model === null && referenced !== null) {
          // New value is undefined
          (relation as ODataModelRelation<F>).model = undefined;
        }
      }
      return relation?.model;
    } else {
      return this.attributes(self, {
        include_concurrency: true,
        include_computed: true,
      })[field.name];
    }
  }

  private _setStructured<F>(
    self: ODataModel<T>,
    field: ODataModelField<F>,
    value:
      | F
      | F[]
      | { [name: string]: any }
      | { [name: string]: any }[]
      | ODataModel<F>
      | ODataCollection<F, ODataModel<F>>
      | null
  ): boolean {
    let changed = false;
    // Ensures that the relation exists
    if (!self._relations.has(field.name)) {
      self._relations.set(field.name, {
        state: ODataModelState.Unchanged,
        field: field,
      });
    }

    const relation = self._relations.get(field.name)!;
    const current = relation.model;

    if (value === null) {
      // Unlink old relation
      this._unlink(self, relation);

      // New value is null
      relation.model = value as null;
      changed = current !== value;
    } else if (ODataModelOptions.isCollection(current)) {
      // Current is collection
      let currentCollection = current as ODataCollection<F, ODataModel<F>>;
      if (ODataModelOptions.isCollection(value)) {
        // New value is collection
        let newCollection = value as ODataCollection<F, ODataModel<F>>;
        if (currentCollection.equals(newCollection)) {
          changed = false;
        } else {
          // Unlink old collection
          this._unlink(self, relation);
          relation.model = newCollection;
          // Link new collection
          this._link(self, relation);
          changed = true;
        }
      } else if (Types.isArray(value)) {
        // New value is array
        changed = this.updateCollection<F>(
          self,
          field,
          currentCollection,
          value as T[] | { [name: string]: any }[]
        );
      }
    } else if (ODataModelOptions.isModel(current)) {
      // Current is model
      let currentModel = current as ODataModel<F>;
      if (ODataModelOptions.isModel(value)) {
        // New value is model
        let newModel = value as ODataModel<F>;
        if (currentModel.equals(newModel)) {
          changed = false;
        } else {
          // Unlink old model
          this._unlink(self, relation);
          relation.model = newModel;
          // Link new model
          this._link(self, relation);
          changed = true;
        }
      } else if (Types.isPlainObject(value)) {
        changed = this.updateModel<F>(
          self,
          field,
          currentModel,
          value as F | { [name: string]: any }
        );
      }
    } else {
      // Current is null or undefined
      // create new model/collection for given value
      relation.model =
        ODataModelOptions.isCollection(value) ||
        ODataModelOptions.isModel(value)
          ? (value as ODataModel<F> | ODataCollection<F, ODataModel<F>>)
          : field.collection
          ? field.collectionFactory<F>({
              parent: self,
              value: value as F[] | { [name: string]: any }[],
              reset: self._reset,
            })
          : field.modelFactory<F>({
              parent: self,
              value: value,
              reset: self._reset,
            });
      // Link new model/collection
      this._link(self, relation);
      changed = true;
    }

    // Resolve referentials
    if (!ODataModelOptions.isCollection(relation.model)) {
      let ref = field.meta?.resolveReferential(relation.model, field);
      if (ref !== null && ref !== undefined) {
        Object.assign(self, ref);
      }
    }

    // Update state and emit event
    relation.state =
      self._reset || !changed
        ? ODataModelState.Unchanged
        : ODataModelState.Changed;
    if (!self._silent && changed) {
      self.events$.emit(
        new ODataModelEvent('change', {
          field: field,
          model: self,
          value: relation.model,
          previous: current,
        })
      );
    }

    return changed;
  }

  private _setValue<F>(
    self: ODataModel<T>,
    field: ODataModelField<F>,
    value:
      | F
      | F[]
      | { [name: string]: any }
      | { [name: string]: any }[]
      | ODataModel<F>
      | ODataCollection<F, ODataModel<F>>
      | null,
    key?: boolean
  ): boolean {
    let changed = false;
    const attrs = this.attributes(self, {
      include_concurrency: true,
      include_computed: true,
    });
    const name = field.name;
    const currentValue = attrs[name];
    changed = !Types.isEqual(currentValue, value);
    if (self._reset) {
      self._changes.delete(name);
      self._attributes.set(name, value);
    } else if (Types.isEqual(value, self._attributes.get(name))) {
      self._changes.delete(name);
    } else if (changed) {
      self._changes.set(name, value);
    }
    if (!self._silent && changed) {
      self.events$.emit(
        new ODataModelEvent('change', {
          field: field,
          model: self,
          value,
          previous: currentValue,
          options: { key },
        })
      );
    }
    return changed;
  }

  _set<F>(
    self: ODataModel<T>,
    field: ODataModelField<F>,
    value:
      | F
      | F[]
      | { [name: string]: any }
      | { [name: string]: any }[]
      | ODataModel<F>
      | ODataCollection<F, ODataModel<F>>
      | null
  ): boolean {
    return field.isStructuredType()
      ? this._setStructured(self, field, value)
      : this._setValue(self, field, value, field.isKey());
  }

  private _unlink<F>(self: ODataModel<T>, relation: ODataModelRelation<F>) {
    if (relation.subscription !== undefined) {
      relation.subscription.unsubscribe();
      relation.subscription = undefined;
    }
    if (relation.model != null) {
      relation.model._parent = null;
    }
  }

  private _link<F>(self: ODataModel<T>, relation: ODataModelRelation<F>) {
    if (relation.subscription) {
      throw new Error('Subscription already exists');
    }
    if (relation.model == null) {
      throw new Error('Subscription model is null');
    }

    if (self._reparent) relation.model._parent = [self, relation.field];

    relation.subscription = relation.model.events$.subscribe(
      (event: ODataModelEvent<any>) => {
        if (
          BUBBLING.indexOf(event.name) !== -1 &&
          event.bubbling &&
          !event.visited(self)
        ) {
          if (event.model === relation.model) {
            if (
              event.name === 'change' &&
              relation.field.navigation &&
              event.options?.key
            ) {
              let ref = (relation.model as ODataModel<any>).referential(
                relation.field
              );
              if (ref !== null && ref !== undefined) {
                Object.assign(self, ref);
              }
            }
          }

          self.events$.emit(event.push(self, relation.field));
        }
      }
    );
  }
}
