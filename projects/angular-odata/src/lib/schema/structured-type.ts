import { ODataCollection, ODataModelOptions } from '../models';
import { ODataModel } from '../models/model';
import {
  JsonSchemaOptions,
  ODataEntityTypeKey,
  ODataStructuredTypeFieldParser,
  ODataStructuredTypeParser,
} from '../parsers';
import { Parser, StructuredTypeConfig } from '../types';
import { ODataAnnotation } from './annotation';
import { ODataSchema } from './schema';

export class ODataStructuredType<T> {
  name: string;
  schema: ODataSchema;
  base?: string;
  open: boolean;
  parent?: ODataStructuredType<any>;
  children: ODataStructuredType<any>[] = [];
  model?: typeof ODataModel;
  collection?: typeof ODataCollection;
  parser: ODataStructuredTypeParser<T>;
  annotations: ODataAnnotation[];

  constructor(config: StructuredTypeConfig<T>, schema: ODataSchema) {
    this.schema = schema;
    this.name = config.name;
    this.base = config.base;
    this.open = config.open || false;
    this.parser = new ODataStructuredTypeParser(
      config,
      schema.namespace,
      schema.alias
    );
    this.annotations = (config.annotations || []).map(
      (annot) => new ODataAnnotation(annot)
    );
    if (config.model !== undefined) {
      this.model = config.model as typeof ODataModel;
      const options = this.model.hasOwnProperty('options')
        ? this.model.options
        : { fields: {} };
      this.model.meta = new ODataModelOptions<T>(options, this);
      if (config.collection !== undefined) {
        this.collection = config.collection as typeof ODataCollection;
        this.collection.model = this.model;
      }
    }
  }

  get api() {
    return this.schema.api;
  }

  configure({
    findParserForType,
    findOptionsForType,
  }: {
    findParserForType: (type: string) => Parser<any>;
    findOptionsForType: (type: string) => ODataModelOptions<any> | undefined;
  }) {
    if (this.base) {
      const parent = this.api.findStructuredTypeForType(
        this.base
      ) as ODataStructuredType<any>;
      parent.children.push(this);
      this.parent = parent;
    }
    this.parser.configure({ options: this.api.options, findParserForType });
    if (this.model !== undefined && this.model.options !== null) {
      this.model.meta.configure({
        options: this.api.options,
        findOptionsForType,
      });
    }
  }

  type({ alias = false }: { alias?: boolean } = {}) {
    return `${alias ? this.schema.alias : this.schema.namespace}.${this.name}`;
  }

  isTypeOf(type: string) {
    return this.parser.isTypeOf(type);
  }

  isSimpleKey() {
    return this.keys().length === 1;
  }

  isCompoundKey() {
    return this.keys().length > 1;
  }

  findAnnotation(predicate: (annot: ODataAnnotation) => boolean) {
    return this.annotations.find(predicate);
  }

  fields({
    include_navigation = false,
    include_parents = true,
  }: {
    include_parents?: boolean;
    include_navigation?: boolean;
  } = {}): ODataStructuredTypeFieldParser<any>[] {
    return [
      ...(include_parents && this.parent !== undefined
        ? this.parent.fields({ include_parents, include_navigation })
        : []),
      ...this.parser.fields.filter(
        (field) => include_navigation || !field.navigation
      ),
    ];
  }

  keys({
    include_parents = true,
  }: {
    include_parents?: boolean;
  } = {}): ODataEntityTypeKey[] {
    return [
      ...(include_parents && this.parent !== undefined
        ? this.parent.keys({ include_parents })
        : []),
      ...(this.parser.keys || []),
    ];
  }

  pick(
    value: { [name: string]: any },
    {
      include_parents = true,
      include_navigation = false,
      include_etag = true,
    }: {
      include_parents?: boolean;
      include_navigation?: boolean;
      include_etag?: boolean;
    } = {}
  ): Partial<T> {
    const names = this.fields({ include_parents, include_navigation }).map(
      (f) => f.name
    );
    let attrs = Object.keys(value)
      .filter((k) => names.indexOf(k) !== -1)
      .reduce((acc, k) => Object.assign(acc, { [k]: value[k] }), {});
    if (include_etag) {
      const etag = this.api.options.helper.etag(value);
      this.api.options.helper.etag(attrs, etag);
    }
    return attrs;
  }

  deserialize(value: any): T {
    return this.parser.deserialize(value, this.api.options);
  }

  serialize(value: T): any {
    return this.parser.serialize(value, this.api.options);
  }

  encode(value: T): any {
    return this.parser.encode(value, this.api.options);
  }

  resolveKey(attrs: T | { [name: string]: any }) {
    return this.parser.resolveKey(attrs);
  }

  defaults() {
    return this.parser.defaults();
  }

  toJsonSchema(options: JsonSchemaOptions<T> = {}) {
    return this.parser.toJsonSchema(options);
  }

  validate(
    attrs: Partial<T>,
    {
      method,
      navigation = false,
    }: {
      method?: 'create' | 'update' | 'patch';
      navigation?: boolean;
    } = {}
  ) {
    return this.parser.validate(attrs, { method, navigation });
  }
}
