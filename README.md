# Frontier State Cache IndexedDB

IndexedDB persistence adapter for Frontier state-cache snapshots and durable cache change logs.

This package provides a browser IndexedDB storage adapter for [`@shapeshift-labs/frontier-state-cache`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache). It lets applications keep using local in-memory query cache APIs while persisting cache snapshots and post-checkpoint query/entity changes across reloads.

- npm: [`@shapeshift-labs/frontier-state-cache-idb`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-idb)
- source: [`siliconjungle/-shapeshift-labs-frontier-state-cache-idb`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-idb)
- license: MIT

## Related Packages

The published Frontier package family is generated from one shared package catalog so READMEs stay in sync across packages:

- [`@shapeshift-labs/frontier`](https://www.npmjs.com/package/@shapeshift-labs/frontier): Core JSON diff/apply, compact patch tuples, JSON Pointer, equality, clone, validation, Unicode helpers.
- [`@shapeshift-labs/frontier-query`](https://www.npmjs.com/package/@shapeshift-labs/frontier-query): Shared query-key, selector path, condition, entity identity, and table-shape primitives.
- [`@shapeshift-labs/frontier-codec`](https://www.npmjs.com/package/@shapeshift-labs/frontier-codec): Patch serialization, binary frames, canonical JSON, and patch-history codecs.
- [`@shapeshift-labs/frontier-engine`](https://www.npmjs.com/package/@shapeshift-labs/frontier-engine): Stateful planned diff engine, adaptive profiles, schema plans, and engine-level history helpers.
- [`@shapeshift-labs/frontier-state`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state): Patch-routed app-state subscriptions, owned commits, maintained views, and path mapping.
- [`@shapeshift-labs/frontier-state-cache`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache): Normalized query-result cache with entity/query watchers, persistence, change logs, optimistic layers, and mutation bridge.
- [`@shapeshift-labs/frontier-state-cache-file`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-file): Structured file persistence adapter for Frontier state-cache snapshots and change logs.
- [`@shapeshift-labs/frontier-state-cache-sql`](https://www.npmjs.com/package/@shapeshift-labs/frontier-state-cache-sql): SQL persistence adapter for Frontier state-cache snapshots and change logs.
- [`@shapeshift-labs/frontier-schema`](https://www.npmjs.com/package/@shapeshift-labs/frontier-schema): JSON Schema validation, Frontier profile generation, CloudEvent envelopes, and query/table schema helpers.
- [`@shapeshift-labs/frontier-event-log`](https://www.npmjs.com/package/@shapeshift-labs/frontier-event-log): Bounded event logs, replay cursors, consumer acknowledgements, keyed compaction, checkpoints, and Frontier patch event records.
- [`@shapeshift-labs/frontier-logging`](https://www.npmjs.com/package/@shapeshift-labs/frontier-logging): Opt-in structured logging, browser telemetry, file sinks, exporters, benchmark traces, and Frontier patch/update summaries.
- [`@shapeshift-labs/frontier-mutation`](https://www.npmjs.com/package/@shapeshift-labs/frontier-mutation): Explicit mutation and selector plans compiled to Frontier patches or CRDT operations.
- [`@shapeshift-labs/frontier-crdt`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt): Native CRDT documents, update tooling, awareness, branches, conflict introspection, version frames, and undo.
- [`@shapeshift-labs/frontier-crdt-sync`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt-sync): CRDT sync endpoints, repo/storage/provider contracts, document URLs, local networks, model checking, forensics, and text binding contracts.
- [`@shapeshift-labs/frontier-crdt-websocket`](https://www.npmjs.com/package/@shapeshift-labs/frontier-crdt-websocket): WebSocket client/server transports for Frontier CRDT sync providers.
- [`@shapeshift-labs/frontier-react`](https://www.npmjs.com/package/@shapeshift-labs/frontier-react): React external-store hooks and adapters for Frontier state, cache, and CRDT surfaces.
- [`@shapeshift-labs/frontier-richtext`](https://www.npmjs.com/package/@shapeshift-labs/frontier-richtext): Rich text Delta normalization/application, marks, embeds, ranges, and cursor/selection transforms for local editor integrations.
- [`@shapeshift-labs/frontier-realtime`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime): Shared realtime command, tick, snapshot, prediction, reconciliation, interpolation, rollback, message, and delta primitives.
- [`@shapeshift-labs/frontier-realtime-server`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime-server): Authoritative realtime room, tick, command validation, rate-limit, session, and snapshot-history runtime.
- [`@shapeshift-labs/frontier-realtime-websocket`](https://www.npmjs.com/package/@shapeshift-labs/frontier-realtime-websocket): WebSocket client, wire, and Node room-server transport for Frontier realtime.
- [`@shapeshift-labs/frontier-game`](https://www.npmjs.com/package/@shapeshift-labs/frontier-game): Game-facing entity, component, player, room, ownership, spatial interest, rollback, physics, and replication helpers above realtime.

Package source repositories:

- [`siliconjungle/-shapeshift-labs-frontier`](https://github.com/siliconjungle/-shapeshift-labs-frontier)
- [`siliconjungle/-shapeshift-labs-frontier-query`](https://github.com/siliconjungle/-shapeshift-labs-frontier-query)
- [`siliconjungle/-shapeshift-labs-frontier-codec`](https://github.com/siliconjungle/-shapeshift-labs-frontier-codec)
- [`siliconjungle/-shapeshift-labs-frontier-engine`](https://github.com/siliconjungle/-shapeshift-labs-frontier-engine)
- [`siliconjungle/-shapeshift-labs-frontier-state`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-idb`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-idb)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-file`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-file)
- [`siliconjungle/-shapeshift-labs-frontier-state-cache-sql`](https://github.com/siliconjungle/-shapeshift-labs-frontier-state-cache-sql)
- [`siliconjungle/-shapeshift-labs-frontier-schema`](https://github.com/siliconjungle/-shapeshift-labs-frontier-schema)
- [`siliconjungle/-shapeshift-labs-frontier-event-log`](https://github.com/siliconjungle/-shapeshift-labs-frontier-event-log)
- [`siliconjungle/-shapeshift-labs-frontier-logging`](https://github.com/siliconjungle/-shapeshift-labs-frontier-logging)
- [`siliconjungle/-shapeshift-labs-frontier-mutation`](https://github.com/siliconjungle/-shapeshift-labs-frontier-mutation)
- [`siliconjungle/-shapeshift-labs-frontier-crdt`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt)
- [`siliconjungle/-shapeshift-labs-frontier-crdt-sync`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt-sync)
- [`siliconjungle/-shapeshift-labs-frontier-crdt-websocket`](https://github.com/siliconjungle/-shapeshift-labs-frontier-crdt-websocket)
- [`siliconjungle/-shapeshift-labs-frontier-react`](https://github.com/siliconjungle/-shapeshift-labs-frontier-react)
- [`siliconjungle/-shapeshift-labs-frontier-richtext`](https://github.com/siliconjungle/-shapeshift-labs-frontier-richtext)
- [`siliconjungle/-shapeshift-labs-frontier-realtime`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime)
- [`siliconjungle/-shapeshift-labs-frontier-realtime-server`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime-server)
- [`siliconjungle/-shapeshift-labs-frontier-realtime-websocket`](https://github.com/siliconjungle/-shapeshift-labs-frontier-realtime-websocket)
- [`siliconjungle/-shapeshift-labs-frontier-game`](https://github.com/siliconjungle/-shapeshift-labs-frontier-game)

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
  name: 'app-cache',
  maxLogEntries: 512
});

const persistence = persistQueryCache(cache, storage, {
  autoHydrate: true,
  debounceMs: 100,
  compactOnFlush: true,
  replayChangeLog: true
});

await persistence.ready;

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
- `adapter.appendChange(entry)` appends a durable cache change-log entry.
- `adapter.readChangeLog(options?)` reads retained change-log entries, optionally after `sinceSeq` and up to `limit`.
- `adapter.compact(snapshot?)` optionally writes a checkpoint snapshot and clears the retained change log in one write transaction.
- `adapter.clear()` removes the snapshot record and retained change log.
- `adapter.close()` closes the cached `IDBDatabase` handle.
- `adapter.destroy()` closes and deletes the IndexedDB database.

Options:

- `name`: shorthand for the IndexedDB database name.
- `databaseName`: IndexedDB database name. Defaults to `frontier-state-cache`.
- `storeName`: object store name. Defaults to `snapshots`.
- `snapshotKey`: record key for the cache snapshot. Defaults to `default`.
- `version`: IndexedDB database version. Defaults to `1`.
- `indexedDB`: explicit `IDBFactory`, useful for tests, workers, or alternate browser contexts.
- `maxLogEntries`: optional retention cap for durable change-log entries. Defaults to unbounded adapter retention.
- `onBlocked` and `onVersionChange`: lifecycle hooks for upgrade/delete/version-change events.

Use `persistQueryCache(cache, storage, { compactOnFlush: true, replayChangeLog: true })` when retained IDB log entries should be replayed after the saved snapshot during hydration. Replay assumes retained entries are post-checkpoint entries; `compactOnFlush` provides that checkpoint-and-trim policy for this adapter.

## Package Scope

This package owns only IndexedDB persistence for Frontier state-cache snapshots and durable cache change logs. It does not add a query cache runtime, mutation planner, CRDT sync provider, remote replication protocol, cross-tab broadcast layer, or arbitrary IndexedDB query abstraction.

Future package-local work may add cross-tab coordination, multi-snapshot namespaces, and app-level migration helpers, but those surfaces should stay opt-in and separate from the basic snapshot/log adapter.

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

Latest local package benchmark on Node v26.1.0 with the package test IndexedDB shim, 3 rounds and 300 iterations:

| Fixture | Median | p95 |
| --- | ---: | ---: |
| IDB snapshot save | 30.39 ms | 31.07 ms |
| IDB snapshot load | 27.26 ms | 29.24 ms |
| IDB persistence flush | 26.46 ms | 33.25 ms |
| IDB change-log append | 3.11 ms | 3.83 ms |
| IDB change-log read | 2.79 ms | 2.89 ms |
| IDB replay hydrate | 34.84 ms | 56.20 ms |
| IDB snapshot clear | 2.39 ms | 2.52 ms |

These are Frontier-only package measurements, not competitor comparisons. Browser IndexedDB implementations will differ from the test shim.

## License

MIT. See [LICENSE](./LICENSE).
