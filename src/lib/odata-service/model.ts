import { ODataClient } from '../client';
import { ODataContext } from '../context';
import { Model, Collection, Field } from '../odata-model';
import { PlainObject, ODataEntityRequest } from '../odata-request';

export class ODataModelService {
  constructor(protected odata: ODataClient, protected context: ODataContext) { }

  model<M extends Model>(type: string): typeof Model {
    let klass = this.context.getModel(type);
    klass.service = this;
    klass.query = this.odata.entitySet<M>(klass.set).entity();
    return klass
  }

  collection<M extends Model>(type: string): typeof Collection {
    let klass = this.context.getCollection(type);
    klass.service = this;
    klass.query = this.odata.entitySet<M>(klass.set);
    return klass;
  }

  parse(field: Field, value: any) {
    if (field.ctor) {
      let klass = (field.collection)? 
        this.collection(field.type):
        this.model(field.type);
        return new klass(value || (field.collection? [] : {}));
    }
    if (value == null) return value;
    switch (field.type) {
      case 'String': return typeof (value) === "string" ? value : value.toString();
      case 'Number': return typeof (value) === "number" ? value : parseInt(value.toString(), 10);
      case 'Boolean': return typeof (value) === "boolean" ? value : !!value;
      case 'Date': return value instanceof Date ? value : new Date(value);
    }
    return value;
  }

  toJSON(field: Field, value: any) {
    if (field.ctor) {
      return value.toJSON();
    }
    if (value == null) return value;
    switch (field.type) {
      case 'String': return typeof (value) === "string" ? value : value.toString();
      case 'Number': return typeof (value) === "number" ? value : parseInt(value.toString(), 10);
      case 'Boolean': return typeof (value) === "boolean" ? value : !!value;
      case 'Date': return value instanceof Date ? value.toISOString() : value;
    }
    return value;
  }

  deserialize(model: Model, attrs: PlainObject) {
    let ctor = <typeof Model>model.constructor;
    let schema = ctor.schema;
    schema.properties.forEach(f => {
      if (f.name in attrs) {
        model[f.name] = this.parse(f, attrs[f.name]);
      }
    });
  }

  serialize(model: Model) {
    let ctor = <typeof Model>model.constructor;
    let schema = ctor.schema;
    return schema.properties.reduce((acc, f) => {
      if (f.name in model) {
        acc[f.name] = this.toJSON(f, model[f.name]);
      }
      return acc;
    }, {});
  }

  relationships(model: Model, attrs: PlainObject) {
    let ctor = <typeof Model>model.constructor;
    let schema = ctor.schema;
    let parse = this.parse;
    model.relationships = {};
    schema.navigations.forEach(field => {
      Object.defineProperty(model, field.name, {
        get() {
          if (!(field.name in this.relationships)) {
            let query = this.query.clone() as ODataEntityRequest<Model>;
            if (this.isNew())
              throw new Error(`Can't resolve ${field.name} relation from new entity`)
            query.key(this.resolveKey());
            let nav = query.navigationProperty<any>(field.name);
            this.relationships[field.name] = parse(field, attrs[field.name]) as Model | Collection<Model>;
            this.relationships[field.name].setQuery(nav);
          }
          return this.relationships[field.name];
        },
        set(value: Model | null) {
          if (field.collection)
            throw new Error(`Can't set ${field.name} to collection, use add`);
          if (!((value as Model).query instanceof ODataEntityRequest))
            throw new Error(`Can't set ${value} to model`);
          this.relationships[field.name] = value;
          /*
          let query = this._query.clone() as ODataQueryBuilder;
          query.entityKey(this.resolveKey());
          query.navigationProperty(field.name);
          this._relationships[field.name] = this._context.createInstance(
            field.type, value !== null ? value.toJSON() : {}, query);
          this.setState(ModelState.Modified);
          this._relationships[field.name].setState(value !== null ? ModelState.Added : ModelState.Deleted);
          */
        }
      });
    });
  }


}
