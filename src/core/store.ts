import * as Y from "yjs";
import type { OrbitConfig, StorageAdapter, OrbitValue } from "./types.ts";

/**
 * Orbit store that manages CRDT state with automatic persistence.
 *
 * Wraps a Yjs CRDT document, providing automatic loading from storage,
 * debounced persistence on updates, and access to CRDT data structures.
 *
 * @example
 * ```typescript
 * const store = new OrbitStore({
 *   storeId: "my-app",
 *   storage: new IndexedDBAdapter()
 * });
 *
 * await store.init();
 * const map = store.getMap("state");
 * map.set("key", "value");
 * ```
 */
export class OrbitStore {
  private ydoc: Y.Doc;
  private storage?: StorageAdapter;
  private persistDebounceMs: number;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;

  readonly storeId: string;

  constructor(config: OrbitConfig) {
    this.storeId = config.storeId;
    this.storage = config.storage;
    this.persistDebounceMs = config.persistDebounceMs ?? 300;
    this.ydoc = new Y.Doc();

    if (this.storage !== undefined) {
      this.ydoc.on("update", this.handleUpdate.bind(this));
    }
  }

  /**
   * Initializes the store by loading persisted state from storage.
   * Must be called before using the store.
   *
   * @returns Promise that resolves when initialization is complete
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.storage !== undefined) {
      const state = await this.storage.load(this.storeId);
      if (state !== null) {
        Y.applyUpdate(this.ydoc, state);
      }
    }

    this.initialized = true;
  }

  /**
   * Gets or creates a Yjs Map at the specified key.
   * Maps store key-value pairs with CRDT conflict resolution.
   *
   * @param name - The name/key of the map
   * @returns Yjs Map instance
   */
  getMap(name: string): Y.Map<OrbitValue> {
    return this.ydoc.getMap(name);
  }

  /**
   * Gets or creates a Yjs Text at the specified key.
   * Text provides collaborative text editing with CRDT semantics.
   *
   * @param name - The name/key of the text
   * @returns Yjs Text instance
   */
  getText(name: string): Y.Text {
    return this.ydoc.getText(name);
  }

  /**
   * Gets or creates a Yjs Array at the specified key.
   * Arrays provide ordered lists with CRDT conflict resolution.
   *
   * @param name - The name/key of the array
   * @returns Yjs Array instance
   */
  getArray(name: string): Y.Array<OrbitValue> {
    return this.ydoc.getArray(name);
  }

  /**
   * Gets the underlying Yjs document instance.
   * Useful for advanced operations or integrations.
   *
   * @returns The Yjs Doc instance
   * @internal
   */
  getYDoc(): Y.Doc {
    return this.ydoc;
  }

  /**
   * Handles updates by scheduling a debounced persist operation.
   */
  private handleUpdate(): void {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
    }

    this.persistTimer = setTimeout(() => {
      this.persist();
    }, this.persistDebounceMs);
  }

  /**
   * Immediately persists the current state to storage.
   *
   * @returns Promise that resolves when persist is complete
   */
  async persist(): Promise<void> {
    if (this.storage === undefined) {
      return;
    }

    const state = Y.encodeStateAsUpdate(this.ydoc);
    await this.storage.save(this.storeId, state);
  }

  /**
   * Cleans up the store and storage adapter.
   * Flushes any pending updates before closing.
   *
   * @returns Promise that resolves when cleanup is complete
   */
  async dispose(): Promise<void> {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }

    await this.persist();

    this.ydoc.destroy();

    if (this.storage !== undefined) {
      await this.storage.dispose();
    }

    this.initialized = false;
  }
}
