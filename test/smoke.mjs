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
    databaseName: 'frontier-idb-smoke-basic',
    indexedDB,
    now: () => 10
  });
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

console.log('frontier state-cache-idb smoke passed');
