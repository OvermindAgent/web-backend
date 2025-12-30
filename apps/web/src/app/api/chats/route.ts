import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { validateApiKey } from "@/lib/auth/keys"
import { db, type Chat, type ChatMessage } from "@/lib/db/kv"
import { generateId } from "@/lib/utils"

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

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const projectId = request.nextUrl.searchParams.get("projectId")
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }
    
    const chats = await db.getProjectChats(projectId)
    
    return NextResponse.json({ chats })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { projectId, name } = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }
    
    const chat: Chat = {
      id: generateId(),
      projectId,
      userId: auth.userId,
      name: name || "New Chat",
      messages: [],
      messageCount: 0,
      manuallyRenamed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    await db.createChat(chat)
    
    return NextResponse.json({ chat })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { id, name, manuallyRenamed, message } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: "Chat ID is required" }, { status: 400 })
    }

    if (message) {
      const chatMessage: ChatMessage = {
        id: generateId(),
        role: message.role,
        content: message.content,
        reasoning: message.reasoning,
        createdAt: Date.now(),
      }
      
      const updatedChat = await db.addMessageToChat(id, chatMessage)
      return NextResponse.json({ chat: updatedChat })
    }
    
    const updates: Partial<Chat> = {}
    if (name !== undefined) updates.name = name
    if (manuallyRenamed !== undefined) updates.manuallyRenamed = manuallyRenamed
    
    await db.updateChat(id, updates)
    const chat = await db.getChat(id)
    
    return NextResponse.json({ chat })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update chat" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const id = request.nextUrl.searchParams.get("id")
    
    if (!id) {
      return NextResponse.json({ error: "Chat ID is required" }, { status: 400 })
    }
    
    await db.deleteChat(id)
    
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 })
  }
}
