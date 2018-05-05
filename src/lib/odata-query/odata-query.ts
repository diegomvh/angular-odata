import { Observable } from 'rxjs';

import { ODataResponse } from '../odata-response/odata-response';
import { HttpOptionsI } from '../odata-service/http-options';
import { ODataService } from '../odata-service/odata.service';
import { Expand } from '../query-options/expand';
import { Filter } from '../query-options/filter/filter';
import { Orderby } from '../query-options/orderby';
import { QueryOptions } from '../query-options/query-options';
import { Search } from '../query-options/search/search';
import { Utils } from '../utils/utils';
import { ODataQueryAbstract } from './odata-query-abstract';
import { ODataQueryBatch } from './odata-query-batch';

export class ODataQuery extends ODataQueryAbstract {
  // QUERY OPTIONS SEPARATOR
  static readonly SEPARATOR = '&';

  // SEGMENT NAMES
  private static readonly METADATA = 'metadata';
  private static readonly ENTITY_SET = 'entitySet';
  private static readonly ENTITY_KEY = 'entityKey';
  private static readonly SINGLETON = 'singleton';
  private static readonly TYPE_NAME = 'typeName';
  private static readonly PROPERTY = 'property';
  private static readonly NAVIGATION_PROPERTY = 'navigationProperty';
  private static readonly REF = 'ref';
  private static readonly VALUE = 'value';
  private static readonly COUNT = 'count';
  private static readonly FUNCTION_CALL = 'functionCall';
  private static readonly ACTION_CALL = 'actionCall';

  // CONSTANT SEGMENTS
  private static readonly $METADATA = '$metadata';
  private static readonly $REF = '$ref';
  private static readonly $VALUE = '$value';
  private static readonly $COUNT = '$count';

  // VARIABLES
  private queryOptions: QueryOptions;
  private segments: string[];
  private lastSegment: string;

  constructor(odataService: ODataService, serviceRoot: string) {
    super(odataService, serviceRoot);
    Utils.requireNotNullNorUndefined(odataService, 'odataService');
    Utils.requireNotNullNorUndefined(serviceRoot, 'serviceRoot');
    Utils.requireNotEmpty(serviceRoot, 'serviceRoot');
    this.queryOptions = new QueryOptions(ODataQuery.SEPARATOR);
    this.segments = [];
    this.lastSegment = null;
  }

  // QUERY SEGMENTS

  metadata(): ODataQuery {
    Utils.requireNullOrUndefined(this.getSegment(ODataQuery.METADATA), ODataQuery.METADATA);
    if (this.segments.length) {
      throw new Error('metadata segment cannot be appended to other segments');
    }
    this.queryString = Utils.appendSegment(this.queryString, ODataQuery.$METADATA);
    this.addSegment(ODataQuery.METADATA);
    return this;
  }

  entitySet(entitySet: string): ODataQuery {
    Utils.requireNullOrUndefined(this.getSegment(ODataQuery.ENTITY_SET), ODataQuery.ENTITY_SET);
    Utils.requireNotNullNorUndefined(entitySet, 'entitySet');
    Utils.requireNotEmpty(entitySet, 'entitySet');
    this.queryString = Utils.appendSegment(this.queryString, entitySet);
    this.addSegment(ODataQuery.ENTITY_SET);
    return this;
  }

  entityKey(entityKey: any | any[]): ODataQuery {
    if (this.lastSegment !== ODataQuery.ENTITY_SET && this.lastSegment !== ODataQuery.NAVIGATION_PROPERTY) {
      throw new Error('entityKey can only be appended to entitySet or navigationProperty');
    }
    Utils.requireNotNullNorUndefined(entityKey, 'entityKey');
    Utils.requireNotEmpty(entityKey, 'entityKey');
    entityKey = Utils.getValueURI(entityKey, true);
    this.queryString = Utils.removeEndingSeparator(this.queryString) + '(' + entityKey + ')';
    this.addSegment(ODataQuery.ENTITY_KEY);
    return this;
  }

  singleton(singleton: string) {
    if (this.segments.length) {
      throw new Error('singleton segment cannot be appended to other segments');
    }
    Utils.requireNotNullNorUndefined(singleton, 'singleton');
    Utils.requireNotEmpty(singleton, 'singleton');
    this.queryString = Utils.appendSegment(this.queryString, singleton);
    this.addSegment(ODataQuery.SINGLETON);
    return this;
  }

  typeName(typeName: string) {
    if (this.lastSegment !== ODataQuery.ENTITY_SET && this.lastSegment !== ODataQuery.NAVIGATION_PROPERTY && this.lastSegment !== ODataQuery.ENTITY_KEY) {
      throw new Error('typeName can only be appended to entitySet, navigationProperty or entityKey');
    }
    Utils.requireNotNullNorUndefined(typeName, 'typeName');
    Utils.requireNotEmpty(typeName, 'typeName');
    this.queryString = Utils.appendSegment(this.queryString, typeName);
    this.addSegment(ODataQuery.TYPE_NAME);
    return this;
  }

  property(property: string): ODataQuery {
    Utils.requireNullOrUndefined(this.getSegment(ODataQuery.PROPERTY), ODataQuery.PROPERTY);
    if (this.lastSegment !== ODataQuery.ENTITY_KEY && this.lastSegment !== ODataQuery.SINGLETON) {
      throw new Error('property can only be appended to entityKey or singleton');
    }
    Utils.requireNotNullNorUndefined(property, 'property');
    Utils.requireNotEmpty(property, 'property');
    this.queryString = Utils.appendSegment(this.queryString, property);
    this.addSegment(ODataQuery.PROPERTY);
    return this;
  }

  navigationProperty(navigationProperty: string): ODataQuery {
    if (this.lastSegment !== ODataQuery.ENTITY_KEY && this.lastSegment !== ODataQuery.SINGLETON && this.lastSegment !== ODataQuery.TYPE_NAME) {
      throw new Error('navigationProperty can only be appended to entityKey, singleton or typeName');
    }
    Utils.requireNotNullNorUndefined(navigationProperty, 'navigationProperty');
    Utils.requireNotEmpty(navigationProperty, 'navigationProperty');
    this.queryString = Utils.appendSegment(this.queryString, navigationProperty);
    this.addSegment(ODataQuery.NAVIGATION_PROPERTY);
    return this;
  }

  ref(): ODataQuery {
    Utils.requireNullOrUndefined(this.getSegment(ODataQuery.REF), ODataQuery.REF);
    if (this.lastSegment !== ODataQuery.NAVIGATION_PROPERTY) {
      throw new Error('ref can only be appended to navigationProperty');
    }
    this.queryString = Utils.appendSegment(this.queryString, ODataQuery.$REF);
    this.addSegment(ODataQuery.REF);
    return this;
  }

  value(): ODataQuery {
    Utils.requireNullOrUndefined(this.getSegment(ODataQuery.VALUE), ODataQuery.VALUE);
    if (this.lastSegment !== ODataQuery.PROPERTY) {
      throw new Error('value can only be appended to property');
    }
    this.queryString = Utils.appendSegment(this.queryString, ODataQuery.$VALUE);
    this.addSegment(ODataQuery.VALUE);
    return this;
  }

  countSegment(): ODataQuery {
    Utils.requireNullOrUndefined(this.getSegment(ODataQuery.COUNT), ODataQuery.COUNT);
    if (this.lastSegment !== ODataQuery.ENTITY_SET && this.lastSegment !== ODataQuery.NAVIGATION_PROPERTY) {
      throw new Error('count can only be appended to entitySet or navigationProperty');
    }
    this.queryString = Utils.appendSegment(this.queryString, ODataQuery.$COUNT);
    this.addSegment(ODataQuery.COUNT);
    return this;
  }

  functionCall(functionCall: string): ODataQuery {
    Utils.requireNotNullNorUndefined(functionCall, 'functionCall');
    Utils.requireNotEmpty(functionCall, 'functionCall');
    this.queryString = Utils.appendSegment(this.queryString, functionCall);
    this.addSegment(ODataQuery.FUNCTION_CALL);
    return this;
  }

  actionCall(actionCall: string): ODataQuery {
    Utils.requireNotNullNorUndefined(actionCall, 'actionCall');
    Utils.requireNotEmpty(actionCall, 'actionCall');
    this.queryString = Utils.appendSegment(this.queryString, actionCall);
    this.addSegment(ODataQuery.ACTION_CALL);
    return this;
  }

  batch(): ODataQueryBatch {
    return new ODataQueryBatch(this.odataService, this.serviceRoot);
  }

  // QUERY OPTIONS

  select(select: string | string[]): ODataQuery {
    this.queryOptions.select(select);
    return this;
  }

  filter(filter: string | Filter): ODataQuery {
    this.queryOptions.filter(filter);
    return this;
  }

  expand(expand: string | Expand | Expand[]): ODataQuery {
    this.queryOptions.expand(expand);
    return this;
  }

  orderby(orderby: string | Orderby[]): ODataQuery {
    this.queryOptions.orderby(orderby);
    return this;
  }

  search(search: string | Search): ODataQuery {
    this.queryOptions.search(search);
    return this;
  }

  skip(skip: number): ODataQuery {
    this.queryOptions.skip(skip);
    return this;
  }

  top(top: number): ODataQuery {
    this.queryOptions.top(top);
    return this;
  }

  countOption(count: boolean): ODataQuery {
    this.queryOptions.count(count);
    return this;
  }

  customOption(key: string, value: string) {
    this.queryOptions.customOption(key, value);
    return this;
  }

  format(format: string): ODataQuery {
    this.queryOptions.format(format);
    return this;
  }

  // QUERY EXECUTION

  get(httpOptions?: HttpOptionsI): Observable<ODataResponse> {
    return this.odataService.get(this, httpOptions);
  }

  post(body: any, httpOptions?: HttpOptionsI): Observable<ODataResponse> {
    return this.odataService.post(this, body, httpOptions);
  }

  patch(body: any, etag?: string, httpOptions?: HttpOptionsI): Observable<ODataResponse> {
    return this.odataService.patch(this, body, etag, httpOptions);
  }

  put(body: any, etag?: string, httpOptions?: HttpOptionsI): Observable<ODataResponse> {
    return this.odataService.put(this, body, etag, httpOptions);
  }

  delete(etag?: string, httpOptions?: HttpOptionsI): Observable<ODataResponse> {
    return this.odataService.delete(this, etag, httpOptions);
  }

  toString(): string {
    let res: string = this.queryString;
    if (Utils.isNotNullNorUndefined(this.queryOptions) && !this.queryOptions.isEmpty()) {
      res += '?' + this.queryOptions.toString();
    }
    return res;
  }

  protected getSegment(segment: string): string {
    Utils.requireNotNull(segment, 'segment');
    const res: string = this.segments.find((value: string, index: number, segments: string[]) => {
      return value === segment;
    });
    return res;
  }

  protected addSegment(segment: string): void {
    Utils.requireNotNull(segment, 'segment');
    this.segments.push(segment);
    if (Utils.isNotNullNorUndefined(this.segments) && this.segments.length) {
      this.lastSegment = this.segments[this.segments.length - 1];
    }
  }
}
