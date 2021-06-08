import { HttpHeaders, HttpParams } from "@angular/common/http";
import { Expand, Filter, OrderBy, Select, Transform } from "../builder";

export type HttpOptions = {
  //apiName?: string,
  headers?: HttpHeaders | {[header: string]: string | string[]},
  params?: HttpParams | {[param: string]: string | string[]},
  reportProgress?: boolean,
  withCredentials?: boolean,
  fetchPolicy?: 'cache-first' | 'cache-and-network' | 'network-only' | 'no-cache' | 'cache-only';
}

export type HttpEntityOptions = HttpOptions & { responseType?: 'entity' }
export type HttpEntitiesOptions = HttpOptions & { responseType?: 'entities', withCount?: boolean };
export type HttpPropertyOptions = HttpOptions & { responseType?: 'property' };
export type HttpNoneOptions = HttpOptions & { responseType?: 'none' };
export type HttpCallableOptions<T> = HttpOptions & {
  select?: Select<T>,
  expand?: Expand<T>,
  transform?: Transform<T>;
  search?: string,
  filter?: Filter;
  orderBy?: OrderBy<T>;
  top?: number;
  skip?: number;
  skiptoken?: string;
};

export type HttpActionOptions<T> = HttpCallableOptions<T>;
export type HttpFunctionOptions<T> = HttpCallableOptions<T> & {alias?: boolean};
