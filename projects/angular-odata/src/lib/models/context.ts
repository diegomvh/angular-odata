import { ODataEntityAnnotations } from '../annotations';
import { ODataApi } from '../api';
import { CACHE_KEY_SEPARATOR } from '../constants';
import { ModelFieldOptions, ModelOptions, ODataCollection, ODataModel, ODataModelField, ODataModelOptions } from '../models';
import { ODataEntityResource, ODataNavigationPropertyResource, ODataPropertyResource, ODataSingletonResource } from '../resources';
import { ODataStructuredType } from '../schema';
import { ODataApiConfig, ParserOptions } from '../types';

const RESERVED_FIELD_NAMES = Object.getOwnPropertyNames(ODataModel.prototype);

export class ODataModelContext {
  api: ODataApi;
  // Models
  models: { [type: string]: typeof ODataModel<any> } = {};
  // Collections
  collections: { [type: string]: typeof ODataCollection<any, ODataModel<any>> } = {};
  // Entires
  entries: Map<string, ODataModel<any>>;

  constructor(api: ODataApi, config: ODataApiConfig) {
    this.api = api;
    this.models = (config.models ?? {}) as { [type: string]: typeof ODataModel<any> };
    this.collections = (config.collections ?? {}) as {
      [type: string]: typeof ODataCollection<any, ODataModel<any>>;
    };
    this.entries = new Map<string, ODataModel<any>>();
  }

  /**
   * Using the resource on the request build an array of string to identify the scope of the request
   * @param obj The request with the resource to build the scope
   * @returns Array of string to identify the scope of the request
   */
  scope(obj: ODataModelOptions<any>): string[] {
    return ['model', obj.name, obj.type()];
  }

  /**
   * Using the odata context on the response build an array of string to identify the tags of the response
   * @param res The response to build the tags
   * @returns Array of string to identify the tags of the response
   */
  tags(obj: ODataModelOptions<any>): string[] {
    return [obj.name];
  }

  configure({ options }: { options: ParserOptions }) {
    Object.entries(this.models).forEach(([type, model]) => {
      const structured = this.api.findStructuredType<any>(type);
      if (structured !== undefined) {
        this.configureModel<any>(structured, model, options);
        const collection = this.collections[type];
        if (collection !== undefined) {
          collection.model = model;
        }
      }
    });
  }

  public configureModel<T>(structured: ODataStructuredType<T>, model: typeof ODataModel<T>, options: ParserOptions) {
    model.meta = this.optionsForType<T>(structured.type(), {
      config: model.options,
      structuredType: structured,
    })!;
    if (model.meta !== undefined) {
      // Configure
      model.meta.configure({ options });
    }
  }

  public findModel<T>(type: string) {
    return (this.models[type] ?? this.api.findStructuredType<any>(type)?.model) as
      | typeof ODataModel<T>
      | undefined;
  }

  public createModel<T>(structured: ODataStructuredType<T>) {
    if (structured.model !== undefined) return structured.model;
    // Build Ad-hoc model
    const Model = class extends ODataModel<T> {} as typeof ODataModel<T>;
    // Store New Model structured for next time
    structured.model = Model;
    return Model;
  }

  public modelForType<T>(type: string) {
    let Model = this.findModel<T>(type);
    if (Model === undefined) {
      const structured = this.api.findStructuredType<T>(type);
      if (structured === undefined) throw Error(`No structured type for ${type}`);
      Model = this.createModel<T>(structured);
      this.configureModel<T>(structured, Model, this.api.options.parserOptions);
    }
    return Model;
  }

  public createModelInstance<T>(
    Klass: typeof ODataModel,
    data: Partial<T> | { [name: string]: any } = {},
    {
      parent,
      resource,
      annots,
      reset = false,
    }: {
      parent?: [
        ODataModel<any> | ODataCollection<any, ODataModel<any>>,
        ODataModelField<any> | null,
      ];
      resource?:
        | ODataEntityResource<T>
        | ODataNavigationPropertyResource<T>
        | ODataPropertyResource<T>
        | ODataSingletonResource<T>,
      annots?: ODataEntityAnnotations<T>;
      reset?: boolean;
    } = {},
  ) {
    return new Klass(data, {
      parent,
      resource,
      annots,
      reset,
    }) as ODataModel<T>;
    /*
    const key = Klass.meta.resolveKey(data);
    if (key !== undefined) {
      const entryKey = this.buildKey([Klass.meta.type(), JSON.stringify(key)]);
      const model = this.entries.get(entryKey) as ODataModel<T> | undefined;
      if (model !== undefined) {
        if (parent !== undefined)
          model._parent = parent;
        if (resource !== undefined) 
          model.attach(resource);
        if (annots !== undefined)
          model._annotations = annots;
        return model;
      }
    }
    const model = new Klass(data, {
      parent,
      resource,
      annots,
      reset,
    }) as ODataModel<T>;

    if (model.key() !== undefined) {
        const entryKey = this.buildKey([Klass.meta.type(), JSON.stringify(model.key())]);
      this.entries.set(entryKey, model);
    }
    return model;
    */
  }

  public findCollection<T>(type: string) {
    return (this.collections[type] ?? this.api.findStructuredType<any>(type)?.collection) as
      | typeof ODataCollection<T, ODataModel<T>>
      | undefined;
  }

  public createCollection<T>(structured: ODataStructuredType<T>, model?: typeof ODataModel<T>) {
    if (structured.collection !== undefined) return structured.collection;
    if (model === undefined) model = this.createModel(structured);
    // Build Ad-hoc collection
    const Collection = class extends ODataCollection<T, ODataModel<T>> {
      static override model = model!;
    } as typeof ODataCollection<T, ODataModel<T>>;
    // Store New Collection structured for next time
    structured.collection = Collection;
    return Collection;
  }

  public collectionForType<T>(type: string) {
    let Collection = this.findCollection<T>(type);
    if (Collection === undefined) {
      const structured = this.api.findStructuredType<T>(type);
      if (structured === undefined) throw Error(`No structured type for ${type}`);
      const Model = this.modelForType<T>(type);
      Collection = this.createCollection<T>(structured, Model) as typeof ODataCollection<
        T,
        ODataModel<T>
      >;
    }
    return Collection;
  }

  // Memoize
  private memo: {
    options: Map<string, ODataModelOptions<any> | undefined>;
  } = {
    options: new Map<string, ODataModelOptions<any> | undefined>(),
  };

  public optionsForType<T>(
    type: string,
    {
      structuredType,
      config,
    }: { structuredType?: ODataStructuredType<T>; config?: ModelOptions } = {},
  ) {
    // Strucutred Options
    if (this.memo.options.has(type)) {
      return this.memo.options.get(type) as ODataModelOptions<T> | undefined;
    }

    let meta: ODataModelOptions<T> | undefined = undefined;
    structuredType = this.api.findStructuredType<T>(type) ?? structuredType;
    if (structuredType !== undefined) {
      if (config === undefined) {
        const fields = structuredType
          .fields({ include_navigation: true, include_parents: true })
          .reduce((acc, field) => {
            let name = field.name;
            // Prevent collision with reserved keywords
            while (RESERVED_FIELD_NAMES.includes(name)) {
              name = name + '_';
            }
            return Object.assign(acc, {
              [name]: {
                field: field.name,
                default: field.default,
                required: !field.nullable,
              },
            });
          }, {});
        config = {
          fields: new Map<string, ModelFieldOptions>(Object.entries(fields)),
        };
      }
      meta = new ODataModelOptions<T>({ config, structuredType, context: this });
    }
    // Set Options for next time
    this.memo.options.set(type, meta);
    return meta;
  }

  /**
   * Build a key from store an entry in the cache
   * @param names The names of the entry
   * @returns The key for the entry
   */
  buildKey(names: string[]): string {
    return names.join(CACHE_KEY_SEPARATOR);
  }
}
