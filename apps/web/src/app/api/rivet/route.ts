import { NextRequest, NextResponse } from "next/server"
import { authenticate } from "@/lib/auth/middleware"
import { kv } from "@vercel/kv"

const CONNECTION_TTL = 60
const SIGNAL_TTL = 30

function getConnectionKey(apiKey: string) {
  return `rivet:conn:${apiKey}`
}

function getSignalQueueKey(apiKey: string) {
  return `rivet:signals:${apiKey}`
}

function getAllConnectionsPattern() {
  return "rivet:conn:*"
}

async function getActiveConnections(): Promise<{ apiKey: string; lastPing: number; userId?: string }[]> {
  try {
    const keys = await kv.keys(getAllConnectionsPattern())
    const connections: { apiKey: string; lastPing: number; userId?: string }[] = []
    
    for (const key of keys) {
      const data = await kv.get<{ lastPing: number; userId?: string }>(key)
      if (data) {
        const apiKey = key.replace("rivet:conn:", "")
        connections.push({ apiKey, ...data })
      }
    }
    
    return connections
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, apiKey, data, source } = body

    if (source === "roblox") {
      if (!apiKey) {
        return NextResponse.json({ error: "API key required" }, { status: 401 })
      }

      const connKey = getConnectionKey(apiKey)

      if (action === "connect") {
        await kv.set(connKey, { lastPing: Date.now(), userId: data?.userId }, { ex: CONNECTION_TTL })
        return NextResponse.json({ success: true, message: "Connected" })
      }

      if (action === "ping") {
        const conn = await kv.get(connKey)
        if (conn) {
          await kv.set(connKey, { ...conn, lastPing: Date.now() }, { ex: CONNECTION_TTL })
          return NextResponse.json({ success: true })
        }
        return NextResponse.json({ error: "Not connected" }, { status: 401 })
      }

      if (action === "poll") {
        const conn = await kv.get(connKey)
        if (!conn) {
          return NextResponse.json({ connected: false, signals: [] })
        }
        
        await kv.set(connKey, { ...conn, lastPing: Date.now() }, { ex: CONNECTION_TTL })
        
        const signalKey = getSignalQueueKey(apiKey)
        const signals = await kv.lrange<{ id: string; action: string; data: Record<string, unknown> }>(signalKey, 0, -1) || []
        
        if (signals.length > 0) {
          await kv.del(signalKey)
        }
        
        return NextResponse.json({ 
          connected: true, 
          signals 
        })
      }

      if (action === "disconnect") {
        await kv.del(connKey)
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
        const { signalAction, signalData, targetApiKey } = data as { 
          signalAction: string
          signalData: Record<string, unknown>
          targetApiKey?: string
        }

        if (!signalAction) {
          return NextResponse.json({ error: "Missing signal action" }, { status: 400 })
        }

        const connections = await getActiveConnections()
        
        if (connections.length === 0) {
          return NextResponse.json({ 
            success: false, 
            error: "No Roblox plugin connected",
            pluginConnected: false 
          })
        }

        const signal = {
          id: crypto.randomUUID(),
          action: signalAction,
          data: signalData || {},
        }

        let sentCount = 0
        for (const conn of connections) {
          if (!targetApiKey || conn.apiKey === targetApiKey) {
            const signalKey = getSignalQueueKey(conn.apiKey)
            await kv.rpush(signalKey, signal)
            await kv.expire(signalKey, SIGNAL_TTL)
            sentCount++
          }
        }

        return NextResponse.json({ 
          success: true, 
          signalId: signal.id,
          pluginConnected: sentCount > 0,
          sentTo: sentCount,
        })
      }

      if (action === "check_connection") {
        const connections = await getActiveConnections()
        const isConnected = connections.length > 0

        return NextResponse.json({ 
          success: true, 
          connected: isConnected,
          connectionCount: connections.length,
        })
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

  const connKey = getConnectionKey(apiKey)
  const conn = await kv.get<{ lastPing: number }>(connKey)
  
  if (!conn) {
    return NextResponse.json({ connected: false, signals: [] })
  }

  await kv.set(connKey, { ...conn, lastPing: Date.now() }, { ex: CONNECTION_TTL })

  const signalKey = getSignalQueueKey(apiKey)
  const signals = await kv.lrange<{ id: string; action: string; data: Record<string, unknown> }>(signalKey, 0, -1) || []
  
  if (signals.length > 0) {
    await kv.del(signalKey)
  }

  return NextResponse.json({ 
    connected: true,
    signals 
  })
}
