import { useCallback, useMemo, useSyncExternalStore, useRef } from "react";
import { useOrbitStore } from "../provider.tsx";

/**
 * Hook to access the awareness state of all connected clients.
 *
 * Provides a real-time view of user presence data (e.g., names, cursors, status)
 * shared via the WebSocket provider's awareness protocol.
 *
 * This hook is optimized for performance through an optional `selector` function.
 * By providing a selector, you can ensure your component only re-renders when
 * the specific slice of awareness state you care about changes.
 *
 * @template T - The type of the awareness state object (e.g., { name: string, color: string })
 * @template S - The type of the selected value returned by the selector
 * @param selector - Optional function to select a subset of awareness state. Receives a Map of client IDs to states.
 * @returns The selected awareness state.
 *
 * @example
 * ```typescript
 * // Get all users (re-renders on any change)
 * const users = useOrbitAwareness<UserPresence>();
 *
 * // Get only the number of online users (only re-renders on join/leave)
 * const userCount = useOrbitAwareness(states => states.size);
 *
 * // Get a specific user's status
 * const isAliceOnline = useOrbitAwareness(states => states.has(aliceClientId));
 * ```
 */
export function useOrbitAwareness<T = any, S = Map<number, T>>(
    selector?: (states: Map<number, T>) => S
): S {
    const store = useOrbitStore();
    const provider = useMemo(() => store.getWebSocketProvider(), [store]);

    const statesSnapshotRef = useRef<Map<number, T>>(new Map());
    const lastProviderRef = useRef(provider);

    if (lastProviderRef.current !== provider || (provider && statesSnapshotRef.current.size === 0)) {
        lastProviderRef.current = provider;
        statesSnapshotRef.current = new Map(provider?.awareness?.getStates() || []) as Map<number, T>;
    }

    const subscribe = useCallback(
        (callback: () => void) => {
            if (!provider || !provider.awareness) return () => { };

            const handleUpdate = () => {
                statesSnapshotRef.current = new Map(provider.awareness!.getStates() as Map<number, T>);
                callback();
            };

            provider.awareness.on("change", handleUpdate);
            return () => provider.awareness.off("change", handleUpdate);
        },
        [provider]
    );

    const getSnapshot = useCallback(() => {
        const states = statesSnapshotRef.current;
        return selector ? selector(states) : (states as unknown as S);
    }, [selector]);

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
