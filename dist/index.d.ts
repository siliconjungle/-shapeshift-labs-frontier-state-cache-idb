import type { QueryCacheStorageAdapter } from '@shapeshift-labs/frontier-state-cache';
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
export declare function createQueryCacheIndexedDbStorageAdapter(options?: string | QueryCacheIndexedDbStorageOptions): QueryCacheIndexedDbStorageAdapter;
//# sourceMappingURL=index.d.ts.map