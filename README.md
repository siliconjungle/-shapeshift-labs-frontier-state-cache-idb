# Frontier State Cache IndexedDB

IndexedDB persistence adapter for Frontier state-cache snapshots.

This package provides a browser IndexedDB storage adapter for [`@shapeshift-labs/frontier-state-cache`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache). It lets applications keep using local in-memory query cache APIs while persisting cache snapshots across reloads.

- npm: [`@shapeshift-labs/frontier-state-cache-idb`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-idb)
- source: [`siliconjungle/-shapeshift-labs-frontier-state-cache-idb`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-idb)
- license: MIT

## Related Packages

- [`@shapeshift-labs/frontier`](https://www.npmjs.com/package/@shapeshift-labs/frontier): core JSON diff/apply primitives below the state-cache package.
- [`@shapeshift-labs/frontier-query`](https://www.npmjs.com/package/@shapeshift-labs/frontier-query): shared query-key, selector path, condition, identity, and table-schema primitives.
- [`@shapeshift-labs/frontier-state-cache`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache): normalized query-result cache with entity/query watchers, persistence hooks, change logs, optimistic layers, and mutation bridge helpers.

Package source repositories:

- [`siliconjungle/-shapeshift-labs-frontier`](https://github.com/siliconjungle/-shapeshift-labs-frontier)
- [`siliconjungle/-shapeshift-labs-frontier-query`](https://github.com/siliconjungle/-shapeshift-labs-frontier-query)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-idb`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-idb)

## Install

```sh
npm install @shapeshift-labs/frontier-state-cache @shapeshift-labs/frontier-state-cache-idb
```

## Usage

```ts
import { createQueryCache, persistQueryCache } from '@shapeshift-labs/frontier-state-cache';
import { createQueryCacheIndexedDbStorageAdapter } from '@shapeshift-labs/frontier-state-cache-idb';

const cache = createQueryCache();
const storage = createQueryCacheIndexedDbStorageAdapter({
  databaseName: 'app-cache'
});

const persistence = persistQueryCache(cache, storage, {
  autoHydrate: true,
  debounceMs: 100
});

cache.writeQuery(['todos'], [
  { __typename: 'Todo', id: 't1', text: 'ship', done: false }
]);

await persistence.flush();
```

## API

```ts
import {
  createQueryCacheIndexedDbStorageAdapter,
  type QueryCacheIndexedDbStorageAdapter,
  type QueryCacheIndexedDbStorageOptions
} from '@shapeshift-labs/frontier-state-cache-idb';
```

Core exports:

- `createQueryCacheIndexedDbStorageAdapter(options?)` creates a `QueryCacheStorageAdapter`.
- `adapter.load()` reads the current persisted cache snapshot.
- `adapter.save(snapshot)` writes one structured snapshot record.
- `adapter.clear()` removes the snapshot record.
- `adapter.close()` closes the cached `IDBDatabase` handle.
- `adapter.destroy()` closes and deletes the IndexedDB database.

Options:

- `databaseName`: IndexedDB database name. Defaults to `frontier-state-cache`.
- `storeName`: object store name. Defaults to `snapshots`.
- `snapshotKey`: record key for the cache snapshot. Defaults to `default`.
- `version`: IndexedDB database version. Defaults to `1`.
- `indexedDB`: explicit `IDBFactory`, useful for tests, workers, or alternate browser contexts.
- `onBlocked` and `onVersionChange`: lifecycle hooks for upgrade/delete/version-change events.

## Package Scope

This package owns only IndexedDB persistence for Frontier state-cache snapshots. It does not add a query cache runtime, mutation planner, CRDT sync provider, remote replication protocol, cross-tab broadcast layer, or arbitrary IndexedDB query abstraction.

Future package-local work may add durable change-log storage and cross-tab coordination, but those surfaces should stay opt-in and separate from the basic snapshot adapter.

## TypeScript

The package ships ESM JavaScript plus `.d.ts` declarations. The package-local TypeScript source lives in `src/` and compiles directly to `dist/`.

## Validation

```sh
npm test
npm run fuzz
npm run bench
npm run pack:dry
```

## Benchmarks

Run the package-local benchmark:

```sh
npm run bench
```

Latest local package benchmark on Node v26.1.0 with the package test IndexedDB shim, 3 rounds:

| Fixture | Median | p95 |
| --- | ---: | ---: |
| IDB snapshot save | 28,290 us | 30,774 us |
| IDB snapshot load | 24,779 us | 25,180 us |
| IDB persistence flush | 23,888 us | 29,805 us |
| IDB snapshot clear | 2,397 us | 2,481 us |

These are Frontier-only package measurements, not competitor comparisons. Browser IndexedDB implementations will differ from the test shim.

## License

MIT. See [LICENSE](./LICENSE).
