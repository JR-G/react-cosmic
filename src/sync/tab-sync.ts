import * as Y from "yjs";
import type { SyncMessage } from "./types.ts";

/**
 * Manages cross-tab synchronization using BroadcastChannel.
 *
 * Broadcasts Yjs updates to other tabs and applies received updates
 * to the local document, enabling real-time multi-tab collaboration.
 *
 * @example
 * ```typescript
 * const tabSync = new TabSync(storeId, ydoc);
 * tabSync.init();
 * ```
 */
export class TabSync {
  private channel: BroadcastChannel;
  private ydoc: Y.Doc;
  private storeId: string;
  private updateHandler: ((update: Uint8Array, origin: unknown) => void) | null = null;

  constructor(storeId: string, ydoc: Y.Doc) {
    this.storeId = storeId;
    this.ydoc = ydoc;
    this.channel = new BroadcastChannel(`orbit-${storeId}`);
  }

  /**
   * Initializes tab synchronization.
   * Sets up listeners for local updates and remote messages.
   */
  init(): void {
    this.updateHandler = (update: Uint8Array, origin: unknown) => {
      if (origin !== this) {
        this.broadcastUpdate(update);
      }
    };

    this.ydoc.on("update", this.updateHandler);

    this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const message = event.data;
      if (message.type === "update" && message.storeId === this.storeId) {
        Y.applyUpdate(this.ydoc, message.update, this);
      }
    };
  }

  /**
   * Broadcasts an update to other tabs.
   *
   * @param update - Binary CRDT update to broadcast
   */
  private broadcastUpdate(update: Uint8Array): void {
    const message: SyncMessage = {
      type: "update",
      storeId: this.storeId,
      update,
    };
    this.channel.postMessage(message);
  }

  /**
   * Cleans up the tab sync by closing the channel and removing listeners.
   */
  dispose(): void {
    if (this.updateHandler !== null) {
      this.ydoc.off("update", this.updateHandler);
      this.updateHandler = null;
    }
    this.channel.close();
  }
}
