# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `useOrbitArray` hook — ordered list state backed by `Y.Array` with `push`, `insert`, `remove`, `clear`
- `useOrbitUndoManager` hook — scoped Yjs `UndoManager` per key, supports `text`/`map`/`array` scope
- `useOrbitCircuit` hook — observe whether the WebSocket circuit breaker has tripped
- `OrbitStore.getStatus()` — read the current connection status without a listener
- `OrbitStore.isCircuitOpen()` — check whether the circuit breaker has tripped
- `OrbitStore.resetCircuit()` — clear the tripped circuit and resume reconnection attempts
- `docs/architecture.md`, `docs/contributing.md`, `docs/troubleshooting.md`
- `AGENTS.md` — guidance for AI agents working on the codebase
- `typedoc.json` — TypeDoc configuration
- `@vitest/coverage-v8` dev dependency; coverage CI job

### Changed
- `useOrbitStatus` now reads status from `OrbitStore.getStatus()` instead of internal
  `y-websocket` properties (`wsconnected`/`wsconnecting`), making it resilient to provider
  upgrades

### Fixed
- `OrbitStore` validates the value from y-websocket's `status` event before assigning it
  to `currentStatus`; unexpected values are warned and discarded rather than stored
- `useOrbitArray.insert` and `useOrbitArray.remove` now throw `RangeError` on out-of-bounds
  indices
- `useOrbitArray` initialisation is now performed inside a Yjs transaction to prevent
  double-push under React StrictMode

### Breaking changes

**`OrbitStore.onStatusChange` / `OrbitStore.offStatusChange` listener signature changed.**

Previously the listener received the status string as an argument:

```ts
store.onStatusChange((status: string) => { /* use status */ });
```

The listener now receives no arguments. Read the status from `store.getStatus()` inside
the listener:

```ts
store.onStatusChange(() => {
  const status = store.getStatus(); // 'connected' | 'connecting' | 'disconnected'
});
```

This only affects code that calls `OrbitStore.onStatusChange` directly. The `useOrbitStatus`
hook is unaffected.

## [1.0.0] - 2026-01-07

### Added
- CRDT-based offline-first React state management using Yjs
- `OrbitProvider` component for state management context
- `useOrbit` hook for primitive values with automatic persistence
- `useOrbitText` hook for collaborative text editing with granular diffing
- `useOrbitObject` hook for nested object updates
- `useOrbitStatus` hook for WebSocket connection status monitoring
- `useOrbitAwareness` hook for real-time presence data
- `useSetLocalAwareness` hook for broadcasting presence state
- IndexedDB persistence adapter with automatic debounced saves
- Cross-tab synchronization via BroadcastChannel
- WebSocket-based real-time collaboration support
- Circuit breaker pattern for WebSocket connection failures
- Full TypeScript support with comprehensive type definitions
- Working examples: basic form demo and collaborative editing demo

### Changed
- N/A (initial stable release)

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

## [0.1.1] - 2026-01-07

### Fixed
- Renamed library to react-cosmic
- Updated README with correct repository URL

## [0.1.0] - 2026-01-07

### Added
- Initial release with core CRDT functionality
- Basic React hooks and provider
- IndexedDB storage support
- Tab synchronization
- WebSocket collaboration features
