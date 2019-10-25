import { PROPERTY_VALUE } from '../../types';

export class ODataProperty<T> {
  [PROPERTY_VALUE]: T;

  constructor(data: {[PROPERTY_VALUE]: T}) {
    Object.assign(this, data);
  }
}
