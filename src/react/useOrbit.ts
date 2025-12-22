import { useSyncExternalStore, useCallback, useMemo, useRef, useEffect } from "react";
import type { OrbitValue } from "../core/types.ts";
import { useOrbitStore } from "./provider.tsx";

/**
 * Hook for managing persistent, synchronized state.
 *
 * Similar to useState, but state is automatically persisted to IndexedDB
 * and synchronized across browser tabs. Perfect for form inputs, preferences,
 * and any component state that should survive page refreshes.
 *
 * @template T - The type of the state value
 * @param key - Unique key for this state value
 * @param initialValue - Default value if no persisted state exists
 * @returns Tuple of [value, setValue] matching useState API
 *
 * @example
 * ```typescript
 * function MyForm() {
 *   const [name, setName] = useOrbit("userName", "");
 *   const [age, setAge] = useOrbit("userAge", 0);
 *
 *   return (
 *     <form>
 *       <input
 *         value={name}
 *         onChange={(e) => setName(e.target.value)}
 *       />
 *       <input
 *         type="number"
 *         value={age}
 *         onChange={(e) => setAge(Number(e.target.value))}
 *       />
 *     </form>
 *   );
 * }
 * ```
 */
export function useOrbit<T extends OrbitValue>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const store = useOrbitStore();
  const map = useMemo(() => store.getMap("orbit-state"), [store]);

  const subscribe = useCallback(
    (callback: () => void) => {
      const observer = (event: any) => {
        if (event.keysChanged.has(key)) {
          callback();
        }
      };
      map.observe(observer);
      return () => {
        map.unobserve(observer);
      };
    },
    [map, key]
  );

  const initialRef = useRef(initialValue);
  useEffect(() => {
    initialRef.current = initialValue;
  }, [initialValue]);

  const getSnapshot = useCallback(() => {
    const existing = map.get(key);
    return (existing !== undefined ? existing : initialRef.current) as T;
  }, [map, key]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setOrbitValue = useCallback(
    (newValue: T) => {
      map.set(key, newValue);
    },
    [map, key]
  );

  return [value, setOrbitValue];
}
