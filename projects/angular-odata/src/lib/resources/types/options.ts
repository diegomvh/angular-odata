import { HttpHeaders, HttpParams } from "@angular/common/http";

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
