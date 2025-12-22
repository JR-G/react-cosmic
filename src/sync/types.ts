/**
 * Message types for cross-tab synchronization.
 */
export interface SyncMessage {
  /**
   * The type of sync message being sent.
   */
  type: "update";

  /**
   * The store ID this update belongs to.
   */
  storeId: string;

  /**
   * Binary CRDT update data to apply.
   */
  update: Uint8Array;
}
