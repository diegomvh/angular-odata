import { FilterString } from './filter/filter-string';
import { Filter } from './filter/filter';
import { Expand } from './expand';
import { Utils } from '../utils/utils';
import { Orderby } from './orderby';
import { Search } from './search/search';

export class QueryOptions {
  private separatorVar: string;
  private selectVar: string[];
  private filterVar: Filter;
  private expandVar: Expand[];
  private orderbyVar: Orderby[];
  private searchVar: string | Search;
  private skipVar: number;
  private topVar: number;
  private countVar: boolean;
  private customVar: Map<string, string>;
  private formatVar: string;

  constructor(separator: string) {
    Utils.requireNotNullNorUndefined(separator, 'separator');
    Utils.requireNotEmpty(separator, 'separator');
    this.separatorVar = separator;
    this.selectVar = null;
    this.filterVar = null;
    this.expandVar = null;
    this.orderbyVar = null;
    this.searchVar = null;
    this.skipVar = null;
    this.topVar = null;
    this.countVar = null;
    this.customVar = null;
    this.formatVar = null;
  }

  select(select: string | string[]): QueryOptions {
    if (Utils.isNullOrUndefined(select) || Utils.isEmpty(select)) {
      this.selectVar = null;
    } else {
      this.selectVar = typeof (select) === 'string' ? [select] : select;
    }
    return this;
  }

  filter(filter: string | Filter): QueryOptions {
    if (Utils.isNullOrUndefined(filter) || Utils.isEmpty(filter)) {
      this.filterVar = null;
    } else {
      this.filterVar = typeof (filter) === 'string' ? new FilterString(filter) : filter;
    }
    return this;
  }

  expand(expand: string | Expand | Expand[]): QueryOptions {
    if (Utils.isNullOrUndefined(expand) || Utils.isEmpty(expand)) {
      this.expandVar = null;
    } else {
      this.expandVar = typeof (expand) === 'string' ? [new Expand(expand)] : expand instanceof Expand ? [expand] : expand;
    }
    return this;
  }

  orderby(orderby: string | Orderby[]): QueryOptions {
    if (Utils.isNullOrUndefined(orderby) || Utils.isEmpty(orderby)) {
      this.orderbyVar = null;
    } else {
      this.orderbyVar = typeof (orderby) === 'string' ? [new Orderby(orderby)] : orderby;
    }
    return this;
  }

  search(search: string | Search): QueryOptions {
    this.searchVar = search;
    return this;
  }

  skip(skip: number): QueryOptions {
    Utils.requireNotNegative(skip, 'skip');
    this.skipVar = skip;
    return this;
  }

  top(top: number): QueryOptions {
    Utils.requireNotNegative(top, 'top');
    this.topVar = top;
    return this;
  }

  count(count: boolean): QueryOptions {
    this.countVar = count;
    return this;
  }

  format(format: string): QueryOptions {
    this.formatVar = format;
    return this;
  }

  customOption(key: string, value: string) {
    Utils.requireNotNullNorUndefined(key, 'key');
    if (Utils.isNullOrUndefined(this.customVar)) {
      this.customVar = new Map<string, string>();
    }
    this.customVar.set(key, value);
    return this;
  }

  params() {
    // query options
    let options = {};

    // add select
    if (!Utils.isNullOrUndefined(this.selectVar) && !Utils.isEmpty(this.selectVar)) {
      if (typeof (this.selectVar) === 'string') {
        options['$select'] = this.selectVar;
      } else {
        options['$select'] = Utils.toString(this.selectVar);
      }
    }

    // add filter
    if (!Utils.isNullOrUndefined(this.filterVar) && !Utils.isEmpty(this.filterVar)) {
      options['$filter='] = encodeURIComponent(this.filterVar.toString());
    }

    // add expand
    if (!Utils.isNullOrUndefined(this.expandVar) && !Utils.isEmpty(this.expandVar)) {
      if (typeof (this.expandVar) === 'string') {
        options['$expand'] = this.expandVar;
      } else {
        options['$expand'] = Utils.toString(this.expandVar);
      }
    }

    // add orderby
    if (!Utils.isNullOrUndefined(this.orderbyVar) && !Utils.isEmpty(this.orderbyVar)) {
      if (typeof (this.orderbyVar) === 'string') {
        options['$orderby'] = this.orderbyVar;
      } else {
        options['$orderby'] = Utils.toString(this.orderbyVar);
      }
    }

    // add search
    if (!Utils.isNullOrUndefined(this.searchVar) && !Utils.isEmpty(this.searchVar)) {
      options['$search'] = encodeURIComponent(this.searchVar.toString());
    }

    // add skip
    if (!Utils.isNullOrUndefined(this.skipVar) && !Utils.isEmpty(this.skipVar)) {
      options['$skip'] = this.skipVar;
    }

    // add top
    if (!Utils.isNullOrUndefined(this.topVar) && !Utils.isEmpty(this.topVar)) {
      options['$top'] = this.topVar;
    }

    // add count
    if (!Utils.isNullOrUndefined(this.countVar) && !Utils.isEmpty(this.countVar)) {
      options['$count'] = this.countVar;
    }

    // add format
    if (!Utils.isNullOrUndefined(this.formatVar) && !Utils.isEmpty(this.formatVar)) {
      options['$format'] = this.formatVar;
    }

    // add custom query options
    if (Utils.isNotNullNorUndefined(this.customVar) && this.customVar.size > 0) {
      this.customVar.forEach((value: string, key: string, map: Map<string, string>) => {
        if (Utils.isNotNullNorUndefined(key) && !Utils.isEmpty(key)
          && Utils.isNotNullNorUndefined(value) && !Utils.isEmpty(value)) {
          options[key] = encodeURIComponent(value);
        }
      });
    }

    return options;
  }

  toString(): string {
    return Object.entries(this.params())
      .map(e => `${e[0]}=${e[1]}`)
      .join(this.separatorVar);
  }

  isEmpty(): boolean {
    for (const key in this) {
      if (key === 'purposeVar' || key === 'separatorVar') {
        continue;
      }
      if (this.hasOwnProperty(key) && !Utils.isEmpty(this[key])) {
        return false;
      }
    }
    return true;
  }
}
