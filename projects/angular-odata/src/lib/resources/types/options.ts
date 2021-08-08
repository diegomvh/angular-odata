import { HttpHeaders, HttpParams } from '@angular/common/http';
import { FetchPolicy } from '../../types';
import { QueryArguments } from '../query-options';

export type HttpOptions = {
  //apiName?: string,
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | string[] };
  reportProgress?: boolean;
  withCredentials?: boolean;
  fetchPolicy?: FetchPolicy;
};

export type HttpEntityOptions = HttpOptions & { responseType?: 'entity' };
export type HttpEntitiesOptions = HttpOptions & {
  responseType?: 'entities';
  withCount?: boolean;
};
export type HttpPropertyOptions = HttpOptions & { responseType?: 'property' };
export type HttpNoneOptions = HttpOptions & { responseType?: 'none' };
export type HttpQueryOptions<T> = QueryArguments<T> & { alias?: boolean; } & HttpOptions;
