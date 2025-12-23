import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { OrbitConfig, StorageAdapter, OrbitValue } from "./types.ts";
import { TabSync } from "../sync/tab-sync.ts";

/**
 * Orbit store that manages CRDT state with automatic persistence.
 *
 * Wraps a Yjs CRDT document that handles all conflict resolution automatically.
 * The CRDT powers tab sync, WebSocket sync across devices, and offline/online
 * scenarios. Changes merge intelligently without losing data or requiring
 * manual conflict resolution.
 *
 * @remarks
 * Most users should use OrbitProvider and the hooks instead of working
 * with OrbitStore directly. This class is exported for advanced use cases.
 *
 * @example
 * Basic usage with local persistence and tab sync:
 * ```typescript
 * const store = new OrbitStore({
 *   storeId: "my-app",
 *   storage: new IndexedDBAdapter()
 * });
 *
 * await store.init();
 *
 * const map = store.getMap("orbit-state");
 * map.set("key", "value");
 * ```
 *
 * @example
 * With WebSocket collaboration and custom circuit breaker:
 * ```typescript
 * const store = new OrbitStore({
 *   storeId: "my-app",
 *   storage: new IndexedDBAdapter(),
 *   websocketUrl: "ws://localhost:1234",
 *   websocketOptions: {
 *     maxFailures: 5 // Allow 5 failures before stopping
 *   }
 * });
 *
 * await store.init();
 * const provider = store.getWebSocketProvider();
 * ```
 *
 * @remarks
 * The store includes a "Circuit Breaker" for WebSockets. If the connection fails
 * consecutively more than `maxFailures` times, it will stop attempting to
 * reconnect to save resources. The app will continue to work offline with
 * local and tab-based synchronization.
 */
export class OrbitStore {
  private ydoc: Y.Doc;
  private storage?: StorageAdapter;
  private tabSync?: TabSync;
  private websocketProvider?: WebsocketProvider;
  private persistDebounceMs: number;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;
  private websocketFailures = 0;
  private readonly maxWebsocketFailures: number;

  readonly storeId: string;

  constructor(config: OrbitConfig) {
    this.storeId = config.storeId;
    this.storage = config.storage;
    this.persistDebounceMs = config.persistDebounceMs ?? 300;
    this.maxWebsocketFailures = config.websocketOptions?.maxFailures ?? 3;
    this.ydoc = new Y.Doc();

    if (config.enableTabSync !== false) {
      this.tabSync = new TabSync(this.storeId, this.ydoc);
    }

    if (config.websocketUrl !== undefined) {
      const protocols = config.websocketOptions?.protocols;
      this.websocketProvider = new WebsocketProvider(
        config.websocketUrl,
        this.storeId,
        this.ydoc,
        {
          connect: false,
          maxBackoffTime: config.websocketOptions?.retryDelay ?? 3000,
          protocols: protocols === undefined ? undefined : Array.isArray(protocols) ? protocols : [protocols],
        }
      );

      this.setupWebSocketErrorHandlers();
    }

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

    if (this.tabSync !== undefined) {
      this.tabSync.init();
    }

    if (this.websocketProvider !== undefined) {
      this.websocketProvider.connect();
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
   * Gets the WebSocket provider if configured.
   *
   * Used for accessing the awareness API for presence features
   * or checking connection status. Returns undefined if WebSocket
   * sync is not enabled.
   *
   * @returns The WebSocket provider instance or undefined
   *
   * @example
   * ```typescript
   * const provider = store.getWebSocketProvider();
   * if (provider?.awareness) {
   *   provider.awareness.setLocalStateField('user', {
   *     name: 'Alice',
   *     color: '#ff0000'
   *   });
   * }
   * ```
   */
  getWebSocketProvider(): WebsocketProvider | undefined {
    return this.websocketProvider;
  }

  private statusListeners = new Set<(status: string) => void>();

  /**
   * Subscribes to connection status changes.
   *
   * @param listener - Callback function invoked when connection status changes
   * @remarks Most users should use the useOrbitStatus hook instead
   */
  onStatusChange(listener: (status: string) => void): void {
    this.statusListeners.add(listener);
  }

  /**
   * Unsubscribes from connection status changes.
   *
   * @param listener - The listener to remove
   */
  offStatusChange(listener: (status: string) => void): void {
    this.statusListeners.delete(listener);
  }

  /**
   * Configures WebSocket error handlers to gracefully handle connection failures.
   *
   * Limits retry attempts when the server is unavailable. After maximum failures,
   * stops attempting reconnection to avoid console spam. The app continues to work
   * with local persistence and tab sync.
   */
  private setupWebSocketErrorHandlers(): void {
    if (this.websocketProvider === undefined) {
      return;
    }

    this.websocketProvider.on("status", (event: { status: string }) => {
      if (event.status === "connected") {
        this.websocketFailures = 0;
      }
      this.statusListeners.forEach((l) => l(event.status));
    });

    this.websocketProvider.on("connection-error", () => {
      this.websocketFailures++;
      if (this.websocketFailures >= this.maxWebsocketFailures && this.websocketProvider) {
        this.websocketProvider.shouldConnect = false;
        this.websocketProvider.disconnect();
        this.statusListeners.forEach((l) => l("disconnected"));
      }
    });
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

    if (this.tabSync !== undefined) {
      this.tabSync.dispose();
    }

    if (this.websocketProvider !== undefined) {
      this.websocketProvider.disconnect();
      this.websocketProvider.destroy();
    }

    this.ydoc.destroy();

    if (this.storage !== undefined) {
      await this.storage.dispose();
    }

    this.initialized = false;
  }
}
