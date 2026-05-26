import { performance } from 'node:perf_hooks';
import {
  createQueryCache,
  persistQueryCache
} from '@shapeshift-labs/frontier-state-cache';
import { createQueryCacheIndexedDbStorageAdapter } from '../dist/index.js';
import { createFakeIndexedDB } from '../test/fake-indexeddb.mjs';

const args = parseArgs(process.argv.slice(2));
const rounds = readPositiveInt(args.rounds, 3);
const rows = readPositiveInt(args.rows, 5000);
const queries = readPositiveInt(args.queries, 128);
const iterations = readPositiveInt(args.iterations, 300);

const results = [
  await measureSnapshotSave(rows, queries, rounds),
  await measureSnapshotLoad(rows, queries, rounds),
  await measurePersistenceFlush(rows, queries, Math.max(30, Math.floor(iterations / 8))),
  await measureChangeLogAppend(iterations),
  await measureChangeLogRead(Math.max(30, Math.floor(iterations / 4))),
  await measureReplayHydrate(rows, queries, Math.max(10, rounds * 4)),
  await measureClear(rounds)
];

console.log('Frontier-only package measurements');
console.log(padRight('fixture', 38) + padLeft('median us', 12) + padLeft('p95 us', 10) + padLeft('events', 9));
for (const row of results) {
  console.log(
    padRight(row.fixture, 38) +
    padLeft(row.medianUs.toFixed(2), 12) +
    padLeft(row.p95Us.toFixed(2), 10) +
    padLeft(String(row.events), 9)
  );
}

async function measureSnapshotSave(rowCount, queryCount, runs) {
  const snapshot = seedCache(rowCount, queryCount).extract();
  const samples = [];
  for (let run = 0; run < runs; run++) {
    const storage = createStorage('save-' + run);
    const start = performance.now();
    await storage.save(snapshot);
    samples.push((performance.now() - start) * 1000);
    await storage.destroy();
  }
  return summarize('idb snapshot save', samples, runs);
}

async function measureSnapshotLoad(rowCount, queryCount, runs) {
  const snapshot = seedCache(rowCount, queryCount).extract();
  const storage = createStorage('load');
  await storage.save(snapshot);
  const samples = [];
  for (let run = 0; run < runs; run++) {
    const start = performance.now();
    await storage.load();
    samples.push((performance.now() - start) * 1000);
  }
  await storage.destroy();
  return summarize('idb snapshot load', samples, runs);
}

async function measurePersistenceFlush(rowCount, queryCount, runs) {
  const cache = seedCache(rowCount, queryCount);
  const storage = createStorage('flush');
  const persistence = persistQueryCache(cache, storage, { debounceMs: 1000000 });
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const page = i % queryCount;
    const id = 'Todo:' + String(((page * 31) % rowCount) + (i & 31));
    cache.modifyEntity(id, (todo) => ({ ...todo, persisted: Number(todo.persisted || 0) + 1 }));
    const start = performance.now();
    await persistence.flush();
    samples.push((performance.now() - start) * 1000);
  }
  const stats = persistence.getStats();
  persistence.dispose();
  await storage.destroy();
  return summarize('idb persistence flush', samples, stats.saves);
}

async function measureChangeLogAppend(runs) {
  const storage = createStorage('change-log-append', { maxLogEntries: runs + 1 });
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await storage.appendChange({
      seq: i + 1,
      type: 'query',
      key: ['todos', { page: i & 15 }],
      hash: 'h' + (i & 15),
      patchOperations: 1,
      updatedAt: i
    });
    samples.push((performance.now() - start) * 1000);
  }
  await storage.destroy();
  return summarize('idb change-log append', samples, runs);
}

async function measureChangeLogRead(runs) {
  const storage = createStorage('change-log-read', { maxLogEntries: 512 });
  for (let i = 0; i < 256; i++) {
    await storage.appendChange({
      seq: i + 1,
      type: 'entity',
      entityId: 'Todo:' + String(i & 31),
      patchOperations: 1,
      updatedAt: i
    });
  }
  const samples = [];
  let entries = 0;
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    const batch = await storage.readChangeLog({ sinceSeq: i & 127, limit: 16 });
    samples.push((performance.now() - start) * 1000);
    entries += batch.length;
  }
  await storage.destroy();
  return summarize('idb change-log read', samples, entries);
}

async function measureReplayHydrate(rowCount, queryCount, runs) {
  const storage = await createReplayStorage('replay-hydrate', rowCount, queryCount, Math.max(16, Math.min(64, queryCount)));
  const samples = [];
  let replayedChanges = 0;
  for (let i = 0; i < runs; i++) {
    const cache = createQueryCache({ now: () => i });
    const persistence = persistQueryCache(cache, storage, {
      replayChangeLog: true,
      debounceMs: 1000000
    });
    const start = performance.now();
    const hydrated = await persistence.hydrate();
    samples.push((performance.now() - start) * 1000);
    if (!hydrated || cache.getQueryData(['todos', { page: 0 }]) === undefined) {
      throw new Error('state-cache IDB replay hydrate fixture did not hydrate');
    }
    replayedChanges += persistence.getStats().replayedChanges;
    persistence.dispose();
  }
  await storage.destroy();
  return summarize('idb replay hydrate', samples, replayedChanges);
}

async function measureClear(runs) {
  const snapshot = seedCache(256, 8).extract();
  const samples = [];
  for (let run = 0; run < runs; run++) {
    const storage = createStorage('clear-' + run);
    await storage.save(snapshot);
    const start = performance.now();
    await storage.clear();
    samples.push((performance.now() - start) * 1000);
    await storage.destroy();
  }
  return summarize('idb snapshot clear', samples, runs);
}

async function createReplayStorage(name, rowCount, queryCount, mutations) {
  const storage = createStorage(name, { maxLogEntries: mutations * 3 });
  const source = seedCache(rowCount, queryCount);
  const persistence = persistQueryCache(source, storage, {
    compactOnFlush: true,
    debounceMs: 1000000
  });
  await persistence.flush();
  const baselineWrites = persistence.getStats().changeLogWrites;
  for (let i = 0; i < mutations; i++) {
    const page = i % queryCount;
    const id = 'Todo:' + String(((page * 31) % rowCount) + (i & 31));
    source.modifyEntity(id, (todo) => ({
      ...todo,
      revision: Number(todo.revision || 0) + 1
    }));
  }
  await waitForChangeLogFlush(persistence, baselineWrites);
  persistence.dispose();
  return storage;
}

async function waitForChangeLogFlush(persistence, baselineWrites) {
  const deadline = performance.now() + 10000;
  while (performance.now() < deadline) {
    const stats = persistence.getStats();
    if (stats.changeLogWrites > baselineWrites && stats.changeLogWrites === stats.changes) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error('Timed out waiting for persistence change log flush');
}

function createStorage(name, options = {}) {
  return createQueryCacheIndexedDbStorageAdapter({
    databaseName: 'frontier-idb-bench-' + name,
    indexedDB: createFakeIndexedDB(),
    ...options
  });
}

function seedCache(rowCount, queryCount) {
  const cache = createQueryCache();
  for (let i = 0; i < queryCount; i++) {
    const offset = (i * 31) % rowCount;
    cache.writeQuery(['todos', { page: i }], makeTodos(offset, 32));
  }
  return cache;
}

function makeTodos(offset, count) {
  const rows = new Array(count);
  for (let i = 0; i < count; i++) {
    const id = offset + i;
    rows[i] = {
      __typename: 'Todo',
      id: String(id),
      group: 'g' + (id & 7),
      text: 'todo-' + id,
      done: (id & 1) === 0,
      revision: 0
    };
  }
  return rows;
}

function summarize(fixture, samples, events) {
  samples.sort((left, right) => left - right);
  return {
    fixture,
    medianUs: percentile(samples, 0.5),
    p95Us: percentile(samples, 0.95),
    events
  };
}

function percentile(samples, point) {
  return samples[Math.min(samples.length - 1, Math.max(0, Math.ceil(samples.length * point) - 1))];
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--rounds') out.rounds = argv[++i];
    else if (arg === '--rows') out.rows = argv[++i];
    else if (arg === '--queries') out.queries = argv[++i];
    else if (arg === '--iterations') out.iterations = argv[++i];
    else throw new Error('unknown argument: ' + arg);
  }
  return out;
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function padRight(value, width) {
  return String(value).padEnd(width, ' ');
}

function padLeft(value, width) {
  return String(value).padStart(width, ' ');
}
