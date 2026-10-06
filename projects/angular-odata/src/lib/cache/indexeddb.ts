import type { ODataCacheEntry, ODataCacheFilter, ODataCacheOptions } from './cache';
import { ODataInMemoryCache } from './memory';

type PendingOperation =
  | { kind: 'put'; key: string; entry: ODataCacheEntry<unknown> }
  | { kind: 'forget'; options: ODataCacheFilter }
  | { kind: 'flush' };

export class ODataIndexedDBCache extends ODataInMemoryCache {
  private name: string;
  private version: number;
  private store: string;
  private _database?: IDBDatabase;
  private _persistent = true;
  private _hydrated = false;
  private _pending: PendingOperation[] = [];
  private _writes: Promise<void> = Promise.resolve();
  private _ready: Promise<void>;

  constructor({
    name = 'ODataCache',
    store = 'cache',
    version = 1,
    ...options
  }: ODataCacheOptions & { name?: string; store?: string; version?: number } = {}) {
    super(options);
    this.name = name;
    this.store = store;
    this.version = version;
    this._ready = this.initialize().catch((error: unknown) => {
      const flushed = this._pending.some((operation) => operation.kind === 'flush');
      this.disablePersistence(error);
      this._hydrated = true;
      this._pending = [];
      if (flushed) this.persist((store) => store.clear(), true);
    });
  }

  /** Wait for hydration and queued writes, or an explicitly reported memory-only fallback. */
  ready(): Promise<void> {
    return this._ready.then(() => this._writes).then(() => this.checkError());
  }

  protected override reportError(message: string, cause?: unknown): void {
    // IndexedDB event callbacks cannot throw into the caller's observable.
    try {
      super.reportError(message, cause);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      this._error = error;
    }
  }

  // The database stays open after a fallback so flush/forget can still remove persisted data.
  private disablePersistence(cause: unknown): void {
    if (!this._persistent) return;
    this._persistent = false;
    this.reportError('IndexedDB cache persistence failed; using memory only', cause);
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, this.version);
      let failed = false;
      const fail = (error: unknown) => {
        failed = true;
        reject(error);
      };
      request.onupgradeneeded = () => {
        if (failed) {
          request.transaction?.abort();
          return;
        }
        const db = request.result;
        if (!db.objectStoreNames.contains(this.store)) db.createObjectStore(this.store);
      };
      request.onsuccess = () => {
        const db = request.result;
        if (failed) {
          db.close();
          return;
        }
        db.onversionchange = () => {
          db.close();
          this._database = undefined;
          this.disablePersistence(new Error('IndexedDB cache version changed'));
        };
        resolve(db);
      };
      request.onerror = () => fail(request.error);
      request.onblocked = () => fail(new Error('IndexedDB cache opening was blocked'));
    });
  }

  private loadFromDb(db: IDBDatabase): Promise<Map<string, ODataCacheEntry<unknown>>> {
    return new Promise((resolve, reject) => {
      const entries = new Map<string, ODataCacheEntry<unknown>>();
      const transaction = db.transaction(this.store, 'readwrite');
      const request = transaction.objectStore(this.store).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor === null) return;
        const value: unknown = cursor.value;
        if (typeof cursor.key !== 'string' || !this.isEntry(value)) {
          cursor.delete();
          this.reportCorruption('Discarding an invalid IndexedDB cache entry');
        } else if (this.isExpired(value)) {
          cursor.delete();
        } else {
          entries.set(cursor.key, value);
        }
        cursor.continue();
      };
      transaction.oncomplete = () => resolve(entries);
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB load failed'));
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB load aborted'));
    });
  }

  private async initialize(): Promise<void> {
    const db = await this.openDb();
    this._database = db;
    const entries = await this.loadFromDb(db);
    if (!this._persistent) {
      this._hydrated = true;
      this._pending = [];
      return;
    }
    const pending = this._pending;
    this._pending = [];
    super.clearEntries();
    entries.forEach((entry, key) => super.setEntry(key, entry));
    this._hydrated = true;
    for (const operation of pending) {
      switch (operation.kind) {
        case 'put':
          this.setEntry(operation.key, operation.entry);
          break;
        case 'forget':
          this.forget(operation.options);
          break;
        case 'flush':
          this.flush();
          break;
      }
    }
    this.prune();
    await this._writes;
  }

  private persist(operation: (store: IDBObjectStore) => void, removal = false): void {
    this._writes = this._writes
      .then(() => {
        const db = this._database;
        if (db === undefined || (!this._persistent && !removal)) return;
        return new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(this.store, 'readwrite');
          transaction.oncomplete = () => resolve();
          transaction.onerror = () =>
            reject(transaction.error ?? new Error('IndexedDB write failed'));
          transaction.onabort = () =>
            reject(transaction.error ?? new Error('IndexedDB write aborted'));
          try {
            operation(transaction.objectStore(this.store));
          } catch (error) {
            transaction.abort();
            reject(error);
          }
        });
      })
      .catch((error: unknown) => this.disablePersistence(error));
  }

  protected override setEntry(key: string, entry: ODataCacheEntry<unknown>): void {
    super.setEntry(key, entry);
    if (!this._hydrated) this._pending.push({ kind: 'put', key, entry });
    else if (this._persistent) this.persist((store) => store.put(entry, key));
    else this.persist((store) => store.delete(key), true);
  }

  protected override deleteEntry(key: string): void {
    super.deleteEntry(key);
    if (this._hydrated) this.persist((store) => store.delete(key), true);
  }

  protected override clearEntries(): void {
    super.clearEntries();
    if (!this._hydrated) this._pending.push({ kind: 'flush' });
    else this.persist((store) => store.clear(), true);
  }

  /** Invalidate loaded entries and record filters that must also apply during hydration. */
  override forget(options: ODataCacheFilter = {}): void {
    if (!this._hydrated) {
      this._pending.push({
        kind: 'forget',
        options: { ...options, scope: [...(options.scope ?? [])], tags: [...(options.tags ?? [])] },
      });
    }
    super.forget(options);
  }
}
