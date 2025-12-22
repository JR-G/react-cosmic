# WebSocket Server Example

Simple WebSocket server for syncing Orbit state across devices and users.

## Recommended approach (easiest)

Use the built-in y-websocket server:

```bash
bunx y-websocket-server --port 1234
```

Or install it globally:

```bash
bun install -g y-websocket
y-websocket-server --port 1234
```

The server will start on `ws://localhost:1234`.

## Alternative (custom server)

For a custom implementation, see `server.ts` in this directory:

```bash
bun examples/server/server.ts
```

This example shows a minimal Yjs WebSocket server. It's simpler than the built-in server but lacks features like persistence and awareness protocol.

## Connect your app

Update your OrbitProvider:

```tsx
<OrbitProvider
  storeId="my-app"
  websocketUrl="ws://localhost:1234"
>
  <YourApp />
</OrbitProvider>
```

Now open your app in multiple tabs, devices, or browsers. All changes sync in real-time through the server.

## What it does

- Accepts WebSocket connections from Orbit clients
- Broadcasts document updates to all connected clients with the same `storeId`
- Handles automatic reconnection and conflict resolution via CRDTs
- No database required (state lives in memory)

## Production notes

This example server stores everything in memory. For production, you'll want:

- **Persistence**: Save documents to a database so they survive restarts
- **Authentication**: Verify users and control access to documents
- **Scaling**: Use Redis or similar for multi-instance deployments
- **HTTPS**: Use `wss://` instead of `ws://` for encrypted connections

The `y-websocket` package supports all of this. Check their docs for advanced setups.
