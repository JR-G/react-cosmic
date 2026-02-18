# Architecture

## Overview

react-cosmic wraps [Yjs](https://yjs.dev/) CRDTs into `useState`-style React hooks. The core idea: a `Y.Doc` is the single source of truth per `storeId`, and all persistence/sync mechanisms are adapters that feed into or out of that document.

```text
Browser Tab A                   Browser Tab B
┌─────────────────────┐         ┌─────────────────────┐
│  React Component    │         │  React Component    │
│  useOrbit(key)      │         │  useOrbit(key)      │
│        │            │         │        │            │
│  useSyncExternalStore          │  useSyncExternalStore
│        │            │         │        │            │
│   OrbitStore        │         │   OrbitStore        │
│   ┌─────────┐       │         │   ┌─────────┐       │
│   │  Y.Doc  │◄──────┼─BroadcastChannel──────►  Y.Doc  │
│   └────┬────┘       │         │   └────┬────┘       │
│        │            │         │        │            │
│   IndexedDB         │         │   IndexedDB         │
└─────────────────────┘         └─────────────────────┘
         │                               │
         └──────── WebSocket Server ─────┘
                  (y-websocket)
```

## Layers

### OrbitStore (`src/core/store.ts`)

The single class that owns a `Y.Doc`. Responsibilities:

- **Storage**: debounced persist (default 300ms) via a `StorageAdapter`; flushes synchronously on `dispose()`
- **Tab sync**: `BroadcastChannel` named `orbit-${storeId}`; uses `origin` guard to prevent echo
- **WebSocket**: `y-websocket` `WebsocketProvider` with a circuit breaker — stops reconnecting after `maxFailures` consecutive failures
- **Status tracking**: fires `onStatusChange` listeners from the provider's `status` event (not from internal properties)

### Storage adapters (`src/core/storage/`)

Implements `StorageAdapter` interface (`load`, `save`, `delete`, `dispose`). Currently only `IndexedDBAdapter` ships. Custom adapters (localStorage, OPFS, remote) can be passed via `OrbitConfig.storage`.

### Tab sync (`src/sync/tab-sync.ts`)

Wraps Yjs's built-in `BroadcastChannel` provider. The `origin` field on each update prevents a tab from applying its own broadcast back to itself.

### React layer (`src/react/`)

Each hook follows the same pattern:

1. Get the store from context via `useOrbitStore()`
2. Get the appropriate Yjs type (`getMap`, `getText`, `getArray`)
3. `useSyncExternalStore(subscribe, getSnapshot)` where:
   - `subscribe` observes the Yjs type and calls the React callback on change
   - `getSnapshot` reads current state synchronously

### Text diffing (`src/core/text-diff.ts`)

`useOrbitText` does not replace the entire Y.Text on each `setText` call. Instead, `computeTextDiff` finds the longest common prefix and suffix, and only the changed middle region is deleted/inserted in a single Yjs transaction. This is critical for CRDT correctness: a full-replacement would produce a Yjs operation that conflicts destructively with concurrent remote edits.

## Data flow on a state update

```text
User calls setCount(5)
  → Y.Map.set("count", 5)          [Yjs records the operation]
  → Y.Doc emits "update" event
  → OrbitStore.handleUpdate()      [schedules debounced persist]
  → TabSync broadcasts the update  [other tabs apply it]
  → useSyncExternalStore callback  [React schedules re-render]
  → getSnapshot() returns 5
  → Component re-renders
```

## WebSocket circuit breaker

To prevent console spam when a server is unreachable, `OrbitStore` counts consecutive connection errors. After `maxFailures` (default 3) the provider's `shouldConnect` flag is set to `false` and `disconnect()` is called. The store emits a final `'disconnected'` status event and sets `circuitTripped = true`, which is exposed via `isCircuitOpen()` and the `useOrbitCircuit()` hook.

## Why Yjs

Yjs uses operation-based CRDTs (specifically a variant of LSEQ for text and a LWW-Map for key-value). This means:

- Concurrent inserts always both survive (no data loss)
- Concurrent map updates use last-write-wins per key
- No central authority is needed to resolve conflicts
- The same algorithm works offline-first (sync later) and real-time (sync live)
