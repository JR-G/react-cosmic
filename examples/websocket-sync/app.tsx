import { createRoot } from "react-dom/client";
import { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import {
  OrbitProvider,
  useOrbit,
  useOrbitText,
  useOrbitStatus,
  useOrbitAwareness,
  useSetLocalAwareness,
  useOrbitStore,
} from "react-cosmic";
import YPartyKitProvider from "y-partykit/provider";
import "./styles.css";

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || "localhost:1999";
const PARTYKIT_ROOM = "react-cosmic-collab";

const PartyKitContext = createContext<any>(null);
const usePartyKit = () => useContext(PartyKitContext);

const COSMIC_NAMES = [
  "Nebula", "Quasar", "Pulsar", "Supernova", "Stardust", "Comet", "Meteor",
  "Galaxy", "Cosmos", "Aurora", "Eclipse", "Celestial", "Astral", "Lunar",
  "Solar", "Stellar", "Cosmic", "Orbital", "Zenith", "Photon"
];

function generateCosmicName(): string {
  const name = COSMIC_NAMES[Math.floor(Math.random() * COSMIC_NAMES.length)];
  const number = Math.floor(Math.random() * 999);
  return `${name}-${number}`;
}

interface UserPresence {
  name: string;
  color: string;
  [key: string]: string | number | boolean | null;
}

function PresenceIndicator() {
  const provider = usePartyKit();
  const [users, setUsers] = useState<Map<number, { user: UserPresence }>>(new Map());

  const deviceId = useMemo(() => {
    let id = localStorage.getItem("orbit-device-id");
    if (!id) {
      id = Math.random().toString(36).substring(2, 11);
      localStorage.setItem("orbit-device-id", id);
    }
    return id;
  }, []);

  const initialProfile = useMemo(() => ({
    name: generateCosmicName(),
    color: `hsl(${Math.random() * 360}, 70%, 60%)`
  }), []);

  const [myProfile] = useOrbit<UserPresence>(`user-profile-${deviceId}`, initialProfile);

  useEffect(() => {
    if (!provider?.awareness) return;

    provider.awareness.setLocalState({ user: myProfile });

    const updateUsers = () => {
      const states = provider.awareness.getStates();
      setUsers(new Map(states));
    };

    provider.awareness.on('change', updateUsers);
    updateUsers();

    return () => {
      provider.awareness.off('change', updateUsers);
    };
  }, [provider, myProfile]);

  const myClientId = provider?.awareness?.clientID;

  if (users.size === 0) {
    return null;
  }

  return (
    <div className="presence-list">
      {Array.from(users.entries()).map(([clientId, state]) => {
        if (!state.user) return null;
        const isMe = clientId === myClientId;
        return (
          <div
            key={clientId}
            className={`presence-item ${isMe ? "is-me" : "not-me"}`}
          >
            <div className="presence-dot" />
            <span className="presence-name" style={{ color: state.user.color }}>
              {state.user.name}{isMe ? " (You)" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface Cursor {
  clientId: number;
  name: string;
  color: string;
  index: number;
}

function CollaborativeTextArea() {
  const [notes, setNotes] = useOrbitText("shared-notes", "");
  const provider = usePartyKit();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [remoteCursors, setRemoteCursors] = useState<Cursor[]>([]);

  useEffect(() => {
    if (!provider?.awareness) return;

    const handleUpdate = () => {
      const states = provider.awareness.getStates();
      const cursors: Cursor[] = [];
      const myClientId = provider.awareness.clientID;

      states.forEach((state: any, clientId: number) => {
        if (clientId !== myClientId && state.user && state.cursor !== undefined) {
          cursors.push({
            clientId,
            name: state.user.name,
            color: state.user.color,
            index: state.cursor
          });
        }
      });
      setRemoteCursors(cursors);
    };

    provider.awareness.on("change", handleUpdate);
    return () => provider.awareness.off("change", handleUpdate);
  }, [provider]);

  const updateCursor = () => {
    if (!provider?.awareness || !textareaRef.current) return;

    const currentState = provider.awareness.getLocalState();
    provider.awareness.setLocalState({
      ...currentState,
      cursor: textareaRef.current.selectionStart
    });
  };

  return (
    <div className="form-section">
      <h2>Shared Notes</h2>
      <p className="notes-subtitle">
        Type together! You'll see others' cursors in real-time.
      </p>
      <div className="form-field textarea-wrapper">
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            updateCursor();
          }}
          onSelect={updateCursor}
          onKeyUp={updateCursor}
          onBlur={() => {
            if (provider?.awareness) {
              const currentState = provider.awareness.getLocalState();
              provider.awareness.setLocalState({
                ...currentState,
                cursor: undefined
              });
            }
          }}
          rows={8}
          placeholder="Start typing... others will see your cursor!"
          className="shared-textarea"
        />
        {textareaRef.current && remoteCursors.map(cursor => {
          const textarea = textareaRef.current;
          if (!textarea) return null;
          return (
            <RemoteCursor
              key={cursor.clientId}
              cursor={cursor}
              textarea={textarea}
            />
          );
        })}
      </div>
    </div>
  );
}

function RemoteCursor({ cursor, textarea }: { cursor: Cursor, textarea: HTMLTextAreaElement }) {
  const [coords, setCoords] = useState<{ top: number, left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    const calculate = () => {
      const div = document.createElement("div");
      const style = window.getComputedStyle(textarea);

      const props = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderWidth", "width", "boxSizing", "whiteSpace", "wordBreak", "letterSpacing"];
      props.forEach(prop => (div.style as any)[prop] = (style as any)[prop]);

      div.style.position = "absolute";
      div.style.visibility = "hidden";
      div.style.whiteSpace = "pre-wrap";
      div.style.overflowWrap = "break-word";

      const content = textarea.value.slice(0, cursor.index);
      div.textContent = content;

      const span = document.createElement("span");
      span.textContent = "|";
      div.appendChild(span);

      document.body.appendChild(div);

      const spanTop = span.offsetTop;
      const spanLeft = span.offsetLeft;

      document.body.removeChild(div);

      setCoords({
        top: spanTop - textarea.scrollTop + 2,
        left: spanLeft - textarea.scrollLeft
      });
    };

    calculate();
    window.addEventListener("resize", calculate);
    textarea.addEventListener("scroll", calculate);
    return () => {
      window.removeEventListener("resize", calculate);
      textarea.removeEventListener("scroll", calculate);
    };
  }, [cursor.index, textarea, textarea.value]);

  if (cursor.index > textarea.value.length) return null;

  return (
    <div className="remote-cursor" style={{ top: coords.top, left: coords.left }}>
      <div
        className="cursor-line"
        style={{ background: cursor.color, boxShadow: `0 0 4px ${cursor.color}` }}
      />
      <div className="cursor-label" style={{ background: cursor.color }}>
        {cursor.name}
      </div>
    </div>
  );
}

function SharedNotes() {
  return <CollaborativeTextArea />;
}

function StateDebugger() {
  const [sharedNotes] = useOrbitText("shared-notes", "");

  return (
    <div className="state-debugger">
      <h3>Current State</h3>
      <pre>{JSON.stringify({ sharedNotes }, null, 2)}</pre>
    </div>
  );
}

function StatusBadge() {
  const status = useOrbitStatus();

  return (
    <div className={`status-badge ${status}`}>
      <div className="status-dot" />
      {status}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo pulse" />
        Initializing Orbit...
      </div>
    </div>
  );
}

function OrbitApp() {
  const store = useOrbitStore();
  const [partyKitProvider, setPartyKitProvider] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');

  useEffect(() => {
    if (!store) return;

    const ydoc = (store as any).ydoc;
    const provider = new YPartyKitProvider(
      PARTYKIT_HOST,
      PARTYKIT_ROOM,
      ydoc
    );

    const updateStatus = () => {
      setConnectionStatus(provider.ws?.readyState === 1 ? 'connected' : 'connecting');
    };

    provider.on('status', updateStatus);
    provider.on('sync', updateStatus);

    setPartyKitProvider(provider);

    return () => {
      provider.off('status', updateStatus);
      provider.off('sync', updateStatus);
      provider.destroy();
    };
  }, [store]);

  if (!store) {
    return <LoadingScreen />;
  }

  return (
    <PartyKitContext.Provider value={partyKitProvider}>
      <PresenceIndicator />
      <div className="container">
        <header>
          <div className="header-badge">
            <div className={`status-badge ${connectionStatus}`}>
              <div className="status-dot" />
              {connectionStatus}
            </div>
          </div>
          <h1>React Cosmic - WebSocket Sync Demo</h1>
          <p className="subtitle">
            Real-time collaboration powered by CRDTs and WebSockets.
            Open this in multiple browser windows to see changes sync instantly.
          </p>
        </header>

        <main>
          <SharedNotes />
          <StateDebugger />
        </main>
      </div>
    </PartyKitContext.Provider>
  );
}

function App() {
  return (
    <OrbitProvider storeId="websocket-sync-example">
      <OrbitApp />
    </OrbitProvider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
