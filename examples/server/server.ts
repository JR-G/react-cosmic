import * as Y from "yjs";
import { WebSocketServer } from "ws";

const PORT = parseInt(process.env.PORT || "1234");
const wss = new WebSocketServer({ port: PORT });

const docs = new Map<string, Y.Doc>();
const connections = new Map<string, Set<any>>();

function getDocName(url: string | undefined): string {
  return url?.slice(1) || "default";
}

wss.on("connection", (websocket, request) => {
  const docName = getDocName(request.url);

  if (!docs.has(docName)) {
    docs.set(docName, new Y.Doc());
    connections.set(docName, new Set());
  }

  const ydoc = docs.get(docName)!;
  const docConnections = connections.get(docName)!;

  docConnections.add(websocket);

  const syncMessage = Y.encodeStateAsUpdate(ydoc);
  websocket.send(
    new Uint8Array([0, 0, ...syncMessage]).buffer
  );

  websocket.on("message", (message: Buffer) => {
    const update = new Uint8Array(message);

    // If it's a sync message, apply it to our server-side doc
    if (update[0] === 0 && (update[1] === 0 || update[1] === 1 || update[1] === 2)) {
      try {
        const actualUpdate = update.slice(2);
        if (actualUpdate.length > 0) {
          Y.applyUpdate(ydoc, actualUpdate);
        }
      } catch (e) {
        console.error("Failed to apply update:", e);
      }
    }

    // Broadcast every message to all other connected clients
    // This includes sync messages and awareness (presence) messages
    docConnections.forEach((client) => {
      if (client !== websocket && client.readyState === 1) {
        client.send(message);
      }
    });
  });

  websocket.on("close", () => {
    docConnections.delete(websocket);
    if (docConnections.size === 0) {
      docs.delete(docName);
      connections.delete(docName);
    }
  });
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);
console.log("Clients can connect and sync their Yjs documents in real-time.");
