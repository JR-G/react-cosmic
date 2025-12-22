import type { StorageAdapter } from "../types.ts";

const DB_NAME = "orbit-storage";
const STORE_NAME = "documents";
const DB_VERSION = 1;

/**
 * IndexedDB implementation of the StorageAdapter interface.
 * Provides persistent storage for CRDT document state in the browser.
 *
 * Uses IndexedDB for reliable, asynchronous storage with larger quota
 * than localStorage. Automatically handles database initialization and
 * cleanup.
 *
 * @example
 * ```typescript
 * const storage = new IndexedDBAdapter();
 * await storage.save("doc-1", stateData);
 * const loaded = await storage.load("doc-1");
 * ```
 */
export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initializes the IndexedDB database and object store.
   * Creates the database and store if they don't exist.
   *
   * @returns Promise resolving to the initialized database
   */
  private async init(): Promise<IDBDatabase> {
    if (this.db !== null) {
      return this.db;
    }

    if (this.initPromise !== null) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });

    return this.initPromise;
  }

  async load(documentId: string): Promise<Uint8Array | null> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(documentId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result instanceof Uint8Array ? result : null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to load document: ${documentId}`));
      };
    });
  }

  async save(documentId: string, state: Uint8Array): Promise<void> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(state, documentId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to save document: ${documentId}`));
      };
    });
  }

  async delete(documentId: string): Promise<void> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(documentId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete document: ${documentId}`));
      };
    });
  }

  async dispose(): Promise<void> {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}
