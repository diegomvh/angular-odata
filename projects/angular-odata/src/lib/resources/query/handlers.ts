import { QueryOptionNames } from '../../types';
import { Objects, Types } from '../../utils';
import {
  alias,
  Expand,
  Filter,
  OrderBy,
  Select,
  Transform,
  normalizeValue,
  raw,
  duration,
  binary,
} from './builder';
import {
  ComputeExpression,
  ComputeExpressionBuilder,
  FilterExpression,
  FilterExpressionBuilder,
  OrderByExpression,
  OrderByExpressionBuilder,
  SearchExpression,
  SearchExpressionBuilder,
  ExpandExpression,
  ExpandExpressionBuilder,
  SelectExpression,
  SelectExpressionBuilder,
} from './expressions';
import type { ODataQueryArguments, ODataQueryOptions } from './options';

export class ODataQueryOptionHandler<T> {
  constructor(
    private o: Map<QueryOptionNames, any>,
    private n: QueryOptionNames
  ) {}

  /**
   * The name of the managed odata query option.
   */
  get name() {
    return this.n;
  }

  /**
   * Converts the managed odata query option to a json object.
   * @returns {any}
   */
  toJSON() {
    return this.o.get(this.n);
  }

  /**
   * Returns a boolean indicating if the managed odata query option is empty.
   * @returns True if the managed odata query option is empty.
   */
  empty() {
    return Types.isEmpty(this.o.get(this.n));
  }

  //#region Primitive Value
  /**
   * Get or Set the value of the managed odata query option.
   * @param v The value to set.
   * @returns
   */
  value(v?: any) {
    if (v !== undefined) this.o.set(this.n, v);
    return this.o.get(this.n);
  }
  //#endregion

  //#region Array Value
  private assertArray(): any[] {
    if (!Types.isArray(this.o.get(this.n)))
      this.o.set(this.n, this.o.has(this.n) ? [this.o.get(this.n)] : []);
    return this.o.get(this.n);
  }

  /**
   * Push value to the managed odata query option.
   * @param value Value to push
   */
  push(value: any) {
    this.assertArray().push(value);
  }

  /**
   * Remove value from the managed odata query option.
   * @param value Value to remove
   */
  remove(value: any) {
    this.o.set(
      this.n,
      this.assertArray().filter((v) => v !== value)
    );
    // If only one and not is array... down to value
    if (
      this.o.get(this.n).length === 1 &&
      !Types.isArray(this.o.get(this.n)[0])
    )
      this.o.set(this.n, this.o.get(this.n)[0]);
  }

  /**
   * Return value at index of the managed odata query option.
   * @param index Index of the value
   * @returns The value
   */
  at(index: number) {
    return this.assertArray()[index];
  }

  some(predicate: (value: any) => boolean) {
    return this.assertArray().some(predicate);
  }

  every(predicate: (value: any) => boolean) {
    return this.assertArray().every(predicate);
  }

  find(predicate: (value: any) => boolean) {
    return this.assertArray().find(predicate);
  }
  //#endregion

  //#region HashMap Value
  private assertObject(create: boolean): { [name: string]: any } {
    if (
      !Types.isArray(this.o.get(this.n)) &&
      Types.isPlainObject(this.o.get(this.n))
    ) {
      return this.o.get(this.n);
    }
    let arr = this.assertArray();
    let obj = arr.find((v) => Types.isPlainObject(v));
    if (!obj && create) {
      obj = {};
      arr.push(obj);
    }
    return obj;
  }

  /**
   * Set the value for path in the managed odata query option.
   * @param path Path for set the value
   * @param value Value to set
   */
  set(path: string, value: any) {
    let obj = this.assertObject(true);
    Objects.set(obj, path, value);
  }

  /**
   * Get the value for path from the managed odata query option.
   * @param path The path from get the value
   * @param def Default if not found
   * @returns
   */
  get(path: string, def?: any): any {
    let obj = this.assertObject(false) || {};
    return Objects.get(obj, path, def);
  }

  /**
   * Unset the value for path in the managed odata query option.
   * @param path
   */
  unset(path: string) {
    let obj = this.assertObject(true);
    Objects.unset(obj, path);

    if (Types.isArray(this.o.get(this.n))) {
      this.o.set(
        this.n,
        this.o.get(this.n).filter((v: any) => !Types.isEmpty(v))
      );
      if (this.o.get(this.n).length === 1)
        this.o.set(this.n, this.o.get(this.n)[0]);
    }
  }

  /**
   * Test if the managed odata query option has the value.
   * @param path The path fot test if the value is set
   * @returns Boolean indicating if the value is set
   */
  has(path: string) {
    let obj = this.assertObject(false) || {};
    return Objects.has(obj, path);
  }

  /**
   * Merge values from object into the managed odata query option.
   * @param values Object to merge
   * @returns
   */
  assign(values: { [attr: string]: any }) {
    let obj = this.assertObject(true);
    return Objects.merge(obj, values);
  }
  //#endregion

  /**
   * Clear the managed odata query option.
   */
  clear() {
    this.o.delete(this.n);
  }
}

export class ODataQueryOptionsHandler<T> {
  constructor(protected options: ODataQueryOptions<T>) {}

  /**
   * Create a raw odata value
   * @param value The value to raw
   * @returns The raw value
   */
  raw(value: any) {
    return raw(value);
  }

  /**
   * Create a new odata alias parameter
   * @link https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html#sec_ParameterAliases
   * @param value The value of the alias
   * @param name The name of the alias
   * @returns The alias
   */
  alias(value: any, name?: string) {
    return alias(value, name);
  }

  /**
   * Create a duration odata value
   * @param value The value to duration
   * @returns The duration value
   */
  duration(value: any) {
    return duration(value);
  }

  /**
   * Create a binary odata value
   * @param value The value to binary
   * @returns The binary value
   */
  binary(value: any) {
    return binary(value);
  }

  /**
   * Normalize the given value to a valid odata value
   * @param value The value to normalize
   * @returns The normalized value
   */
  normalize(value: any) {
    return normalizeValue(value);
  }

  /**
   * Build and return a handler for modifying the $select option.
   * If opts is given then set te value as new value for $select.
   * @param opts Select<T> value or builder function for SelectExpression<T>
   */
  select(opts: SelectExpressionBuilder<T>): SelectExpression<T>;
  select(opts: Select<T>): ODataQueryOptionHandler<T>;
  select(): ODataQueryOptionHandler<T>;
  select(opts?: any): any {
    if (Types.isFunction(opts)) {
      return this.options.expression(
        QueryOptionNames.select,
        SelectExpression.select(
          opts,
          this.options.expression(QueryOptionNames.select)
        )
      );
    }
    return this.options.option<Select<T>>(QueryOptionNames.select, opts);
  }

  /**
   * Build and return a handler for modifying the $expand option.
   * If opts is given then set te value as new value for $expand.
   * @param opts Expand<T> value or builder function for ExpandExpression<T>
   */
  expand(opts: ExpandExpressionBuilder<T>): ExpandExpression<T>;
  expand(opts: Expand<T>): ODataQueryOptionHandler<T>;
  expand(): ODataQueryOptionHandler<T>;
  expand(opts?: any): any {
    if (Types.isFunction(opts)) {
      return this.options.expression(
        QueryOptionNames.expand,
        ExpandExpression.expand(
          opts,
          this.options.expression(QueryOptionNames.expand)
        )
      );
    }
    return this.options.option<Expand<T>>(QueryOptionNames.expand, opts);
  }

  /**
   * Build and return a handler for modifying the $compute option.
   * If opts is given then set te value as new value for $compute.
   * @link https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html#sec_SystemQueryOptioncompute
   * @param opts string value or builder function for ComputeExpression<T>
   */
  compute(
    opts: (
      builder: ComputeExpressionBuilder<T>,
      current?: ComputeExpression<T>
    ) => ComputeExpression<T>
  ): ComputeExpression<T>;
  compute(opts: string): ODataQueryOptionHandler<T>;
  compute(): ODataQueryOptionHandler<T>;
  compute(opts?: any): any {
    if (Types.isFunction(opts)) {
      return this.options.expression(
        QueryOptionNames.compute,
        ComputeExpression.compute(
          opts,
          this.options.expression(QueryOptionNames.compute)
        )
      );
    }
    return this.options.option<string>(QueryOptionNames.compute, opts);
  }

  /**
   * Build and return a handler for modifying the $format option.
   * If opts is given then set te value as new value for $format.
   * @link https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html#sec_SystemQueryOptionformat
   * @param opts string value for format
   */
  format(opts: string): ODataQueryOptionHandler<T>;
  format(): ODataQueryOptionHandler<T>;
  format(opts?: string): any {
    return this.options.option<string>(QueryOptionNames.format, opts);
  }

  /**
   * Build and return a handler for modifying the $transform option.
   * If opts is given then set te value as new value for $transform.
   * @param opts string value for transform
   */
  transform(opts: Transform<T>): ODataQueryOptionHandler<T>;
  transform(): ODataQueryOptionHandler<T>;
  transform(opts?: Transform<T>): any {
    return this.options.option<Transform<T>>(QueryOptionNames.transform, opts);
  }

  /**
   * Build and return a handler for modifying the $search option.
   * If opts is given then set te value as new value for $search.
   * @param opts string value or builder function for SearchExpression<T>
   */
  search(
    opts: (
      builder: SearchExpressionBuilder<T>,
      current?: SearchExpression<T>
    ) => SearchExpression<T>
  ): SearchExpression<T>;
  search(opts: string): ODataQueryOptionHandler<T>;
  search(): ODataQueryOptionHandler<T>;
  search(opts?: any): any {
    if (Types.isFunction(opts)) {
      return this.options.expression(
        QueryOptionNames.search,
        SearchExpression.search(
          opts,
          this.options.expression(QueryOptionNames.search)
        )
      );
    }
    return this.options.option<string>(QueryOptionNames.search, opts);
  }

  /**
   * Build and return a handler for modifying the $filter option.
   * If opts is given then set te value as new value for $filter.
   * @param opts Filter<T> value or builder function for FilterExpression<T>
   */
  filter(
    opts: (
      builder: FilterExpressionBuilder<T>,
      current?: FilterExpression<T>
    ) => FilterExpression<T>
  ): FilterExpression<T>;
  filter(opts: Filter<T>): ODataQueryOptionHandler<T>;
  filter(): ODataQueryOptionHandler<T>;
  filter(opts?: any): any {
    if (Types.isFunction(opts)) {
      return this.options.expression(
        QueryOptionNames.filter,
        FilterExpression.filter(
          opts,
          this.options.expression(QueryOptionNames.filter)
        )
      );
    }
    return this.options.option<Filter<T>>(QueryOptionNames.filter, opts);
  }

  /**
   * Build and return a handler for modifying the $orderby option.
   * If opts is given then set te value as new value for $orderby.
   * @param opts OrderBy<T> value or builder function for OrderByExpression<T>
   */
  orderBy(
    opts: (
      builder: OrderByExpressionBuilder<T>,
      current?: OrderByExpression<T>
    ) => OrderByExpression<T>
  ): OrderByExpression<T>;
  orderBy(opts: OrderBy<T>): ODataQueryOptionHandler<T>;
  orderBy(): ODataQueryOptionHandler<T>;
  orderBy(opts?: any): any {
    if (Types.isFunction(opts)) {
      return this.options.option(
        QueryOptionNames.orderBy,
        OrderByExpression.orderBy(
          opts,
          this.options.expression(QueryOptionNames.orderBy)
        )
      );
    }
    return this.options.option<OrderBy<T>>(QueryOptionNames.orderBy, opts);
  }

  /**
   * Build and return a handler for modifying the $top option.
   * If opts is given then set te value as new value for $top.
   * @param opts number value
   */
  top(opts: number): ODataQueryOptionHandler<T>;
  top(): ODataQueryOptionHandler<T>;
  top(opts?: number): any {
    return this.options.option<number>(QueryOptionNames.top, opts);
  }

  /**
   * Build and return a handler for modifying the $skip option.
   * If opts is given then set te value as new value for $skip.
   * @param opts number value
   */
  skip(opts: number): ODataQueryOptionHandler<T>;
  skip(): ODataQueryOptionHandler<T>;
  skip(opts?: number): any {
    return this.options.option<number>(QueryOptionNames.skip, opts);
  }

  /**
   * Build and return a handler for modifying the $skiptoken option.
   * If opts is given then set te value as new value for $skiptoken.
   * @param opts string value
   */
  skiptoken(opts: string): ODataQueryOptionHandler<T>;
  skiptoken(): ODataQueryOptionHandler<T>;
  skiptoken(opts?: string): any {
    return this.options.option<string>(QueryOptionNames.skiptoken, opts);
  }

  /**
   * Shortcut for set $top, $skip, $skiptoken.
   * @param param0 skip or top or skiptoken
   */
  paging({
    skip,
    skiptoken,
    top,
  }: {
    skip?: number | null;
    skiptoken?: string | null;
    top?: number | null;
  } = {}) {
    if (skiptoken !== undefined) {
      if (skiptoken !== null) {
        this.skiptoken(skiptoken);
      } else {
        this.options.remove(QueryOptionNames.skiptoken);
      }
    }
    if (skip !== undefined) {
      if (skip !== null) {
        this.skip(skip);
      } else {
        this.options.remove(QueryOptionNames.skip);
      }
    }
    if (top !== undefined) {
      if (top !== null) {
        this.top(top);
      } else {
        this.options.remove(QueryOptionNames.top);
      }
    }
  }

  /**
   * Shortcut for clear pagination by unset $top, $skip, $skiptoken.
   */
  clearPaging() {
    this.options.remove(QueryOptionNames.skip);
    this.options.remove(QueryOptionNames.top);
    this.options.remove(QueryOptionNames.skiptoken);
  }

  /**
   * Shortcut for clear query.
   */
  clear() {
    this.options.clear();
  }

  /**
   * Retrun the query.
   */
  query() {
    return this.options.toQueryArguments();
  }

  /**
   * Apply the given query options to the current query.
   * @param query The query to be applied.
   */
  apply(query: ODataQueryArguments<T>) {
    if (query.select !== undefined) {
      if (query.select instanceof SelectExpression) {
        this.options.expression(
          QueryOptionNames.select,
          query.select as SelectExpression<T>
        );
      } else if (query.select !== null) {
        this.options.option(QueryOptionNames.select, query.select);
      } else {
        this.options.remove(QueryOptionNames.select);
      }
    }
    if (query.expand !== undefined) {
      if (query.expand instanceof ExpandExpression) {
        this.options.expression(
          QueryOptionNames.expand,
          query.expand as ExpandExpression<T>
        );
      } else if (query.expand !== null) {
        this.options.option(QueryOptionNames.expand, query.expand);
      } else {
        this.options.remove(QueryOptionNames.expand);
      }
    }
    if (query.compute !== undefined) {
      if (query.compute instanceof ComputeExpression) {
        this.options.expression(
          QueryOptionNames.compute,
          query.compute as ComputeExpression<T>
        );
      } else if (query.compute !== null) {
        this.options.option(QueryOptionNames.compute, query.compute);
      } else {
        this.options.remove(QueryOptionNames.compute);
      }
    }
    if (query.transform !== undefined) {
      if (query.transform !== null) {
        this.options.option(QueryOptionNames.transform, query.transform);
      } else {
        this.options.remove(QueryOptionNames.transform);
      }
    }
    if (query.search !== undefined) {
      if (query.search instanceof SearchExpression) {
        this.options.expression(
          QueryOptionNames.search,
          query.search as SearchExpression<T>
        );
      } else if (query.search !== null) {
        this.options.option(QueryOptionNames.search, query.search);
      } else {
        this.options.remove(QueryOptionNames.search);
      }
    }
    if (query.filter !== undefined) {
      if (query.filter instanceof FilterExpression) {
        this.options.expression(
          QueryOptionNames.filter,
          query.filter as FilterExpression<T>
        );
      } else if (query.filter !== null) {
        this.options.option(QueryOptionNames.filter, query.filter);
      } else {
        this.options.remove(QueryOptionNames.filter);
      }
    }
    if (query.orderBy !== undefined) {
      if (query.orderBy instanceof OrderByExpression) {
        this.options.expression(
          QueryOptionNames.orderBy,
          query.orderBy as OrderByExpression<T>
        );
      } else if (query.orderBy !== null) {
        this.options.option(QueryOptionNames.orderBy, query.orderBy);
      } else {
        this.options.remove(QueryOptionNames.orderBy);
      }
    }
    this.paging(query);
  }
}
