const DB_NAME = 'ta-rss-railway';
const DB_VERSION = 1;

export const STORES = [
  'settings',
  'rssSources',
  'articles',
  'categories',
  'blacklist',
  'scoreCache',
  'selections',
  'exports'
];

const defaultCategories = [
  {
    id: 'yapay-zeka',
    name: 'Yapay Zeka',
    priority: 'high',
    color: '#8b5cf6',
    keywords: ['AI', 'yapay zeka', 'Gemini', 'OpenAI', 'LLM']
  },
  {
    id: 'otomasyon',
    name: 'Yapay Zeka ile Otomasyon',
    priority: 'medium',
    color: '#3b82f6',
    keywords: ['automation', 'otomasyon', 'AI agents', 'workflow']
  }
];

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const storeName of STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll(storeName) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  return requestToPromise(tx.objectStore(storeName).getAll());
}

export async function putItem(storeName, item) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put(item);
  await transactionDone(tx);
  return item;
}

export async function deleteItem(storeName, id) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(id);
  await transactionDone(tx);
}

export async function clearStore(storeName) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).clear();
  await transactionDone(tx);
}

export async function countStore(storeName) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  return requestToPromise(tx.objectStore(storeName).count());
}

export async function seedDefaults() {
  const settingsCount = await countStore('settings');
  if (settingsCount === 0) {
    await putItem('settings', {
      id: 'app',
      bulletinTitle: 'TA RSS Bulteni',
      introText: 'Secilmis icerikler ve haftanin one cikan gelismeleri.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  const categoryCount = await countStore('categories');
  if (categoryCount === 0) {
    for (const category of defaultCategories) {
      await putItem('categories', {
        ...category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  const blacklistCount = await countStore('blacklist');
  if (blacklistCount === 0) {
    await putItem('blacklist', {
      id: 'default',
      competitors: [],
      banned: [],
      topics: [],
      updatedAt: new Date().toISOString()
    });
  }
}

export async function exportData() {
  const snapshot = {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'ta-rss-railway',
    stores: {}
  };

  for (const storeName of STORES) {
    snapshot.stores[storeName] = await getAll(storeName);
  }

  return snapshot;
}

export async function importData(snapshot) {
  if (!snapshot || snapshot.app !== 'ta-rss-railway' || !snapshot.stores) {
    throw new Error('Gecersiz yedek dosyasi');
  }

  for (const storeName of STORES) {
    if (!Array.isArray(snapshot.stores[storeName])) {
      continue;
    }
    await clearStore(storeName);
    for (const item of snapshot.stores[storeName]) {
      await putItem(storeName, item);
    }
  }

  await seedDefaults();
}

export async function resetData() {
  for (const storeName of STORES) {
    await clearStore(storeName);
  }
  await seedDefaults();
}
