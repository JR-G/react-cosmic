import { useSyncExternalStore, useCallback } from "react";
import { useOrbitStore } from "../provider.tsx";

/**
 * Hook that returns whether the WebSocket circuit breaker has tripped.
 *
 * The circuit breaker opens after a configured number of consecutive connection
 * failures to prevent reconnection spam when a server is down. Once open,
 * the app continues working with local persistence and tab sync.
 *
 * @returns true if the circuit is open (reconnection has stopped)
 *
 * @example
 * ```typescript
 * function App() {
 *   const status = useOrbitStatus();
 *   const circuitOpen = useOrbitCircuit();
 *
 *   if (circuitOpen) {
 *     return <Banner>Working offline — server unreachable</Banner>;
 *   }
 *
 *   return <div>Status: {status}</div>;
 * }
 * ```
 *
 * @remarks
 * Only relevant when websocketUrl is configured in OrbitProvider.
 * Always returns false if WebSockets are not enabled.
 */
export function useOrbitCircuit(): boolean {
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

  const getSnapshot = useCallback(() => store.isCircuitOpen(), [store]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
