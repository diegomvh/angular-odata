export const ENTITYSET_VALUE = "value";

export class ODataEntitySet<T> {
  public static readonly ODATA_COUNT = '@odata.count';
  public static readonly ODATA_NEXTLINK = '@odata.nextLink';

  [ENTITYSET_VALUE]: T[];

  constructor(json: any) {
    Object.assign(this, {[ENTITYSET_VALUE]:[]}, json);
  }

  get entities(): T[] {
    return this[ENTITYSET_VALUE];
  }

  get count(): number {
    return this[ODataEntitySet.ODATA_COUNT] as number;
  }

  get nextLink(): string {
    return decodeURIComponent(this[ODataEntitySet.ODATA_NEXTLINK]) as string;
  }

  get skip(): number {
    let match = (this.nextLink || "").match(/\$skip=(\d+)/);
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
