export class ODataModelOptions<M> {
  fields: any[];
  relations: any[];
  defaults: any;

  constructor(opts: {fields: any[], relations?: any[], defaults?: any}) {
    Object.assign(this, {relations: [], defaults: {}}, opts);
  }

  attrs(value: any, parse: boolean) {
    let attrs = parse ? this.parse(value) : Object.create(value);
    return Object.assign({}, this.defaults, attrs);
  }

  parse(value) {
    return value;
  }

  json(model: M) {
    return model;
  }
}
