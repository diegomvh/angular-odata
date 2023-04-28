const COMPARISON_OPERATORS = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];
const LOGICAL_OPERATORS = ['and', 'or', 'not'];
const COLLECTION_OPERATORS = ['any', 'all'];
const BOOLEAN_FUNCTIONS = ['startswith', 'endswith', 'contains'];
const SUPPORTED_EXPAND_PROPERTIES = [
  'expand',
  'levels',
  'select',
  'top',
  'count',
  'orderby',
  'filter',
];

const FUNCTION_REGEX = /\((.*)\)/;
const INDEXOF_REGEX = /(?!indexof)\((\w+)\)/;

export type Unpacked<T> = T extends (infer U)[] ? U : T;
export type Select<T> = SelectType<T> | SelectType<T>[];
export type SelectType<T> = string | keyof T;
export type Filter<T> = FilterType | FilterType[];
export type FilterType = string | { [name: string]: any };

export enum StandardAggregateMethods {
  sum = 'sum',
  min = 'min',
  max = 'max',
  average = 'average',
  countdistinct = 'countdistinct',
}
export type Aggregate =
  | string
  | { [propertyName: string]: { with: StandardAggregateMethods; as: string } };

// OrderBy

export type OrderBy<T> = OrderByType<T> | OrderByType<T>[];
export type OrderByType<T> = string | OrderByObject<T>;
export type OrderByObject<T> =
  | keyof T
  | [keyof T | string, 'asc' | 'desc']
  | NestedOrderBy<T>;
export type NestedOrderBy<T> = {
  [P in keyof T]?: T[P] extends Array<infer E> ? OrderBy<E> : OrderBy<T[P]>;
};

// Expand
export type Expand<T> = ExpandType<T> | ExpandType<T>[];
export type ExpandType<T> = string | ExpandObject<T>;
export type ExpandObject<T> = keyof T | NestedExpandOptions<T>;
export type NestedExpandOptions<T> = {
  [P in keyof T]?: ExpandOptions<Unpacked<T[P]>>;
};
export type ExpandOptions<T> = {
  select?: Select<T>;
  filter?: Filter<T>;
  orderBy?: OrderBy<T>;
  top?: number;
  skip?: number;
  levels?: number | 'max';
  count?: boolean | Filter<T>;
  expand?: Expand<T>;
};

export type Transform<T> = {
  aggregate?: Aggregate | Array<Aggregate>;
  filter?: Filter<T>;
  groupBy?: GroupBy<T>;
};
export type GroupBy<T> = {
  properties: Array<keyof T>;
  transform?: Transform<T>;
};

export enum QueryCustomTypes {
  Raw,
  Alias,
  Duration,
  Binary,
}

export type QueryCustomType = {
  type: QueryCustomTypes;
  value: any;
  name?: string;
};
export type Value = string | Date | number | boolean | QueryCustomType;

//https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html#sec_QueryOptions
export const raw = (value: string): QueryCustomType => ({
  type: QueryCustomTypes.Raw,
  value,
});
export const alias = (value: any, name?: string): QueryCustomType => ({
  type: QueryCustomTypes.Alias,
  value,
  name,
});
export const duration = (value: string): QueryCustomType => ({
  type: QueryCustomTypes.Duration,
  value,
});
export const binary = (value: string): QueryCustomType => ({
  type: QueryCustomTypes.Binary,
  value,
});
export const isQueryCustomType = (value: any) =>
  typeof value === 'object' &&
  'type' in value &&
  value.type in QueryCustomTypes;

export const isRawType = (value: any) => isQueryCustomType(value) && (value as QueryCustomType).type === QueryCustomTypes.Raw;

export type QueryOptions<T> = ExpandOptions<T> & {
  search: string;
  transform: { [name: string]: any } | { [name: string]: any }[];
  skip: number;
  skiptoken: string;
  key: string | number | { [name: string]: any };
  count: boolean | Filter<T>;
  action: string;
  func: string | { [functionName: string]: { [parameterName: string]: any } };
  format: string;
  aliases: QueryCustomType[];
  escape: boolean;
};

export const ITEM_ROOT = '';

export default function <T>({
  select,
  search,
  skiptoken,
  format,
  top,
  skip,
  filter,
  transform,
  orderBy,
  key,
  count,
  expand,
  action,
  func,
  aliases,
  escape,
}: Partial<QueryOptions<T>> = {}) {
  const [path, params] = buildPathAndQuery({
    select,
    search,
    skiptoken,
    format,
    top,
    skip,
    filter,
    transform,
    orderBy,
    key,
    count,
    expand,
    action,
    func,
    aliases,
    escape,
  });

  return buildUrl(path, params);
}

export function buildPathAndQuery<T>({
  select,
  search,
  skiptoken,
  format,
  top,
  skip,
  filter,
  transform,
  orderBy,
  key,
  count,
  expand,
  action,
  func,
  aliases,
  escape,
}: Partial<QueryOptions<T>> = {}): [string, { [name: string]: any }] {
  let path: string = '';
  aliases = aliases || [];

  const query: any = {};

  // key is not (null, undefined)
  if (key != undefined) {
    path += `(${normalizeValue(key as Value, { aliases, escape })})`;
  }

  // Select
  if (select) {
    query.$select = isRawType(select) ? (select as unknown as QueryCustomType).value : Array.isArray(select) ? select.join(',') : select;
  }

  // Search
  if (search) {
    query.$search = search;
  }

  // Skiptoken
  if (skiptoken) {
    query.$skiptoken = skiptoken;
  }

  // Format
  if (format) {
    query.$format = format;
  }

  // Filter
  if (filter || typeof count === 'object') {
    query.$filter = buildFilter(typeof count === 'object' ? count : filter, {
      aliases,
      escape,
    });
  }

  // Transform
  if (transform) {
    query.$apply = buildTransforms(transform, { aliases, escape });
  }

  // Expand
  if (expand) {
    query.$expand = buildExpand(expand, { aliases, escape });
  }

  // OrderBy
  if (orderBy) {
    query.$orderby = buildOrderBy(orderBy);
  }

  // Count
  if (isRawType(count)) {
    query.$count = (count as QueryCustomType).value;
  } else if (typeof count === 'boolean') {
    query.$count = true;
  } else if (count) {
    path += '/$count';
  }

  // Top
  if (isRawType(top)) {
    query.$top = (top as unknown as QueryCustomType).value;
  }
  else if (typeof top === 'number') {
    query.$top = top;
  }

  // Skip
  if (isRawType(skip)) {
    query.$top = (skip as unknown as QueryCustomType).value;
  }
  else if (typeof skip === 'number') {
    query.$skip = skip;
  }

  if (action) {
    path += `/${action}`;
  }

  if (func) {
    if (typeof func === 'string') {
      path += `/${func}()`;
    } else if (typeof func === 'object') {
      const [funcName] = Object.keys(func);
      const funcArgs = normalizeValue(func[funcName] as Value, {
        aliases,
        escape,
      });

      path += `/${funcName}(${funcArgs})`;
    }
  }

  if (aliases.length > 0) {
    Object.assign(
      query,
      aliases.reduce(
        (acc, alias) =>
          Object.assign(acc, {
            [`@${alias.name}`]: normalizeValue(alias.value, {
              escape,
            }),
          }),
        {}
      )
    );
  }

  // Filter empty values
  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== '')
    .reduce((acc, [key, value]) => Object.assign(acc, { [key]: value }), {});

  return [path, params];
}

function renderPrimitiveValue(
  key: string,
  val: any,
  {
    aliases,
    escape,
  }: {
    aliases?: QueryCustomType[];
    escape?: boolean;
  }
) {
  return `${key} eq ${normalizeValue(val, { aliases, escape })}`;
}

function buildFilter(
  filters: Filter<any> = {},
  {
    aliases,
    propPrefix,
    escape,
  }: { aliases?: QueryCustomType[]; propPrefix?: string; escape?: boolean }
): string {
  return (
    (Array.isArray(filters) ? filters : [filters]).reduce(
      (acc: string[], filter) => {
        if (filter) {
          const builtFilter = buildFilterCore(filter, {
            aliases,
            propPrefix,
            escape,
          });
          if (builtFilter) {
            acc.push(builtFilter);
          }
        }
        return acc;
      },
      []
    ) as string[]
  ).join(' and ');

  function buildFilterCore(
    filter: Filter<any> = {},
    {
      aliases,
      propPrefix,
      escape,
    }: { aliases?: QueryCustomType[]; propPrefix?: string; escape?: boolean }
  ) {
    let filterExpr = '';
    if (isRawType(filter)) {
      // Use raw query custom filter string
      filterExpr = (filter as QueryCustomType).value;
    } else if (typeof filter === 'string') {
      // Use raw filter string
      filterExpr = filter;
    } else if (filter && typeof filter === 'object') {
      const filtersArray = Object.keys(filter).reduce(
        (result: any[], filterKey) => {
          const value = (filter as any)[filterKey];
          let propName = '';
          if (propPrefix) {
            if (filterKey === ITEM_ROOT) {
              propName = propPrefix;
            } else if (INDEXOF_REGEX.test(filterKey)) {
              propName = filterKey.replace(INDEXOF_REGEX, (_, $1) =>
                $1.trim() === ITEM_ROOT
                  ? `(${propPrefix})`
                  : `(${propPrefix}/${$1.trim()})`
              );
            } else if (FUNCTION_REGEX.test(filterKey)) {
              propName = filterKey.replace(FUNCTION_REGEX, (_, $1) =>
                $1.trim() === ITEM_ROOT
                  ? `(${propPrefix})`
                  : `(${propPrefix}/${$1.trim()})`
              );
            } else {
              propName = `${propPrefix}/${filterKey}`;
            }
          } else {
            propName = filterKey;
          }

          if (filterKey === ITEM_ROOT && Array.isArray(value)) {
            return result.concat(
              value.map((arrayValue: any) =>
                renderPrimitiveValue(propName, arrayValue, { escape, aliases })
              )
            );
          }

          if (
            ['number', 'string', 'boolean'].indexOf(typeof value) !== -1 ||
            value instanceof Date ||
            value === null
          ) {
            // Simple key/value handled as equals operator
            result.push(
              renderPrimitiveValue(propName, value, { aliases, escape })
            );
          } else if (Array.isArray(value)) {
            const op = filterKey;
            const builtFilters = value
              .map((v) => buildFilter(v, { aliases, propPrefix, escape }))
              .filter((f) => f)
              .map((f) =>
                LOGICAL_OPERATORS.indexOf(op) !== -1 ? `(${f})` : f
              );
            if (builtFilters.length) {
              if (LOGICAL_OPERATORS.indexOf(op) !== -1) {
                if (builtFilters.length) {
                  if (op === 'not') {
                    result.push(parseNot(builtFilters as string[]));
                  } else {
                    result.push(`(${builtFilters.join(` ${op} `)})`);
                  }
                }
              } else {
                result.push(builtFilters.join(` ${op} `));
              }
            }
          } else if (LOGICAL_OPERATORS.indexOf(propName) !== -1) {
            const op = propName;
            const builtFilters = Object.keys(value).map((valueKey) =>
              buildFilterCore(
                { [valueKey]: value[valueKey] },
                { aliases, escape }
              )
            );
            if (builtFilters.length) {
              if (op === 'not') {
                result.push(parseNot(builtFilters as string[]));
              } else {
                result.push(`${builtFilters.join(` ${op} `)}`);
              }
            }
          } else if (typeof value === 'object') {
            if ('type' in value) {
              result.push(
                renderPrimitiveValue(propName, value, { aliases, escape })
              );
            } else {
              const operators = Object.keys(value);
              operators.forEach((op) => {
                if (COMPARISON_OPERATORS.indexOf(op) !== -1) {
                  result.push(
                    `${propName} ${op} ${normalizeValue(value[op], {
                      aliases,
                      escape,
                    })}`
                  );
                } else if (LOGICAL_OPERATORS.indexOf(op) !== -1) {
                  if (Array.isArray(value[op])) {
                    result.push(
                      value[op]
                        .map(
                          (v: any) =>
                            '(' +
                            buildFilterCore(v, {
                              aliases,
                              propPrefix: propName,
                              escape,
                            }) +
                            ')'
                        )
                        .join(` ${op} `)
                    );
                  } else {
                    result.push(
                      '(' +
                        buildFilterCore(value[op], {
                          aliases,
                          propPrefix: propName,
                          escape,
                        }) +
                        ')'
                    );
                  }
                } else if (COLLECTION_OPERATORS.indexOf(op) !== -1) {
                  const collectionClause = buildCollectionClause(
                    filterKey.toLowerCase(),
                    value[op],
                    op,
                    propName
                  );
                  if (collectionClause) {
                    result.push(collectionClause);
                  }
                } else if (op === 'has') {
                  result.push(
                    `${propName} ${op} ${normalizeValue(value[op], {
                      aliases,
                      escape,
                    })}`
                  );
                } else if (op === 'in') {
                  const resultingValues = Array.isArray(value[op])
                    ? value[op]
                    : value[op].value.map((typedValue: any) => ({
                        type: value[op].type,
                        value: typedValue,
                      }));

                  result.push(
                    propName +
                      ' in (' +
                      resultingValues
                        .map((v: any) => normalizeValue(v, { aliases, escape }))
                        .join(',') +
                      ')'
                  );
                } else if (BOOLEAN_FUNCTIONS.indexOf(op) !== -1) {
                  // Simple boolean functions (startswith, endswith, contains)
                  result.push(
                    `${op}(${propName},${normalizeValue(value[op], {
                      aliases,
                      escape,
                    })})`
                  );
                } else {
                  // Nested property
                  const filter = buildFilterCore(value, {
                    aliases,
                    propPrefix: propName,
                    escape,
                  });
                  if (filter) {
                    result.push(filter);
                  }
                }
              });
            }
          } else if (value === undefined) {
            // Ignore/omit filter if value is `undefined`
          } else {
            throw new Error(`Unexpected value type: ${value}`);
          }

          return result;
        },
        []
      );

      filterExpr = filtersArray.join(' and ');
    } /* else {
        throw new Error(`Unexpected filters type: ${filter}`);
      } */
    return filterExpr;
  }

  function buildCollectionClause(
    lambdaParameter: string,
    value: any,
    op: string,
    propName: string
  ) {
    let clause = '';

    if (typeof value === 'string' || value instanceof String) {
      clause = getStringCollectionClause(lambdaParameter, value, op, propName);
    } else if (value) {
      // normalize {any:[{prop1: 1}, {prop2: 1}]} --> {any:{prop1: 1, prop2: 1}}; same for 'all',
      // simple values collection: {any:[{'': 'simpleVal1'}, {'': 'simpleVal2'}]} --> {any:{'': ['simpleVal1', 'simpleVal2']}}; same for 'all',
      const filterValue = Array.isArray(value)
        ? value.reduce((acc, item) => {
            if (item.hasOwnProperty(ITEM_ROOT)) {
              if (!acc.hasOwnProperty(ITEM_ROOT)) {
                acc[ITEM_ROOT] = [];
              }
              acc[ITEM_ROOT].push(item[ITEM_ROOT]);
              return acc;
            }
            return { ...acc, ...item };
          }, {})
        : value;

      const filter = buildFilterCore(filterValue, {
        aliases,
        propPrefix: lambdaParameter,
        escape,
      });
      clause = `${propName}/${op}(${
        filter ? `${lambdaParameter}:${filter}` : ''
      })`;
    }
    return clause;
  }
}

function getStringCollectionClause(
  lambdaParameter: string,
  value: any,
  collectionOperator: string,
  propName: string
) {
  let clause = '';
  const conditionOperator = collectionOperator == 'all' ? 'ne' : 'eq';
  clause = `${propName}/${collectionOperator}(${lambdaParameter}: ${lambdaParameter} ${conditionOperator} '${value}')`;

  return clause;
}

function escapeIllegalChars(string: string) {
  string = string.replace(/%/g, '%25');
  string = string.replace(/\+/g, '%2B');
  string = string.replace(/\//g, '%2F');
  string = string.replace(/\?/g, '%3F');
  string = string.replace(/#/g, '%23');
  string = string.replace(/&/g, '%26');
  string = string.replace(/'/g, "''");
  return string;
}

export function normalizeValue(
  value: Value,
  {
    aliases,
    escape = false,
  }: { aliases?: QueryCustomType[]; escape?: boolean } = {}
): any {
  if (typeof value === 'string') {
    return escape ? `'${escapeIllegalChars(value)}'` : `'${value}'`;
  } else if (value instanceof Date) {
    return value.toISOString();
  } else if (typeof value === 'number') {
    return value;
  } else if (Array.isArray(value)) {
    return `[${value
      .map((d) => normalizeValue(d, { aliases, escape }))
      .join(',')}]`;
  } else if (value === null) {
    return value;
  } else if (typeof value === 'object') {
    switch (value.type) {
      case QueryCustomTypes.Raw:
        return value.value;
      case QueryCustomTypes.Duration:
        return `duration'${value.value}'`;
      case QueryCustomTypes.Binary:
        return `binary'${value.value}'`;
      case QueryCustomTypes.Alias:
        // Store
        if (Array.isArray(aliases)) {
          if (value.name === undefined) {
            value.name = `a${aliases.length + 1}`;
          }
          aliases.push(value);
        }
        return `@${value.name}`;
      default:
        return Object.entries(value)
          .filter(([, v]) => v !== undefined)
          .map(
            ([k, v]) =>
              `${k}=${normalizeValue(v as Value, { aliases, escape })}`
          )
          .join(',');
    }
  }
  return value;
}

function buildExpand<T>(
  expands: Expand<T>,
  { aliases, escape = false }: { aliases?: QueryCustomType[]; escape?: boolean }
): string {
  if (isRawType(expands)) {
    return (expands as QueryCustomType).value;
  } else if (typeof expands === 'number') {
    return expands as any;
  } else if (typeof expands === 'string') {
    if (expands.indexOf('/') === -1) {
      return expands;
    }

    // Change `Foo/Bar/Baz` to `Foo($expand=Bar($expand=Baz))`
    return expands
      .split('/')
      .reverse()
      .reduce((results, item, index, arr) => {
        if (index === 0) {
          // Inner-most item
          return `$expand=${item}`;
        } else if (index === arr.length - 1) {
          // Outer-most item, don't add `$expand=` prefix (added above)
          return `${item}(${results})`;
        } else {
          // Other items
          return `$expand=${item}(${results})`;
        }
      }, '');
  } else if (Array.isArray(expands)) {
    return `${(expands as Array<NestedExpandOptions<any>>)
      .map((e) => buildExpand(e, { aliases, escape }))
      .join(',')}`;
  } else if (typeof expands === 'object') {
    const expandKeys = Object.keys(expands);

    if (
      expandKeys.some(
        (key) => SUPPORTED_EXPAND_PROPERTIES.indexOf(key.toLowerCase()) !== -1
      )
    ) {
      return expandKeys
        .map((key) => {
          let value;
          switch (key) {
            case 'filter':
              value = buildFilter((expands as NestedExpandOptions<any>)[key], {
                aliases,
                escape,
              });
              break;
            case 'orderBy':
              value = buildOrderBy(
                (expands as NestedExpandOptions<any>)[key] as OrderBy<T>
              );
              break;
            case 'levels':
            case 'count':
            case 'top':
            case 'skip':
              value = `${(expands as NestedExpandOptions<any>)[key]}`;
              if (isRawType(value))
                value = (value as unknown as QueryCustomType).value;
              break;
            default:
              value = buildExpand(
                (expands as NestedExpandOptions<any>)[key] as Expand<T>,
                { aliases, escape }
              );
          }
          return `$${key.toLowerCase()}=${value}`;
        })
        .join(';');
    } else {
      return expandKeys
        .map((key) => {
          const builtExpand = buildExpand(
            (expands as NestedExpandOptions<any>)[
              key
            ] as NestedExpandOptions<any>,
            { aliases, escape }
          );
          return builtExpand ? `${key}(${builtExpand})` : key;
        })
        .join(',');
    }
  }
  return '';
}

function buildTransforms<T>(
  transforms: Transform<T> | Transform<T>[],
  { aliases, escape = false }: { aliases?: QueryCustomType[]; escape?: boolean }
) {
  // Wrap single object an array for simplified processing
  const transformsArray = Array.isArray(transforms) ? transforms : [transforms];

  const transformsResult = transformsArray.reduce(
    (result: string[], transform) => {
      const { aggregate, filter, groupBy, ...rest } = transform;

      // TODO: support as many of the following:
      //   topcount, topsum, toppercent,
      //   bottomsum, bottomcount, bottompercent,
      //   identity, concat, expand, search, compute, isdefined
      const unsupportedKeys = Object.keys(rest);
      if (unsupportedKeys.length) {
        throw new Error(`Unsupported transform(s): ${unsupportedKeys}`);
      }

      if (aggregate) {
        result.push(`aggregate(${buildAggregate(aggregate)})`);
      }
      if (filter) {
        const builtFilter = buildFilter(filter, { aliases, escape });
        if (builtFilter) {
          result.push(
            `filter(${buildFilter(builtFilter, { aliases, escape })})`
          );
        }
      }
      if (groupBy) {
        result.push(`groupby(${buildGroupBy(groupBy, { aliases, escape })})`);
      }

      return result;
    },
    []
  );

  return transformsResult.join('/') || undefined;
}

function buildAggregate(aggregate: Aggregate | Aggregate[]) {
  // Wrap single object in an array for simplified processing
  const aggregateArray = Array.isArray(aggregate) ? aggregate : [aggregate];

  return aggregateArray
    .map((aggregateItem) => {
      return typeof aggregateItem === 'string'
        ? aggregateItem
        : Object.keys(aggregateItem).map((aggregateKey) => {
            const aggregateValue = aggregateItem[aggregateKey];

            // TODO: Are these always required?  Can/should we default them if so?
            if (!aggregateValue.with) {
              throw new Error(`'with' property required for '${aggregateKey}'`);
            }
            if (!aggregateValue.as) {
              throw new Error(`'as' property required for '${aggregateKey}'`);
            }

            return `${aggregateKey} with ${aggregateValue.with} as ${aggregateValue.as}`;
          });
    })
    .join(',');
}

function buildGroupBy<T>(
  groupBy: GroupBy<T>,
  { aliases, escape = false }: { aliases?: QueryCustomType[]; escape?: boolean }
) {
  if (!groupBy.properties) {
    throw new Error(`'properties' property required for groupBy`);
  }

  let result = `(${groupBy.properties.join(',')})`;

  if (groupBy.transform) {
    result += `,${buildTransforms(groupBy.transform, { aliases, escape })}`;
  }

  return result;
}

function buildOrderBy<T>(orderBy: OrderBy<T>, prefix: string = ''): string {
  if (isRawType(orderBy)) {
    return (orderBy as QueryCustomType).value
  } else if (Array.isArray(orderBy)) {
    return (orderBy as OrderByObject<T>[])
      .map((value) =>
        Array.isArray(value) &&
        value.length === 2 &&
        ['asc', 'desc'].indexOf(value[1]) !== -1
          ? value.join(' ')
          : value
      )
      .map((v) => `${prefix}${v as string}`)
      .join(',');
  } else if (typeof orderBy === 'object') {
    return Object.entries(orderBy)
      .map(([k, v]) => buildOrderBy(v as OrderBy<any>, `${k}/`))
      .map((v) => `${prefix}${v}`)
      .join(',');
  }
  return `${prefix}${orderBy as string}`;
}

function buildUrl(path: string, params: { [name: string]: any }): string {
  // This can be refactored using URL API. But IE does not support it.
  const queries: string[] = Object.entries(params).map(
    ([key, value]) => `${key}=${value}`
  );
  return queries.length ? `${path}?${queries.join('&')}` : path;
}

function parseNot(builtFilters: string[]): string {
  return `not(${builtFilters.join(' and ')})`;
}
