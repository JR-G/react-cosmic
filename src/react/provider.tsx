import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { OrbitStore } from "../core/store.ts";
import type { OrbitConfig } from "../core/types.ts";
import { IndexedDBAdapter } from "../core/storage/indexeddb-adapter.ts";

/**
 * React Context for the Orbit store.
 */
const OrbitContext = createContext<OrbitStore | null>(null);

/**
 * Props for the OrbitProvider component.
 */
export interface OrbitProviderProps {
  /**
   * Unique identifier for this store.
   * Components using the same storeId will share state.
   */
  storeId: string;

  /**
   * Child components that can access the Orbit store.
   */
  children: ReactNode;

  /**
   * Whether to enable persistent storage.
   * Defaults to true. When true, uses IndexedDB.
   */
  enableStorage?: boolean;

  /**
   * Whether to enable cross-tab synchronization.
   * Defaults to true.
   */
  enableTabSync?: boolean;

  /**
   * Debounce delay in milliseconds for persisting state.
   * Defaults to 300ms.
   */
  persistDebounceMs?: number;
}

/**
 * Provider component that initializes and provides the Orbit store to child components.
 *
 * Wrap your app or component tree with this provider to enable Orbit state management.
 * All hooks (useOrbit, useOrbitText, useOrbitObject) must be used within this provider.
 *
 * @example
 * ```typescript
 * function App() {
 *   return (
 *     <OrbitProvider storeId="my-app">
 *       <MyComponent />
 *     </OrbitProvider>
 *   );
 * }
 * ```
 */
export function OrbitProvider({
  storeId,
  children,
  enableStorage = true,
  enableTabSync = true,
  persistDebounceMs,
}: OrbitProviderProps): ReactNode {
  const [store, setStore] = useState<OrbitStore | null>(null);

  useEffect(() => {
    const config: OrbitConfig = {
      storeId,
      enableTabSync,
      persistDebounceMs,
    };

    if (enableStorage) {
      config.storage = new IndexedDBAdapter();
    }

    const newStore = new OrbitStore(config);

    newStore.init().then(() => {
      setStore(newStore);
    });

    return () => {
      newStore.dispose();
    };
  }, [storeId, enableStorage, enableTabSync, persistDebounceMs]);

  if (store === null) {
    return null;
  }

  return (
    <OrbitContext.Provider value={store}>{children}</OrbitContext.Provider>
  );
}

/**
 * Hook to access the Orbit store from context.
 * Must be used within an OrbitProvider.
 *
 * @returns The Orbit store instance
 * @throws Error if used outside of OrbitProvider
 * @internal
 */
export function useOrbitStore(): OrbitStore {
  const store = useContext(OrbitContext);

  if (store === null) {
    throw new Error("useOrbitStore must be used within an OrbitProvider");
  }

  return store;
}
