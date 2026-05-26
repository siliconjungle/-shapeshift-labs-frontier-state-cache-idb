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

function createStorage(name) {
  return createQueryCacheIndexedDbStorageAdapter({
    databaseName: 'frontier-idb-bench-' + name,
    indexedDB: createFakeIndexedDB()
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
