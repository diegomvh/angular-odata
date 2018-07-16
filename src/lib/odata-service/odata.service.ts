
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ODataQueryAbstract } from '../odata-query/odata-query-abstract';
import { ODataResponse } from '../odata-response/odata-response';
import { Utils } from '../utils/utils';
import { HttpOptions, HttpOptionsI } from './http-options';

export interface ODataOptions {
  serviceRoot: string;
  withCredentials: boolean;
}

@Injectable()
export class ODataService {
  private static readonly IF_MATCH_HEADER = 'If-Match';

  constructor(private http: HttpClient, private options: ODataOptions) { }

  get(odataQuery: ODataQueryAbstract, httpOptions?: HttpOptionsI): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    const options: HttpOptions = this.createHttpOptions(httpOptions);
    return this.http.get(url, options).pipe(
      map(response => new ODataResponse(response))
    );
  }

  post(odataQuery: ODataQueryAbstract, body: any, httpOptions?: HttpOptionsI): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    const options: HttpOptions = this.createHttpOptions(httpOptions);
    return this.http.post(url, body, options).pipe(
      map(response => new ODataResponse(response))
    );
  }

  patch(odataQuery: ODataQueryAbstract, body: any, etag?: string, httpOptions?: HttpOptionsI): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    let options: HttpOptions = this.createHttpOptions(httpOptions);
    options = this.mergeETag(options, etag);
    return this.http.patch(url, body, options).pipe(
      map(response => new ODataResponse(response))
    );
  }

  put(odataQuery: ODataQueryAbstract, body: any, etag?: string, httpOptions?: HttpOptionsI): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    let options: HttpOptions = this.createHttpOptions(httpOptions);
    options = this.mergeETag(options, etag);
    return this.http.put(url, body, options).pipe(
      map(response => new ODataResponse(response))
    );
  }

  delete(odataQuery: ODataQueryAbstract, etag?: string, httpOptions?: HttpOptionsI): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    let options: HttpOptions = this.createHttpOptions(httpOptions);
    options = this.mergeETag(options, etag);
    return this.http.delete(url, options).pipe(
      map(response => new ODataResponse(response))
    );
  }

  protected createEndpointUrl(odataQuery: ODataQueryAbstract): string {
    return `${this.options.serviceRoot}${odataQuery}`;
  }

  protected createHttpOptions(httpOptions: HttpOptionsI): HttpOptions {
    if (httpOptions instanceof HttpOptions) {
      return httpOptions;
    }
    return Object.assign(new HttpOptions(), { withCredentials: this.options.withCredentials }, httpOptions);
  }

  protected mergeETag(httpOptions: HttpOptions, etag: string): HttpOptions {
    if (Utils.isNullOrUndefined(etag)) {
      return httpOptions;
    }
    if (Utils.isNullOrUndefined(httpOptions)) {
      httpOptions = new HttpOptions();
    }
    if (Utils.isNullOrUndefined(httpOptions.headers)) {
      httpOptions.headers = new HttpHeaders();
    }

    httpOptions.headers[ODataService.IF_MATCH_HEADER] = etag;

    return httpOptions;
  }
}
