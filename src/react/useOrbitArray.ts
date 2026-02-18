import { useSyncExternalStore, useCallback, useMemo, useEffect, useRef } from "react";
import * as Y from "yjs";
import type { OrbitValue } from "../core/types.ts";
import { useOrbitStore } from "./provider.tsx";

/**
 * Hook for managing ordered list state with CRDT conflict resolution.
 *
 * Backed by a Yjs Array, so concurrent inserts and deletes from multiple
 * clients or tabs merge correctly without losing items.
 *
 * @template T - The type of each item in the array
 * @param key - Unique key for this array
 * @param initialValue - Default items if no persisted state exists
 * @returns Tuple of [items, helpers] where helpers provides push, delete, and move operations
 *
 * @example
 * ```typescript
 * function TodoList() {
 *   const [todos, { push, remove }] = useOrbitArray<string>('todos', []);
 *
 *   return (
 *     <ul>
 *       {todos.map((todo, i) => (
 *         <li key={i}>
 *           {todo}
 *           <button onClick={() => remove(i)}>x</button>
 *         </li>
 *       ))}
 *       <button onClick={() => push('New todo')}>Add</button>
 *     </ul>
 *   );
 * }
 * ```
 */
export interface OrbitArrayHelpers<T extends OrbitValue> {
  /** Appends one or more items to the end of the array. */
  push(...items: T[]): void;
  /** Inserts an item at the given index. */
  insert(index: number, item: T): void;
  /** Removes the item at the given index. */
  remove(index: number): void;
  /** Removes all items from the array. */
  clear(): void;
}

export function useOrbitArray<T extends OrbitValue>(
  key: string,
  initialValue: T[] = []
): [T[], OrbitArrayHelpers<T>] {
  const store = useOrbitStore();
  const yarray = useMemo(() => store.getArray(key) as unknown as Y.Array<T>, [store, key]);
  const snapshotRef = useRef<T[]>([]);
  const initialRef = useRef(initialValue);

  useEffect(() => {
    if (yarray.length === 0 && initialRef.current.length > 0) {
      yarray.push([...initialRef.current]);
    }
  }, [yarray]);

  const subscribe = useCallback(
    (callback: () => void) => {
      const observer = () => {
        callback();
      };
      yarray.observe(observer);
      return () => {
        yarray.unobserve(observer);
      };
    },
    [yarray]
  );

  const getSnapshot = useCallback(() => {
    const current = yarray.toArray();
    const prev = snapshotRef.current;

    if (
      prev.length === current.length &&
      current.every((item, i) => item === prev[i])
    ) {
      return prev;
    }

    snapshotRef.current = current;
    return current;
  }, [yarray]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const helpers = useMemo<OrbitArrayHelpers<T>>(
    () => ({
      push(...items: T[]) {
        yarray.push(items);
      },
      insert(index: number, item: T) {
        yarray.insert(index, [item]);
      },
      remove(index: number) {
        yarray.delete(index, 1);
      },
      clear() {
        yarray.delete(0, yarray.length);
      },
    }),
    [yarray]
  );

  return [value, helpers];
}
