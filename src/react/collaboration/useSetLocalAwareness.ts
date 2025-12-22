import { useEffect } from "react";
import { useOrbitStore } from "../provider.tsx";

/**
 * Hook to set your local awareness state that other connected clients can see.
 *
 * Automatically broadcasts your presence data (like name, cursor position, status)
 * to all connected clients via the WebSocket provider's awareness protocol.
 * Cleans up on unmount.
 *
 * @template T - The type of the awareness state object
 * @param state - Your local presence state to broadcast, or undefined to clear
 *
 * @example
 * ```typescript
 * interface UserPresence {
 *   name: string;
 *   color: string;
 *   cursor?: number;
 * }
 *
 * function MyComponent() {
 *   const [profile] = useOrbit<UserPresence>('profile', {
 *     name: 'Alice',
 *     color: '#ff0000'
 *   });
 *
 *   useSetLocalAwareness(profile);
 *
 *   return <div>Your name: {profile.name}</div>;
 * }
 * ```
 *
 * @remarks
 * Only works when websocketUrl is configured in OrbitProvider.
 * Does nothing if WebSockets are not enabled.
 */
export function useSetLocalAwareness<T>(field: string, state: T | undefined): void {
  const store = useOrbitStore();

  useEffect(() => {
    const provider = store.getWebSocketProvider();
    if (!provider?.awareness) {
      return;
    }

    provider.awareness.setLocalStateField(field, state);

    return () => {
      provider.awareness.setLocalStateField(field, null);
    };
  }, [store, field, state]);
}
