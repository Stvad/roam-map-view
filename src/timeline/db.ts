import type { TimelineCache } from "../types";

const DB_NAME = "roam-map-view-db";
const STORE_NAME = "timeline-cache";
const CACHE_KEY = "default";

function dbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function readCache(): Promise<TimelineCache | null> {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(CACHE_KEY);
    req.onsuccess = () => {
      const val = req.result?.value ?? null;
      resolve(val);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function writeCache(cache: TimelineCache): Promise<void> {
  const db = await dbOpen();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ id: CACHE_KEY, value: cache });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
