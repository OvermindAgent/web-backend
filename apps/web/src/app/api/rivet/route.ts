import { NextRequest, NextResponse } from "next/server"
import { authenticate } from "@/lib/auth/middleware"

type Signal = {
  id: string
  action: string
  data: Record<string, unknown>
  timestamp: number
  processed: boolean
}

const signalQueues = new Map<string, Signal[]>()
const pluginConnections = new Map<string, { lastPing: number; projectId: string }>()

const SIGNAL_TTL = 30000
const CONNECTION_TTL = 60000

function cleanupOldSignals(projectId: string) {
  const queue = signalQueues.get(projectId)
  if (!queue) return
  
  const now = Date.now()
  const filtered = queue.filter(s => now - s.timestamp < SIGNAL_TTL && !s.processed)
  signalQueues.set(projectId, filtered)
}

function cleanupOldConnections() {
  const now = Date.now()
  for (const [apiKey, conn] of pluginConnections) {
    if (now - conn.lastPing > CONNECTION_TTL) {
      pluginConnections.delete(apiKey)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, apiKey, projectId, data, source } = body

    if (source === "roblox") {
      if (!apiKey) {
        return NextResponse.json({ error: "API key required" }, { status: 401 })
      }

      if (action === "connect") {
        pluginConnections.set(apiKey, { lastPing: Date.now(), projectId })
        return NextResponse.json({ success: true, message: "Connected" })
      }

      if (action === "ping") {
        const conn = pluginConnections.get(apiKey)
        if (conn) {
          conn.lastPing = Date.now()
          return NextResponse.json({ success: true })
        }
        return NextResponse.json({ error: "Not connected" }, { status: 401 })
      }

      if (action === "poll") {
        const conn = pluginConnections.get(apiKey)
        if (!conn) {
          return NextResponse.json({ error: "Not connected" }, { status: 401 })
        }
        
        conn.lastPing = Date.now()
        cleanupOldSignals(conn.projectId)
        
        const queue = signalQueues.get(conn.projectId) || []
        const pending = queue.filter(s => !s.processed)
        
        pending.forEach(s => s.processed = true)
        
        return NextResponse.json({ 
          success: true, 
          signals: pending.map(s => ({ id: s.id, action: s.action, data: s.data }))
        })
      }

      if (action === "disconnect") {
        pluginConnections.delete(apiKey)
        return NextResponse.json({ success: true, message: "Disconnected" })
      }

      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    if (source === "web") {
      const auth = await authenticate(request)
      if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      if (action === "send_signal") {
        const { signalAction, signalData, targetProjectId } = data as { 
          signalAction: string
          signalData: Record<string, unknown>
          targetProjectId: string 
        }

        if (!targetProjectId || !signalAction) {
          return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const signal: Signal = {
          id: crypto.randomUUID(),
          action: signalAction,
          data: signalData || {},
          timestamp: Date.now(),
          processed: false,
        }

        const queue = signalQueues.get(targetProjectId) || []
        queue.push(signal)
        signalQueues.set(targetProjectId, queue)

        cleanupOldSignals(targetProjectId)

        let isPluginConnected = false
        for (const [, conn] of pluginConnections) {
          if (conn.projectId === targetProjectId && Date.now() - conn.lastPing < CONNECTION_TTL) {
            isPluginConnected = true
            break
          }
        }

        return NextResponse.json({ 
          success: true, 
          signalId: signal.id,
          pluginConnected: isPluginConnected,
        })
      }

      if (action === "check_connection") {
        const { targetProjectId } = data as { targetProjectId: string }
        
        cleanupOldConnections()
        
        let isConnected = false
        for (const [, conn] of pluginConnections) {
          if (conn.projectId === targetProjectId && Date.now() - conn.lastPing < CONNECTION_TTL) {
            isConnected = true
            break
          }
        }

        return NextResponse.json({ success: true, connected: isConnected })
      }

      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    return NextResponse.json({ error: "Invalid source" }, { status: 400 })
  } catch (error) {
    console.error("[Rivet API] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const apiKey = url.searchParams.get("apiKey")
  
  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 })
  }

  const conn = pluginConnections.get(apiKey)
  if (!conn) {
    return NextResponse.json({ connected: false, signals: [] })
  }

  conn.lastPing = Date.now()
  cleanupOldSignals(conn.projectId)

  const queue = signalQueues.get(conn.projectId) || []
  const pending = queue.filter(s => !s.processed)
  pending.forEach(s => s.processed = true)

  return NextResponse.json({ 
    connected: true,
    signals: pending.map(s => ({ id: s.id, action: s.action, data: s.data }))
  })
}
