import { ODataCollection, ODataModelOptions } from '../models';
import { ODataModel } from '../models/model';
import { JsonSchemaOptions, ODataEntityTypeKey, ODataStructuredTypeFieldParser, ODataStructuredTypeParser } from '../parsers';
import { Annotation, EntityKey, Parser, StructuredTypeConfig } from '../types';
import { ODataAnnotation } from './annotation';
import { ODataSchema } from './schema';

export class ODataStructuredType<T> {
  schema: ODataSchema;
  base?: string;
  parent?: ODataStructuredType<any>;
  children: ODataStructuredType<any>[] = [];
  name: string;
  model?: typeof ODataModel;
  collection?: typeof ODataCollection;
  parser: ODataStructuredTypeParser<T>;
  annotations: ODataAnnotation[];

  constructor(config: StructuredTypeConfig<T>, schema: ODataSchema) {
    this.schema = schema;
    this.name = config.name;
    this.base = config.base;
    this.parser = new ODataStructuredTypeParser(config, schema.namespace, schema.alias);
    this.annotations = (config.annotations || []).map(annot => new ODataAnnotation(annot));
    if (config.model !== undefined) {
      this.model = config.model as typeof ODataModel;
      this.model._options = new ODataModelOptions<T>(config, this);
      if (config.collection !== undefined) {
        this.collection = config.collection as typeof ODataCollection;
        this.collection._model = this.model;
      }
    }
  }

  configure(settings: { findParserForType: (type: string) => Parser<any>, findOptionsForType: (type: string) => ODataModelOptions<any> | undefined }) {
    if (this.base) {
      const parent = this.api.findStructuredTypeForType(this.base) as ODataStructuredType<any>;
      parent.children.push(this);
      this.parent = parent;
    }
    const parserSettings = { options: this.api.options, ...settings };
    this.parser.configure(parserSettings);
    if (this.model !== undefined && this.model._options !== null) {
      const optionsSettings = { properties: this.model._properties || [], options: this.api.options, ...settings };
      this.model._options.configure(optionsSettings);
    }
  }

  type({alias = false}: {alias?: boolean} = {}) {
    return `${alias ? this.schema.alias : this.schema.namespace}.${this.name}`;
  }

  isTypeOf(type: string) {
    return this.parser.isTypeOf(type);
  }

  get api() {
    return this.schema.api;
  }

  findAnnotation(predicate: (annot: Annotation) => boolean) {
    return this.annotations.find(predicate);
  }

  fields({include_navigation = false, include_parents = true}: {
    include_parents?: boolean,
    include_navigation?: boolean
  } = {}): ODataStructuredTypeFieldParser<any>[] {
    return [
      ...((include_parents && this.parent !== undefined) ? this.parent.fields({include_parents, include_navigation}) : []),
      ...this.parser.fields.filter(field => include_navigation || !field.navigation)
    ];
  }

  keys({include_parents = true}: {
    include_parents?: boolean
  } = {}): ODataEntityTypeKey[] {
    return [
      ...((include_parents && this.parent !== undefined) ? this.parent.keys({include_parents}) : []),
      ...(this.parser.keys || [])
    ];
  }

  pick(value: { [name: string]: any }, {include_parents = true, include_navigation = false, include_etag = true}: {
    include_parents?: boolean,
    include_navigation?: boolean,
    include_etag?: boolean
  } = {}): Partial<T> {
    const names = this.fields({include_parents, include_navigation}).map(f => f.name);
    let attrs = Object.keys(value)
      .filter(k => names.indexOf(k) !== -1)
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

  resolveKey(attrs: T | {[name: string]: any}) {
    return this.parser.resolveKey(attrs);
  }

  defaults() {
    return this.parser.defaults();
  }

  toJsonSchema(options: JsonSchemaOptions<T> = {}) {
    return this.parser.toJsonSchema(options);
  }

  validate(attrs: Partial<T>, {create = false, patch = false}: {create?: boolean, patch?: boolean} = {}) {
    return this.parser.validate(attrs, {create, patch});
  }
}
