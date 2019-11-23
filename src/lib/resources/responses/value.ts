import { VALUE } from '../../types';

export class ODataValue<T> {
  [VALUE]: T;

  constructor(data: {[VALUE]: T}) {
    let keys = Object.keys(data);
    let metadata = keys.filter(k => k.startsWith("@odata"))
      .reduce((acc, k) => Object.assign(acc, {[k]: data[k]}), {});
    Object.assign(this, metadata);
    this[VALUE] = data[VALUE];
  }
}
