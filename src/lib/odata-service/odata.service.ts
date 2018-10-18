
import { HttpHeaders, HttpResponse, HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ODataQueryAbstract } from '../odata-query/odata-query-abstract';
import { ODataResponse } from '../odata-response/odata-response';
import { Utils } from '../utils/utils';
import { ODataQueryBuilder } from '../odata-query/odata-query-builder';
import { ODataQuery } from '../odata-query/odata-query';
import { ODataContext } from '../odata-context';

export class ODataService {
  private static readonly IF_MATCH_HEADER = 'If-Match';
  constructor(protected http: HttpClient, protected context: ODataContext) {
  }

  public metadata(): any {
    if (!this.context.metadata) {
      this.context.metadata = this.http.get(this.context.metadataUrl, {observe: 'response', responseType: 'text'}).pipe(
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

  get(odataQuery: ODataQueryAbstract, options?): Observable<ODataResponse> {
    const url: string = this.context.createEndpointUrl(odataQuery);
    options = this.context.assignOptions(options || {}, {observe: 'response', responseType: 'text'});
    return this.http.get(url, 
      <{observe: 'response', responseType: 'text'}>options).pipe(
      map(response => new ODataResponse(response))
    );
  }

  post(odataQuery: ODataQueryAbstract, body: any, options?): Observable<ODataResponse> {
    const url: string = this.context.createEndpointUrl(odataQuery);
    options = this.context.assignOptions(options || {}, {observe: 'response', responseType: 'text'});
    return this.http.post(url, body, 
      <{observe: 'response', responseType: 'text'}>options).pipe(
      map(response => new ODataResponse(response))
    );
  }

  patch(odataQuery: ODataQueryAbstract, body: any, etag?: string, options?): Observable<ODataResponse> {
    const url: string = this.context.createEndpointUrl(odataQuery);
    options = this.context.assignOptions(options || {}, {observe: 'response', responseType: 'text'});
    options = this.mergeETag(options, etag);
    return this.http.patch(url, body, 
      <{observe: 'response', responseType: 'text'}>options).pipe(
      map(response => new ODataResponse(response))
    );
  }

  put(odataQuery: ODataQueryAbstract, body: any, etag?: string, options?): Observable<ODataResponse> {
    const url: string = this.context.createEndpointUrl(odataQuery);
    options = this.context.assignOptions(options || {}, {observe: 'response', responseType: 'text'});
    options = this.mergeETag(options, etag);
    return this.http.put(url, body, 
      <{observe: 'response', responseType: 'text'}>options).pipe(
      map(response => new ODataResponse(response))
    );
  }

  delete(odataQuery: ODataQueryAbstract, etag?: string, options?): Observable<ODataResponse> {
    const url: string = this.context.createEndpointUrl(odataQuery);
    options = this.context.assignOptions(options || {}, {observe: 'response', responseType: 'text'});
    options = this.mergeETag(options, etag);
    return this.http.delete(url, 
      <{observe: 'response', responseType: 'text'}>options).pipe(
      map(response => new ODataResponse(response))
    );
  }

  protected mergeETag(options, etag: string) {
    if (Utils.isNullOrUndefined(options.headers)) {
      options.headers = {};
    }

    options.headers[ODataService.IF_MATCH_HEADER] = etag;

    return options;
  }
}
