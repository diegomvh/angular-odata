import { Observable, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  CID_FIELD_NAME,
  COMPUTED,
  DEFAULT_VERSION,
  OPTIMISTIC_CONCURRENCY,
  EVENT_SPLITTER,
} from '../constants';
import { ODataHelper } from '../helper';
import {
  EntityKey,
  ODataQueryOptions,
  ODataQueryOptionsHandler,
  ODataResource,
  ODataSingletonResource,
} from '../resources';
import {
  ODataEntityResource,
  ODataEntitySetResource,
  ODataNavigationPropertyResource,
  ODataPropertyResource,
} from '../resources';
import {
  ODataEntitySet,
  ODataEnumType,
  ODataStructuredType,
  ODataStructuredTypeFieldParser,
} from '../schema';
import { EdmType, ParserOptions } from '../types';
import { Objects, Types } from '../utils';
import { ODataCollection } from './collection';
import { ODataModel } from './model';
import { EventEmitter } from '@angular/core';
import { ODataEntitiesAnnotations, ODataEntityAnnotations } from '../annotations';

export enum ODataModelEventType {
  Change = 'change',
  Reset = 'reset',
  Update = 'update',
  Sort = 'sort',
  Destroy = 'destroy',
  Add = 'add',
  Remove = 'remove',
  Invalid = 'invalid',
  Request = 'request',
  Sync = 'sync',
  Attach = 'attach',
}

export class ODataModelEvent<T> {
  type: ODataModelEventType | string;
  value?: any;
  previous?: any;
  options?: any;

  constructor(
    type: ODataModelEventType | string,
    {
      model,
      collection,
      previous,
      value,
      attr,
      options,
      bubbles,
      chain,
    }: {
      model?: ODataModel<T>;
      collection?: ODataCollection<T, ODataModel<T>>;
      attr?: ODataModelAttribute<any> | number;
      previous?: any;
      value?: any;
      options?: any;
      bubbles?: boolean;
      chain?: [
        ODataModel<any> | ODataCollection<any, ODataModel<any>>,
        ODataModelAttribute<any> | number | null
      ][];
    } = {}
  ) {
    this.type = type;
    this.model = model;
    this.collection = collection;
    this.previous = previous;
    this.value = value;
    this.options = options;
    this.chain = chain ?? [
      [
        (this.model || this.collection) as
        | ODataModel<any>
        | ODataCollection<any, ODataModel<any>>,
        attr || null,
      ],
    ];
    this.bubbles = bubbles ?? BUBBLES.indexOf(this.type) !== -1;
  }

  chain: [
    ODataModel<any> | ODataCollection<any, ODataModel<any>>,
    ODataModelAttribute<any> | number | null
  ][];

  push(
    model: ODataModel<any> | ODataCollection<any, ODataModel<any>>,
    attr: ODataModelAttribute<any> | number
  ) {
    return new ODataModelEvent<any>(this.type, {
      model:
        this.model ??
        (model instanceof ODataModel ? model : undefined),
      collection:
        this.collection ??
        (model instanceof ODataCollection
          ? (model as ODataCollection<any, ODataModel<any>>)
          : undefined),
      previous: this.previous,
      value: this.value,
      options: {
        ...this.options,
        index: attr instanceof ODataModelAttribute ? attr.name : attr,
      },
      bubbles: this.bubbles,
      chain: [[model, attr], ...this.chain],
    });
  }

  bubbles: boolean;
  stopPropagation() {
    this.bubbles = false;
  }

  visited(model: ODataModel<any> | ODataCollection<any, ODataModel<any>>) {
    return (
      this.chain.some((c) => c[0] === model) &&
      this.chain[this.chain.length - 1][0] !== model
    );
  }

  canContinueWith(self: ODataModel<T> | ODataCollection<T, ODataModel<T>>) {
    return this.bubbles && !this.visited(self);
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

export class ODataModelEventEmitter<T> extends EventEmitter<
  ODataModelEvent<T>
> {
  model?: ODataModel<T>;
  collection?: ODataCollection<T, ODataModel<T>>;

  constructor({
    model,
    collection,
  }: {
    model?: ODataModel<T>;
    collection?: ODataCollection<T, ODataModel<T>>;
  } = {}) {
    super();
    this.model = model;
    this.collection = collection;
  }

  trigger(
    type: ODataModelEventType | string,
    {
      collection,
      previous,
      value,
      attr,
      options,
      bubbles,
    }: {
      collection?: ODataCollection<T, ODataModel<T>>;
      attr?: ODataModelAttribute<any> | number;
      previous?: any;
      value?: any;
      options?: any;
      bubbles?: boolean;
    } = {}
  ) {
    const _trigger = (name: string) =>
      this.emit(
        new ODataModelEvent(name, {
          model: this.model,
          collection: collection ?? this.collection,
          previous,
          value,
          attr,
          options,
          bubbles,
        })
      );
    if (type && EVENT_SPLITTER.test(type)) {
      for (const name of type.split(EVENT_SPLITTER)) {
        _trigger(name);
      }
    } else {
      _trigger(type);
    }
  }
}

export const BUBBLES: (ODataModelEventType | string)[] = [
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
  include_id: false,
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
      Klass.options = {
        fields: new Map<string, ModelFieldOptions>(),
      } as ModelOptions;
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
      Klass.options = {
        fields: new Map<string, ModelFieldOptions>(),
      } as ModelOptions;
    options.field = name ?? key;
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
  optionsForType?: (type: string) => ODataModelOptions<any> | undefined;
  modelForType?: (t: string) => typeof ODataModel<any> | undefined;
  collectionForType?: (t: string) => typeof ODataCollection<any, ODataModel<any>> | undefined;
  enumForType?: (t: string) => ODataEnumType<F> | undefined;
  structuredForType?: (t: string) => ODataStructuredType<F> | undefined;
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

  get type() {
    return this.parser.type;
  }

  get navigation() {
    return this.parser.navigation;
  }

  get collection() {
    return this.parser.collection;
  }

  annotatedValue<T>(term: string | RegExp) {
    return this.parser.annotatedValue<T>(term);
  }

  configure({
    optionsForType,
    modelForType,
    collectionForType,
    enumForType,
    structuredForType,
    concurrency,
    options,
  }: {
    optionsForType: (type: string) => ODataModelOptions<any> | undefined;
    modelForType: (t: string) => typeof ODataModel<any> | undefined 
    collectionForType: (t: string) => typeof ODataCollection<any, any> | undefined,
    enumForType: (t: string) => ODataEnumType<any> | undefined 
    structuredForType: (t: string) => ODataStructuredType<any> | undefined,
    concurrency: boolean;
    options: ParserOptions;
  }) {
    this.optionsForType = optionsForType;
    this.modelForType = modelForType;
    this.collectionForType = collectionForType;
    this.enumForType = enumForType;
    this.structuredForType = structuredForType;
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

  structuredType() {
    const structuredType = this.structuredForType ? this.structuredForType(this.type) : undefined;
    //Throw error if not found
    if (!structuredType)
      throw new Error(`Could not find structured type for ${this.parser.type}`);
    return structuredType;
  }

  isEnumType() {
    return this.parser.isEnumType();
  }

  enumType() {
    const enumType = this.enumForType ? this.enumForType(this.type) : undefined;
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
      const errors = this.parser?.validate(value, { method, navigation }) || [];
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
    const meta = this.optionsForType ? this.optionsForType(this.type) : undefined;
    return this.isStructuredType() && meta !== undefined
      ? meta.defaults()
      : this.default;
  }

  deserialize(value: any, options?: ParserOptions): F {
    const parserOptions = options ?? this.parserOptions;
    return this.parser.deserialize(value, parserOptions);
  }

  serialize(value: F, options?: ParserOptions): any {
    const parserOptions = options ?? this.parserOptions;
    return this.parser.serialize(value, parserOptions);
  }

  encode(value: F, options?: ParserOptions): any {
    const parserOptions = options ?? this.parserOptions;
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
    let Model = this.modelForType ? this.modelForType(this.type) : undefined;
    if (Model === undefined) throw Error(`No Model type for ${this.name}`);
    if (value !== undefined) {
      annots.update(value);
    }

    if (annots?.type !== undefined && Model.meta !== null) {
      const meta = Model.meta.findChildOptions((o) =>
        o.isTypeOf(annots.type as string)
      )?.structuredType;
      if (meta !== undefined && meta.model !== undefined)
        // Change to child model
        Model = meta.model;
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
    const Collection = this.collectionForType ? this.collectionForType(this.type) : undefined;
    if (Collection === undefined)
      throw Error(`No Collection type for ${this.name}`);
    return new Collection(
      (value || []) as Partial<F>[] | { [name: string]: any }[],
      {
        annots: annots,
        reset,
        parent: [parent, this],
      }
    ) as ODataCollection<F, ODataModel<F>>;
  }
}

export class ODataModelAttribute<T> {
  private value?: T | ODataModel<T> | ODataCollection<T, ODataModel<T>> | null;
  private change?: T | ODataModel<T> | ODataCollection<T, ODataModel<T>> | null;
  private subscription?: Subscription;
  events$ = new ODataModelEventEmitter<T>();

  constructor(
    private _model: ODataModel<any>,
    private _field: ODataModelField<T>
  ) { }

  get type() {
    return this._field.type;
  }

  get navigation() {
    return this._field.navigation;
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
  structuredType: ODataStructuredType<T>;
  entitySet?: ODataEntitySet;
  // Hierarchy
  parent?: ODataModelOptions<any>;
  children: ODataModelOptions<any>[] = [];
  events$ = new ODataModelEventEmitter<T>();

  constructor({
    config,
    structuredType,
  }: {
    config: ModelOptions;
    structuredType: ODataStructuredType<T>;
  }) {
    this.name = structuredType.name;
    this.base = structuredType.base;
    this.structuredType = structuredType;
    this.cid = config?.cid ?? CID_FIELD_NAME;
    config.fields.forEach((value, key) => this.addField<any>(key, value));
  }

  get api() {
    return this.structuredType.api;
  }

  type({ alias = false }: { alias?: boolean } = {}) {
    return this.structuredType.type({ alias });
  }

  isOpenType() {
    return this.structuredType.isOpenType();
  }

  isEntityType() {
    return this.structuredType.isEntityType();
  }

  isComplexType() {
    return this.structuredType.isComplexType();
  }

  isTypeOf(type: string) {
    return this.structuredType.type() === type;
  }

  isModelFor(entity: T | { [name: string]: any }) {
    // Resolve By Type
    const type = this.api.options.helper.type(
      entity as { [name: string]: any }
    );
    if (type && this.isTypeOf(type)) return true;
    // Resolve By fields
    const keys = Object.keys(entity as { [name: string]: any });
    const names = this.fields({
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
    for (const ch of this.children) {
      match = ch.findChildOptions(predicate);
      if (match !== undefined) break;
    }
    return match;
  }

  configure({
    options,
  }: {
    options: ParserOptions;
  }) {
    if (this.base) {
      const parent = this.api.optionsForType(this.base) as ODataModelOptions<any>;
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
      const concurrency = concurrencyFields.indexOf(field.field) !== -1;
      field.configure({
        optionsForType: (t: string) => this.api.optionsForType(t),
        modelForType: (t: string) => this.api.modelForType(t),
        collectionForType: (t: string) => this.api.collectionForType(t),
        enumForType: (t: string) => this.api.findEnumType(t),
        structuredForType: (t: string) => this.api.findStructuredType(t),
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
    const field = this.findField<F>(name);
    //Throw error if not found
    if (!field) throw new Error(`No field with name ${name as string}`);
    return field as ODataModelField<F>;
  }

  findField<F>(name: keyof T | string, {reset}: {reset?: boolean} = {}): ODataModelField<F> | undefined {
    return this.fields({
      include_parents: true,
      include_navigation: true,
    }).find(
      (modelField: ODataModelField<F>) => (reset && modelField.field === name) || modelField.name === name
    ) as ODataModelField<F> | undefined;
  }

  addField<F>(name: string, options: ModelFieldOptions) {
    const { field, parser, ...opts } = options;
    if (field === undefined || name === undefined)
      throw new Error('Model Properties need name and field');
    const fieldParser = parser ?? this.structuredType.field<F>(field as keyof T);
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
    type: EdmType | string
  ) {
    const structuredFieldParser = this.structuredType.addField<F>(name, { type });
    structuredFieldParser.configure({
      parserForType: (type: EdmType | string) => this.api.parserForType(type),
      options: this.api.options,
    });
    const modelField = this.addField<F>(name, {
      field: name,
      parser: structuredFieldParser,
    });
    modelField.configure({
      optionsForType: (t: string) => this.api.optionsForType(t),
      modelForType: (t: string) => this.api.modelForType(t),
      collectionForType: (t: string) => this.api.collectionForType(t),
      enumForType: (t: string) => this.api.findEnumType(t),
      structuredForType: (t: string) => this.api.findStructuredType(t),
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
      resource.outgoingType() !== self._resource.outgoingType() &&
      !self._resource.isSubtypeOf(resource)
    )
      throw new Error(
        `Can't attach ${resource.outgoingType()} to ${self._resource.outgoingType()}`
      );

    const current = self._resource;
    if (current === null || !current.isEqualTo(resource)) {
      self._resource = resource;
      self.events$.trigger(ODataModelEventType.Attach, {
        previous: current,
        value: resource,
      });
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
  ): ODataResource<T> | null {
    let resource: ODataResource<any> | null = null;
    let prevField: ODataModelField<any> | null = null;
    for (const [model, field] of ODataModelOptions.chain(child)) {
      resource = resource || (model._resource as ODataResource<T>);
      if (resource === null) break;
      if (
        ODataModelOptions.isModel(model) &&
        (prevField === null || prevField.collection)
      ) {
        const m = model as ODataModel<any>;
        // Resolve subtype if collection not is from field
        // FIXME
        /*
        if (field === null) {
          const r = m._meta.modelResourceFactory(resource.cloneQuery<T>());
          if (r !== null && !r.isTypeOf(resource) && r.isSubtypeOf(resource)) {
            resource = r;
          }
        }
        */
        // Resolve key
        const mKey = m.key({ field_mapping: true }) as EntityKey<any>;
        if (mKey !== undefined) {
          resource =
            resource instanceof ODataEntitySetResource
              ? resource.entity(mKey)
              : (resource as ODataEntityResource<T>).key(mKey);
        }
      }
      prevField = field;
      if (field === null && model._resource !== null) {
        // Apply the query from model to new resource
        model._resource.query((qs) =>
          resource?.query((qd) => qd.restore(qs.store()))
        );
      } else if (field !== null) {
        resource = field.resourceFactory<any, any>(resource);
      }
    }
    return resource;
  }

  collectionResourceFactory(
    query?: ODataQueryOptions<T>
  ):
    | ODataEntitySetResource<T>
    | ODataNavigationPropertyResource<T>
    | ODataPropertyResource<T>
    | null {
    if (this.entitySet === undefined) return null;
    return ODataEntitySetResource.factory<T>(this.api, {
      path: this.entitySet.name,
      type: this.entitySet.entityType,
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
    | null {
    const resource = this.collectionResourceFactory(query);
    if (resource instanceof ODataEntitySetResource) return resource.entity();
    return resource as
      | ODataEntityResource<T>
      | ODataNavigationPropertyResource<T>
      | ODataPropertyResource<T>
      | ODataSingletonResource<T>
      | null;
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
      resource?: ODataResource<T> | null;
      annots?: ODataEntityAnnotations<T>;
    } = {}
  ) {
    // Events
    self.events$.subscribe((e) => this.events$.emit(e));

    // Parent
    if (parent !== undefined) {
      self._parent = parent;
    }

    // Resource
    if (self._parent === null && resource === undefined)
      resource = this.modelResourceFactory();
    if (resource) {
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
      annots ?? new ODataEntityAnnotations(ODataHelper[DEFAULT_VERSION]);

    // Fields
    this.fields({
      include_navigation: true,
      include_parents: true,
    }).forEach((field) => {
      Object.defineProperty(self, field.name, {
        configurable: true,
        get: () => this.get(self, field as ODataModelField<any>),
        set: (value: any) =>
          this.set(self, field as ODataModelField<any>, value),
      });
    });
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
    const keyTypes = this.structuredType.keys({ include_parents: true });
    const key = new Map<string, any>();
    for (const kt of keyTypes) {
      let v = value as any;
      let options = this as ODataModelOptions<any> | undefined;
      let field: ODataModelField<any> | undefined;
      for (const name of kt.name.split('/')) {
        if (options === undefined) break;
        field = options
          .fields({ include_navigation: false, include_parents: true })
          .find((field: ODataModelField<any>) => field.field === name);
        if (field !== undefined) {
          v = Types.isPlainObject(v) || ODataModelOptions.isModel(v) ? v[field.name] : v;
          options = this.api.optionsForType(field.type);
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
    for (const ref of attr.referentials) {
      const from = this.fields({
        include_navigation: false,
        include_parents: true,
      }).find((p: any) => p.field === ref.referencedProperty);
      const to = attr.options
        .fields({ include_navigation: false, include_parents: true })
        .find((field: ODataModelField<any>) => field.field === ref.property);
      if (from !== undefined && to !== undefined) {
        const name = field_mapping ? to.field : to.name;
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
    for (const ref of attr.referentials) {
      const from = this.fields({
        include_navigation: false,
        include_parents: true,
      }).find((field: ODataModelField<any>) => field.field === ref.property);
      const meta = this.api.optionsForType<any>(attr.type);
      const to = meta?.fields({ include_navigation: false, include_parents: true })
        .find(
          (field: ODataModelField<any>) =>
            field.field === ref.referencedProperty
        );
      if (from !== undefined && to !== undefined) {
        const name = field_mapping ? to.field : to.name;
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
      const value = (self as any)[field.name];
      const errs = field.validate(value, { method });
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
      const value = field.defaults();
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
      | ODataSingletonResource<T>
      | null,
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
    // Clone query from him or parent
    let query = self._resource?.cloneQuery<T>();
    if (
      query === undefined &&
      self._parent &&
      self._parent[0] instanceof ODataCollection
    )
      query = self._parent[0]._resource?.cloneQuery<T>();
    // Build new resource
    const resource = this.modelResourceFactory(query);
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
      include_id = false,
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
      include_id?: boolean;
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
            include_id: include_id && !!navigation,
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
            include_id: include_id && !!navigation,
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

    // Add id
    if (include_id) {
      self.asEntity((e) => {
        const resource = e.resource();
        if (resource)
          entity[this.api.options.helper.ODATA_ID] = `${resource.clearQuery()}`;
      });
    }

    // Add type
    if (
      self._parent !== null &&
      ((ODataModelOptions.isModel(self._parent[0]) &&
        self._parent[1] !== null && this.api.optionsForType(self._parent[1].type) !== self._meta) ||
        (ODataModelOptions.isCollection(self._parent[0]) &&
          (self._parent[0] as ODataCollection<any, ODataModel<any>>)._model.meta !== self._meta))
    ) {
      entity[this.api.options.helper.ODATA_TYPE] = `#${this.structuredType.type()}`;
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
      self.events$.trigger(ODataModelEventType.Reset, { options: { changes } });
    }
  }

  assign(
    self: ODataModel<T>,
    entity: Partial<T> | { [name: string]: any },
    {
      add = true,
      merge = true,
      remove = true,
      reset = false,
      reparent = false,
      silent = false,
    }: {
      add?: boolean;
      merge?: boolean;
      remove?: boolean;
      reset?: boolean;
      reparent?: boolean;
      silent?: boolean;
    } = {}
  ) {
    const changes: string[] = [];

    // Update annotations
    self.annots().update(entity);
    // Update attributes
    const attrs = self.annots().attributes(entity, 'full');
    Object.entries(attrs)
      .filter(([, value]) => value !== undefined) // Filter undefined
      .forEach(([key, value]) => {
        const field = this.findField(key, {reset});

        if (field !== undefined || this.isOpenType()) {
          // Delegated to private setter
          if (this.set(self, field ?? key, value, { add, merge, remove, reset, reparent, silent })) {
            changes.push(field?.name ?? key);
          }
        } else {
          // Basic assignment
          const current = (<any>self)[key];
          (<any>self)[key] = value;
          if (current !== value) changes.push(key);
        }
      });

    if (!silent && changes.length > 0) {
      self.events$.trigger(
        reset ? ODataModelEventType.Reset : ODataModelEventType.Update,
        { options: { changes } }
      );
    }
    return self;
  }

  static isModel(obj: any) {
    return Types.rawType(obj) === 'Model';
  }

  static isCollection(obj: any) {
    return Types.rawType(obj) === 'Collection';
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
    { add, merge, remove, reset, reparent, silent, type }: { 
      add?: boolean;
      merge?: boolean;
      remove?: boolean;
      reset?: boolean;
      reparent?: boolean;
      silent?: boolean;
      type?: EdmType | string 
    } = {}
  ): boolean {
    let modelField =
      field instanceof ODataModelField ? field : this.findField<F>(field);
    if (
      modelField === undefined &&
      this.isOpenType() &&
      typeof field === 'string'
    ) {
      type = type ?? this.tsToEdm[typeof value] ?? EdmType.String;
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
        changed = attr.set(value as null, reset, reparent);
      } else if (ODataModelOptions.isCollection(current)) {
        // Current is collection
        const currentCollection = current as ODataCollection<F, ODataModel<F>>;
        if (ODataModelOptions.isCollection(value)) {
          // New value is collection
          changed = attr.set(
            value as ODataCollection<F, ODataModel<F>>,
            reset,
            reparent
          );
        } else if (Types.isArray(value)) {
          // New value is array
          currentCollection._annotations = modelField.annotationsFactory(
            self.annots()
          ) as ODataEntitiesAnnotations<F>;
          currentCollection.assign(value as Partial<T>[] | { [name: string]: any }[], {
            add,
            merge,
            remove,
            reset,
            reparent,
            silent});
          changed = currentCollection.hasChanged();
        }
      } else if (ODataModelOptions.isModel(current)) {
        // Current is model
        const currentModel = current as ODataModel<F>;
        if (ODataModelOptions.isModel(value)) {
          // New value is model
          changed = attr.set(
            value as ODataModel<F>,
            reset,
            reparent
          );
        } else if (Types.isPlainObject(value)) {
          currentModel._annotations = modelField.annotationsFactory(
            self.annots()
          ) as ODataEntityAnnotations<F>;
          currentModel.assign(value as F | { [name: string]: any }, {
            add,
            merge,
            remove,
            reset,
            reparent,
            silent});
          changed = currentModel.hasChanged();
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
                reset: reset,
              })
              : modelField.modelFactory<F>({
                parent: self,
                value: value,
                reset: reset,
              }),
          reset,
          reparent
        );
      }

      // Resolve referentials
      if (!ODataModelOptions.isCollection(attr.get())) {
        const meta = this.api.optionsForType<F>(modelField.type);
        const ref = meta?.resolveReferential(attr.get(), attr);
        if (ref !== null && ref !== undefined) {
          Object.assign(self, ref);
        }
      }
    } else {
      changed = attr.set(value, reset, reparent);
    }

    if (!silent && changed) {
      self.events$.trigger(ODataModelEventType.Change, {
        attr,
        value,
        previous: current,
        options: { key: modelField.isKey() },
      });
    }

    return changed;
  }

  private _link<F>(self: ODataModel<T>, attr: ODataModelAttribute<F>) {
    attr.events$.subscribe((event: ODataModelEvent<any>) => {
      if (event.canContinueWith(self)) {
        if (event.model === attr.get()) {
          if (
            event.type === ODataModelEventType.Change &&
            attr.navigation &&
            event.options?.key
          ) {
            const ref = (attr.get() as ODataModel<any>).referential(attr);
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
