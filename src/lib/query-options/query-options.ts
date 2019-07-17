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
  private customOptionsVar: Map<string, string>;
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
    this.customOptionsVar = null;
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
    if (Utils.isNullOrUndefined(this.customOptionsVar)) {
      this.customOptionsVar = new Map<string, string>();
    }
    this.customOptionsVar.set(key, value);
    return this;
  }

  toString(): string {
    // query options
    let queryOptions = '';

    // add select
    if (!Utils.isNullOrUndefined(this.selectVar) && !Utils.isEmpty(this.selectVar)) {
      queryOptions += '$select=';
      if (typeof (this.selectVar) === 'string') {
        queryOptions += this.selectVar;
      } else {
        queryOptions += Utils.toString(this.selectVar);
      }
    }

    // add filter
    if (!Utils.isNullOrUndefined(this.filterVar) && !Utils.isEmpty(this.filterVar)) {
      if (queryOptions.length) {
        queryOptions += this.separatorVar;
      }
      queryOptions += '$filter=' + encodeURIComponent(this.filterVar.toString());
    }

    // add expand
    if (!Utils.isNullOrUndefined(this.expandVar) && !Utils.isEmpty(this.expandVar)) {
      if (queryOptions.length) {
        queryOptions += this.separatorVar;
      }
      queryOptions += '$expand=';
      if (typeof (this.expandVar) === 'string') {
        queryOptions += this.expandVar;
      } else {
        queryOptions += Utils.toString(this.expandVar);
      }
    }

    // add orderby
    if (!Utils.isNullOrUndefined(this.orderbyVar) && !Utils.isEmpty(this.orderbyVar)) {
      if (queryOptions.length) {
        queryOptions += this.separatorVar;
      }
      queryOptions += '$orderby=';
      if (typeof (this.orderbyVar) === 'string') {
        queryOptions += this.orderbyVar;
      } else {
        queryOptions += Utils.toString(this.orderbyVar);
      }
    }

    // add search
    if (!Utils.isNullOrUndefined(this.searchVar) && !Utils.isEmpty(this.searchVar)) {
      if (queryOptions.length) {
        queryOptions += this.separatorVar;
      }
      queryOptions += '$search=' + encodeURIComponent(this.searchVar.toString());
    }

    // add skip
    if (!Utils.isNullOrUndefined(this.skipVar) && !Utils.isEmpty(this.skipVar)) {
      if (queryOptions.length) {
        queryOptions += this.separatorVar;
      }
      queryOptions += '$skip=' + this.skipVar;
    }

    // add top
    if (!Utils.isNullOrUndefined(this.topVar) && !Utils.isEmpty(this.topVar)) {
      if (queryOptions.length) {
        queryOptions += this.separatorVar;
      }
      queryOptions += '$top=' + this.topVar;
    }

    // add count
    if (!Utils.isNullOrUndefined(this.countVar) && !Utils.isEmpty(this.countVar)) {
      if (queryOptions.length) {
        queryOptions += this.separatorVar;
      }
      queryOptions += '$count=' + this.countVar;
    }

    // add custom query options
    if (Utils.isNotNullNorUndefined(this.customOptionsVar) && this.customOptionsVar.size > 0) {
      this.customOptionsVar.forEach((value: string, key: string, map: Map<string, string>) => {
        if (Utils.isNotNullNorUndefined(key) && !Utils.isEmpty(key)
          && Utils.isNotNullNorUndefined(value) && !Utils.isEmpty(value)) {
          if (queryOptions.length) {
            queryOptions += this.separatorVar;
          }
          queryOptions += key + '=' + encodeURIComponent(value);
        }
      });
    }

    // add format
    if (!Utils.isNullOrUndefined(this.formatVar) && !Utils.isEmpty(this.formatVar)) {
      if (queryOptions.length) {
        queryOptions += this.separatorVar;
      }
      queryOptions += '$format=' + this.formatVar;
    }

    return queryOptions;
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
