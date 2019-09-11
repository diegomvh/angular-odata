
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ODataResponse } from '../odata-response/odata-response';
import { ODataQueryBuilder } from '../odata-query/odata-query-builder';
import { ODataQuery } from '../odata-query/odata-query';
import { ODataContext } from '../odata-context';
import { ODataQueryType } from '../odata-query/odata-query-type';
import { Metadata } from '../odata-response/metadata';

export interface ODataHttpOptions {
  headers?: HttpHeaders | { [header: string]: string | string[]; },
  params?: HttpParams | { [param: string]: string | string[]; },
  reportProgress?: boolean;
  withCredentials?: boolean;
}

export class ODataService {
  protected static readonly IF_MATCH_HEADER = 'If-Match';

  constructor(protected http: HttpClient, public context: ODataContext) {
  }

  public metadata(): Observable<Metadata> {
    return this.http
      .get(this.context.metadataUrl, {observe: 'body', responseType: 'text'})
      .pipe(map(body => new Metadata(body)));
  }

  public query(): ODataQuery {
    return new ODataQuery(this);
  }

  public queryBuilder(): ODataQueryBuilder {
    return new ODataQueryBuilder(this);
  }

  get(odataQuery: ODataQueryType, options: ODataHttpOptions = {}): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    options.headers = this.mergeHttpHeaders(options.headers);
    options.params = this.mergeHttpParams(options.params, odataQuery.params());
    const httpOptions = this.createHttpOptions(options);
    (<any>window).PARAMS = httpOptions.params;
    console.log(httpOptions);
    return this.handleError( 
      this.http.get(url, httpOptions)
        .pipe(map(response => new ODataResponse(response)))); 
      } 

  post(odataQuery: ODataQueryType, body: any, options: ODataHttpOptions = {}): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    options.headers = this.mergeHttpHeaders(options.headers);
    options.params = this.mergeHttpParams(options.params, odataQuery.params());
    const httpOptions = this.createHttpOptions(options);
    return this.handleError( 
      this.http.post(url, body, httpOptions)
      .pipe( map(response => new ODataResponse(response)))
    );
  }

  patch(odataQuery: ODataQueryType, body: any, etag: string = "", options: ODataHttpOptions = {}): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    options.headers = this.mergeHttpHeaders(options.headers);
    options.params = this.mergeHttpParams(options.params, odataQuery.params());
    if (etag) options.headers = this.mergeETag(options.headers, etag);
    const httpOptions = this.createHttpOptions(options);
    return this.handleError( 
      this.http.patch(url, body, httpOptions)
        .pipe( map(response => new ODataResponse(response)))
    );
  }

  put(odataQuery: ODataQueryType, body: any, etag: string = "", options: ODataHttpOptions = {}): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    options.headers = this.mergeHttpHeaders(options.headers);
    options.params = this.mergeHttpParams(options.params, odataQuery.params());
    if (etag) options.headers = this.mergeETag(options.headers, etag);
    const httpOptions = this.createHttpOptions(options);
    return this.handleError(
      this.http.put(url, body, httpOptions)
        .pipe(map(response => new ODataResponse(response)))
    );
  }

  delete(odataQuery: ODataQueryType, etag: string = "", options: ODataHttpOptions = {}): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    options.headers = this.mergeHttpHeaders(options.headers);
    options.params = this.mergeHttpParams(options.params, odataQuery.params());
    if (etag) options.headers = this.mergeETag(options.headers, etag);
    const httpOptions = this.createHttpOptions(options);
    return this.handleError(
      this.http.delete(url, httpOptions) 
        .pipe( map(response => new ODataResponse(response)))
    );
  }

  protected handleError(observable: Observable<ODataResponse>): Observable<ODataResponse> {
    if (this.context.errorHandler) {
      observable = observable.pipe(
        catchError(this.context.errorHandler)
      );
    }
    return observable;
  }

  protected mergeHttpHeaders(...headers: (HttpHeaders | { [header: string]: string | string[]; })[]): HttpHeaders {
    let attrs = {};
    headers.forEach(header => {
    if (header instanceof HttpHeaders) {
      const httpHeader = header as HttpHeaders;
      attrs = httpHeader.keys().reduce((acc, key) => Object.assign(acc, {[key]: httpHeader.getAll(key)}), attrs);
    } else if (typeof(header) === 'object')
      attrs = Object.assign(attrs, header);
    });
    return new HttpHeaders(attrs);
  }

  protected mergeHttpParams(...params: (HttpParams | { [param: string]: string | string[]; })[]): HttpParams {
    let attrs = {};
    params.forEach(param => {
      if (param instanceof HttpParams) {
        const httpParam = param as HttpParams;
        attrs = httpParam.keys().reduce((acc, key) => Object.assign(acc, {[key]: httpParam.getAll(key)}), attrs);
      } else if (typeof(param) === 'object')
        attrs = Object.assign(attrs, param);
    });
    return new HttpParams({fromObject: attrs});
  }

  protected createHttpOptions(options?: ODataHttpOptions) {
    return Object.assign(
      <{observe: 'response', responseType: 'text'}>{observe: 'response', responseType: 'text'}, 
      { withCredentials: this.context.withCredentials },
      (options || {})
    );
  }

  protected createEndpointUrl(query: ODataQueryType) {
    const serviceRoot = this.context.serviceRoot();
    return `${serviceRoot}${query.path()}`;
  }

  protected mergeETag(headers: HttpHeaders, etag: string) {
    return headers.set(ODataService.IF_MATCH_HEADER, etag);
  }
}
