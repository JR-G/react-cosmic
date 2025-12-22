# React Orbit

State that persists. Across tabs. Across crashes. No server required.

Built on CRDTs so your users can't lose their work, even when they try.

## What is this?

You know how form data disappears when you refresh the page? Or how opening the same app in two tabs creates a mess? This fixes that.

React Orbit wraps [Yjs](https://yjs.dev/) and gives you hooks that work like [`useState`](https://react.dev/reference/react/useState) but actually remember things. Your state syncs across browser tabs automatically and persists to [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) without you doing anything.

## Install

```bash
bun add react-orbit  # or npm/pnpm/yarn
```

## Quick start

Wrap your app:

```tsx
import { OrbitProvider } from 'react-orbit';

function App() {
  return (
    <OrbitProvider storeId="my-app">
      <YourStuff />
    </OrbitProvider>
  );
}
```

Use the hooks:

```tsx
import {
  useOrbit,
  useOrbitText,
  useOrbitObject,
  useOrbitStatus,
  useOrbitAwareness,
  useSetLocalAwareness
} from 'react-orbit';

function Form() {
  const [email, setEmail] = useOrbit('email', '');
  const [bio, setBio] = useOrbitText('bio', '');
  const [profile, updateProfile] = useOrbitObject('profile', {
    name: '',
    age: 0
  });

  return (
    <form>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
      />
      <input
        value={profile.name}
        onChange={(e) => updateProfile({ name: e.target.value })}
      />
    </form>
  );
}
```

That's it. Now open two tabs and watch them sync. Close the browser and reopen it. Your data is still there.

## API

### `<OrbitProvider>`

Put this around your app or component tree.

```tsx
<OrbitProvider
  storeId="unique-id"           // required - same ID = shared state
  enableStorage={true}          // optional - persist to IndexedDB (default: true)
  enableTabSync={true}          // optional - sync across tabs (default: true)
  persistDebounceMs={300}       // optional - debounce saves (default: 300)
  websocketUrl="ws://localhost:1234"  // optional - sync across devices/users
  websocketOptions={{           // optional - WebSocket config
    retryDelay: 3000,           // reconnect delay in ms
    maxRetries: Infinity,       // retry attempts
    protocols: ["my-protocol"]  // WebSocket protocols
  }}
>
```

### `useOrbit(key, initialValue)`

Like `useState` but it remembers. Use for primitives and simple values.

```tsx
const [count, setCount] = useOrbit('count', 0);
const [name, setName] = useOrbit('name', '');
const [enabled, setEnabled] = useOrbit('enabled', false);
```

### `useOrbitText(key, initialValue?)`

For text fields. Uses Yjs Text internally for proper collaborative editing.

```tsx
const [content, setContent] = useOrbitText('doc-content', '');
```

### `useOrbitObject(key, initialValue)`

For nested objects. Lets you update individual properties without replacing the whole thing.

```tsx
const [user, updateUser] = useOrbitObject('user', {
  name: '',
  email: '',
  age: 0
});

updateUser({ age: 25 });  // only updates age, keeps name and email
```

### `useOrbitStatus()`

Track WebSocket connection status. Returns `'connected'`, `'connecting'`, or `'disconnected'`.

```tsx
const status = useOrbitStatus();

return <div>Status: {status}</div>;
```

Only useful when `websocketUrl` is configured. Returns `'disconnected'` if WebSockets aren't enabled.

### `useOrbitAwareness<T>()`

Read presence data for all connected clients. Returns a `Map<number, T>` where the key is the client ID and the value is their awareness state.

```tsx
interface UserPresence {
  name: string;
  color: string;
  cursor?: number;
}

const users = useOrbitAwareness<UserPresence>();

return (
  <div>
    {Array.from(users.values()).map(user => (
      <div key={user.name}>{user.name}</div>
    ))}
  </div>
);
```

Only works when `websocketUrl` is configured.

### `useSetLocalAwareness<T>(state)`

Broadcast your presence state to all connected clients. Automatically cleans up on unmount.

```tsx
interface UserPresence {
  name: string;
  color: string;
}

function MyComponent() {
  const [profile] = useOrbit<UserPresence>('profile', {
    name: 'Alice',
    color: '#ff0000'
  });

  useSetLocalAwareness(profile);

  return <div>Your name: {profile.name}</div>;
}
```

Only works when `websocketUrl` is configured.

## Try the demos

**Basic form demo** (local persistence and tab sync):
```bash
git clone <this-repo>
cd react-orbit
bun install
bun run demo
```

Open multiple tabs to see cross-tab sync in action.

**Collaboration demo** (real-time multi-user sync with presence):

Terminal 1 - start the WebSocket server:
```bash
bun run demo:server
```

Terminal 2 - start the demo:
```bash
bun run demo:collab
```

Open multiple browsers to see real-time collaboration with presence indicators and remote cursors.

## When to use this

Good for:
- Forms that shouldn't lose data
- Draft content (emails, posts, documents)
- User preferences
- Any UI state you want to survive refreshes
- Multi-tab scenarios
- Real-time collaboration (with WebSocket server)
- Cross-device state sync

Not for:
- Replacing your backend (it's a sync layer, not a database)
- Massive datasets (it's in-browser storage)

## Server sync (CRDT-powered collaboration)

Want to sync across devices or add real-time multiplayer? Run a WebSocket server. The same CRDT that syncs your tabs now syncs across devices and users, with automatic conflict resolution.

The simplest option is using bunx:

```bash
bunx y-websocket-server --port 1234
```

Or install globally:

```bash
bun install -g y-websocket
y-websocket-server --port 1234
```

Then connect your app:

```tsx
<OrbitProvider
  storeId="my-app"
  websocketUrl="ws://localhost:1234"
>
  <YourStuff />
</OrbitProvider>
```

Now users on different devices see each other's changes in real-time. The CRDT handles all conflict resolution automatically - whether it's two tabs, two users, or twenty.

For production, you'll want auth, persistence, and proper scaling. Check out `y-websocket` docs or hosted Yjs providers.

## License

MIT
