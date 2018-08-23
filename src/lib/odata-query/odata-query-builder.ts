import { ODataQueryAbstract } from "./odata-query-abstract";
import { ODataService } from "../odata-service/odata.service";
import buildQuery from 'odata-query';
import { Observable } from "rxjs";
import { ODataResponse } from "../odata-response/odata-response";

export interface BuilderOptions {
  set: string;
}

export class ODataQueryBuilder extends ODataQueryAbstract {
  options: BuilderOptions;
  constructor(odataService: ODataService, options?: BuilderOptions) {
    super(odataService);
    this.options = options || <BuilderOptions>{};
  }

  clone(): ODataQueryBuilder {
    return new ODataQueryBuilder(this.odataService, Object.assign({}, this.options));
  }

  toObject() {
    return Object.assign({}, this.options);
  }

  toString() {
    let set = this.options.set || "";
    return `${set}${buildQuery(this.options)}`;
  }

  static fromObject(odataService: ODataService, options: BuilderOptions): ODataQueryBuilder {
    return new ODataQueryBuilder(odataService, options);
  }

  private wrapper(value, opts): ODataQueryBuilder | any {
    if (typeof(opts) === 'undefined') {
      return this.options[value];
    }
    else if (opts === null) {
      delete this.options[value];
    } else {
      this.options = Object.assign(this.options, {[value]: opts});
    }
    return this;
  }

  select(opts=null) { return this.wrapper("select", opts); }
  filter(opts=null) { return this.wrapper("filter", opts); }
  search(opts=null) { return this.wrapper("search", opts); }
  groupBy(opts=null) { return this.wrapper("groupBy", opts); }
  transform(opts=null) { return this.wrapper("transform", opts); }
  orderBy(opts=null) { return this.wrapper("orderBy", opts); }
  top(opts=null) { return this.wrapper("top", opts); }
  skip(opts=null) { return this.wrapper("skip", opts); }
  set(opts=null) { return this.wrapper("set", opts); }
  key(opts=null) { return this.wrapper("key", opts); }
  count(opts=null) { return this.wrapper("count", opts); }
  expand(opts=null) { return this.wrapper("expand", opts); }
  action(opts=null) { return this.wrapper("action", opts); }
  func(opts=null) { return this.wrapper("func", opts); }

  // QUERY EXECUTION

  get(httpOptions?): Observable<ODataResponse> {
    return this.odataService.get(this, httpOptions);
  }

  post(body: any, httpOptions?): Observable<ODataResponse> {
    return this.odataService.post(this, body, httpOptions);
  }

  patch(body: any, etag?: string, httpOptions?): Observable<ODataResponse> {
    return this.odataService.patch(this, body, etag, httpOptions);
  }

  put(body: any, etag?: string, httpOptions?): Observable<ODataResponse> {
    return this.odataService.put(this, body, etag, httpOptions);
  }

  delete(etag?: string, httpOptions?): Observable<ODataResponse> {
    return this.odataService.delete(this, etag, httpOptions);
  }
}