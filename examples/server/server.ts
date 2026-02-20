import { WebSocketServer } from "y-websocket/bin/utils.js";

const port = parseInt(process.env.PORT ?? "1234");
const server = new WebSocketServer({ port });

console.log(`WebSocket server running on ws://localhost:${port}`);

server;
