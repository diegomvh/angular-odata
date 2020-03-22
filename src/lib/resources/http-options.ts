import { HttpHeaders, HttpParams } from "@angular/common/http";

export type HttpOptions = {
  headers?: HttpHeaders | {[header: string]: string | string[]},
  params?: HttpParams|{[param: string]: string | string[]},
  reportProgress?: boolean,
  withCredentials?: boolean
}

export type HttpEntityOptions = HttpOptions & { responseType?: 'entity' }
export type HttpEntitiesOptions = HttpOptions & { responseType?: 'entities', withCount?: boolean };
export type HttpPropertyOptions = HttpOptions & { responseType?: 'property' };