import { FilterString } from './filter/filter-string';
import { Filter } from './filter/filter';
import { Expand } from './expand';
import { Utils } from '../utils/utils';
import { Orderby } from './orderby';
import { Search } from './search/search';

export class QueryOptions {
  private _separator: string;
  private _select: string[];
  private _filter: Filter;
  private _expand: Expand[];
  private _orderby: Orderby[];
  private _search: string | Search;
  private _skip: number;
  private _top: number;
  private _count: boolean;
  private _customOptions: Map<string, string>;
  private _format: string;

  constructor(separator: string) {
    Utils.requireNotNullNorUndefined(separator, 'separator');
    Utils.requireNotEmpty(separator, 'separator');
    this._separator = separator;
    this._select = null;
    this._filter = null;
    this._expand = null;
    this._orderby = null;
    this._search = null;
    this._skip = null;
    this._top = null;
    this._count = null;
    this._customOptions = null;
    this._format = null;
  }

  select(select: string | string[]): QueryOptions {
    if (Utils.isNullOrUndefined(select) || Utils.isEmpty(select)) {
      this._select = null;
    } else {
      this._select = typeof (select) === 'string' ? [select] : select;
    }
    return this;
  }

  filter(filter: string | Filter): QueryOptions {
    if (Utils.isNullOrUndefined(filter) || Utils.isEmpty(filter)) {
      this._filter = null;
    } else {
      this._filter = typeof (filter) === 'string' ? new FilterString(filter) : filter;
    }
    return this;
  }

  expand(expand: string | Expand | Expand[]): QueryOptions {
    if (Utils.isNullOrUndefined(expand) || Utils.isEmpty(expand)) {
      this._expand = null;
    } else {
      this._expand = typeof (expand) === 'string' ? [new Expand(expand)] : expand instanceof Expand ? [expand] : expand;
    }
    return this;
  }

  orderby(orderby: string | Orderby[]): QueryOptions {
    if (Utils.isNullOrUndefined(orderby) || Utils.isEmpty(orderby)) {
      this._orderby = null;
    } else {
      this._orderby = typeof (orderby) === 'string' ? [new Orderby(orderby)] : orderby;
    }
    return this;
  }

  search(search: string | Search): QueryOptions {
    this._search = search;
    return this;
  }

  skip(skip: number): QueryOptions {
    Utils.requireNotNegative(skip, 'skip');
    this._skip = skip;
    return this;
  }

  top(top: number): QueryOptions {
    Utils.requireNotNegative(top, 'top');
    this._top = top;
    return this;
  }

  count(count: boolean): QueryOptions {
    this._count = count;
    return this;
  }

  format(format: string): QueryOptions {
    this._format = format;
    return this;
  }

  customOption(key: string, value: string) {
    Utils.requireNotNullNorUndefined(key, 'key');
    if (Utils.isNullOrUndefined(this._customOptions)) {
      this._customOptions = new Map<string, string>();
    }
    this._customOptions.set(key, value);
    return this;
  }

  toString(): string {
    // query options
    let queryOptions = '';

    // add select
    if (!Utils.isNullOrUndefined(this._select) && !Utils.isEmpty(this._select)) {
      queryOptions += '$select=';
      if (typeof (this._select) === 'string') {
        queryOptions += this._select;
      } else {
        queryOptions += Utils.toString(this._select);
      }
    }

    // add filter
    if (!Utils.isNullOrUndefined(this._filter) && !Utils.isEmpty(this._filter)) {
      if (queryOptions.length) {
        queryOptions += this._separator;
      }
      queryOptions += '$filter=' + encodeURIComponent(this._filter.toString());
    }

    // add expand
    if (!Utils.isNullOrUndefined(this._expand) && !Utils.isEmpty(this._expand)) {
      if (queryOptions.length) {
        queryOptions += this._separator;
      }
      queryOptions += '$expand=';
      if (typeof (this._expand) === 'string') {
        queryOptions += this._expand;
      } else {
        queryOptions += Utils.toString(this._expand);
      }
    }

    // add orderby
    if (!Utils.isNullOrUndefined(this._orderby) && !Utils.isEmpty(this._orderby)) {
      if (queryOptions.length) {
        queryOptions += this._separator;
      }
      queryOptions += '$orderby=';
      if (typeof (this._orderby) === 'string') {
        queryOptions += this._orderby;
      } else {
        queryOptions += Utils.toString(this._orderby);
      }
    }

    // add search
    if (!Utils.isNullOrUndefined(this._search) && !Utils.isEmpty(this._search)) {
      if (queryOptions.length) {
        queryOptions += this._separator;
      }
      queryOptions += '$search=' + encodeURIComponent(this._search.toString());
    }

    // add skip
    if (!Utils.isNullOrUndefined(this._skip) && !Utils.isEmpty(this._skip)) {
      if (queryOptions.length) {
        queryOptions += this._separator;
      }
      queryOptions += '$skip=' + this._skip;
    }

    // add top
    if (!Utils.isNullOrUndefined(this._top) && !Utils.isEmpty(this._top)) {
      if (queryOptions.length) {
        queryOptions += this._separator;
      }
      queryOptions += '$top=' + this._top;
    }

    // add count
    if (!Utils.isNullOrUndefined(this._count) && !Utils.isEmpty(this._count)) {
      if (queryOptions.length) {
        queryOptions += this._separator;
      }
      queryOptions += '$count=' + this._count;
    }

    // add custom query options
    if (Utils.isNotNullNorUndefined(this._customOptions) && this._customOptions.size > 0) {
      this._customOptions.forEach((value: string, key: string, map: Map<string, string>) => {
        if (Utils.isNotNullNorUndefined(key) && !Utils.isEmpty(key)
          && Utils.isNotNullNorUndefined(value) && !Utils.isEmpty(value)) {
          if (queryOptions.length) {
            queryOptions += this._separator;
          }
          queryOptions += key + '=' + encodeURIComponent(value);
        }
      });
    }

    // add format
    if (!Utils.isNullOrUndefined(this._format) && !Utils.isEmpty(this._format)) {
      if (queryOptions.length) {
        queryOptions += this._separator;
      }
      queryOptions += '$format=' + this._format;
    }

    return queryOptions;
  }

  isEmpty(): boolean {
    for (const key in this) {
      if (key === '_purpose' || key === '_separator') {
        continue;
      }
      if (this.hasOwnProperty(key) && !Utils.isEmpty(this[key])) {
        return false;
      }
    }
    return true;
  }
}
