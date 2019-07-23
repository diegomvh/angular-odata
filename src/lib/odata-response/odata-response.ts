import { HttpHeaders, HttpResponse } from '@angular/common/http';

import { Utils } from '../utils/utils';
import { EntitySet } from './entity-collection';
import { Metadata } from './metadata';
import { ODataResponseAbstract } from './odata-response-abstract';

export class ODataResponse extends ODataResponseAbstract {
  public static readonly ODATA_CONTEXT = '@odata.context';
  public static readonly ODATA_ETAG = '@odata.etag';
  public static readonly ODATA_ID = '@odata.id';
  public static readonly ODATA_COUNT = '@odata.count';
  public static readonly ODATA_NEXT_LINK = '@odata.nextLink';

  private static readonly VALUE = 'value';
  private static readonly CONTENT_TYPE = 'content-type';

  constructor(httpResponse: HttpResponse<string>) {
    super(httpResponse);
  }

  getSkipToken(url: string) {
    //https://docs.microsoft.com/en-us/odata/webapi/skiptoken-for-server-side-paging
    let match = url.match(/\$skiptoken=(\d+)/);
    if (match) {
      return Number(match[1]);
    }
  }

  getSkip(url: string) {
    let match = url.match(/\$skip=(\d+)/);
    if (match) {
      return Number(match[1]);
    }
  }

  getBodyAsJson(): any {
    const headers: HttpHeaders = this.getHttpResponse().headers;
    let contentType: string;
    for (const key of headers.keys()) {
      if (key.toLowerCase() === ODataResponse.CONTENT_TYPE) {
        contentType = headers.get(key).toLowerCase();
        break;
      }
    }
    if (Utils.isNotNullNorUndefined(contentType) && contentType.includes('application/json')) {
      try {
        return JSON.parse(this.getBodyAsText());
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  toMetadata(): Metadata {
    const xml: string = this.getBodyAsText();
    return new Metadata(xml);
  }

  toEntitySet<T>(): EntitySet<T> {
    const json: any = this.getBodyAsJson();
    if (Utils.isNotNullNorUndefined(json) && json.hasOwnProperty(ODataResponse.VALUE)) {
      let count: number = null;
      if (json.hasOwnProperty(ODataResponse.ODATA_COUNT)) {
        count = json[ODataResponse.ODATA_COUNT];
      }
      let skip: number = null;
      if (json.hasOwnProperty(ODataResponse.ODATA_NEXT_LINK)) {
        skip = this.getSkip(json[ODataResponse.ODATA_NEXT_LINK]);
        if (!skip)
          skip = this.getSkipToken(json[ODataResponse.ODATA_NEXT_LINK]);
      }
      return new EntitySet<T>(json[ODataResponse.VALUE], count || json[ODataResponse.VALUE].length, skip);
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

  toPropertyValue<T>(): T {
    const json: any = this.getBodyAsJson();
    if (Utils.isNotNullNorUndefined(json)) {
      if (json.hasOwnProperty(ODataResponse.VALUE)) {
        return json[ODataResponse.VALUE] as T;
      }
      return null;
    } else {
      return JSON.parse(this.getBodyAsText()) as T;
    }
  }

  toCount(): number {
    return Number(this.getBodyAsText());
  }

  /*
  toODataResponseBatch(): ODataResponseBatch {
      return new ODataResponseBatch(this.getHttpResponse());
  }
  */

  protected toObject<T>(): T {
    const json: any = this.getBodyAsJson();
    if (Utils.isNotNullNorUndefined(json)) {
      return <T>json;
    }
    return null;
  }
}
