import { ODataQueryBase } from "./odata-query-base";
import { ODataService } from "../odata-service/odata.service";
import buildQuery from 'odata-query';

export class ODataQueryBuilder extends ODataQueryBase {
  segments: {type: string, name: string, options: {[key: string]: any}}[];
  options: {[key: string]: any};

  constructor(
    service: ODataService, 
    segments?: {type: string, name: string, options: {[key: string]: any}}[],
    options?: {[key: string]: any}
  ) {
    super(service);
    this.segments = segments || [];
    this.options = options || {};
  }

  clone() {
    return new ODataQueryBuilder(this.service,
      this.segments.map(segment => 
        ({type: segment.type, name: segment.name, options: Object.assign({}, segment.options)})),
      Object.assign({}, this.options));
  };

  toJSON() {
    return {
      segments: this.segments.slice(), options: Object.assign({}, this.options)
    }
  }

  static fromJSON(service: ODataService, json) {
    let builder = new ODataQueryBuilder(service, json.options);
    builder.segments = json.segments || [];
    return builder;
  }

  protected toString() {
    let segments = this.segments
      .map(segment => {
        if (segment.type == ODataQueryBuilder.FUNCTION_CALL)
          return buildQuery({ func: { [segment.name]: segment.options } }).slice(1);
        return segment.name + buildQuery(segment.options);
      });
    let odata = [
      ODataQueryBuilder.SELECT,
      ODataQueryBuilder.FILTER,
      ODataQueryBuilder.SEARCH,
      ODataQueryBuilder.GROUP_BY,
      ODataQueryBuilder.TRANSFORM,
      ODataQueryBuilder.ORDER_BY,
      ODataQueryBuilder.TOP,
      ODataQueryBuilder.SKIP,
      ODataQueryBuilder.COUNT,
      ODataQueryBuilder.EXPAND]
      .map(key => this.options[key] ? { [key]: this.options[key] } : {})
      .reduce((acc, obj) => Object.assign(acc, obj), {});
    let rawFilter = this.options[ODataQueryBuilder.RAWFILTER];
    if (rawFilter)
      odata[ODataQueryBuilder.FILTER] = [odata[ODataQueryBuilder.FILTER] || {}, rawFilter];
    let query = buildQuery(odata);
    return segments.join(ODataQueryBuilder.PATHSEP) + query;
  }

  // ================
  protected objectHandler(value) {
    return {
      attrs: value,
      toJSON: function () {
        return this.attrs;
      },
      get: function (name) {
        return this.attrs[name];
      },
      set: function (name, value) {
        return this.attrs[name] = value;
      },
      unset: function (name) {
        delete this.attrs[name];
      },
      assign: function (values) {
        return Object.assign(this.attrs, values);
      }
    };
  }

  protected arrayHandler(value) {
    return {
      array: value,
      push: function (value) {
        this.array.push(value);
      }
    };
  }

  // Options
  protected wrapOption(type: string, opts?: {[key: string]: any}) {
    if (typeof(opts) === "undefined") {
      // query.<property>() retorna un manejador de objeto
      // Fix filter y expand para retornar el handler
      if (!this.hasOption(type) && [ODataQueryBuilder.FILTER, ODataQueryBuilder.EXPAND].indexOf(type) !== -1)
        this.options[type] = {};
      // Fix selecy order_by y rawfilter para retornar un manejador de array
      if ([ODataQueryBuilder.SELECT, ODataQueryBuilder.ORDER_BY, ODataQueryBuilder.RAWFILTER].indexOf(type) !== -1) {
        this.options[type] = typeof(this.options[type]) === "string" ? [this.options[type]] : this.options[type] || [];
      }
      let value = this.options[type];
      return typeof(value) === "object" ?
        (!Array.isArray(value) ? this.objectHandler(value) : this.arrayHandler(value)) : value;
    } else if (opts === null) {
      // query.<property>(null) limpia la propiedad
      delete this.options[type];
    } else {
      // query.<property>(opts) setea la propiedad
      this.options[type] = opts;
    }
    return this;
  }

  protected hasOption(type) {
    return typeof(this.options[type]) !== "undefined";
  }
  
  protected removeOption(type) {
    delete this.options[type];
  }

  // Segments
  protected wrapSegment(type: string, name?: string, index: number = -1) {
    let segment;
    if (typeof (name) === "undefined") {
      segment = this.segments.find(s => s.type === type);
      if (segment)
        return segment.name;
    } else {
      segment = this.segments.find(s => s.type === type && s.name === name);
      if (!segment) {
        segment = { type, name, options: {} };
        if (index === -1)
          this.segments.push(segment);
        else {
          this.segments.splice(index, 0, segment);
        }
      }
      return this.objectHandler(segment.options);
    }
  }
  protected hasSegment(type, name) {
    return !!this.segments.find(s => s.type === type && ( typeof(name) === "undefined" || s.name === name));
  }
  protected removeSegment(type, name) {
    this.segments = this.segments.filter(s => s.type === type && s.name === name);
  }

  select(opts?) { return this.wrapOption(ODataQueryBuilder.SELECT, opts); }
  hasSelect() { return this.hasOption(ODataQueryBuilder.SELECT); }
  removeSelect() { this.removeOption(ODataQueryBuilder.SELECT); }
  filter(opts?) { return this.wrapOption(ODataQueryBuilder.FILTER, opts); }
  removeFilter() { this.removeOption(ODataQueryBuilder.FILTER); }
  rawFilter(opts?) { return this.wrapOption(ODataQueryBuilder.RAWFILTER, opts); }
  removeRawFilter() { this.removeOption(ODataQueryBuilder.RAWFILTER); }
  search(opts?) { return this.wrapOption(ODataQueryBuilder.SEARCH, opts); }
  removeSearch() { this.removeOption(ODataQueryBuilder.SEARCH); }
  groupBy(opts?) { return this.wrapOption(ODataQueryBuilder.GROUP_BY, opts); }
  removeGroupBy() { this.removeOption(ODataQueryBuilder.GROUP_BY); }
  transform(opts?) { return this.wrapOption(ODataQueryBuilder.TRANSFORM, opts); }
  removeTransform() { this.removeOption(ODataQueryBuilder.TRANSFORM); }
  orderBy(opts?) { return this.wrapOption(ODataQueryBuilder.ORDER_BY, opts); }
  removeOrderBy() { this.removeOption(ODataQueryBuilder.ORDER_BY); }
  expand(opts?) { return this.wrapOption(ODataQueryBuilder.EXPAND, opts); }
  hasExpand() { return this.hasOption(ODataQueryBuilder.EXPAND); }
  removeExpand() { this.removeOption(ODataQueryBuilder.EXPAND); }

  top(opts?) { return this.wrapOption(ODataQueryBuilder.TOP, opts); }
  removeTop() { this.removeOption(ODataQueryBuilder.TOP); }
  skip(opts?) { return this.wrapOption(ODataQueryBuilder.SKIP, opts); }
  removeSkip() { this.removeOption(ODataQueryBuilder.SKIP); }
  count(opts?) { return this.wrapOption(ODataQueryBuilder.COUNT, opts); }
  removeCount() { this.removeOption(ODataQueryBuilder.COUNT); }

  entityKey(opts) {
    let name = this.wrapSegment(ODataQueryBuilder.ENTITY_SET);
    // Quito lo que no se puede usar con keys
    this.removeFilter();
    this.removeRawFilter();
    this.removeOrderBy();
    this.removeCount();
    this.removeSkip();
    this.removeTop();
    this.wrapSegment(ODataQueryBuilder.ENTITY_SET, name || "").set('key', opts);
    return this;
  }
  removeEntityKey() {
    let name = this.wrapSegment(ODataQueryBuilder.ENTITY_SET);
    if (typeof(name) !== "undefined")
      this.wrapSegment(ODataQueryBuilder.ENTITY_SET, name).unset('key');
  }

  singleton(name) { return this.wrapSegment(ODataQueryBuilder.SINGLETON, name); }
  removeSingleton(name) { return this.removeSegment(ODataQueryBuilder.SINGLETON, name); }
  entitySet(name) { return this.wrapSegment(ODataQueryBuilder.ENTITY_SET, name, 0); }
  removeEntitySet(name) { return this.removeSegment(ODataQueryBuilder.ENTITY_SET, name); }
  action(name) { return this.wrapSegment(ODataQueryBuilder.ACTION_CALL, name); }
  hasAction(name) { return this.hasSegment(ODataQueryBuilder.ACTION_CALL, name); }
  removeAction(name) { return this.removeSegment(ODataQueryBuilder.ACTION_CALL, name); }
  function(name) { return this.wrapSegment(ODataQueryBuilder.FUNCTION_CALL, name); }
  removeFunction(name) { return this.removeSegment(ODataQueryBuilder.FUNCTION_CALL, name); }
  property(name) { return this.wrapSegment(ODataQueryBuilder.PROPERTY, name); }
  removeProperty(name) { return this.removeSegment(ODataQueryBuilder.PROPERTY, name); }
  navigationProperty(name) { return this.wrapSegment(ODataQueryBuilder.NAVIGATION_PROPERTY, name); }
  removeNavigationProperty(name) { return this.removeSegment(ODataQueryBuilder.NAVIGATION_PROPERTY, name); }
  ref() { return this.wrapSegment(ODataQueryBuilder.REF, ODataQueryBuilder.$REF); }
  removeRef() { return this.removeSegment(ODataQueryBuilder.REF, ODataQueryBuilder.$REF); }
  value() { return this.wrapSegment(ODataQueryBuilder.VALUE, ODataQueryBuilder.$VALUE); }
  removeValue() { return this.removeSegment(ODataQueryBuilder.VALUE, ODataQueryBuilder.$VALUE); }
  countSegment() { return this.wrapSegment(ODataQueryBuilder.COUNT, ODataQueryBuilder.$COUNT); }
  removeCountSegment() { return this.removeSegment(ODataQueryBuilder.COUNT, ODataQueryBuilder.$COUNT); }
}