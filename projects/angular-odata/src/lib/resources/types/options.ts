import { HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { FetchPolicy, ParserOptions } from '../../types';
import { ODataQueryOptionsHandler } from '../query';
import { ODataStructuredType } from '../../schema';

export type ODataOptions = {
  etag?: string;
  context?: HttpContext;
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?:
    | HttpParams
    | {
        [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean>;
      };
  reportProgress?: boolean;
  withCredentials?: boolean;
  fetchPolicy?: FetchPolicy;
  maxAge?: number;
  parserOptions?: ParserOptions;
};

export type ODataEntityOptions = ODataOptions & { responseType?: 'entity' };
export type ODataEntitiesOptions = ODataOptions & {
  responseType?: 'entities';
  withCount?: boolean;
};
export type ODataPropertyOptions = ODataOptions & { responseType?: 'property' };
export type ODataQueryableOptions<T> = ODataOptions & {
  query?: (q: ODataQueryOptionsHandler<T>, s?: ODataStructuredType<T>) => void;
};
export type ODataActionOptions<T> = ODataQueryableOptions<T>;
export type ODataFunctionOptions<T> = ODataQueryableOptions<T> & {
  alias?: boolean;
};
