import type { QueryCacheChangeLogEntry, QueryCacheSnapshot, QueryCacheStorageAdapter } from '@shapeshift-labs/frontier-state-cache';
export interface QueryCacheIndexedDbStorageOptions {
    name?: string;
    databaseName?: string;
    storeName?: string;
    snapshotKey?: string;
    version?: number;
    indexedDB?: IDBFactory;
    now?: () => number;
    maxLogEntries?: number;
    onBlocked?: (event: IDBVersionChangeEvent) => void;
    onVersionChange?: (event: IDBVersionChangeEvent) => void;
}
export interface QueryCacheIndexedDbChangeLogReadOptions {
    sinceSeq?: number;
    limit?: number;
}
export interface QueryCacheIndexedDbStorageAdapter extends QueryCacheStorageAdapter {
    readonly databaseName: string;
    readonly storeName: string;
    readonly snapshotKey: string;
    appendChange(entry: QueryCacheChangeLogEntry): Promise<void>;
    readChangeLog(options?: QueryCacheIndexedDbChangeLogReadOptions): Promise<QueryCacheChangeLogEntry[]>;
    compact(snapshot?: QueryCacheSnapshot): Promise<void>;
    close(): void;
    destroy(): Promise<void>;
}
export declare function createQueryCacheIndexedDbStorageAdapter(options?: string | QueryCacheIndexedDbStorageOptions): QueryCacheIndexedDbStorageAdapter;
//# sourceMappingURL=index.d.ts.map