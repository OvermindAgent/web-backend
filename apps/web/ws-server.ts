import { createWebSocketServer } from "./src/lib/ws/server"

const port = parseInt(process.env.WS_PORT || "3001", 10)

createWebSocketServer(port)

console.log(`WebSocket server running on ws://localhost:${port}`)
