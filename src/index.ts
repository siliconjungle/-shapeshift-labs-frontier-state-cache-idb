import type {
  QueryCacheSnapshot,
  QueryCacheStorageAdapter
} from '@shapeshift-labs/frontier-state-cache';

const DEFAULT_DATABASE_NAME = 'frontier-state-cache';
const DEFAULT_STORE_NAME = 'snapshots';
const DEFAULT_SNAPSHOT_KEY = 'default';
const DEFAULT_VERSION = 1;
const RECORD_MAGIC = 'frontier-state-cache-idb';
const RECORD_VERSION = 1;

export interface QueryCacheIndexedDbStorageOptions {
  databaseName?: string;
  storeName?: string;
  snapshotKey?: string;
  version?: number;
  indexedDB?: IDBFactory;
  now?: () => number;
  onBlocked?: (event: IDBVersionChangeEvent) => void;
  onVersionChange?: (event: IDBVersionChangeEvent) => void;
}

export interface QueryCacheIndexedDbStorageAdapter extends QueryCacheStorageAdapter {
  readonly databaseName: string;
  readonly storeName: string;
  readonly snapshotKey: string;
  close(): void;
  destroy(): Promise<void>;
}

type QueryCacheIndexedDbRecord = {
  key: string;
  magic: typeof RECORD_MAGIC;
  version: typeof RECORD_VERSION;
  savedAt: number;
  snapshot: QueryCacheSnapshot;
};

export function createQueryCacheIndexedDbStorageAdapter(
  options: string | QueryCacheIndexedDbStorageOptions = {}
): QueryCacheIndexedDbStorageAdapter {
  const normalized = normalizeOptions(options);
  const databaseName = normalized.databaseName;
  const storeName = normalized.storeName;
  const snapshotKey = normalized.snapshotKey;
  const version = normalized.version;
  const now = normalized.now;
  const indexedDb = normalized.indexedDB;

  let dbPromise: Promise<IDBDatabase> | undefined;
  let db: IDBDatabase | undefined;

  const adapter: QueryCacheIndexedDbStorageAdapter = {
    databaseName,
    storeName,
    snapshotKey,
    async load() {
      const record = await runStore<QueryCacheIndexedDbRecord | undefined>('readonly', (store) =>
        store.get(snapshotKey) as IDBRequest<QueryCacheIndexedDbRecord | undefined>
      );
      if (record === undefined || record === null) return null;
      assertRecord(record);
      return cloneSnapshot(record.snapshot);
    },
    async save(snapshot) {
      const record: QueryCacheIndexedDbRecord = {
        key: snapshotKey,
        magic: RECORD_MAGIC,
        version: RECORD_VERSION,
        savedAt: now(),
        snapshot: cloneSnapshot(snapshot)
      };
      await runStore<IDBValidKey>('readwrite', (store) => store.put(record));
    },
    async clear() {
      await runStore<undefined>('readwrite', (store) => store.delete(snapshotKey) as IDBRequest<undefined>);
    },
    close() {
      if (db !== undefined) db.close();
      db = undefined;
      dbPromise = undefined;
    },
    async destroy() {
      adapter.close();
      await deleteDatabase();
    }
  };

  return adapter;

  function getDb(): Promise<IDBDatabase> {
    if (dbPromise === undefined) dbPromise = openDatabase();
    return dbPromise;
  }

  function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const factory = getIndexedDb(indexedDb);
      const request = factory.open(databaseName, version);
      request.onblocked = (event) => {
        if (typeof normalized.onBlocked === 'function') normalized.onBlocked(event);
      };
      request.onupgradeneeded = () => {
        const nextDb = request.result;
        if (!hasObjectStore(nextDb, storeName)) nextDb.createObjectStore(storeName, { keyPath: 'key' });
      };
      request.onerror = () => {
        reject(request.error || new Error('IndexedDB open failed'));
      };
      request.onsuccess = () => {
        const nextDb = request.result;
        if (!hasObjectStore(nextDb, storeName)) {
          nextDb.close();
          reject(new Error('IndexedDB database is missing object store "' + storeName + '"; increase the adapter version to create it'));
          return;
        }
        nextDb.onversionchange = (event) => {
          if (typeof normalized.onVersionChange === 'function') normalized.onVersionChange(event);
          nextDb.close();
          if (db === nextDb) {
            db = undefined;
            dbPromise = undefined;
          }
        };
        db = nextDb;
        resolve(nextDb);
      };
    });
  }

  async function runStore<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const database = await getDb();
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      let value: T;
      const transaction = database.transaction(storeName, mode);
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        reject(error instanceof Error ? error : new Error(String(error || 'IndexedDB transaction failed')));
      };
      transaction.onerror = () => fail(transaction.error || new Error('IndexedDB transaction failed'));
      transaction.onabort = () => fail(transaction.error || new Error('IndexedDB transaction aborted'));
      transaction.oncomplete = () => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      let request: IDBRequest<T>;
      try {
        request = operation(transaction.objectStore(storeName));
      } catch (error) {
        fail(error);
        return;
      }
      request.onsuccess = () => {
        value = request.result;
      };
      request.onerror = () => fail(request.error || new Error('IndexedDB request failed'));
    });
  }

  function deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = getIndexedDb(indexedDb).deleteDatabase(databaseName);
      request.onblocked = (event) => {
        if (typeof normalized.onBlocked === 'function') normalized.onBlocked(event);
      };
      request.onerror = () => reject(request.error || new Error('IndexedDB deleteDatabase failed'));
      request.onsuccess = () => resolve();
    });
  }
}

function normalizeOptions(options: string | QueryCacheIndexedDbStorageOptions): Required<Pick<QueryCacheIndexedDbStorageOptions, 'databaseName' | 'storeName' | 'snapshotKey' | 'version' | 'now'>> & QueryCacheIndexedDbStorageOptions {
  const raw = typeof options === 'string' ? { databaseName: options } : options;
  const version = Number(raw.version);
  return {
    ...raw,
    databaseName: normalizeName(raw.databaseName, DEFAULT_DATABASE_NAME, 'databaseName'),
    storeName: normalizeName(raw.storeName, DEFAULT_STORE_NAME, 'storeName'),
    snapshotKey: normalizeName(raw.snapshotKey, DEFAULT_SNAPSHOT_KEY, 'snapshotKey'),
    version: Number.isFinite(version) && version >= 1 ? Math.floor(version) : DEFAULT_VERSION,
    now: typeof raw.now === 'function' ? raw.now : Date.now
  };
}

function normalizeName(value: unknown, fallback: string, label: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('createQueryCacheIndexedDbStorageAdapter ' + label + ' must be a non-empty string');
  }
  return value;
}

function getIndexedDb(factory: IDBFactory | undefined): IDBFactory {
  const resolved = factory || globalThis.indexedDB;
  if (resolved === undefined || resolved === null) {
    throw new Error('IndexedDB is not available; pass options.indexedDB or run in a browser environment');
  }
  return resolved;
}

function hasObjectStore(db: IDBDatabase, name: string): boolean {
  const names = db.objectStoreNames;
  if (typeof names.contains === 'function') return names.contains(name);
  for (let index = 0; index < names.length; index++) {
    if (names.item(index) === name || names[index] === name) return true;
  }
  return false;
}

function assertRecord(record: QueryCacheIndexedDbRecord): void {
  if (record.magic !== RECORD_MAGIC || record.version !== RECORD_VERSION) {
    throw new Error('IndexedDB record is not a Frontier state-cache snapshot');
  }
  const snapshot = record.snapshot;
  if (
    snapshot === null ||
    typeof snapshot !== 'object' ||
    snapshot.entities === null ||
    typeof snapshot.entities !== 'object' ||
    !Array.isArray(snapshot.queries)
  ) {
    throw new Error('IndexedDB record contains an invalid Frontier state-cache snapshot');
  }
}

function cloneSnapshot(snapshot: QueryCacheSnapshot): QueryCacheSnapshot {
  if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(snapshot);
  return JSON.parse(JSON.stringify(snapshot)) as QueryCacheSnapshot;
}
