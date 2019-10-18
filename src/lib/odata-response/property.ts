import { Schema } from '../schema';

export const PROPERTY_VALUE = 'value';

export class ODataProperty<T> {

  [PROPERTY_VALUE]: T;

  constructor(json: any, schema: Schema<T>) {
    // @odata
    let odata = Object.keys(json)
      .filter(k => k.startsWith("@odata"))
      .reduce((acc, k) => Object.assign(acc, {[k]: json[k]}), {});
    // Values
    let value = PROPERTY_VALUE in json ? json[PROPERTY_VALUE] : null as any;

    Object.assign(this, odata);
    this[PROPERTY_VALUE] = value;
  }
}
