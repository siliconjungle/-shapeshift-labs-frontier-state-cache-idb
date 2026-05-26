const DEFAULT_DATABASE_NAME = 'frontier-state-cache';
const DEFAULT_STORE_NAME = 'snapshots';
const DEFAULT_SNAPSHOT_KEY = 'default';
const DEFAULT_VERSION = 1;
const RECORD_MAGIC = 'frontier-state-cache-idb';
const CHANGE_LOG_MAGIC = 'frontier-state-cache-idb-change';
const RECORD_VERSION = 1;
export function createQueryCacheIndexedDbStorageAdapter(options = {}) {
    const normalized = normalizeOptions(options);
    const databaseName = normalized.databaseName;
    const storeName = normalized.storeName;
    const snapshotKey = normalized.snapshotKey;
    const changeLogKey = snapshotKey + '\u0000changes';
    const version = normalized.version;
    const now = normalized.now;
    const indexedDb = normalized.indexedDB;
    let dbPromise;
    let db;
    const adapter = {
        databaseName,
        storeName,
        snapshotKey,
        async load() {
            const record = await runStore('readonly', (store) => store.get(snapshotKey));
            if (record === undefined || record === null)
                return null;
            assertRecord(record);
            return cloneSnapshot(record.snapshot);
        },
        async save(snapshot) {
            const record = {
                key: snapshotKey,
                magic: RECORD_MAGIC,
                version: RECORD_VERSION,
                savedAt: now(),
                snapshot: cloneSnapshot(snapshot)
            };
            await runStore('readwrite', (store) => store.put(record));
        },
        async clear() {
            await runWriteTransaction((store) => {
                store.delete(snapshotKey);
                store.delete(changeLogKey);
            });
        },
        async appendChange(entry) {
            assertChangeLogEntry(entry);
            await updateChangeLogRecord((record) => {
                record.entries.push(cloneChangeLogEntry(entry));
                if (normalized.maxLogEntries > 0 && record.entries.length > normalized.maxLogEntries) {
                    record.entries = record.entries.slice(record.entries.length - normalized.maxLogEntries);
                }
                record.updatedAt = now();
            });
        },
        async readChangeLog(options = {}) {
            const record = await loadChangeLogRecord();
            const sinceSeq = Number(options.sinceSeq);
            const limit = readPositiveInt(options.limit, 0);
            const entries = [];
            for (let i = 0; i < record.entries.length; i++) {
                const entry = record.entries[i];
                if (Number.isFinite(sinceSeq) && entry.seq <= sinceSeq)
                    continue;
                entries.push(cloneChangeLogEntry(entry));
                if (limit > 0 && entries.length >= limit)
                    break;
            }
            return entries;
        },
        async compact(snapshot) {
            await runWriteTransaction((store) => {
                if (snapshot !== undefined) {
                    const record = {
                        key: snapshotKey,
                        magic: RECORD_MAGIC,
                        version: RECORD_VERSION,
                        savedAt: now(),
                        snapshot: cloneSnapshot(snapshot)
                    };
                    store.put(record);
                }
                store.delete(changeLogKey);
            });
        },
        close() {
            if (db !== undefined)
                db.close();
            db = undefined;
            dbPromise = undefined;
        },
        async destroy() {
            adapter.close();
            await deleteDatabase();
        }
    };
    return adapter;
    function getDb() {
        if (dbPromise === undefined)
            dbPromise = openDatabase();
        return dbPromise;
    }
    function openDatabase() {
        return new Promise((resolve, reject) => {
            const factory = getIndexedDb(indexedDb);
            const request = factory.open(databaseName, version);
            request.onblocked = (event) => {
                if (typeof normalized.onBlocked === 'function')
                    normalized.onBlocked(event);
            };
            request.onupgradeneeded = () => {
                const nextDb = request.result;
                if (!hasObjectStore(nextDb, storeName))
                    nextDb.createObjectStore(storeName, { keyPath: 'key' });
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
                    if (typeof normalized.onVersionChange === 'function')
                        normalized.onVersionChange(event);
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
    async function runStore(mode, operation) {
        const database = await getDb();
        return new Promise((resolve, reject) => {
            let settled = false;
            let value;
            const transaction = database.transaction(storeName, mode);
            const fail = (error) => {
                if (settled)
                    return;
                settled = true;
                reject(error instanceof Error ? error : new Error(String(error || 'IndexedDB transaction failed')));
            };
            transaction.onerror = () => fail(transaction.error || new Error('IndexedDB transaction failed'));
            transaction.onabort = () => fail(transaction.error || new Error('IndexedDB transaction aborted'));
            transaction.oncomplete = () => {
                if (settled)
                    return;
                settled = true;
                resolve(value);
            };
            let request;
            try {
                request = operation(transaction.objectStore(storeName));
            }
            catch (error) {
                fail(error);
                return;
            }
            request.onsuccess = () => {
                value = request.result;
            };
            request.onerror = () => fail(request.error || new Error('IndexedDB request failed'));
        });
    }
    async function runWriteTransaction(operation) {
        const database = await getDb();
        return new Promise((resolve, reject) => {
            let settled = false;
            const transaction = database.transaction(storeName, 'readwrite');
            const fail = (error) => {
                if (settled)
                    return;
                settled = true;
                reject(error instanceof Error ? error : new Error(String(error || 'IndexedDB transaction failed')));
            };
            transaction.onerror = () => fail(transaction.error || new Error('IndexedDB transaction failed'));
            transaction.onabort = () => fail(transaction.error || new Error('IndexedDB transaction aborted'));
            transaction.oncomplete = () => {
                if (settled)
                    return;
                settled = true;
                resolve();
            };
            try {
                operation(transaction.objectStore(storeName));
            }
            catch (error) {
                fail(error);
            }
        });
    }
    async function updateChangeLogRecord(mutator) {
        const database = await getDb();
        return new Promise((resolve, reject) => {
            let settled = false;
            const transaction = database.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const fail = (error) => {
                if (settled)
                    return;
                settled = true;
                reject(error instanceof Error ? error : new Error(String(error || 'IndexedDB transaction failed')));
            };
            transaction.onerror = () => fail(transaction.error || new Error('IndexedDB transaction failed'));
            transaction.onabort = () => fail(transaction.error || new Error('IndexedDB transaction aborted'));
            transaction.oncomplete = () => {
                if (settled)
                    return;
                settled = true;
                resolve();
            };
            const request = store.get(changeLogKey);
            request.onerror = () => fail(request.error || new Error('IndexedDB request failed'));
            request.onsuccess = () => {
                try {
                    const record = normalizeChangeLogRecord(request.result);
                    mutator(record);
                    const putRequest = store.put(record);
                    putRequest.onerror = () => fail(putRequest.error || new Error('IndexedDB request failed'));
                }
                catch (error) {
                    fail(error);
                }
            };
        });
    }
    async function loadChangeLogRecord() {
        const record = await runStore('readonly', (store) => store.get(changeLogKey));
        return normalizeChangeLogRecord(record);
    }
    function normalizeChangeLogRecord(record) {
        if (record === undefined || record === null) {
            return {
                key: changeLogKey,
                magic: CHANGE_LOG_MAGIC,
                version: RECORD_VERSION,
                updatedAt: now(),
                entries: []
            };
        }
        assertChangeLogRecord(record);
        return {
            key: changeLogKey,
            magic: CHANGE_LOG_MAGIC,
            version: RECORD_VERSION,
            updatedAt: record.updatedAt,
            entries: record.entries.map(cloneChangeLogEntry)
        };
    }
    function deleteDatabase() {
        return new Promise((resolve, reject) => {
            const request = getIndexedDb(indexedDb).deleteDatabase(databaseName);
            request.onblocked = (event) => {
                if (typeof normalized.onBlocked === 'function')
                    normalized.onBlocked(event);
            };
            request.onerror = () => reject(request.error || new Error('IndexedDB deleteDatabase failed'));
            request.onsuccess = () => resolve();
        });
    }
}
function normalizeOptions(options) {
    const raw = typeof options === 'string' ? { databaseName: options } : options;
    const version = Number(raw.version);
    return {
        ...raw,
        databaseName: normalizeName(raw.databaseName === undefined ? raw.name : raw.databaseName, DEFAULT_DATABASE_NAME, 'databaseName'),
        storeName: normalizeName(raw.storeName, DEFAULT_STORE_NAME, 'storeName'),
        snapshotKey: normalizeName(raw.snapshotKey, DEFAULT_SNAPSHOT_KEY, 'snapshotKey'),
        version: Number.isFinite(version) && version >= 1 ? Math.floor(version) : DEFAULT_VERSION,
        now: typeof raw.now === 'function' ? raw.now : Date.now,
        maxLogEntries: readPositiveInt(raw.maxLogEntries, 0)
    };
}
function normalizeName(value, fallback, label) {
    if (value === undefined)
        return fallback;
    if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError('createQueryCacheIndexedDbStorageAdapter ' + label + ' must be a non-empty string');
    }
    return value;
}
function getIndexedDb(factory) {
    const resolved = factory || globalThis.indexedDB;
    if (resolved === undefined || resolved === null) {
        throw new Error('IndexedDB is not available; pass options.indexedDB or run in a browser environment');
    }
    return resolved;
}
function hasObjectStore(db, name) {
    const names = db.objectStoreNames;
    if (typeof names.contains === 'function')
        return names.contains(name);
    for (let index = 0; index < names.length; index++) {
        if (names.item(index) === name || names[index] === name)
            return true;
    }
    return false;
}
function assertRecord(record) {
    if (record.magic !== RECORD_MAGIC || record.version !== RECORD_VERSION) {
        throw new Error('IndexedDB record is not a Frontier state-cache snapshot');
    }
    const snapshot = record.snapshot;
    if (snapshot === null ||
        typeof snapshot !== 'object' ||
        snapshot.entities === null ||
        typeof snapshot.entities !== 'object' ||
        !Array.isArray(snapshot.queries)) {
        throw new Error('IndexedDB record contains an invalid Frontier state-cache snapshot');
    }
}
function assertChangeLogRecord(record) {
    if (record.magic !== CHANGE_LOG_MAGIC || record.version !== RECORD_VERSION || !Array.isArray(record.entries)) {
        throw new Error('IndexedDB record is not a Frontier state-cache change log');
    }
    for (let i = 0; i < record.entries.length; i++)
        assertChangeLogEntry(record.entries[i]);
}
function assertChangeLogEntry(entry) {
    if (entry === null ||
        typeof entry !== 'object' ||
        !Number.isFinite(entry.seq) ||
        typeof entry.type !== 'string') {
        throw new Error('Invalid Frontier state-cache change-log entry');
    }
}
function cloneChangeLogEntry(entry) {
    if (typeof globalThis.structuredClone === 'function')
        return globalThis.structuredClone(entry);
    return JSON.parse(JSON.stringify(entry));
}
function cloneSnapshot(snapshot) {
    if (typeof globalThis.structuredClone === 'function')
        return globalThis.structuredClone(snapshot);
    return JSON.parse(JSON.stringify(snapshot));
}
function readPositiveInt(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}
//# sourceMappingURL=index.js.map