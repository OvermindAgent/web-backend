import { NextRequest, NextResponse } from "next/server"
import { authenticate } from "@/lib/auth/middleware"
import { db } from "@/lib/db/kv"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, apiKey, data, source } = body

    if (source === "roblox") {
      if (!apiKey) {
        return NextResponse.json({ error: "API key required" }, { status: 401 })
      }

      if (action === "connect") {
        await db.setRivetConnection(apiKey, { lastPing: Date.now(), userId: data?.userId })
        return NextResponse.json({ success: true, message: "Connected" })
      }

      if (action === "ping") {
        const conn = await db.getRivetConnection(apiKey)
        if (conn) {
          await db.setRivetConnection(apiKey, { ...conn, lastPing: Date.now() })
          return NextResponse.json({ success: true })
        }
        return NextResponse.json({ error: "Not connected" }, { status: 401 })
      }

      if (action === "poll") {
        const conn = await db.getRivetConnection(apiKey)
        if (!conn) {
          return NextResponse.json({ connected: false, signals: [] })
        }
        
        await db.setRivetConnection(apiKey, { ...conn, lastPing: Date.now() })
        const signals = await db.popRivetSignals(apiKey)
        
        return NextResponse.json({ 
          connected: true, 
          signals 
        })
      }

      if (action === "disconnect") {
        await db.deleteRivetConnection(apiKey)
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

        const connections = await db.getActiveRivetConnections()
        
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
            await db.pushRivetSignal(conn.apiKey, signal)
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
        const connections = await db.getActiveRivetConnections()
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

  const conn = await db.getRivetConnection(apiKey)
  
  if (!conn) {
    return NextResponse.json({ connected: false, signals: [] })
  }

  await db.setRivetConnection(apiKey, { ...conn, lastPing: Date.now() })
  const signals = await db.popRivetSignals(apiKey)

  return NextResponse.json({ 
    connected: true,
    signals 
  })
}
