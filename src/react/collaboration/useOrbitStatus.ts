import { useSyncExternalStore, useCallback } from "react";
import { useOrbitStore } from "../provider.tsx";

/**
 * Hook to track the current WebSocket connection status.
 *
 * Returns the real-time connection state of the WebSocket provider.
 * Useful for showing connection indicators in collaborative applications.
 *
 * @returns Current connection status
 *
 * @example
 * ```typescript
 * function ConnectionStatus() {
 *   const status = useOrbitStatus();
 *   const colors = {
 *     connected: 'green',
 *     connecting: 'yellow',
 *     disconnected: 'red'
 *   };
 *
 *   return (
 *     <div style={{ color: colors[status] }}>
 *       {status}
 *     </div>
 *   );
 * }
 * ```
 *
 * @remarks
 * Only works when websocketUrl is configured in OrbitProvider.
 * Returns 'disconnected' if WebSockets are not enabled.
 */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export function useOrbitStatus(): ConnectionStatus {
  const store = useOrbitStore();

  const subscribe = useCallback(
    (callback: () => void) => {
      store.onStatusChange(callback);
      return () => {
        store.offStatusChange(callback);
      };
    },
    [store]
  );

  const getSnapshot = useCallback(() => store.getStatus(), [store]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
