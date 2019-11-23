import { VALUE, ODATA_ETAG } from '../../types';

export class ODataSingle<T> {
  [VALUE] : T

  constructor(data: T) {
    let keys = Object.keys(data);
    let metadata = keys.filter(k => k.startsWith("@odata"))
      .reduce((acc, k) => Object.assign(acc, {[k]: data[k]}), {});
    let value = keys.filter(k => !k.startsWith("@odata"))
      .reduce((acc, k) => Object.assign(acc, {[k]: data[k]}), {});
    Object.assign(this, metadata);
    this[VALUE] = value as T;
  }

  get etag(): string {
    return this[ODATA_ETAG] as string;
  }
}
