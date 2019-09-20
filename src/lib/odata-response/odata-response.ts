import { HttpHeaders, HttpResponse } from '@angular/common/http';

import { Utils } from '../utils/utils';

export class ODataResponse<T> extends HttpResponse<T> {

  private static readonly VALUE = 'value';
  private static readonly CONTENT_TYPE = 'content-type';

    constructor(init?: {
        body?: T | null;
        headers?: HttpHeaders;
        status?: number;
        statusText?: string;
        url?: string;
    }) {
    super(init);
  }

  getBodyAsJson(): T {
    const headers: HttpHeaders = this.headers;
    let contentType: string;
    for (const key of headers.keys()) {
      if (key.toLowerCase() === ODataResponse.CONTENT_TYPE) {
        contentType = headers.get(key).toLowerCase();
        break;
      }
    }
    if (Utils.isNotNullNorUndefined(contentType) && contentType.includes('application/json')) {
      try {
        return this.body;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  toComplexCollection<T>(): T[] {
    const json: any = this.getBodyAsJson();

    if (Utils.isNotNullNorUndefined(json) && json.hasOwnProperty(ODataResponse.VALUE)) {
      return json[ODataResponse.VALUE] as T[];
    }

    return null;
  }

  toEntity<T>(): T {
    return this.toObject<T>();
  }

  toComplexValue<T>(): T {
    return this.toObject<T>();
  }

  getBodyAsText(): string {
    return <any>this.body as string;
  }

  toPropertyValue<V>(): V {
    const json: any = this.getBodyAsJson();
    if (Utils.isNotNullNorUndefined(json)) {
      if (json.hasOwnProperty(ODataResponse.VALUE)) {
        return json[ODataResponse.VALUE] as V;
      }
      return null;
    } else {
      return JSON.parse(this.getBodyAsText()) as V;
    }
  }

  toCount(): number {
    return Number(this.getBodyAsText());
  }

  protected toObject<T>(): T {
    const json: any = this.getBodyAsJson();
    if (Utils.isNotNullNorUndefined(json)) {
      return <T>json;
    }
    return null;
  }

  toString(): string {
    let res = `${this.status} ${this.statusText}\n`;

    const headers = this.headers;
    for (const key of headers.keys()) {
      res += key + ': ';
      let valueString = '';
      for (const value of headers.getAll(key)) {
        if (valueString.length) {
          valueString += ' ';
        }
        valueString += value;
      }
      res += valueString + '\n';
    }

    const json = this.getBodyAsJson();
    if (Utils.isNotNullNorUndefined(json)) {
      res += JSON.stringify(json, null, 4);
    } else {
      res += this.getBodyAsText();
    }
    return res;
  }
}
