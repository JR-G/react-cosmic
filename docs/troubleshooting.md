# Troubleshooting

## State not persisting after refresh

**Symptom**: Data resets on page reload even with `enableStorage={true}`.

**Likely causes**:

1. **IndexedDB quota exceeded** — browsers impose storage limits (typically 50–80% of available disk). Check DevTools → Application → Storage for quota usage.
2. **Private / incognito mode** — some browsers restrict IndexedDB in private mode or clear it on tab close.
3. **`storeId` mismatch** — if you change `storeId`, the old data is under the old key and the new store starts fresh.
4. **`enableStorage={false}` set** — state only lives in memory.

**Debug**: Open DevTools → Application → IndexedDB → look for a database named `orbit-<storeId>`.

## State not syncing between tabs

**Symptom**: Updating state in one tab doesn't appear in another.

**Likely causes**:

1. **Different `storeId`** — tabs must use the same `storeId` to share a `BroadcastChannel`.
2. **`enableTabSync={false}`** — tab sync is disabled.
3. **Service worker interference** — some service workers intercept BroadcastChannel messages.
4. **Cross-origin tabs** — `BroadcastChannel` is scoped to origin + partition. Tabs on different ports (e.g. `localhost:3000` vs `localhost:5173`) will not sync.

## WebSocket not connecting

**Symptom**: `useOrbitStatus()` stays at `'connecting'` or drops to `'disconnected'`.

**Check**:

1. Is the server running? `bunx y-websocket-server --port 1234`
2. Is the URL correct? `ws://` for local, `wss://` for production.
3. Has the circuit breaker tripped? Use `useOrbitCircuit()` — if `true`, the store has stopped reconnecting after repeated failures. Remount the `OrbitProvider` to reset it.

**Circuit breaker**: After 3 consecutive failures (configurable via `websocketOptions.maxFailures`), the store stops trying to reconnect. The app continues to work with local + tab sync. This prevents console spam when a server is down.

## `useOrbitText` conflicting with controlled input

**Symptom**: Cursor jumps to end of input on every keystroke.

**Cause**: The component is re-rendering and resetting cursor position. This is a standard React controlled input issue, not specific to react-cosmic.

**Fix**: Use an uncontrolled input with a ref, or use a rich text editor that supports Yjs natively (e.g. Tiptap, Lexical).

## `useOrbitObject` not updating on change

**Symptom**: Calling `updateObject({ key: value })` doesn't cause a re-render.

**Likely cause**: The snapshot comparison in `useOrbitObject` is shallow — it compares values by reference. If a property holds an object reference that mutated in place (without being replaced), the snapshot will appear unchanged.

**Fix**: Always pass a new object reference when updating nested values:

```ts
// Wrong — mutates in place
updateObject({ nested: Object.assign(existing.nested, { key: 'value' }) });

// Correct — new reference
updateObject({ nested: { ...existing.nested, key: 'value' } });
```

## Types not found after installing

**Symptom**: TypeScript can't find types from `react-cosmic`.

The package ships a single ESM entry point (`dist/index.mjs` + `dist/index.d.mts`). Ensure your `tsconfig.json` has `"moduleResolution": "bundler"` or `"node16"`/`"nodenext"`. The older `"node"` resolution mode does not support `.mts` declaration files.

## Memory leaks in tests

**Symptom**: Tests become slower over time or produce warnings about uncleared timers.

Each `OrbitStore` holds a persist debounce timer. If you create stores in tests without calling `dispose()`, the timers leak. Always `await store.dispose()` in `afterEach`. When using `OrbitProvider` in React tests, the provider disposes the store on unmount — call `unmount()` or wrap in a `cleanup()` call.
