export const PROPERTY_VALUE = 'value';

export class ODataProperty<T> {

  [PROPERTY_VALUE]: T;

  constructor(json: any) {
    Object.assign(this, {[PROPERTY_VALUE]: null}, json);
  }

  get property(): T {
    return this[PROPERTY_VALUE];
  }
}
