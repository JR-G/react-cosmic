import {
  useSyncExternalStore,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import type { OrbitValue } from "../core/types.ts";
import { useOrbitStore } from "./provider.tsx";

/**
 * Hook for managing nested object state with partial updates.
 *
 * Allows updating individual properties of an object without replacing
 * the entire object, with proper CRDT conflict resolution.
 *
 * @template T - The type of the object (must be a record/object)
 * @param key - Unique key for this object
 * @param initialValue - Default object if no persisted state exists
 * @returns Tuple of [object, updateObject] where updateObject accepts partial updates
 *
 * @example
 * ```typescript
 * interface UserProfile {
 *   name: string;
 *   email: string;
 *   age: number;
 * }
 *
 * function ProfileForm() {
 *   const [profile, updateProfile] = useOrbitObject<UserProfile>("profile", {
 *     name: "",
 *     email: "",
 *     age: 0,
 *   });
 *
 *   return (
 *     <form>
 *       <input
 *         value={profile.name}
 *         onChange={(e) => updateProfile({ name: e.target.value })}
 *       />
 *       <input
 *         value={profile.email}
 *         onChange={(e) => updateProfile({ email: e.target.value })}
 *       />
 *     </form>
 *   );
 * }
 * ```
 */
export function useOrbitObject<T extends Record<string, OrbitValue>>(
  key: string,
  initialValue: T
): [T, (updates: Partial<T>) => void] {
  const store = useOrbitStore();
  const map = useMemo(() => store.getMap(key), [store, key]);
  const snapshotRef = useRef<T | null>(null);

  useEffect(() => {
    if (map.size === 0) {
      for (const [propKey, propValue] of Object.entries(initialValue)) {
        map.set(propKey, propValue);
      }
    }
  }, [map, initialValue]);

  const subscribe = useCallback(
    (callback: () => void) => {
      const observer = () => {
        callback();
      };
      map.observe(observer);
      return () => {
        map.unobserve(observer);
      };
    },
    [map]
  );

  const getSnapshot = useCallback(() => {
    const obj: Record<string, OrbitValue> = {};
    let hasValues = false;

    for (const [propKey, propValue] of map.entries()) {
      obj[propKey] = propValue;
      hasValues = true;
    }

    const newSnapshot = (hasValues ? obj : initialValue) as T;

    if (snapshotRef.current !== null) {
      const oldKeys = Object.keys(snapshotRef.current);
      const newKeys = Object.keys(newSnapshot);

      if (oldKeys.length === newKeys.length) {
        const allKeysMatch = oldKeys.every(
          (propKey) => snapshotRef.current![propKey] === newSnapshot[propKey]
        );
        const allNewKeysExist = newKeys.every(
          (propKey) => propKey in snapshotRef.current!
        );

        if (allKeysMatch && allNewKeysExist) {
          return snapshotRef.current;
        }
      }
    }

    snapshotRef.current = newSnapshot;
    return newSnapshot;
  }, [map, initialValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const updateObject = useCallback(
    (updates: Partial<T>) => {
      for (const [propKey, propValue] of Object.entries(updates)) {
        if (propValue !== undefined) {
          map.set(propKey, propValue);
        }
      }
    },
    [map]
  );

  return [value, updateObject];
}
