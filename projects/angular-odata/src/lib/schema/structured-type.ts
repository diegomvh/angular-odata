import { JsonSchemaOptions, ODataStructuredTypeFieldParser, ODataStructuredTypeParser } from '../parsers';
import { Annotation, EntityKey, Parser, StructuredTypeConfig } from '../types';
import { Types } from '../utils/types';
import { ODataAnnotation } from './annotation';
import { ODataSchema } from './schema';

export class ODataStructuredType<T> {
  schema: ODataSchema;
  name: string;
  model?: { new(...params: any[]): any };
  collection?: { new(...params: any[]): any };
  parser: ODataStructuredTypeParser<T>;
  annotations: ODataAnnotation[];

  constructor(config: StructuredTypeConfig<T>, schema: ODataSchema) {
    this.schema = schema;
    this.name = config.name;
    this.model = config.model;
    this.collection = config.collection;
    this.parser = new ODataStructuredTypeParser(config, schema.namespace, schema.alias);
    this.annotations = (config.annotations || []).map(annot => new ODataAnnotation(annot));
  }

  isTypeOf(type: string) {
    var names = [`${this.schema.namespace}.${this.name}`];
    if (this.schema.alias)
      names.push(`${this.schema.alias}.${this.name}`);
    return names.indexOf(type) !== -1;
  }

  get api() {
    return this.schema.api;
  }

  findAnnotation(predicate: (annot: Annotation) => boolean) {
    return this.annotations.find(predicate);
  }

  configure(settings: { findParserForType: (type: string) => Parser<any> }) {
    const parserSettings = Object.assign({ options: this.api.options }, settings);
    this.parser.configure(parserSettings);
  }

  fields(opts: {
    include_parents?: boolean,
    include_navigation?: boolean
  } = { include_navigation: false, include_parents: true }): ODataStructuredTypeFieldParser<any>[] {
    let parent = this.parser as ODataStructuredTypeParser<any> | undefined;
    let fields = <ODataStructuredTypeFieldParser<any>[]>[];
    while (parent !== undefined) {
      fields = [
        ...parent.fields.filter(field => opts.include_navigation || !field.navigation),
        ...fields
      ];
      if (!opts.include_parents)
        break;
      parent = parent.parent;
    }
    return fields;
  }

  pick(value: { [name: string]: any }, opts: {
    include_parents?: boolean,
    include_navigation?: boolean,
    include_etag?: boolean
  } = { include_navigation: false, include_parents: true, include_etag: true }): Partial<T> {
    const names = this.fields(opts).map(f => f.name);
    let attrs = Object.keys(value)
      .filter(k => names.indexOf(k) !== -1)
      .reduce((acc, k) => Object.assign(acc, { [k]: value[k] }), {});
    if (opts.include_etag) {
      const etag = this.api.options.helper.etag(value);
      this.api.options.helper.etag(attrs, etag);
    }
    return attrs;
  }

  resolveKey(attrs: any): EntityKey<T> | undefined {
    let key = this.parser.keys()
      .reduce((acc, f) => Object.assign(acc, { [f.name]: f.resolve(attrs) }), {}) as any;
    const values = Object.values(key);
    if (values.length === 1) {
      // Single primitive key value
      key = values[0];
    } else if (values.some(v => v === undefined)) {
      // Compose key, needs all values
      key = null;
    }
    return !Types.isEmpty(key) ? key : undefined;
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
