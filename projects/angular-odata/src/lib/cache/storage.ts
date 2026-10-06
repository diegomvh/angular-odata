import { CACHE_KEY_SEPARATOR } from '../constants';
import { Types } from '../utils/types';
import type { ODataCacheEntry, ODataCacheFilter, ODataCacheOptions } from './cache';
import { ODataInMemoryCache } from './memory';

export class ODataInStorageCache extends ODataInMemoryCache {
  prefix: string;
  private _storage?: Storage;
  private _persistent = true;
  private _memoryOnly = new Set<string>();

  constructor({
    prefix,
    storage,
    ...options
  }: ODataCacheOptions & { prefix: string; storage?: Storage }) {
    super(options);
    this.prefix = prefix;
    try {
      this._storage = storage ?? globalThis.sessionStorage;
      if (this._storage === undefined) throw new Error('Web Storage is unavailable');
    } catch (error) {
      this.disablePersistence(error);
    }
    this.loadFromStorage();
  }

  /** The backing storage. Throws if the platform has no Web Storage implementation. */
  get storage(): Storage {
    if (this._storage === undefined) throw new Error('Web Storage is unavailable');
    return this._storage;
  }

  set storage(storage: Storage) {
    this._storage = storage;
    this._persistent = true;
    this.loadFromStorage();
  }

  override buildKey(names: string[]): string {
    return super.buildKey([this.prefix, ...names]);
  }

  private disablePersistence(cause: unknown): void {
    if (!this._persistent) return;
    this._persistent = false;
    this.reportError('Web Storage cache persistence failed; using memory only', cause);
  }

  private storageKeys(): string[] {
    if (this._storage === undefined) return [];
    try {
      const keys: string[] = [];
      const prefix = `${this.prefix}${CACHE_KEY_SEPARATOR}`;
      for (let index = 0; index < this.storage.length; index++) {
        const key = this.storage.key(index);
        if (key !== null && key.startsWith(prefix)) keys.push(key);
      }
      return keys;
    } catch (error) {
      this.disablePersistence(error);
      return [];
    }
  }

  private readEntry(key: string): ODataCacheEntry<unknown> | undefined {
    let raw: string | null;
    try {
      raw = this.storage.getItem(key);
    } catch (error) {
      this.disablePersistence(error);
      return this.entries.get(key);
    }
    if (raw === null) return undefined;
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      this.deleteEntry(key);
      this.reportCorruption('Discarding invalid JSON from the Web Storage cache', error);
      return undefined;
    }
    if (!this.isEntry(value)) {
      this.deleteEntry(key);
      this.reportCorruption('Discarding an invalid Web Storage cache entry');
      return undefined;
    }
    if (this.isExpired(value)) {
      this.deleteEntry(key);
      return undefined;
    }
    return value;
  }

  private loadFromStorage(): void {
    if (!this._persistent) return;
    const keys = this.storageKeys();
    if (!this._persistent) return;
    const stored = new Set(keys);
    this.entries.forEach((_, key) => {
      if (!stored.has(key) && !this._memoryOnly.has(key)) super.deleteEntry(key);
    });
    for (const key of keys) {
      if (!this._persistent) break;
      if (this._memoryOnly.has(key)) continue;
      const entry = this.readEntry(key);
      if (entry !== undefined) super.setEntry(key, entry);
    }
    this.prune();
  }

  // Removal is attempted after a memory fallback so flush/forget still clear persisted data.
  private removeStoredEntry(key: string): void {
    if (this._storage === undefined) return;
    try {
      this.storage.removeItem(key);
    } catch (error) {
      this.disablePersistence(error);
    }
  }

  protected override setEntry(key: string, entry: ODataCacheEntry<unknown>): void {
    super.setEntry(key, entry);
    const payload = this.isResponseJson(entry.payload) ? entry.payload.body : entry.payload;
    if (['ArrayBuffer', 'Blob', 'File'].includes(Types.rawType(payload))) {
      this._memoryOnly.add(key);
      this.removeStoredEntry(key);
      return;
    }
    this._memoryOnly.delete(key);
    if (!this._persistent) {
      this.removeStoredEntry(key);
      return;
    }
    try {
      const serialized = JSON.stringify(entry);
      if (!this.isEntry(JSON.parse(serialized))) {
        throw new TypeError('Cache payload is not JSON serializable');
      }
      this.storage.setItem(key, serialized);
    } catch (error) {
      this.disablePersistence(error);
    }
  }

  protected override deleteEntry(key: string): void {
    super.deleteEntry(key);
    this._memoryOnly.delete(key);
    this.removeStoredEntry(key);
  }

  protected override expireEntry(key: string): void {
    if (this._persistent && !this._memoryOnly.has(key)) {
      const latest = this.readEntry(key);
      if (latest !== undefined && !this.isExpired(latest)) {
        super.setEntry(key, latest);
        return;
      }
    }
    super.expireEntry(key);
  }

  protected override clearEntries(): void {
    const keys = this.storageKeys();
    super.clearEntries();
    this._memoryOnly.clear();
    keys.forEach((key) => this.removeStoredEntry(key));
  }

  /** Read a persisted entry, or its in-memory fallback, without renewing its age. */
  override get<T>(name: string, { scope }: { scope?: string[] } = {}): T | undefined {
    const key = this.buildKey([...(scope ?? []), name]);
    if (this._persistent && !this._memoryOnly.has(key)) {
      const entry = this.readEntry(key);
      if (entry === undefined) super.deleteEntry(key);
      else super.setEntry(key, entry);
    }
    return super.get<T>(name, { scope });
  }

  /** Remove matching entries from both persistent storage and the memory fallback. */
  override forget(options: ODataCacheFilter = {}): void {
    this.loadFromStorage();
    super.forget(options);
  }

  /** Count unexpired entries, including memory-only binary responses. */
  override size(): number {
    this.loadFromStorage();
    return super.size();
  }
}
