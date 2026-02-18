# Agent Guide — react-cosmic

## What this is

A React hooks library wrapping Yjs CRDTs. State persists to IndexedDB, syncs across browser tabs via BroadcastChannel, and optionally syncs across devices via WebSocket. No backend required for single-tab or multi-tab use.

**npm**: `react-cosmic` | **License**: MIT

## Architecture

```
src/
├── core/
│   ├── store.ts              OrbitStore — Yjs doc, storage, tab sync, WebSocket, circuit breaker
│   ├── types.ts              OrbitValue, StorageAdapter, OrbitConfig
│   ├── text-diff.ts          computeTextDiff() — prefix/suffix diff for minimal Yjs ops
│   └── storage/
│       └── indexeddb-adapter.ts
├── react/
│   ├── provider.tsx          OrbitProvider + useOrbitStore context
│   ├── useOrbit.ts           useState for primitives/JSON
│   ├── useOrbitText.ts       Y.Text hook with granular diffing
│   ├── useOrbitObject.ts     Y.Map per-key with partial updates
│   ├── useOrbitArray.ts      Y.Array hook with push/insert/remove/clear
│   ├── useOrbitUndoManager.ts  Yjs UndoManager scoped to a single key
│   └── collaboration/
│       ├── useOrbitStatus.ts     WebSocket connection status (reads store.getStatus())
│       ├── useOrbitCircuit.ts    Whether circuit breaker has tripped
│       ├── useOrbitAwareness.ts  Remote presence map with optional selector
│       └── useSetLocalAwareness.ts
└── sync/
    ├── tab-sync.ts           BroadcastChannel cross-tab CRDT sync
    └── types.ts
```

## Critical invariants

**Do not read `provider.wsconnected` / `provider.wsconnecting`** — these are undocumented internals of y-websocket. All connection state flows through `OrbitStore.getStatus()` and the `onStatusChange` / `offStatusChange` event system.

**Do not replace `useOrbitText`'s diff algorithm with a full string replacement** (`ytext.delete(0, length); ytext.insert(0, newText)`). The `computeTextDiff` prefix/suffix approach is required for correct CRDT behaviour under concurrent edits. A full replacement produces a Yjs operation that conflicts with concurrent edits from other clients.

**`OrbitStore.init()` is idempotent** — safe to call multiple times; subsequent calls return immediately.

**`useOrbitObject` creates one `Y.Map` per key** (not slots in a shared map) to allow per-property granular updates with no cross-key interference.

## Public API surface

```ts
// Provider
OrbitProvider           // storeId, enableStorage, enableTabSync, persistDebounceMs,
                        // websocketUrl, websocketOptions

// State hooks
useOrbit<T>(key, initialValue)             // useState for primitives/JSON
useOrbitText(key, initialValue?)           // Yjs Text with granular diffing
useOrbitObject<T>(key, initialValue)       // Yjs Map per-key, partial updates
useOrbitArray<T>(key, initialValue?)       // Yjs Array with push/insert/remove/clear

// History
useOrbitUndoManager(key, scope?)           // Yjs UndoManager for a key

// Collaboration / WebSocket
useOrbitStatus()                           // 'connected' | 'connecting' | 'disconnected'
useOrbitCircuit()                          // boolean — circuit breaker tripped
useOrbitAwareness<T, S>(selector?)         // presence map with optional selector
useSetLocalAwareness<T>(state)             // broadcast own presence

// Lower-level (advanced use)
OrbitStore
IndexedDBAdapter
```

## Testing conventions

- Framework: Vitest 4 + happy-dom + @testing-library/react
- IndexedDB: polyfilled via `fake-indexeddb/auto` in `tests/setup.ts`
- **No `any` in mocks** — define typed interfaces for mock objects
- Collaboration tests mock `useOrbitStore` via `vi.mock("../../src/react/provider.tsx")`
- Each `OrbitProvider` test uses a unique `storeId` to avoid state leakage between tests
- Unit tests for pure utilities (e.g. `computeTextDiff`) live in `tests/core/`

## Tooling

- **Runtime**: Bun
- **Build**: tsdown (`bun run build`) → `dist/index.mjs` + `dist/index.d.mts`
- **Lint**: `bun run lint` (ESLint 9, strict TypeScript rules)
- **Typecheck**: `bun run typecheck`
- **Tests**: `bun run test:file` (single run) or `bun run test` (watch)
- **Coverage**: `bun run test:coverage` (v8 provider)
- **Docs**: `bun run docs` (TypeDoc → `docs/api/`)

## Release workflow (two-step)

1. `bun run release <patch|minor|major>` — bumps version, creates branch + PR
2. After PR merges: `bun run release:tag` — pushes `vX.Y.Z` tag → triggers npm publish via GitHub Actions

**Never push a tag manually** — the `release:tag` script handles fetching latest main first.

## What to avoid

- Adding hooks that bypass the `OrbitStore` API and talk directly to the Yjs doc or WebSocket provider
- Storing non-`OrbitValue` types (functions, class instances, `undefined`) in any orbit state
- Forgetting to unobserve Yjs observers on cleanup — always return an unobserve function from `subscribe`
- Using `useMemo` dependencies that change on every render (e.g. passing inline objects as config)
