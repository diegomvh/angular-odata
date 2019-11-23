import { ODATA_COUNT, ODATA_NEXTLINK, VALUE } from '../../types';

export class ODataCollection<T> {
  [VALUE]: T[];

  constructor(data: {[VALUE]: T[]}) {
    let keys = Object.keys(data);
    let metadata = keys.filter(k => k.startsWith("@odata"))
      .reduce((acc, k) => Object.assign(acc, {[k]: data[k]}), {});
    Object.assign(this, metadata);
    this[VALUE] = data[VALUE];
  }

  get count(): number {
    return this[ODATA_COUNT] as number;
  }

  get nextLink(): string {
    return decodeURIComponent(this[ODATA_NEXTLINK]) as string;
  }

  get skip(): number {
    let match = (this.nextLink || "").match(/\$skip=(\d+)/);
    if (match) return Number(match[1]);
    match = (this.nextLink || "").match(/\$skiptoken=(\d+)/);
    if (match) return Number(match[1]);
  }

  get skiptoken(): string {
    let match = (this.nextLink || "").match(/\$skiptoken=([\d\w\s]+)/);
    if (match) return match[1];
  }
  
  public [Symbol.iterator]() {
    let pointer = 0;
    let models = this[VALUE];
    return {
      next(): IteratorResult<T> {
        return {
          done: pointer === models.length,
          value: models[pointer++]
        };
      }
    }
  }
}