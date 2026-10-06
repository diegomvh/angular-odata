import { ODataBaseCache } from './cache';
import type { ODataCacheEntry, ODataCacheFilter, ODataCacheOptions } from './cache';

export class ODataInMemoryCache extends ODataBaseCache {
  entries: Map<string, ODataCacheEntry<any>>;
  private _nextExpiry = Infinity;

  constructor(options: ODataCacheOptions = {}) {
    super(options);
    this.entries = new Map<string, ODataCacheEntry<any>>();
  }

  protected setEntry(key: string, entry: ODataCacheEntry<unknown>): void {
    this.entries.set(key, entry);
    this._nextExpiry = Math.min(this._nextExpiry, entry.date + entry.maxAge);
  }

  protected deleteEntry(key: string): void {
    this.entries.delete(key);
  }

  protected expireEntry(key: string): void {
    this.deleteEntry(key);
  }

  protected clearEntries(): void {
    this.entries.clear();
    this._nextExpiry = Infinity;
  }

  protected prune(): void {
    if (Date.now() < this._nextExpiry) return;
    this._nextExpiry = Infinity;
    this.entries.forEach((entry, key) => {
      if (this.isExpired(entry)) this.expireEntry(key);
      const current = this.entries.get(key);
      if (current !== undefined) {
        this._nextExpiry = Math.min(this._nextExpiry, current.date + current.maxAge);
      }
    });
  }

  /**
   * Put some payload in the cache
   * @param name The name for the entry
   * @param payload The payload to store in the cache
   * @param maxAge The maximum age for the entry
   * @param scope The scope for the entry
   * @param tags The tags for the entry
   */
  override put<T>(
    name: string,
    payload: T,
    { maxAge, scope, tags }: { maxAge?: number; scope?: string[]; tags?: string[] } = {},
  ) {
    this.checkError();
    const entry = this.buildEntry<T>(payload, { maxAge, tags });
    const key = this.buildKey([...(scope ?? []), name]);
    this.prune();
    this.setEntry(key, entry);
  }

  /**
   * Return the payload from the cache if it exists and is not expired
   * @param name The name of the entry
   * @param scope The scope of the entry
   * @returns The payload of the entry
   */
  override get<T>(name: string, { scope }: { scope?: string[] } = {}): T | undefined {
    this.checkError();
    this.prune();
    const key = this.buildKey([...(scope || []), name]);
    const entry = this.entries.get(key);
    return entry !== undefined && !this.isExpired(entry) ? entry.payload : undefined;
  }

  /**
   * Remove all cache entries that are matching with the given options
   * @param options The options to forget
   */
  override forget(options: ODataCacheFilter = {}) {
    this.checkError();
    this.entries.forEach((entry, k) => {
      if (this.matches(k, entry, options)) this.deleteEntry(k);
    });
  }

  /**
   * Remove all cache entries
   */
  override flush() {
    this.checkError();
    this.clearEntries();
  }

  /** Return the number of unexpired entries. */
  override size() {
    this.checkError();
    this.prune();
    return this.entries.size;
  }
}
