import { CACHE_KEY_SEPARATOR, DEFAULT_MAXAGE } from '../constants';
import type { ODataRequest } from '../resources/request';
import { ODataResponse } from '../resources/response';
import type { ODataResponseJson } from '../resources/response';
import type { ODataCache } from '../types';
import { PathSegment } from '../types';

export type ODataCacheOptions = {
  maxAge?: number;
  /** Opt into memory fallback on persistence failures; also told of discarded corrupt entries. */
  onError?: (error: Error) => void;
};

export type ODataCacheFilter = {
  name?: string;
  scope?: string[];
  tags?: string[];
};

/**
 * A cache entry that holds a payload, a date when it was last read from the backend, and a maxAge for the entry.
 * @param payload The payload to cache.
 * @param date The date when the entry was last read from the backend.
 * @param maxAge The maximum age for the entry.
 * @param tags Some tags to identify the entry.
 */
export interface ODataCacheEntry<T> {
  payload: T;
  date: number;
  maxAge: number;
  tags: string[];
}

export abstract class ODataBaseCache implements ODataCache {
  maxAge: number;
  private _onError?: (error: Error) => void;
  protected _error?: Error;

  constructor({
    maxAge = DEFAULT_MAXAGE,
    onError,
  }: ODataCacheOptions) {
    this.validateMaxAge(maxAge);
    this.maxAge = maxAge;
    this._onError = onError;
  }

  /**
   * Check if the entry is expired
   * @param entry The cache entry
   * @returns Boolean indicating if the entry is expired
   */
  isExpired(entry: ODataCacheEntry<any>) {
    return entry.date <= Date.now() - entry.maxAge;
  }

  /**
   * Using the resource on the request build an array of string to identify the scope of the request
   * @param req The request with the resource to build the scope
   * @returns Array of string to identify the scope of the request
   */
  scope(req: ODataRequest<any>): string[] {
    const segments = req.resource.cloneSegments();
    return segments.segments().reduce(
      (acc, s) => {
        if (s.name === PathSegment.entitySet || s.name === PathSegment.singleton)
          acc = [...acc, s.path() as string];
        return acc;
      },
      req.cacheScope,
    );
  }

  /**
   * Using the odata context on the response build an array of string to identify the tags of the response
   * @param res The response to build the tags
   * @returns Array of string to identify the tags of the response
   */
  tags(res: ODataResponse<any>): string[] {
    const tags = [];
    const context = res.context;
    if (context.entitySet) {
      tags.push(context.key ? `${context.entitySet}(${context.key})` : context.entitySet);
    }
    if (context.type) tags.push(context.type);
    return tags;
  }

  /**
   * Build an entry from a payload and some options
   * @param payload The payload to store in the cache
   * @param maxAge The maximum age for the entry
   * @param tags The tags for the entry
   * @returns The entry to store in the cache
   */
  buildEntry<T>(
    payload: T,
    { maxAge, tags }: { maxAge?: number; tags?: string[] },
  ): ODataCacheEntry<T> {
    const seconds = maxAge ?? this.maxAge;
    this.validateMaxAge(seconds);
    return {
      payload,
      date: Date.now(),
      maxAge: seconds * 1000,
      tags: [...(tags ?? [])],
    };
  }

  /**
   * Build a key from store an entry in the cache
   * @param names The names of the entry
   * @returns The key for the entry
   */
  buildKey(names: string[]): string {
    return names.join(CACHE_KEY_SEPARATOR);
  }

  protected validateMaxAge(maxAge: number): void {
    if (!Number.isFinite(maxAge * 1000) || maxAge < 0) {
      throw new RangeError('Cache maxAge must be a finite, non-negative number of seconds');
    }
  }

  protected reportError(message: string, cause?: unknown): void {
    const error = new Error(message, { cause });
    if (this._onError !== undefined) this._onError(error);
    else {
      this._error = error;
      throw error;
    }
  }

  /** Report a discarded entry; corrupt entries are treated as cache misses. */
  protected reportCorruption(message: string, cause?: unknown): void {
    this._onError?.(new Error(message, { cause }));
  }

  protected checkError(): void {
    if (this._error !== undefined) throw this._error;
  }

  protected isEntry(value: unknown): value is ODataCacheEntry<unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      'payload' in value &&
      'date' in value &&
      typeof value.date === 'number' &&
      Number.isFinite(value.date) &&
      'maxAge' in value &&
      typeof value.maxAge === 'number' &&
      Number.isFinite(value.maxAge) &&
      value.maxAge >= 0 &&
      'tags' in value &&
      Array.isArray(value.tags) &&
      value.tags.every((tag: unknown) => typeof tag === 'string')
    );
  }

  protected matches(
    key: string,
    entry: ODataCacheEntry<unknown>,
    { name, scope = [], tags = [] }: ODataCacheFilter,
  ): boolean {
    const scopedKey = this.buildKey(name !== undefined ? [...scope, name] : scope);
    return (
      this.isExpired(entry) ||
      (name !== undefined
        ? key === scopedKey
        : scope.length > 0 &&
          (key === scopedKey || key.startsWith(`${scopedKey}${CACHE_KEY_SEPARATOR}`))) ||
      tags.some((tag) => entry.tags.includes(tag))
    );
  }

  protected isResponseJson(value: unknown): value is ODataResponseJson<unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      'body' in value &&
      'status' in value &&
      typeof value.status === 'number' &&
      Number.isInteger(value.status) &&
      'statusText' in value &&
      typeof value.statusText === 'string' &&
      'url' in value &&
      (value.url === null || typeof value.url === 'string') &&
      'headers' in value &&
      typeof value.headers === 'object' &&
      value.headers !== null &&
      !Array.isArray(value.headers) &&
      Object.values(value.headers).every(
        (header: unknown) =>
          typeof header === 'string' ||
          (Array.isArray(header) && header.every((part: unknown) => typeof part === 'string')),
      )
    );
  }

  protected snapshot(response: ODataResponseJson<unknown>): ODataResponseJson<unknown> {
    const body = response.body;
    return {
      ...response,
      body:
        typeof Blob !== 'undefined' && body instanceof Blob
          ? body.slice(0, body.size, body.type)
          : structuredClone(body),
      headers: structuredClone(response.headers),
    };
  }

  /** Store a detached response snapshot, respecting server reuse restrictions. */
  putResponse(req: ODataRequest<any>, res: ODataResponse<any>): void {
    const scope = this.scope(req);
    if (!res.isCacheable(req.ignoreCacheControl)) {
      this.forget({ name: req.cacheKey, scope });
      return;
    }
    this.put(req.cacheKey, this.snapshot(res.toJson()), {
      maxAge: req.maxAge ?? (req.ignoreCacheControl ? undefined : res.options.maxAge),
      scope,
      tags: this.tags(res),
    });
  }

  /** Restore a detached response using the current request's resource and parser. */
  getResponse(req: ODataRequest<any>): ODataResponse<any> | undefined {
    const scope = this.scope(req);
    const data = this.get<unknown>(req.cacheKey, { scope });
    if (data === undefined) return undefined;
    if (!this.isResponseJson(data)) {
      this.forget({ name: req.cacheKey, scope });
      this.reportCorruption('Discarding an invalid cached OData response');
      return undefined;
    }
    const response = ODataResponse.fromJson(req, this.snapshot(data));
    if (!response.isCacheable(req.ignoreCacheControl)) {
      this.forget({ name: req.cacheKey, scope });
      return undefined;
    }
    return response;
  }

  abstract put<T>(
    name: string,
    payload: T,
    { maxAge, scope, tags }: { maxAge?: number; scope?: string[]; tags?: string[] },
  ): void;
  abstract get<T>(name: string, { scope }: { scope?: string[] }): T | undefined;
  abstract forget({
    name,
    scope,
    tags,
  }: {
    name?: string;
    scope?: string[];
    tags?: string[];
  }): void;
  abstract flush(): void;
  abstract size(): number;
}
