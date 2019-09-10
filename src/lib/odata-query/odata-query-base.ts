import { Utils } from '../utils/utils';
import { ODataService } from '../odata-service/odata.service';
import { Observable } from 'rxjs';
import { ODataResponse } from '../odata-response/odata-response';
import { ODataQueryType } from './odata-query-type';
import { ODataQueryBatch } from './odata-query-batch';

export abstract class ODataQueryBase implements ODataQueryType {
  // URL QUERY PARTS
  public static readonly SEPARATOR = '&';
  public static readonly PATHSEP = '/';

  // OPTIONS NAMES
  public static readonly SELECT = 'select';
  public static readonly FILTER = 'filter';
  public static readonly SEARCH = 'search';
  public static readonly GROUP_BY = 'groupBy';
  public static readonly TRANSFORM = 'transform';
  public static readonly ORDER_BY = 'orderBy';
  public static readonly TOP = 'top';
  public static readonly SKIP = 'skip';
  public static readonly EXPAND = 'expand';
  public static readonly FORMAT = 'format';

  // SEGMENT NAMES
  public static readonly METADATA = 'metadata';
  public static readonly ENTITY_SET = 'entitySet';
  public static readonly ENTITY_KEY = 'entityKey';
  public static readonly SINGLETON = 'singleton';
  public static readonly TYPE_NAME = 'typeName';
  public static readonly PROPERTY = 'property';
  public static readonly NAVIGATION_PROPERTY = 'navigationProperty';
  public static readonly REF = 'ref';
  public static readonly VALUE = 'value';
  public static readonly COUNT = 'count';
  public static readonly FUNCTION_CALL = 'functionCall';
  public static readonly ACTION_CALL = 'actionCall';

  // CUSTOM OPTIONS
  public static readonly CUSTOM = 'custom';

  // CONSTANT SEGMENTS
  public static readonly $METADATA = '$metadata';
  public static readonly $REF = '$ref';
  public static readonly $VALUE = '$value';
  public static readonly $COUNT = '$count';

  // VARIABLES
  public service: ODataService;

  constructor(service: ODataService) {
    Utils.requireNotNullNorUndefined(service, 'odataService');
    this.service = service;
  }

  // ABSTRACTS
  abstract clone(): ODataQueryBase;
  abstract isEntity(): boolean;
  abstract path();
  abstract params();

  toString(): string {
    let path = this.path();
    let queryString = Object.entries(this.params())
      .map(e => `${e[0]}=${e[1]}`)
      .join("&");
    return queryString ? `${path}?${queryString}` : path
  }

  batch(): ODataQueryBatch {
    return new ODataQueryBatch(this.service);
  }

  // QUERY EXECUTION
  get(options?): Observable<ODataResponse> {
    return this.service.get(this, options);
  }

  post(body: any, options?): Observable<ODataResponse> {
    return this.service.post(this, body, options);
  }

  patch(body: any, etag?: string, options?): Observable<ODataResponse> {
    return this.service.patch(this, body, etag, options);
  }

  put(body: any, etag?: string, options?): Observable<ODataResponse> {
    return this.service.put(this, body, etag, options);
  }

  delete(etag?: string, options?): Observable<ODataResponse> {
    return this.service.delete(this, etag, options);
  }
}
