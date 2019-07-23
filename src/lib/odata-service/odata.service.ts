
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ODataResponse } from '../odata-response/odata-response';
import { Utils } from '../utils/utils';
import { ODataQueryBuilder } from '../odata-query/odata-query-builder';
import { ODataQuery } from '../odata-query/odata-query';
import { ODataContext } from '../odata-context';
import { ODataQueryType } from '../odata-query/odata-query-type';
import { Metadata } from '../odata-response/metadata';

export class ODataService {
  protected static readonly IF_MATCH_HEADER = 'If-Match';

  constructor(protected http: HttpClient, public context: ODataContext) {
  }

  public metadata(): Promise<Metadata> {
    if (!this.context.metadata) {
      this.context.metadata = this.http
        .get(this.context.metadataUrl, {observe: 'response', responseType: 'text'})
        .pipe(
          map(response => new ODataResponse(response).toMetadata())
      ).toPromise();
    }
    return this.context.metadata;
  }

  public query(): ODataQuery {
    return new ODataQuery(this);
  }

  public queryBuilder(): ODataQueryBuilder {
    return new ODataQueryBuilder(this);
  }

  get(odataQuery: ODataQueryType, options?): Observable<ODataResponse> {
    const url: string = this.context.createEndpointUrl(odataQuery);
    options = this.context.assignOptions(options || {}, {observe: 'response', responseType: 'text'});
    return this.handleError( 
      this.http.get(url, <{observe: 'response', responseType: 'text'}>options)
        .pipe( map(response => new ODataResponse(response)))
    );
  }

  post(odataQuery: ODataQueryType, body: any, options?): Observable<ODataResponse> {
    const url: string = this.context.createEndpointUrl(odataQuery);
    options = this.context.assignOptions(options || {}, {observe: 'response', responseType: 'text'});
    return this.handleError( 
      this.http.post(url, body, <{observe: 'response', responseType: 'text'}>options)
      .pipe( map(response => new ODataResponse(response)))
    );
  }

  patch(odataQuery: ODataQueryType, body: any, etag?: string, options?): Observable<ODataResponse> {
    const url: string = this.context.createEndpointUrl(odataQuery);
    options = this.context.assignOptions(options || {}, {observe: 'response', responseType: 'text'});
    if (etag)
      options = this.mergeETag(options, etag);
    return this.handleError( 
      this.http.patch(url, body, <{observe: 'response', responseType: 'text'}>options)
        .pipe( map(response => new ODataResponse(response)))
    );
  }

  put(odataQuery: ODataQueryType, body: any, etag?: string, options?): Observable<ODataResponse> {
    const url: string = this.context.createEndpointUrl(odataQuery);
    options = this.context.assignOptions(options || {}, {observe: 'response', responseType: 'text'});
    if (etag)
      options = this.mergeETag(options, etag);
    return this.handleError(
      this.http.put(url, body, <{observe: 'response', responseType: 'text'}>options)
        .pipe(map(response => new ODataResponse(response)))
    );
  }

  delete(odataQuery: ODataQueryType, etag?: string, options?): Observable<ODataResponse> {
    const url: string = this.context.createEndpointUrl(odataQuery);
    options = this.context.assignOptions(options || {}, {observe: 'response', responseType: 'text'});
    if (etag)
      options = this.mergeETag(options, etag);
    return this.handleError(
      this.http.delete(url, <{observe: 'response', responseType: 'text'}>options)
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

  protected mergeETag(options, etag: string) {
    if (Utils.isNullOrUndefined(options.headers)) {
      options.headers = {};
    }

    options.headers[ODataService.IF_MATCH_HEADER] = etag;

    return options;
  }
}
