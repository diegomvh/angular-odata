import { HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { FetchPolicy } from '../../types';
import { ODataQueryArguments } from '../query';

export type ODataOptions = {
  etag?: string;
  context?: HttpContext;
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?:
    | HttpParams
    | {
        [param: string]:
          | string
          | number
          | boolean
          | ReadonlyArray<string | number | boolean>;
      };
  reportProgress?: boolean;
  withCredentials?: boolean;
  fetchPolicy?: FetchPolicy;
};

export type ODataEntityOptions = ODataOptions & { responseType?: 'entity' };
export type ODataEntitiesOptions = ODataOptions & {
  responseType?: 'entities';
  withCount?: boolean;
};
export type ODataPropertyOptions = ODataOptions & { responseType?: 'property' };
export type ODataQueryArgumentsOptions<T> = ODataOptions &
  ODataQueryArguments<T>;
export type ODataActionOptions<T> = ODataQueryArgumentsOptions<T>;
export type ODataFunctionOptions<T> = ODataQueryArgumentsOptions<T> & {
  alias?: boolean;
};
