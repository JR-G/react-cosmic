import { createRoot } from "react-dom/client";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  OrbitProvider,
  useOrbit,
  useOrbitText,
  useOrbitStatus,
  useOrbitAwareness,
  useSetLocalAwareness,
} from "../../src/index.ts";
import { useOrbitStore } from "../../src/react/provider.tsx";
import "./styles.css";

const WEBSOCKET_URL = "ws://localhost:1234";

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
  const users = useOrbitAwareness<{ user: UserPresence }>();
  const store = useOrbitStore();

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

  useSetLocalAwareness("user", myProfile);

  const myClientId = useMemo(() => {
    return store.getWebSocketProvider()?.awareness?.clientID ?? null;
  }, [store]);

  if (users.size === 0) {
    return null;
  }

  return (
    <div style={{
      position: "fixed",
      top: "20px",
      right: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      zIndex: 1000
    }}>
      {Array.from(users.entries()).map(([clientId, state]) => {
        if (!state.user) return null;
        const isMe = clientId === myClientId;
        return (
          <div key={clientId} style={{
            background: "rgba(30, 41, 59, 0.95)",
            backdropFilter: "blur(10px)",
            color: "white",
            padding: "10px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "500",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: isMe ? "2px solid #8B5CF6" : "1px solid rgba(139, 92, 246, 0.3)"
          }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#4ade80",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              boxShadow: "0 0 4px #4ade80"
            }} />
            <span style={{ color: state.user.color, fontWeight: "600" }}>
              {state.user.name}{isMe ? " (You)" : ""}
            </span>
          </div>
        );
      })}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
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
  const store = useOrbitStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [remoteCursors, setRemoteCursors] = useState<Cursor[]>([]);

  useEffect(() => {
    const provider = store.getWebSocketProvider();
    if (!provider || !provider.awareness) return;

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
  }, [store]);

  const updateCursor = () => {
    const provider = store.getWebSocketProvider();
    if (!provider || !provider.awareness || !textareaRef.current) return;

    provider.awareness.setLocalStateField("cursor", textareaRef.current.selectionStart);
  };

  return (
    <div className="form-section">
      <h2>Shared Notes</h2>
      <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "16px" }}>
        Type together! You'll see others' cursors in real-time.
      </p>
      <div className="form-field" style={{ position: "relative", overflow: "hidden" }}>
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
            const provider = store.getWebSocketProvider();
            if (provider?.awareness) {
              provider.awareness.setLocalStateField("cursor", undefined);
            }
          }}
          rows={8}
          placeholder="Start typing... others will see your cursor!"
          style={{
            fontFamily: "monospace",
            position: "relative",
            zIndex: 1
          }}
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
      div.style.wordWrap = "break-word";

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
    <div style={{
      position: "absolute",
      top: coords.top,
      left: coords.left,
      pointerEvents: "none",
      zIndex: 2,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start"
    }}>
      <div style={{
        width: "2px",
        height: "1.2em",
        background: cursor.color,
        boxShadow: `0 0 4px ${cursor.color}`
      }} />
      <div style={{
        background: cursor.color,
        color: "white",
        fontSize: "10px",
        padding: "2px 4px",
        borderRadius: "2px",
        whiteSpace: "nowrap",
        fontWeight: "bold",
        marginTop: "-2px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
      }}>
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
  const colors: Record<string, string> = {
    connected: "#4ade80",
    connecting: "#fbbf24",
    disconnected: "#f87171"
  };

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 10px",
      borderRadius: "20px",
      background: "rgba(15, 23, 42, 0.4)",
      border: `1px solid ${colors[status] || "#94a3b8"}`,
      fontSize: "11px",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: colors[status] || "#94a3b8"
    }}>
      <div style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: colors[status] || "#94a3b8"
      }} />
      {status}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
      color: "white",
      fontSize: "18px",
      fontWeight: "500"
    }}>
      <div style={{ textAlign: "center" }}>
        <div className="pulse" style={{
          width: "40px",
          height: "40px",
          background: "#8b5cf6",
          borderRadius: "50%",
          margin: "0 auto 20px"
        }} />
        Initializing Orbit...
      </div>
    </div>
  );
}

function OrbitApp() {
  const store = useOrbitStore();

  if (!store) {
    return <LoadingScreen />;
  }

  return (
    <>
      <PresenceIndicator />
      <div className="container">
        <header>
          <div style={{ marginBottom: "16px" }}>
            <StatusBadge />
          </div>
          <h1>React Orbit - WebSocket Sync Demo</h1>
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
    </>
  );
}

function App() {
  return (
    <OrbitProvider
      storeId="websocket-sync-example"
      websocketUrl={WEBSOCKET_URL}
    >
      <OrbitApp />
    </OrbitProvider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
