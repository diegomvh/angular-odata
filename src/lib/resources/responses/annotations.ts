import { ODATA_ETAG, ODATA_COUNT, ODATA_NEXTLINK, ODATA_ANNOTATION_PREFIX } from '../../types';

export class ODataAnnotations {
  constructor(body: any) {
    Object.keys(body)
      .filter(key => key.startsWith(ODATA_ANNOTATION_PREFIX))
      .forEach(key => {
        this[key] = body[key];
      });
  }

  get etag(): string {
    return this[ODATA_ETAG] as string;
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
}