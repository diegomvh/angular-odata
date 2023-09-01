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
import { EdmType, Parser, ParserOptions } from '../types';
import { Objects, Types } from '../utils';
import { ODataCollection } from './collection';
import type { ODataModel } from './model';
import { EventEmitter } from '@angular/core';

export enum ODataModelEventType {
  Change = 'change',
  Reset = 'reset',
  Update = 'update',
  Destroy = 'destroy',
  Add = 'add',
  Remove = 'remove',
  Invalid = 'invalid',
  Request = 'request',
  Sync = 'sync',
  Attach = 'attach',
}

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
      attr,
      options,
    }: {
      model?: ODataModel<T>;
      collection?: ODataCollection<T, ODataModel<T>>;
      attr?: ODataModelAttribute<any> | number;
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
        attr || null,
      ],
    ];
  }

  bubbling: boolean = true;
  stopPropagation() {
    this.bubbling = false;
  }

  chain: [
    ODataModel<any> | ODataCollection<any, ODataModel<any>>,
    ODataModelAttribute<any> | number | null
  ][];

  push(
    model: ODataModel<any> | ODataCollection<any, ODataModel<any>>,
    attr: ODataModelAttribute<any> | number
  ) {
    let event = new ODataModelEvent(this.name, {
      model: this.model,
      collection: this.collection,
      previous: this.previous,
      value: this.value,
      options: this.options,
    });
    event.chain = [...this.chain];
    event.chain.splice(0, 0, [model, attr]);
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
      .map(([, attr], index) =>
        typeof attr === 'number'
          ? `[${attr}]`
          : attr instanceof ODataModelAttribute
            ? index === 0
              ? attr.name
              : `.${attr.name}`
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
  ODataModelEventType.Change,
  ODataModelEventType.Reset,
  ODataModelEventType.Update,
  ODataModelEventType.Destroy,
  ODataModelEventType.Add,
  ODataModelEventType.Remove,
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
  Unchanged,
}

export type ModelOptions = {
  cid?: string;
  fields: Map<string, ModelFieldOptions>;
};

export type ModelFieldOptions = {
  field?: string;
  parser?: ODataStructuredTypeFieldParser<any>;
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
  return <T extends { new(...args: any[]): {} }>(constructor: T) => {
    const Klass = <any>constructor;
    if (!Klass.hasOwnProperty('options'))
      Klass.options = { fields: new Map<string, ModelFieldOptions>() } as ModelOptions;
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
      Klass.options = { fields: new Map<string, ModelFieldOptions>() } as ModelOptions;
    options.field = name || key;
    Klass.options.fields.set(key, options);
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
        reset,
        parent: [parent, this],
      }
    );
  }
}

export class ODataModelAttribute<T> {
  private value?: T | ODataModel<T> | ODataCollection<T, ODataModel<T>> | null;
  private change?: T | ODataModel<T> | ODataCollection<T, ODataModel<T>> | null;
  private subscription?: Subscription;
  events$ = new EventEmitter<ODataModelEvent<T>>();

  constructor(
    private _model: ODataModel<any>,
    private _field: ODataModelField<T>
  ) { }

  get navigation() {
    return Boolean(this._field.navigation);
  }

  get computed() {
    return this._field.annotatedValue<boolean>(COMPUTED);
  }

  get concurrency() {
    return Boolean(this._field.concurrency);
  }

  get referentials() {
    return this._field.referentials;
  }

  get options() {
    return this._field.options;
  }

  get meta() {
    return this._field.meta;
  }

  get name() {
    return this._field.name;
  }

  get fieldName() {
    return this._field.field;
  }

  get():
    | T
    | ODataModel<T>
    | ODataCollection<T, ODataModel<T>>
    | null
    | undefined {
    return this.change !== undefined ? this.change : this.value;
  }

  set(
    value:
      | T
      | ODataModel<T>
      | ODataCollection<T, ODataModel<T>>
      | null
      | undefined,
    reset: boolean = false,
    reparent: boolean = false
  ) {
    const current = this.get();

    if (
      ODataModelOptions.isModel(current) ||
      ODataModelOptions.isCollection(current)
    )
      this.unlink(
        current as ODataModel<T> | ODataCollection<T, ODataModel<T>>
        //this.value !== current
      );

    const changed =
      ODataModelOptions.isModel(current) && ODataModelOptions.isModel(value)
        ? !(current as ODataModel<T>).equals(value as ODataModel<T>)
        : ODataModelOptions.isCollection(current) &&
          ODataModelOptions.isCollection(value)
          ? !(current as ODataCollection<T, ODataModel<T>>).equals(
            value as ODataCollection<T, ODataModel<T>>
          )
          : !Types.isEqual(current, value);
    if (reset) {
      this.value = value;
      this.change = undefined;
    } else if (Types.isEqual(value, this.value)) {
      this.change = undefined;
    } else if (changed) {
      this.change = value;
    }
    if (
      ODataModelOptions.isModel(value) ||
      ODataModelOptions.isCollection(value)
    ) {
      this.link(
        value as ODataModel<T> | ODataCollection<T, ODataModel<T>>,
        reparent
      );
    }
    return changed;
  }

  isChanged({
    include_navigation = false,
  }: { include_navigation?: boolean } = {}): boolean {
    const current = this.get();
    return (
      this.change !== undefined ||
      ((ODataModelOptions.isModel(current) ||
        ODataModelOptions.isCollection(current)) &&
        (
          current as ODataModel<T> | ODataCollection<T, ODataModel<T>>
        ).hasChanged({ include_navigation }))
    );
  }

  reset() {
    if (
      ODataModelOptions.isModel(this.change) ||
      ODataModelOptions.isCollection(this.change)
    )
      this.unlink(
        this.change as ODataModel<T> | ODataCollection<T, ODataModel<T>>
      );
    this.change = undefined;
    if (
      ODataModelOptions.isModel(this.value) ||
      ODataModelOptions.isCollection(this.value)
    )
      this.link(
        this.value as ODataModel<T> | ODataCollection<T, ODataModel<T>>
      );
  }

  private link(
    value: ODataModel<T> | ODataCollection<T, ODataModel<T>>,
    reparent: boolean = false
  ) {
    this.subscription = value.events$.subscribe((e) => this.events$.emit(e));
    if (reparent) {
      value._parent = [this._model, this._field];
    }
  }

  private unlink(
    value: ODataModel<T> | ODataCollection<T, ODataModel<T>>,
    reparent: boolean = false
  ) {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    if (reparent) {
      value._parent = null;
    }
  }
}

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
  private _fields: ODataModelField<any>[] = [];
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
    this.schema = schema;
    this.cid = options?.cid || CID_FIELD_NAME;
    options.fields.forEach((value, key) =>
      this.addField<any>(key, value)
    );
  }

  get api() {
    return this.schema.api;
  }

  type({ alias = false }: { alias?: boolean } = {}) {
    return this.schema.type({ alias });
  }

  isOpenType() {
    return this.schema.isOpenType();
  }

  isEntityType() {
    return this.schema.isEntityType();
  }

  isComplexType() {
    return this.schema.isComplexType();
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
    let field = this.findField<F>(name);
    //Throw error if not found
    if (field === undefined)
      throw new Error(`No field with name ${name as string}`);
    return field as ODataModelField<F>;
  }

  findField<F>(name: keyof T | string) {
    return this.fields({
      include_parents: true,
      include_navigation: true,
    }).find(
      (modelField: ODataModelField<F>) =>
        modelField.name === name || modelField.field === name
    ) as ODataModelField<F> | undefined;
  }

  addField<F>(name: string, options: ModelFieldOptions) {
    const { field, parser, ...opts } = options;
    if (field === undefined || name === undefined)
      throw new Error('Model Properties need name and field');
    const fieldParser = parser ?? this.schema.field<F>(field as keyof T);
    if (fieldParser === undefined)
      throw new Error(`No parser for ${field} with name = ${name}`);
    const modelField = new ODataModelField<F>(this, {
      name,
      field,
      parser: fieldParser,
      ...opts,
    });
    this._fields.push(modelField);
    return modelField;
  }

  tsToEdm: Record<string, EdmType> = {
    string: EdmType.String,
    number: EdmType.Int32,
    bigint: EdmType.Int64,
    boolean: EdmType.Boolean,
  };
  private modelFieldFactory<F>(
    self: ODataModel<T>,
    name: string,
    type: string | EdmType
  ) {
    const structuredFieldParser = this.schema.addField<F>(name, { type });
    structuredFieldParser.configure({
      findOptionsForType: (type: string) => this.api.findOptionsForType(type),
      parserForType: (type: string | EdmType) => this.api.parserForType(type),
      options: this.api.options,
    });
    const modelField = this.addField<F>(name, {
      field: name,
      parser: structuredFieldParser,
    });
    modelField.configure({
      findOptionsForType: (type: string) => this.api.findOptionsForType(type),
      options: this.api.options,
      concurrency: false,
    });
    Object.defineProperty(self, modelField.name, {
      configurable: true,
      get: () => this.get(self, modelField as ODataModelField<any>),
      set: (value: any) =>
        this.set(self, modelField as ODataModelField<any>, value),
    });
    return modelField;
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
        new ODataModelEvent(ODataModelEventType.Attach, {
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
        get: () => this.get(self, field as ODataModelField<any>),
        set: (value: any) =>
          this.set(self, field as ODataModelField<any>, value),
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
    attr: ODataModelAttribute<any> | ODataModelField<any>,
    {
      field_mapping = false,
      resolve = true,
      single = false,
    }: { field_mapping?: boolean; resolve?: boolean; single?: boolean } = {}
  ): { [name: string]: any } | null | undefined {
    const referential = new Map<string, any>();
    for (let ref of attr.referentials) {
      let from = this.fields({
        include_navigation: false,
        include_parents: true,
      }).find((p: any) => p.field === ref.referencedProperty);
      let to = attr.options
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
    attr: ODataModelAttribute<any> | ODataModelField<any>,
    {
      field_mapping = false,
      resolve = true,
      single = false,
    }: { field_mapping?: boolean; resolve?: boolean; single?: boolean } = {}
  ): { [name: string]: any } | null | undefined {
    const referenced = new Map<string, any>();
    for (let ref of attr.referentials) {
      let from = this.fields({
        include_navigation: false,
        include_parents: true,
      }).find((field: ODataModelField<any>) => field.field === ref.property);
      let to = (attr.meta as ODataModelOptions<any>)
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
    return [...self._attributes.values()]
      .filter((attr) => !attr.navigation || include_navigation)
      .some(
        (attr) =>
          (!include_navigation || attr.navigation) &&
          attr.isChanged({ include_navigation })
      );
  }

  hasKey(self: ODataModel<T>) {
    return this.resolveKey(self) !== undefined;
  }

  withResource<R, M extends ODataModel<T>>(
    self: M,
    resource:
      | ODataEntityResource<T>
      | ODataPropertyResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataSingletonResource<T>,
    ctx: (model: M) => R
  ): R {
    // Push
    self.pushResource(resource);
    // Execute function
    const result = ctx(self);
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
  asEntity<R, M extends ODataModel<T>>(self: M, ctx: (model: M) => R): R {
    // Build new resource
    const query = self._resource?.cloneQuery<T>();
    let resource = this.modelResourceFactory(query);
    if (resource === undefined)
      throw new Error('Model does not have associated Entity endpoint');
    return this.withResource(self, resource, ctx);
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
    let entity: any = [...self._attributes.values()]
      .filter(
        // Chain
        (attr) => chain.every((c) => c !== attr.get())
      )
      .filter(
        // Changes only
        (attr) =>
          !changes_only ||
          (changes_only && attr.isChanged({ include_navigation }))
      )
      .filter(
        (attr) =>
          // Navigation
          (include_navigation && attr.navigation && attr.get() !== null) ||
          !attr.navigation
      )
      .reduce((acc, attr) => {
        const name = field_mapping ? attr.fieldName : attr.name;
        let value: any = attr.get();
        const computed = attr.computed;
        const navigation = attr.navigation;
        const concurrency = attr.concurrency;
        if (ODataModelOptions.isModel(value)) {
          value = (value as ODataModel<any>).toEntity({
            client_id,
            include_navigation,
            include_concurrency,
            include_computed,
            include_non_field,
            field_mapping,
            changes_only: changes_only && !!navigation,
            include_key: include_key && !!navigation,
            chain: [self, ...chain],
          });
        } else if (ODataModelOptions.isCollection(value)) {
          value = (value as ODataCollection<any, ODataModel<any>>).toEntities({
            client_id,
            include_navigation,
            include_concurrency,
            include_computed,
            include_non_field,
            field_mapping,
            changes_only: changes_only && !!navigation,
            include_key: include_key && !!navigation,
            chain: [self, ...chain],
          });
        }
        if (include_concurrency && concurrency) {
          return Object.assign(acc, { [name]: value });
        } else if (include_computed && computed) {
          return Object.assign(acc, { [name]: value });
        } else if (changes_only && attr.isChanged()) {
          return Object.assign(acc, { [name]: value });
        } else if (!changes_only && !concurrency && !computed) {
          return Object.assign(acc, { [name]: value });
        }
        return acc;
      }, {});

    if (include_non_field) {
      const names = Object.keys(entity);
      // Attributes from object (attributes for object)
      const nonFieldAttrs = Object.entries(self)
        .filter(
          ([k]) =>
            names.indexOf(k) === -1 && !k.startsWith('_') && !k.endsWith('$')
        )
        .reduce((acc, [k, v]) => Object.assign(acc, { [k]: v }), {});
      entity = { ...entity, ...nonFieldAttrs };
    }

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

    return entity as T | { [name: string]: any };
  }

  reset(
    self: ODataModel<T>,
    { name, silent = false }: { name?: string; silent?: boolean } = {}
  ) {
    let changes: string[] = [];
    if (name !== undefined) {
      // Reset value
      const attribute = self._attributes.get(name);
      if (
        attribute !== undefined &&
        attribute.isChanged({ include_navigation: true })
      ) {
        attribute.reset();
        changes = [name];
      } else if (attribute?.isChanged()) {
        attribute.reset();
        changes = [name];
      }
    } else {
      // reset all
      changes = [...self._attributes.keys()];
      //self._changes.clear();
      self._attributes.forEach((attr, key) => {
        if (attr.isChanged({ include_navigation: true })) {
          attr.reset();
          changes.push(key);
        }
      });
    }
    if (!silent && changes.length > 0) {
      self.events$.emit(
        new ODataModelEvent(ODataModelEventType.Reset, {
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
    }: {
      reset?: boolean;
      reparent?: boolean;
      silent?: boolean;
    } = {}
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
          if (this.set(self, field, value)) {
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
        new ODataModelEvent(
          self._reset ? ODataModelEventType.Reset : ODataModelEventType.Update,
          {
            model: self,
            options: { changes },
          }
        )
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

  private _updateCollection<F>(
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

  private _updateModel<F>(
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

  get<F>(
    self: ODataModel<T>,
    field: ODataModelField<F> | string
  ): F | ODataModel<F> | ODataCollection<F, ODataModel<F>> | null | undefined {
    const attr = self._attributes.get(
      field instanceof ODataModelField ? field.name : field
    );
    if (attr !== undefined) {
      const value = attr.get();
      if (
        (attr.navigation && value === null) ||
        ODataModelOptions.isModel(value)
      ) {
        // Check for reference
        const referenced = this.resolveReferenced(self, attr);
        if (value !== null && referenced !== null && referenced !== undefined) {
          (value as ODataModel<F>).assign(referenced as Partial<F>, {
            silent: true,
          });
        } else if (value !== null && referenced === null) {
          // New value is null
          (attr as ODataModelAttribute<F>).set(null);
        } else if (value === null && referenced !== null) {
          // New value is undefined
          (attr as ODataModelAttribute<F>).set(undefined);
        }
      }
      return value;
    } else if (
      typeof field === 'string' &&
      !field.startsWith('_') &&
      !field.endsWith('$')
    ) {
      return (self as any)[field];
    }
    return undefined;
  }

  set<F>(
    self: ODataModel<T>,
    field: ODataModelField<F> | string,
    value:
      | F
      | F[]
      | { [name: string]: any }
      | { [name: string]: any }[]
      | ODataModel<F>
      | ODataCollection<F, ODataModel<F>>
      | null,
    { type }: { type?: string } = {}
  ): boolean {
    let modelField =
      field instanceof ODataModelField ? field : this.findField<F>(field);
    if (
      modelField === undefined &&
      this.isOpenType() &&
      typeof field === 'string'
    ) {
      type = type ?? (this.tsToEdm[typeof value] as EdmType) ?? '';
      modelField = this.modelFieldFactory<F>(self, field, type);
    }
    if (modelField === undefined)
      throw new Error(`No field with name ${field as string}`);

    let changed = false;
    let attr = self._attributes.get(modelField.name);

    // Ensures that the attribute exists
    if (attr === undefined) {
      attr = new ODataModelAttribute(self, modelField);
      this._link(self, attr);
      self._attributes.set(modelField.name, attr);
    }

    const current = attr.get();

    if (modelField.isStructuredType()) {
      if (value === null) {
        // New value is null
        changed = attr.set(value as null, self._reset, self._reparent);
      } else if (ODataModelOptions.isCollection(current)) {
        // Current is collection
        let currentCollection = current as ODataCollection<F, ODataModel<F>>;
        if (ODataModelOptions.isCollection(value)) {
          // New value is collection
          changed = attr.set(
            value as ODataCollection<F, ODataModel<F>>,
            self._reset,
            self._reparent
          );
        } else if (Types.isArray(value)) {
          // New value is array
          changed = this._updateCollection<F>(
            self,
            modelField,
            currentCollection,
            value as T[] | { [name: string]: any }[]
          );
        }
      } else if (ODataModelOptions.isModel(current)) {
        // Current is model
        let currentModel = current as ODataModel<F>;
        if (ODataModelOptions.isModel(value)) {
          // New value is model
          changed = attr.set(
            value as ODataModel<F>,
            self._reset,
            self._reparent
          );
        } else if (Types.isPlainObject(value)) {
          changed = this._updateModel<F>(
            self,
            modelField,
            currentModel,
            value as F | { [name: string]: any }
          );
        }
      } else {
        // Current is null or undefined
        // create new model/collection for given value
        changed = attr.set(
          ODataModelOptions.isCollection(value) ||
            ODataModelOptions.isModel(value)
            ? (value as ODataModel<F> | ODataCollection<F, ODataModel<F>>)
            : modelField.collection
              ? modelField.collectionFactory<F>({
                parent: self,
                value: value as F[] | { [name: string]: any }[],
                reset: self._reset,
              })
              : modelField.modelFactory<F>({
                parent: self,
                value: value,
                reset: self._reset,
              }),
          self._reset,
          self._reparent
        );
      }

      // Resolve referentials
      if (!ODataModelOptions.isCollection(attr.get())) {
        let ref = modelField.meta?.resolveReferential(attr.get(), attr);
        if (ref !== null && ref !== undefined) {
          Object.assign(self, ref);
        }
      }
    } else {
      changed = attr.set(value, self._reset, self._reparent);
    }

    if (!self._silent && changed) {
      self.events$.emit(
        new ODataModelEvent(ODataModelEventType.Change, {
          attr,
          model: self,
          value,
          previous: current,
          options: { key: modelField.isKey() },
        })
      );
    }

    return changed;
  }

  private _link<F>(self: ODataModel<T>, attr: ODataModelAttribute<F>) {
    attr.events$.subscribe((event: ODataModelEvent<any>) => {
      if (
        BUBBLING.indexOf(event.name) !== -1 &&
        event.bubbling &&
        !event.visited(self)
      ) {
        if (event.model === attr.get()) {
          if (
            event.name === 'change' &&
            attr.navigation &&
            event.options?.key
          ) {
            let ref = (attr.get() as ODataModel<any>).referential(attr);
            if (ref !== null && ref !== undefined) {
              Object.assign(self, ref);
            }
          }
        }

        self.events$.emit(event.push(self, attr));
      }
    });
  }
}
