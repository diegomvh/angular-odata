
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ODataResponse } from '../odata-response/odata-response';
import { Utils } from '../utils/utils';
import { ODataQueryBuilder, PlainObject } from '../odata-query/odata-query-builder';
import { ODataQuery } from '../odata-query/odata-query';
import { ODataContext } from '../odata-context';
import { ODataQueryType } from '../odata-query/odata-query-type';
import { Metadata } from '../odata-response/metadata';

export interface ODataHttpOptions {
  headers?: HttpHeaders | {
      [header: string]: string | string[];
  };
  params?: HttpParams | {
      [param: string]: string | string[];
  };
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

  get(odataQuery: ODataQueryType, options?: ODataHttpOptions): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    const httpOptions = this.createHttpOptions(options);
    return this.handleError( 
      this.http.get(url, httpOptions)
        .pipe(map(response => new ODataResponse(response)))); 
      } 

  post(odataQuery: ODataQueryType, body: any, options?: ODataHttpOptions): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    const httpOptions = this.createHttpOptions(options);
    return this.handleError( 
      this.http.post(url, body, httpOptions)
      .pipe( map(response => new ODataResponse(response)))
    );
  }

  patch(odataQuery: ODataQueryType, body: any, etag?: string, options?: ODataHttpOptions): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    if (etag) this.mergeETag(options, etag);
    const httpOptions = this.createHttpOptions(options);
    return this.handleError( 
      this.http.patch(url, body, httpOptions)
        .pipe( map(response => new ODataResponse(response)))
    );
  }

  put(odataQuery: ODataQueryType, body: any, etag?: string, options?: ODataHttpOptions): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    if (etag) this.mergeETag(options, etag);
    const httpOptions = this.createHttpOptions(options);
    return this.handleError(
      this.http.put(url, body, httpOptions)
        .pipe(map(response => new ODataResponse(response)))
    );
  }

  delete(odataQuery: ODataQueryType, etag?: string, options?: ODataHttpOptions): Observable<ODataResponse> {
    const url: string = this.createEndpointUrl(odataQuery);
    if (etag) this.mergeETag(options, etag);
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

  protected createHttpOptions(options?: ODataHttpOptions) {
    return Object.assign(
      <{observe: 'response', responseType: 'text'}>{observe: 'response', responseType: 'text'}, 
      { withCredentials: this.context.withCredentials },
      (options || {}));
  }

  protected createEndpointUrl(query: ODataQueryType) {
    const serviceRoot = this.context.serviceRoot();
    return `${serviceRoot}${query}`;
  }

  protected mergeETag(options: ODataHttpOptions , etag: string) {
    if (Utils.isNullOrUndefined(options.headers)) {
      options.headers = new HttpHeaders();
    }
    options.headers[ODataService.IF_MATCH_HEADER] = etag;
  }

  protected mergeParams(options: ODataHttpOptions, params: PlainObject) {
    if (Utils.isNullOrUndefined(options.params)) {
      options.params = new HttpParams();
    }
    Object.entries(params)
      .forEach(e => options.params[e[0]] = e[1]);
  }
}
