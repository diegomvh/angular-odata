import {QueryArguments, HttpOptions} from '../resources/index';

export type HttpActionOptions<T> = QueryArguments<T> & HttpOptions;
export type HttpFunctionOptions<T> = QueryArguments<T> & {alias?: boolean} & HttpOptions;
export type HttpNavigationPropertyOptions<T> = QueryArguments<T> & HttpOptions;
