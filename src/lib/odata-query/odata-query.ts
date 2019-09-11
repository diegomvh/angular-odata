import { ODataService } from '../odata-service/odata.service';
import { Expand } from '../query-options/expand';
import { Filter } from '../query-options/filter/filter';
import { Orderby } from '../query-options/orderby';
import { QueryOptions } from '../query-options/query-options';
import { Search } from '../query-options/search/search';
import { Utils } from '../utils/utils';
import { ODataQueryBase } from './odata-query-base';
import { QuotedString } from './quoted-string';
import { PlainObject } from './odata-query-builder';

export class ODataQuery extends ODataQueryBase {
  // VARIABLES
  private options: QueryOptions;
  private segments: {type: string, value: string}[];

  private get lastSegment() {
    if (Utils.isNotNullNorUndefined(this.segments) && this.segments.length) {
      return this.segments[this.segments.length - 1];
    }
  }

  constructor(service: ODataService) {
    super(service);
    this.options = new QueryOptions(ODataQuery.SEPARATOR);
    this.segments = [];
  }

  clone(): ODataQueryBase {
    //TODO: Clone
    return new ODataQuery(this.service);
  }

  // QUERY SEGMENTS
  metadata(): ODataQuery {
    Utils.requireNullOrUndefined(this.getSegment(ODataQuery.METADATA), ODataQuery.METADATA);
    if (this.segments.length) {
      throw new Error('metadata segment cannot be appended to other segments');
    }
    this.addSegment(ODataQuery.METADATA, ODataQuery.$METADATA);
    return this;
  }

  entitySet(entitySet: string): ODataQuery {
    Utils.requireNullOrUndefined(this.getSegment(ODataQuery.ENTITY_SET), ODataQuery.ENTITY_SET);
    Utils.requireNotNullNorUndefined(entitySet, 'entitySet');
    Utils.requireNotEmpty(entitySet, 'entitySet');
    this.addSegment(ODataQuery.ENTITY_SET, entitySet);
    return this;
  }

  entityKey(entityKey: any): ODataQuery {
    if (this.lastSegment.type !== ODataQuery.ENTITY_SET && this.lastSegment.type !== ODataQuery.NAVIGATION_PROPERTY) {
      throw new Error('entityKey can only be appended to entitySet or navigationProperty');
    }
    Utils.requireNotNullNorUndefined(entityKey, 'entityKey');
    Utils.requireNotEmpty(entityKey, 'entityKey');
    if (Utils.isObject(entityKey)) {
      var parts = Object.keys(entityKey).map(key => `${key}=${Utils.getValueURI(
        typeof(entityKey[key]) === "string" ? new QuotedString(entityKey[key]) : entityKey[key], 
        true)}`);
      this.lastSegment.value = this.lastSegment.value + '(' + parts.join(",") + ')';
    } else {
      entityKey = Utils.getValueURI(
        typeof(entityKey) === "string" ? new QuotedString(entityKey) : entityKey, 
        true);
      this.lastSegment.value = this.lastSegment.value + '(' + entityKey + ')';
    }
    this.lastSegment.type = ODataQuery.ENTITY_KEY;
    return this;
  }

  isEntity() {
    return this.lastSegment.type === ODataQuery.ENTITY_KEY;
  }
  
  singleton(singleton: string) {
    if (this.segments.length) {
      throw new Error('singleton segment cannot be appended to other segments');
    }
    Utils.requireNotNullNorUndefined(singleton, 'singleton');
    Utils.requireNotEmpty(singleton, 'singleton');
    this.addSegment(ODataQuery.SINGLETON, singleton);
    return this;
  }

  typeName(typeName: string) {
    if (this.lastSegment.type !== ODataQuery.ENTITY_SET && this.lastSegment.type !== ODataQuery.NAVIGATION_PROPERTY && this.lastSegment.type !== ODataQuery.ENTITY_KEY) {
      throw new Error('typeName can only be appended to entitySet, navigationProperty or entityKey');
    }
    Utils.requireNotNullNorUndefined(typeName, 'typeName');
    Utils.requireNotEmpty(typeName, 'typeName');
    this.addSegment(ODataQuery.TYPE_NAME, typeName);
    return this;
  }

  property(property: string): ODataQuery {
    Utils.requireNullOrUndefined(this.getSegment(ODataQuery.PROPERTY), ODataQuery.PROPERTY);
    if (this.lastSegment.type !== ODataQuery.ENTITY_KEY && this.lastSegment.type !== ODataQuery.SINGLETON) {
      throw new Error('property can only be appended to entityKey or singleton');
    }
    Utils.requireNotNullNorUndefined(property, 'property');
    Utils.requireNotEmpty(property, 'property');
    this.addSegment(ODataQuery.PROPERTY, property);
    return this;
  }

  navigationProperty(navigationProperty: string): ODataQuery {
    if (this.lastSegment.type !== ODataQuery.ENTITY_KEY && this.lastSegment.type !== ODataQuery.SINGLETON && this.lastSegment.type !== ODataQuery.TYPE_NAME) {
      throw new Error('navigationProperty can only be appended to entityKey, singleton or typeName');
    }
    Utils.requireNotNullNorUndefined(navigationProperty, 'navigationProperty');
    Utils.requireNotEmpty(navigationProperty, 'navigationProperty');
    this.addSegment(ODataQuery.NAVIGATION_PROPERTY, navigationProperty);
    return this;
  }

  ref(): ODataQuery {
    Utils.requireNullOrUndefined(this.getSegment(ODataQuery.REF), ODataQuery.REF);
    if (this.lastSegment.type !== ODataQuery.NAVIGATION_PROPERTY) {
      throw new Error('ref can only be appended to navigationProperty');
    }
    this.addSegment(ODataQuery.REF, ODataQuery.$REF);
    return this;
  }

  value(): ODataQuery {
    Utils.requireNullOrUndefined(this.getSegment(ODataQuery.VALUE), ODataQuery.VALUE);
    if (this.lastSegment.type !== ODataQuery.PROPERTY) {
      throw new Error('value can only be appended to property');
    }
    this.addSegment(ODataQuery.VALUE, ODataQuery.$VALUE);
    return this;
  }

  countSegment(): ODataQuery {
    Utils.requireNullOrUndefined(this.getSegment(ODataQuery.COUNT), ODataQuery.COUNT);
    if (this.lastSegment.type !== ODataQuery.ENTITY_SET && this.lastSegment.type !== ODataQuery.NAVIGATION_PROPERTY) {
      throw new Error('count can only be appended to entitySet or navigationProperty');
    }
    this.addSegment(ODataQuery.COUNT, ODataQuery.$COUNT);
    return this;
  }

  functionCall(functionCall: string): ODataQuery {
    Utils.requireNotNullNorUndefined(functionCall, 'functionCall');
    Utils.requireNotEmpty(functionCall, 'functionCall');
    this.addSegment(ODataQuery.FUNCTION_CALL, functionCall);
    return this;
  }

  actionCall(actionCall: string): ODataQuery {
    Utils.requireNotNullNorUndefined(actionCall, 'actionCall');
    Utils.requireNotEmpty(actionCall, 'actionCall');
    this.addSegment(ODataQuery.ACTION_CALL, actionCall);
    return this;
  }

  // QUERY OPTIONS
  select(select: string | string[]): ODataQuery {
    this.options.select(select);
    return this;
  }

  filter(filter: string | Filter): ODataQuery {
    this.options.filter(filter);
    return this;
  }

  expand(expand: string | Expand | Expand[]): ODataQuery {
    this.options.expand(expand);
    return this;
  }

  orderby(orderby: string | Orderby[]): ODataQuery {
    this.options.orderby(orderby);
    return this;
  }

  search(search: string | Search): ODataQuery {
    this.options.search(search);
    return this;
  }

  skip(skip: number): ODataQuery {
    this.options.skip(skip);
    return this;
  }

  top(top: number): ODataQuery {
    this.options.top(top);
    return this;
  }

  countOption(count: boolean): ODataQuery {
    this.options.count(count);
    return this;
  }

  customOption(key: string, value: string) {
    this.options.customOption(key, value);
    return this;
  }

  format(format: string): ODataQuery {
    this.options.format(format);
    return this;
  }

  path(): string {
    return this.segments.map(segment => segment.value).join('/');
  }

  params(): PlainObject {
    return this.options.params();
  }

  protected getSegment(segment: string): string {
    Utils.requireNotNull(segment, 'segment');
    const res = this.segments.find(value => {
      return value.type === segment;
    });
    if (res)
      return res.value;
  }

  protected addSegment(type: string, value: string): void {
    Utils.requireNotNull(type, 'type');
    Utils.requireNotNull(value, 'value');
    this.segments.push({type, value});
  }
}
