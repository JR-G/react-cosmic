/**
 * Primitive value types that can be stored in Orbit state.
 * Includes strings, numbers, booleans, and null.
 */
export type OrbitPrimitive = string | number | boolean | null;

/**
 * Represents any JSON-serializable value that can be stored in Orbit state.
 * This includes primitives, objects, and arrays of these types.
 */
export type OrbitValue =
  | OrbitPrimitive
  | { [key: string]: OrbitValue }
  | OrbitValue[];

/**
 * Interface for storage adapters that persist CRDT document state.
 * Implementations handle the actual storage mechanism (IndexedDB, localStorage, etc).
 */
export interface StorageAdapter {
  /**
   * Loads the persisted document state for a given document ID.
   * Returns the binary state data if found, or null if no state exists.
   *
   * @param documentId - Unique identifier for the document
   * @returns Promise resolving to binary state data or null
   */
  load(documentId: string): Promise<Uint8Array | null>;

  /**
   * Persists the document state to storage.
   * Overwrites any existing state for the given document ID.
   *
   * @param documentId - Unique identifier for the document
   * @param state - Binary state data to persist
   * @returns Promise that resolves when save is complete
   */
  save(documentId: string, state: Uint8Array): Promise<void>;

  /**
   * Deletes the persisted state for a given document ID.
   * No-op if the document doesn't exist.
   *
   * @param documentId - Unique identifier for the document to delete
   * @returns Promise that resolves when deletion is complete
   */
  delete(documentId: string): Promise<void>;

  /**
   * Cleans up any resources held by the storage adapter.
   * Should be called when the adapter is no longer needed.
   *
   * @returns Promise that resolves when cleanup is complete
   */
  dispose(): Promise<void>;
}

/**
 * Configuration options for initializing an Orbit document.
 */
export interface DocumentConfig {
  /**
   * Unique identifier for this document.
   * Documents with the same ID will sync their state.
   */
  documentId: string;

  /**
   * Storage adapter instance for persisting document state.
   * If not provided, state will only exist in memory.
   */
  storage?: StorageAdapter;

  /**
   * Whether to enable cross-tab synchronization via BroadcastChannel.
   * Defaults to true. Set to false to disable tab sync.
   */
  enableTabSync?: boolean;

  /**
   * Debounce delay in milliseconds for persisting state changes.
   * Prevents excessive writes to storage on rapid updates.
   * Defaults to 300ms.
   */
  persistDebounceMs?: number;
}
