import assert from 'node:assert';
import {
  createQueryCache,
  persistQueryCache
} from '@shapeshift-labs/frontier-state-cache';
import { createQueryCacheIndexedDbStorageAdapter } from '../dist/index.js';
import { createFakeIndexedDB } from './fake-indexeddb.mjs';

{
  const indexedDB = createFakeIndexedDB();
  const storage = createQueryCacheIndexedDbStorageAdapter({
    name: 'frontier-idb-smoke-basic',
    indexedDB,
    now: () => 10
  });
  assert.strictEqual(storage.databaseName, 'frontier-idb-smoke-basic');
  const snapshot = {
    entities: {
      'Todo:1': { __typename: 'Todo', id: '1', text: 'saved' }
    },
    queries: []
  };

  assert.strictEqual(await storage.load(), null);
  await storage.save(snapshot);
  snapshot.entities['Todo:1'].text = 'mutated';

  const loaded = await storage.load();
  assert.strictEqual(loaded.entities['Todo:1'].text, 'saved');
  loaded.entities['Todo:1'].text = 'mutated-again';
  assert.strictEqual((await storage.load()).entities['Todo:1'].text, 'saved');

  await storage.clear();
  assert.strictEqual(await storage.load(), null);
  await storage.destroy();
}

{
  const indexedDB = createFakeIndexedDB();
  const source = createQueryCache({ now: () => 20 });
  const storage = createQueryCacheIndexedDbStorageAdapter({
    databaseName: 'frontier-idb-smoke-persist',
    indexedDB
  });
  const persistence = persistQueryCache(source, storage, { debounceMs: 1000 });

  source.writeQuery(['todos'], [
    { __typename: 'Todo', id: '1', text: 'ship', done: false }
  ]);
  await persistence.flush();

  source.modifyEntity('Todo:1', (todo) => ({ ...todo, text: 'draft' }));
  assert.strictEqual((await storage.load()).queries[0].value[0].text, 'ship');
  await persistence.flush();
  assert.strictEqual((await storage.load()).queries[0].value[0].text, 'draft');

  const restored = createQueryCache();
  const restoredPersistence = persistQueryCache(restored, storage);
  assert.strictEqual(await restoredPersistence.hydrate(), true);
  assert.deepStrictEqual(restored.getQueryData(['todos']), [
    { __typename: 'Todo', id: '1', text: 'draft', done: false }
  ]);

  await restoredPersistence.clear();
  assert.strictEqual(await storage.load(), null);

  persistence.dispose();
  restoredPersistence.dispose();
  await storage.destroy();
}

{
  const indexedDB = createFakeIndexedDB();
  const storage = createQueryCacheIndexedDbStorageAdapter({
    databaseName: 'frontier-idb-smoke-changelog',
    indexedDB,
    maxLogEntries: 3,
    now: () => 30
  });

  await storage.appendChange({ seq: 1, type: 'query', key: ['todos'], hash: 'a', patchOperations: 1, stale: false, updatedAt: 1 });
  await storage.appendChange({ seq: 2, type: 'entity', entityId: 'Todo:1', patchOperations: 1 });
  await storage.appendChange({ seq: 3, type: 'invalidate', hash: 'a' });
  await storage.appendChange({ seq: 4, type: 'clear' });

  assert.deepStrictEqual((await storage.readChangeLog()).map((entry) => entry.seq), [2, 3, 4]);
  assert.deepStrictEqual((await storage.readChangeLog({ sinceSeq: 2 })).map((entry) => entry.seq), [3, 4]);
  assert.deepStrictEqual((await storage.readChangeLog({ limit: 1 })).map((entry) => entry.seq), [2]);

  const snapshot = { entities: {}, queries: [] };
  await storage.compact(snapshot);
  assert.deepStrictEqual(await storage.readChangeLog(), []);
  assert.deepStrictEqual(await storage.load(), snapshot);

  await storage.destroy();
}

{
  const indexedDB = createFakeIndexedDB();
  const source = createQueryCache({ now: () => 40 });
  const storage = createQueryCacheIndexedDbStorageAdapter({
    databaseName: 'frontier-idb-smoke-replay',
    indexedDB
  });
  const sourcePersistence = persistQueryCache(source, storage, {
    compactOnFlush: true,
    debounceMs: 1000000
  });

  source.writeQuery(['todos'], [
    { __typename: 'Todo', id: '1', text: 'ship', done: false, revision: 0 }
  ]);
  await sourcePersistence.flush();
  assert.deepStrictEqual(await storage.readChangeLog(), []);
  const baselineWrites = sourcePersistence.getStats().changeLogWrites;

  source.modifyEntity('Todo:1', (todo) => ({
    ...todo,
    done: true,
    revision: Number(todo.revision) + 1
  }));
  await waitForChangeLogFlush(sourcePersistence, baselineWrites);
  const log = await storage.readChangeLog();
  assert.ok(log.length > 0);
  sourcePersistence.dispose();

  const restored = createQueryCache();
  const restoredPersistence = persistQueryCache(restored, storage, {
    replayChangeLog: true,
    debounceMs: 1000000
  });
  assert.strictEqual(await restoredPersistence.hydrate(), true);
  assert.deepStrictEqual(restored.getQueryData(['todos']), [
    { __typename: 'Todo', id: '1', text: 'ship', done: true, revision: 1 }
  ]);
  assert.strictEqual(restoredPersistence.getStats().replayedChanges, log.length);

  restoredPersistence.dispose();
  await storage.destroy();
}

async function waitForChangeLogFlush(persistence, baselineWrites) {
  for (let i = 0; i < 50; i++) {
    const stats = persistence.getStats();
    if (stats.changeLogWrites > baselineWrites && stats.changeLogWrites === stats.changes) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('Timed out waiting for persistence change log flush');
}

console.log('frontier state-cache-idb smoke passed');
