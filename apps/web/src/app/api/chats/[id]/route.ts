import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { validateApiKey } from "@/lib/auth/keys"
import { db } from "@/lib/db/kv"

async function authenticate(request: NextRequest): Promise<{ userId: string } | null> {
  if (process.env.NODE_ENV === "development") {
    return { userId: "dev-user-001" }
  }

  const authHeader = request.headers.get("authorization")
  
  if (authHeader?.startsWith("Bearer ")) {
    const key = authHeader.slice(7)
    const result = await validateApiKey(key)
    if (result.valid && result.userId) {
      return { userId: result.userId }
    }
  }
  
  const user = await getCurrentUser()
  if (user) {
    return { userId: user.id }
  }
  
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { id } = await params
    const chat = await db.getChat(id)
    
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }
    
    if (chat.userId !== auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
    
    return NextResponse.json({ chat })
  } catch (error) {
    console.error("Error fetching chat:", error)
    return NextResponse.json({ error: "Failed to fetch chat" }, { status: 500 })
  }
}
