import { PROPERTY_VALUE } from '../../types';

export class ODataValue<T> {
  [PROPERTY_VALUE]: T;

  constructor(data: {[PROPERTY_VALUE]: T}) {
    Object.assign(this, data);
  }
}
