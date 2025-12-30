import { WebSocketServer, WebSocket } from "ws"

interface Client {
  ws: WebSocket
  userId: string
  source: "web" | "roblox" | "vscode"
  projectId?: string
  authenticated: boolean
}

interface WSMessage {
  type: "auth" | "signal" | "chat" | "event" | "error"
  source?: "web" | "roblox" | "vscode"
  projectId?: string
  payload?: Record<string, unknown>
}

const clients = new Map<WebSocket, Client>()
let wssInstance: WebSocketServer | null = null

export function createWebSocketServer(port: number) {
  const wss = new WebSocketServer({ port })
  wssInstance = wss

  console.log(`[WS] Server started on port ${port}`)

  wss.on("connection", (ws) => {
    console.log("[WS] New connection")

    clients.set(ws, {
      ws,
      userId: "",
      source: "web",
      authenticated: false,
    })

    ws.on("message", async (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString())
        await handleMessage(ws, message)
      } catch (error) {
        sendError(ws, "Invalid message format")
      }
    })

    ws.on("close", () => {
      console.log("[WS] Client disconnected")
      clients.delete(ws)
    })

    ws.on("error", (error) => {
      console.error("[WS] Error:", error)
      clients.delete(ws)
    })
  })

  return wss
}

async function handleMessage(ws: WebSocket, message: WSMessage) {
  const client = clients.get(ws)
  if (!client) return

  switch (message.type) {
    case "auth":
      await handleAuth(ws, client, message)
      break

    case "chat":
      if (!client.authenticated) {
        sendError(ws, "Not authenticated")
        return
      }
      await handleChat(ws, client, message)
      break

    case "signal":
      if (!client.authenticated) {
        sendError(ws, "Not authenticated")
        return
      }
      broadcastSignal(client, message)
      break

    case "event":
      if (!client.authenticated) {
        sendError(ws, "Not authenticated")
        return
      }
      broadcastEvent(client, message)
      break

    default:
      sendError(ws, "Unknown message type")
  }
}

async function handleChat(ws: WebSocket, client: Client, message: WSMessage) {
  const content = message.payload?.content as string
  const preset = (message.payload?.preset as string) || "fast"

  if (!content) {
    sendError(ws, "Message content required")
    return
  }

  console.log(`[WS] Chat from ${client.source}: ${content}`)

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content }],
        preset,
        projectContext: `Connected from: ${client.source}`,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[WS] Chat API error: ${errText}`)
      send(ws, {
        type: "chat",
        payload: {
          role: "assistant",
          content: `Error: ${response.status} - ${errText}`,
        },
      })
      return
    }

    const data = await response.json()
    const aiContent = data.content || data.message || "No response"

    console.log(`[WS] AI response: ${aiContent.substring(0, 100)}...`)

    send(ws, {
      type: "chat",
      payload: {
        role: "assistant",
        content: aiContent,
      },
    })

    if (data.toolResults && data.toolResults.length > 0) {
      console.log(`[WS] Tool results:`, data.toolResults.length, "tools executed")
      
      for (const tr of data.toolResults) {
        const toolCall = tr.call as { name: string; args: Record<string, unknown> }
        const executionResult = tr.result as { success: boolean; result?: { queued?: boolean; action?: string; args?: Record<string, unknown> }; error?: string }
        
        console.log(`[WS] Tool: ${toolCall.name}`, JSON.stringify(toolCall.args).substring(0, 200))
        
        if (toolCall.name === "emit_signal") {
          const action = toolCall.args.action as string
          const payload = toolCall.args.payload as Record<string, unknown>
          
          console.log(`[WS] >>> Sending signal to Roblox: ${action}`)
          
          emitSignalToClient(client.userId, action, payload)
        }
        
        if (executionResult.success && executionResult.result?.queued && executionResult.result?.action) {
          const action = executionResult.result.action as string
          const args = executionResult.result.args || toolCall.args
          
          console.log(`[WS] >>> Sending queued signal to Roblox: ${action}`)
          
          emitSignalToClient(client.userId, action, args as Record<string, unknown>)
        }
      }
    }
  } catch (error) {
    console.error(`[WS] Chat error:`, error)
    send(ws, {
      type: "chat",
      payload: {
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    })
  }
}

async function handleAuth(ws: WebSocket, client: Client, message: WSMessage) {
  const apiKey = message.payload?.apiKey as string
  const isDev = process.env.NODE_ENV !== "production"

  if (!apiKey) {
    if (isDev) {
      client.userId = "dev-user-001"
      client.source = message.source || "web"
      client.projectId = message.projectId
      client.authenticated = true

      console.log(`[WS] Dev mode auth: ${client.source}`)

      send(ws, {
        type: "auth",
        payload: { success: true },
      })
      return
    }

    sendError(ws, "API key required")
    return
  }

  client.userId = isDev ? "dev-user-001" : apiKey.substring(0, 16)
  client.source = message.source || "web"
  client.projectId = message.projectId
  client.authenticated = true

  console.log(`[WS] Client authenticated: ${client.source} (userId: ${client.userId})`)

  send(ws, {
    type: "auth",
    payload: { success: true },
  })

  broadcastToUser(client.userId, {
    type: "event",
    payload: {
      action: "client_connected",
      source: client.source,
    },
  })
}

function broadcastSignal(sender: Client, message: WSMessage) {
  const signal = {
    type: "signal" as const,
    payload: message.payload,
  }

  console.log(`[WS] Broadcasting signal:`, message.payload)

  clients.forEach((client, ws) => {
    if (
      client.authenticated &&
      client.userId === sender.userId &&
      client.source !== sender.source &&
      ws.readyState === WebSocket.OPEN
    ) {
      send(ws, signal)
    }
  })
}

function broadcastEvent(sender: Client, message: WSMessage) {
  const event = {
    type: "event" as const,
    source: sender.source,
    payload: message.payload,
  }

  clients.forEach((client, ws) => {
    if (
      client.authenticated &&
      client.userId === sender.userId &&
      ws.readyState === WebSocket.OPEN
    ) {
      send(ws, event)
    }
  })
}

function broadcastToUser(userId: string, message: WSMessage) {
  clients.forEach((client, ws) => {
    if (
      client.authenticated &&
      client.userId === userId &&
      ws.readyState === WebSocket.OPEN
    ) {
      send(ws, message)
    }
  })
}

export function emitSignalToUser(userId: string, action: string, payload?: Record<string, unknown>) {
  console.log(`[WS] Emitting signal to user ${userId}:`, action, payload)
  broadcastToUser(userId, {
    type: "signal",
    payload: { action, ...payload },
  })
}

function emitSignalToClient(userId: string, action: string, payload?: Record<string, unknown>) {
  console.log(`[WS] Emitting signal to Roblox clients for user ${userId}:`, action)
  
  let sent = 0
  clients.forEach((client, ws) => {
    if (
      client.authenticated &&
      client.userId === userId &&
      client.source === "roblox" &&
      ws.readyState === WebSocket.OPEN
    ) {
      send(ws, {
        type: "signal",
        payload: { action, data: payload },
      })
      sent++
    }
  })
  
  console.log(`[WS] Signal sent to ${sent} Roblox client(s)`)
}

function send(ws: WebSocket, message: WSMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}

function sendError(ws: WebSocket, error: string) {
  send(ws, { type: "error", payload: { error } })
}

export function getConnectedClients(userId: string): { source: string; projectId?: string }[] {
  const connected: { source: string; projectId?: string }[] = []

  clients.forEach((client) => {
    if (client.authenticated && client.userId === userId) {
      connected.push({ source: client.source, projectId: client.projectId })
    }
  })

  return connected
}
