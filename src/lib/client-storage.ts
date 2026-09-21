'use client';

// Lightweight, zero-dependency browser IndexedDB storage layer for 100% private, client-side persistence

const DB_NAME = 'CryptoTrackLocalDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getClientDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser environments.'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('trades')) {
          db.createObjectStore('trades', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('transfers')) {
          db.createObjectStore('transfers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('balances')) {
          db.createObjectStore('balances', { keyPath: 'asset' });
        }
        if (!db.objectStoreNames.contains('futures')) {
          db.createObjectStore('futures', { keyPath: 'symbol' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}

// -------------------------------------------------------------
// Generic Helpers
// -------------------------------------------------------------
async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await getClientDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function bulkPutToStore<T>(storeName: string, items: T[]): Promise<void> {
  if (!items || items.length === 0) return;
  const db = await getClientDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// -------------------------------------------------------------
// Trades
// -------------------------------------------------------------
export async function getStoredTrades(): Promise<any[]> {
  try {
    return await getAllFromStore('trades');
  } catch {
    return [];
  }
}

export async function saveStoredTrades(trades: any[]): Promise<void> {
  return bulkPutToStore('trades', trades);
}

// -------------------------------------------------------------
// Transfers
// -------------------------------------------------------------
export async function getStoredTransfers(): Promise<any[]> {
  try {
    return await getAllFromStore('transfers');
  } catch {
    return [];
  }
}

export async function saveStoredTransfers(transfers: any[]): Promise<void> {
  return bulkPutToStore('transfers', transfers);
}

// -------------------------------------------------------------
// Balances & Positions
// -------------------------------------------------------------
export async function getStoredBalances(): Promise<any[]> {
  try {
    return await getAllFromStore('balances');
  } catch {
    return [];
  }
}

export async function saveStoredBalances(balances: any[]): Promise<void> {
  return bulkPutToStore('balances', balances);
}

export async function getStoredFutures(): Promise<any[]> {
  try {
    return await getAllFromStore('futures');
  } catch {
    return [];
  }
}

export async function saveStoredFutures(positions: any[]): Promise<void> {
  return bulkPutToStore('futures', positions);
}

// -------------------------------------------------------------
// Key-Value Settings
// -------------------------------------------------------------
export async function getStoredSetting(key: string): Promise<string | null> {
  try {
    const db = await getClientDb();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setStoredSetting(key: string, value: string): Promise<void> {
  const db = await getClientDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    store.put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// -------------------------------------------------------------
// Cached Calculated Portfolio
// -------------------------------------------------------------
export async function getCachedPortfolio(): Promise<any | null> {
  try {
    const db = await getClientDb();
    return new Promise((resolve) => {
      const tx = db.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');
      const req = store.get('portfolio_overview');
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedPortfolio(data: any): Promise<void> {
  const db = await getClientDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    store.put({ id: 'portfolio_overview', data, updated_at: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// -------------------------------------------------------------
// Database Stats & Clear
// -------------------------------------------------------------
export async function getClientStorageStats(): Promise<{
  tradesCount: number;
  transfersCount: number;
  hasApiKey: boolean;
  lastSyncedAt: string | null;
}> {
  try {
    const [trades, transfers, apiKey, lastSync] = await Promise.all([
      getStoredTrades(),
      getStoredTransfers(),
      getStoredSetting('binance_api_key'),
      getStoredSetting('last_synced_at'),
    ]);

    return {
      tradesCount: trades.length,
      transfersCount: transfers.length,
      hasApiKey: !!apiKey,
      lastSyncedAt: lastSync,
    };
  } catch {
    return {
      tradesCount: 0,
      transfersCount: 0,
      hasApiKey: false,
      lastSyncedAt: null,
    };
  }
}

export async function clearClientStorage(): Promise<void> {
  const db = await getClientDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['trades', 'transfers', 'balances', 'futures', 'cache'], 'readwrite');
    tx.objectStore('trades').clear();
    tx.objectStore('transfers').clear();
    tx.objectStore('balances').clear();
    tx.objectStore('futures').clear();
    tx.objectStore('cache').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// -------------------------------------------------------------
// Client-Side Backup & Restore
// -------------------------------------------------------------
export async function exportClientBackup(): Promise<any> {
  const [trades, transfers, balances, futures] = await Promise.all([
    getStoredTrades(),
    getStoredTransfers(),
    getStoredBalances(),
    getStoredFutures(),
  ]);

  const cachedPortfolio = await getCachedPortfolio();

  return {
    app: 'CryptoTrack',
    version: 1,
    exportedAt: new Date().toISOString(),
    dataset: {
      trades,
      transfers,
      balances,
      futures,
    },
    cachedPortfolio,
    stats: {
      tradesCount: trades.length,
      transfersCount: transfers.length,
      balancesCount: balances.length,
      futuresCount: futures.length,
    },
  };
}

export async function restoreClientBackup(backupPayload: any): Promise<void> {
  if (!backupPayload || !backupPayload.dataset) {
    throw new Error('Invalid backup file format: missing dataset.');
  }

  const { trades = [], transfers = [], balances = [], futures = [] } = backupPayload.dataset;

  await Promise.all([
    saveStoredTrades(trades),
    saveStoredTransfers(transfers),
    saveStoredBalances(balances),
    saveStoredFutures(futures),
  ]);

  if (backupPayload.cachedPortfolio) {
    await setCachedPortfolio(backupPayload.cachedPortfolio);
  }
}
