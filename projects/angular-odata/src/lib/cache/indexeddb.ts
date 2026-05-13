import { ODataRequest, ODataResponse, ODataResponseJson } from '../resources';
import { ODataBaseCache, ODataCacheEntry } from './cache';

export class ODataIndexedDBCache extends ODataBaseCache {
  private name: string;
  private version: number;
  private store: string;
  private entries: Map<string, ODataCacheEntry<any>>;
  private _db: Promise<IDBDatabase> | null;

  constructor({
    name = 'ODataCache',
    store = 'cache',
    version = 1,
    maxAge,
  }: {
    name?: string;
    store?: string;
    version?: number;
    maxAge?: number;
  } = {}) {
    super({ maxAge });
    this.name = name;
    this.store = store;
    this.version = version;
    this.entries = new Map();
    this._db = this.initDb();
  }

  private initDb(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.name, this.version);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.store)) {
          db.createObjectStore(this.store);
        }
      };
      request.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        await this.loadFromDb(db);
        resolve(db);
      };
      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private loadFromDb(db: IDBDatabase): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.store, 'readonly');
      const store = transaction.objectStore(this.store);
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          this.entries.set(cursor.key as string, cursor.value as ODataCacheEntry<any>);
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  private async withDb<T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T> {
    const db = await this._db!;
    return fn(db);
  }

  override put<T>(
    name: string,
    payload: T,
    { maxAge, scope, tags }: { maxAge?: number; scope?: string[]; tags?: string[] } = {},
  ) {
    const entry = this.buildEntry<T>(payload, { maxAge, tags });
    const key = this.buildKey([...(scope ?? []), name]);
    this.entries.set(key, entry);
    this.withDb((db) => {
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.store, 'readwrite');
        const store = transaction.objectStore(this.store);
        store.put(entry, key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject((event.target as IDBRequest).error);
      });
    });
  }

  override get<T>(name: string, { scope }: { scope?: string[] } = {}): T | undefined {
    const key = this.buildKey([...(scope || []), name]);
    const entry = this.entries.get(key);
    return entry !== undefined && !this.isExpired(entry) ? entry.payload : undefined;
  }

  override putResponse(req: ODataRequest<any>, res: ODataResponse<any>) {
    const scope = this.scope(req);
    const tags = this.tags(res);
    this.put<ODataResponseJson<any>>(req.cacheKey, res.toJson(), {
      maxAge: req.maxAge ?? res.options.maxAge,
      scope,
      tags,
    });
  }

  override getResponse(req: ODataRequest<any>): ODataResponse<any> | undefined {
    const scope = this.scope(req);
    const data = this.get<ODataResponseJson<any>>(req.cacheKey, { scope });
    return data !== undefined ? ODataResponse.fromJson(req, data) : undefined;
  }

  override forget({
    name,
    scope = [],
    tags = [],
  }: { name?: string; scope?: string[]; tags?: string[] } = {}) {
    if (name) scope.push(name);
    const key = scope.length > 0 ? this.buildKey(scope) : undefined;
    const keysToDelete: string[] = [];
    this.entries.forEach((entry, k) => {
      if (
        this.isExpired(entry) ||
        (key !== undefined && k.startsWith(key)) ||
        (tags.length > 0 && tags.some((t) => entry.tags.indexOf(t) !== -1))
      ) {
        keysToDelete.push(k);
      }
    });
    keysToDelete.forEach((k) => this.entries.delete(k));
    if (keysToDelete.length > 0) {
      this.withDb((db) => {
        return new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(this.store, 'readwrite');
          const store = transaction.objectStore(this.store);
          keysToDelete.forEach((k) => store.delete(k));
          transaction.oncomplete = () => resolve();
          transaction.onerror = (event) => reject((event.target as IDBRequest).error);
        });
      });
    }
  }

  override flush() {
    this.entries = new Map();
    this.withDb((db) => {
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.store, 'readwrite');
        const store = transaction.objectStore(this.store);
        store.clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject((event.target as IDBRequest).error);
      });
    });
  }

  override size() {
    return this.entries.size;
  }
}
