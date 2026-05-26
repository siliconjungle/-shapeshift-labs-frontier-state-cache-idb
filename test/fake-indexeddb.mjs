export function createFakeIndexedDB() {
  const databases = new Map();
  return {
    open(name, version) {
      const request = createRequest();
      setTimeout(() => {
        let state = databases.get(name);
        const nextVersion = version === undefined ? state?.version || 1 : Math.floor(version);
        const needsUpgrade = state === undefined || nextVersion > state.version;
        if (state === undefined) {
          state = { name, version: nextVersion, stores: new Map() };
          databases.set(name, state);
        } else if (needsUpgrade) {
          state.version = nextVersion;
        }
        const db = createDatabase(state);
        request.result = db;
        if (needsUpgrade && typeof request.onupgradeneeded === 'function') {
          request.onupgradeneeded({ target: request, oldVersion: 0, newVersion: nextVersion });
        }
        if (typeof request.onsuccess === 'function') request.onsuccess({ target: request });
      }, 0);
      return request;
    },
    deleteDatabase(name) {
      const request = createRequest();
      setTimeout(() => {
        databases.delete(name);
        if (typeof request.onsuccess === 'function') request.onsuccess({ target: request });
      }, 0);
      return request;
    }
  };
}

function createDatabase(state) {
  return {
    name: state.name,
    version: state.version,
    objectStoreNames: createNameList(state),
    onversionchange: null,
    createObjectStore(name, options = {}) {
      if (state.stores.has(name)) throw new Error('object store already exists');
      const store = { keyPath: options.keyPath || null, records: new Map() };
      state.stores.set(name, store);
      this.objectStoreNames = createNameList(state);
      return createObjectStore(store, null);
    },
    transaction(name) {
      const store = state.stores.get(name);
      if (!store) throw new Error('missing object store: ' + name);
      return createTransaction(store);
    },
    close() {}
  };
}

function createNameList(state) {
  const names = Array.from(state.stores.keys());
  const list = {
    length: names.length,
    contains(name) {
      return names.includes(name);
    },
    item(index) {
      return names[index] || null;
    }
  };
  for (let index = 0; index < names.length; index++) list[index] = names[index];
  return list;
}

function createTransaction(store) {
  const transaction = {
    error: null,
    oncomplete: null,
    onerror: null,
    onabort: null,
    objectStore() {
      return createObjectStore(store, transaction);
    }
  };
  return transaction;
}

function createObjectStore(store, transaction) {
  return {
    get(key) {
      return finishRequest(transaction, clone(store.records.get(key)));
    },
    put(value) {
      const key = store.keyPath === null ? value.key : value[store.keyPath];
      store.records.set(key, clone(value));
      return finishRequest(transaction, key);
    },
    delete(key) {
      store.records.delete(key);
      return finishRequest(transaction, undefined);
    },
    clear() {
      store.records.clear();
      return finishRequest(transaction, undefined);
    }
  };
}

function finishRequest(transaction, result) {
  const request = createRequest();
  setTimeout(() => {
    request.result = result;
    if (typeof request.onsuccess === 'function') request.onsuccess({ target: request });
    if (transaction && typeof transaction.oncomplete === 'function') {
      setTimeout(() => transaction.oncomplete({ target: transaction }), 0);
    }
  }, 0);
  return request;
}

function createRequest() {
  return {
    result: undefined,
    error: null,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    onblocked: null
  };
}

function clone(value) {
  if (value === undefined) return undefined;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
