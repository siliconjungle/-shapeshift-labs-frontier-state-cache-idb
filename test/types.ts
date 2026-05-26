import {
  createQueryCacheIndexedDbStorageAdapter,
  type QueryCacheIndexedDbStorageAdapter,
  type QueryCacheIndexedDbStorageOptions
} from '../dist/index.js';
import {
  createQueryCache,
  persistQueryCache,
  type QueryCacheStorageAdapter
} from '@shapeshift-labs/frontier-state-cache';

const options: QueryCacheIndexedDbStorageOptions = {
  databaseName: 'frontier-types',
  storeName: 'snapshots',
  snapshotKey: 'default',
  version: 1,
  now: () => 1
};

const storage: QueryCacheIndexedDbStorageAdapter = createQueryCacheIndexedDbStorageAdapter(options);
const genericStorage: QueryCacheStorageAdapter = storage;
const stringStorage: QueryCacheIndexedDbStorageAdapter = createQueryCacheIndexedDbStorageAdapter('frontier-types-string');
const persistence = persistQueryCache(createQueryCache(), genericStorage);

void stringStorage;
void persistence;
storage.close();
