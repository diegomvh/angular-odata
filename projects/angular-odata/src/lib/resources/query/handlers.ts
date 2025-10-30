import { Parser, ParserOptions, QueryOption } from '../../types';
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
  ApplyExpression,
  ApplyExpressionBuilder,
} from './expressions';
import { ODataQueryArguments, ODataQueryOptions, pathAndParamsFromQueryOptions } from './options';

export class ODataQueryOptionHandler<T> {
  constructor(
    private o: Map<QueryOption, any>,
    private n: QueryOption,
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
  toJson() {
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
      this.assertArray().filter((v) => v !== value),
    );
    // If only one and not is array... down to value
    if (this.o.get(this.n).length === 1 && !Types.isArray(this.o.get(this.n)[0]))
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
    if (!Types.isArray(this.o.get(this.n)) && Types.isPlainObject(this.o.get(this.n))) {
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
        this.o.get(this.n).filter((v: any) => !Types.isEmpty(v)),
      );
      if (this.o.get(this.n).length === 1) this.o.set(this.n, this.o.get(this.n)[0]);
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
  toString({ escape, parser }: { escape?: boolean; parser?: Parser<T> } = {}): string {
    const [_, params] = pathAndParamsFromQueryOptions(
      new Map<QueryOption, any>([[this.n, this.o.get(this.n)]]),
      { escape, parser },
    );
    return params[`$${this.n}`];
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
  select(
    opts: (
      builder: SelectExpressionBuilder<T>,
      current: SelectExpression<T>,
    ) => SelectExpression<T>,
  ): SelectExpression<T>;
  select(opts: Select<T>): ODataQueryOptionHandler<T>;
  select(): ODataQueryOptionHandler<T>;
  select(opts?: any): any {
    if (Types.isFunction(opts)) {
      return this.options.expression(
        QueryOption.select,
        SelectExpression.factory(opts, this.options.expression(QueryOption.select)),
      );
    }
    return this.options.option<Select<T>>(QueryOption.select, opts);
  }

  /**
   * Build and return a handler for modifying the $expand option.
   * If opts is given then set te value as new value for $expand.
   * @param opts Expand<T> value or builder function for ExpandExpression<T>
   */
  expand(
    opts: (
      builder: ExpandExpressionBuilder<T>,
      current: ExpandExpression<T>,
    ) => ExpandExpression<T>,
  ): ExpandExpression<T>;
  expand(opts: Expand<T>): ODataQueryOptionHandler<T>;
  expand(): ODataQueryOptionHandler<T>;
  expand(opts?: any): any {
    if (Types.isFunction(opts)) {
      return this.options.expression(
        QueryOption.expand,
        ExpandExpression.factory(opts, this.options.expression(QueryOption.expand)),
      );
    }
    return this.options.option<Expand<T>>(QueryOption.expand, opts);
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
      current: ComputeExpression<T>,
    ) => ComputeExpression<T>,
  ): ComputeExpression<T>;
  compute(opts: string): ODataQueryOptionHandler<T>;
  compute(): ODataQueryOptionHandler<T>;
  compute(opts?: any): any {
    if (Types.isFunction(opts)) {
      return this.options.expression(
        QueryOption.compute,
        ComputeExpression.factory(opts, this.options.expression(QueryOption.compute)),
      );
    }
    return this.options.option<string>(QueryOption.compute, opts);
  }

  /**
   * Build and return a handler for modifying the $apply option.
   * If opts is given then set te value as new value for $compute.
   * @link http://docs.oasis-open.org/odata/odata-data-aggregation-ext/v4.0/cs02/odata-data-aggregation-ext-v4.0-cs02.html
   * @param opts string value or builder function for ApplyExpression<T>
   */
  apply(
    opts: (builder: ApplyExpressionBuilder<T>, current: ApplyExpression<T>) => ApplyExpression<T>,
  ): ApplyExpression<T>;
  apply(opts: string): ODataQueryOptionHandler<T>;
  apply(): ODataQueryOptionHandler<T>;
  apply(opts?: any): any {
    if (Types.isFunction(opts)) {
      return this.options.expression(
        QueryOption.apply,
        ApplyExpression.factory(opts, this.options.expression(QueryOption.apply)),
      );
    }
    return this.options.option<string>(QueryOption.apply, opts);
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
    return this.options.option<string>(QueryOption.format, opts);
  }

  /**
   * Build and return a handler for modifying the $transform option.
   * If opts is given then set te value as new value for $transform.
   * @param opts string value for transform
   */
  transform(opts: Transform<T>): ODataQueryOptionHandler<T>;
  transform(): ODataQueryOptionHandler<T>;
  transform(opts?: Transform<T>): any {
    return this.options.option<Transform<T>>(QueryOption.transform, opts);
  }

  /**
   * Build and return a handler for modifying the $search option.
   * If opts is given then set te value as new value for $search.
   * @param opts string value or builder function for SearchExpression<T>
   */
  search(
    opts: (
      builder: SearchExpressionBuilder<T>,
      current: SearchExpression<T>,
    ) => SearchExpression<T>,
  ): SearchExpression<T>;
  search(opts: string): ODataQueryOptionHandler<T>;
  search(): ODataQueryOptionHandler<T>;
  search(opts?: any): any {
    if (Types.isFunction(opts)) {
      return this.options.expression(
        QueryOption.search,
        SearchExpression.factory(opts, this.options.expression(QueryOption.search)),
      );
    }
    return this.options.option<string>(QueryOption.search, opts);
  }

  /**
   * Build and return a handler for modifying the $filter option.
   * If opts is given then set te value as new value for $filter.
   * @param opts Filter<T> value or builder function for FilterExpression<T>
   */
  filter(
    opts: (
      builder: FilterExpressionBuilder<T>,
      current: FilterExpression<T>,
    ) => FilterExpression<T>,
  ): FilterExpression<T>;
  filter(opts: Filter<T>): ODataQueryOptionHandler<T>;
  filter(): ODataQueryOptionHandler<T>;
  filter(opts?: any): any {
    if (Types.isFunction(opts)) {
      return this.options.expression(
        QueryOption.filter,
        FilterExpression.factory(opts, this.options.expression(QueryOption.filter)),
      );
    }
    return this.options.option<Filter<T>>(QueryOption.filter, opts);
  }

  /**
   * Build and return a handler for modifying the $orderby option.
   * If opts is given then set te value as new value for $orderby.
   * @param opts OrderBy<T> value or builder function for OrderByExpression<T>
   */
  orderBy(
    opts: (
      builder: OrderByExpressionBuilder<T>,
      current: OrderByExpression<T>,
    ) => OrderByExpression<T>,
  ): OrderByExpression<T>;
  orderBy(opts: OrderBy<T>): ODataQueryOptionHandler<T>;
  orderBy(): ODataQueryOptionHandler<T>;
  orderBy(opts?: any): any {
    if (Types.isFunction(opts)) {
      return this.options.option(
        QueryOption.orderBy,
        OrderByExpression.factory(opts, this.options.expression(QueryOption.orderBy)),
      );
    }
    return this.options.option<OrderBy<T>>(QueryOption.orderBy, opts);
  }

  /**
   * Build and return a handler for modifying the $top option.
   * If opts is given then set te value as new value for $top.
   * @param opts number value
   */
  top(opts: number): ODataQueryOptionHandler<T>;
  top(): ODataQueryOptionHandler<T>;
  top(opts?: number): any {
    return this.options.option<number>(QueryOption.top, opts);
  }

  /**
   * Build and return a handler for modifying the $skip option.
   * If opts is given then set te value as new value for $skip.
   * @param opts number value
   */
  skip(opts: number): ODataQueryOptionHandler<T>;
  skip(): ODataQueryOptionHandler<T>;
  skip(opts?: number): any {
    return this.options.option<number>(QueryOption.skip, opts);
  }

  /**
   * Build and return a handler for modifying the $skiptoken option.
   * If opts is given then set te value as new value for $skiptoken.
   * @param opts string value
   */
  skiptoken(opts: string): ODataQueryOptionHandler<T>;
  skiptoken(): ODataQueryOptionHandler<T>;
  skiptoken(opts?: string): any {
    return this.options.option<string>(QueryOption.skiptoken, opts);
  }

  remove(...keys: QueryOption[]) {
    this.options.remove(...keys);
  }

  keep(...keys: QueryOption[]) {
    this.options.keep(...keys);
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
        this.remove(QueryOption.skiptoken);
      }
    }
    if (skip !== undefined) {
      if (skip !== null) {
        this.skip(skip);
      } else {
        this.remove(QueryOption.skip);
      }
    }
    if (top !== undefined) {
      if (top !== null) {
        this.top(top);
      } else {
        this.remove(QueryOption.top);
      }
    }
  }

  /**
   * Shortcut for clear pagination by unset $top, $skip, $skiptoken.
   */
  removePaging() {
    this.remove(QueryOption.skip, QueryOption.top, QueryOption.skiptoken);
  }

  /**
   * Shortcut for clear query.
   */
  clear() {
    this.options.clear();
  }

  /**
   * Store the query options from the current query.
   */
  store() {
    return this.options.toQueryArguments();
  }

  /**
   * Restore the given query options to the current query.
   * @param options The query to be applied.
   */
  restore(options: ODataQueryArguments<T>) {
    if (options.select !== undefined) {
      if (options.select instanceof SelectExpression) {
        this.options.expression(QueryOption.select, options.select as SelectExpression<T>);
      } else if (options.select !== null) {
        this.options.option(QueryOption.select, options.select);
      } else {
        this.options.remove(QueryOption.select);
      }
    }
    if (options.expand !== undefined) {
      if (options.expand instanceof ExpandExpression) {
        this.options.expression(QueryOption.expand, options.expand as ExpandExpression<T>);
      } else if (options.expand !== null) {
        this.options.option(QueryOption.expand, options.expand);
      } else {
        this.options.remove(QueryOption.expand);
      }
    }
    if (options.compute !== undefined) {
      if (options.compute instanceof ComputeExpression) {
        this.options.expression(QueryOption.compute, options.compute as ComputeExpression<T>);
      } else if (options.compute !== null) {
        this.options.option(QueryOption.compute, options.compute);
      } else {
        this.options.remove(QueryOption.compute);
      }
    }
    if (options.apply !== undefined) {
      if (options.apply instanceof ApplyExpression) {
        this.options.expression(QueryOption.apply, options.apply as ApplyExpression<T>);
      } else if (options.apply !== null) {
        this.options.option(QueryOption.apply, options.apply);
      } else {
        this.options.remove(QueryOption.apply);
      }
    }
    if (options.transform !== undefined) {
      if (options.transform !== null) {
        this.options.option(QueryOption.transform, options.transform);
      } else {
        this.options.remove(QueryOption.transform);
      }
    }
    if (options.search !== undefined) {
      if (options.search instanceof SearchExpression) {
        this.options.expression(QueryOption.search, options.search as SearchExpression<T>);
      } else if (options.search !== null) {
        this.options.option(QueryOption.search, options.search);
      } else {
        this.options.remove(QueryOption.search);
      }
    }
    if (options.filter !== undefined) {
      if (options.filter instanceof FilterExpression) {
        this.options.expression(QueryOption.filter, options.filter as FilterExpression<T>);
      } else if (options.filter !== null) {
        this.options.option(QueryOption.filter, options.filter);
      } else {
        this.options.remove(QueryOption.filter);
      }
    }
    if (options.orderBy !== undefined) {
      if (options.orderBy instanceof OrderByExpression) {
        this.options.expression(QueryOption.orderBy, options.orderBy as OrderByExpression<T>);
      } else if (options.orderBy !== null) {
        this.options.option(QueryOption.orderBy, options.orderBy);
      } else {
        this.options.remove(QueryOption.orderBy);
      }
    }
    this.paging(options);
  }

  /**
   * Combine the given query options with the current query.
   * @param options The query to be combined.
   */
  combine(options: ODataQueryArguments<T>) {
    if (options.select !== undefined) {
      if (options.select instanceof SelectExpression) {
        const current = this.options.expression(QueryOption.select) as SelectExpression<T>;
        if (current === undefined) {
          this.options.expression(QueryOption.select, options.select as SelectExpression<T>);
        } else {
          current.combine(options.select as SelectExpression<T>);
        }
      } else if (options.select !== null) {
        const current = this.options.option(QueryOption.select);
        if (current === undefined) {
          this.options.option(QueryOption.select, options.select);
        } else {
          this.options.option(QueryOption.select, [current, options.select]);
        }
      } else {
        this.options.remove(QueryOption.select);
      }
    }
    if (options.expand !== undefined) {
      if (options.expand instanceof ExpandExpression) {
        const current = this.options.expression(QueryOption.expand) as ExpandExpression<T>;
        if (current === undefined) {
          this.options.expression(QueryOption.expand, options.expand as ExpandExpression<T>);
        } else {
          current.combine(options.expand as ExpandExpression<T>);
        }
      } else if (options.expand !== null) {
        const current = this.options.option(QueryOption.expand);
        if (current === undefined) {
          this.options.option(QueryOption.expand, options.expand);
        }
      } else {
        this.options.remove(QueryOption.expand);
      }
    }
    if (options.search !== undefined) {
      if (options.search instanceof SearchExpression) {
        const current = this.options.expression(QueryOption.search) as SearchExpression<T>;
        if (current === undefined) {
          this.options.expression(QueryOption.search, options.search as SearchExpression<T>);
        } else {
          current.combine(options.search as SearchExpression<T>);
        }
      } else if (options.search !== null) {
        const current = this.options.option(QueryOption.search);
        if (current === undefined) {
          this.options.option(QueryOption.search, options.search);
        }
      } else {
        this.options.remove(QueryOption.search);
      }
    }
    if (options.filter !== undefined) {
      if (options.filter instanceof FilterExpression) {
        const current = this.options.expression(QueryOption.filter) as FilterExpression<T>;
        if (current === undefined) {
          this.options.expression(QueryOption.filter, options.filter as FilterExpression<T>);
        } else {
          current.combine(options.filter as FilterExpression<T>);
        }
      } else if (options.filter !== null) {
        const current = this.options.option(QueryOption.filter);
        if (current === undefined) {
          this.options.option(QueryOption.filter, options.filter);
        }
      } else {
        this.options.remove(QueryOption.filter);
      }
    }
    if (options.orderBy !== undefined) {
      if (options.orderBy instanceof OrderByExpression) {
        const current = this.options.expression(QueryOption.orderBy) as OrderByExpression<T>;
        if (current === undefined) {
          this.options.expression(QueryOption.orderBy, options.orderBy as OrderByExpression<T>);
        } else {
          current.combine(options.orderBy as OrderByExpression<T>);
        }
      } else if (options.orderBy !== null) {
        const current = this.options.option(QueryOption.filter);
        if (current === undefined) {
          this.options.option(QueryOption.orderBy, options.orderBy);
        }
      } else {
        this.options.remove(QueryOption.orderBy);
      }
    }
    this.paging(options);
  }

  toJson() {
    return this.options.toJson();
  }

  fromJson(json: { [name: string]: any }) {
    this.options.fromJson(json);
  }

  toString({ escape, parser }: { escape?: boolean; parser?: Parser<T> } = {}): string {
    return this.options.toString({ escape, parser });
  }

  pathAndParams({
    escape,
    parser,
    options,
  }: {
    escape?: boolean;
    parser?: Parser<T>;
    options?: ParserOptions;
  } = {}): [string, { [name: string]: any }] {
    return this.options.pathAndParams({
      escape,
      parser,
      options,
    });
  }
}
