import { HttpHeaders, HttpParams } from '@angular/common/http';

import { FetchPolicy } from '../../types';
import { ODataQueryArguments } from '../query-options';

export type ODataOptions = {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | string[] };
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
export type ODataNoneOptions = ODataOptions & { responseType?: 'none' };
export type ODataQueryArgumentsOptions<T> = ODataQueryArguments<T> & {
  alias?: boolean;
} & ODataOptions;
