import { Schema } from '../schema';
import { ODATA_COUNT, ODATA_NEXTLINK } from '../constants';

export const ENTITYSET_VALUE = "value";

export class ODataEntitySet<T> {
  [ENTITYSET_VALUE]: T[];

  constructor(json: any, schema: Schema<T>) {
    // @odata
    let odata = Object.keys(json)
      .filter(k => k.startsWith("@odata"))
      .reduce((acc, k) => Object.assign(acc, {[k]: json[k]}), {});
    // Values
    let values = (ENTITYSET_VALUE in json && Array.isArray(json[ENTITYSET_VALUE]) ?
      json[ENTITYSET_VALUE] : []) as any[];
    
    Object.assign(this, odata);
    this[ENTITYSET_VALUE] = values.map(value => schema.deserialize(value));
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
    let models = this[ENTITYSET_VALUE];
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
