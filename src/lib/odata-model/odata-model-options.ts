import { EventEmitter } from "@angular/core";

export class ODataModelOptions<M> {
  fields: any[];
  relations: any[];
  defaults: any;

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
