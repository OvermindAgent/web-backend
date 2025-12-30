import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { validateApiKey } from "@/lib/auth/keys"
import { db, type Task } from "@/lib/db/kv"
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
    
    const tasks = await db.getProjectTasks(projectId)
    
    return NextResponse.json({ tasks })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { projectId, title, description } = await request.json()
    
    if (!projectId || !title) {
      return NextResponse.json({ error: "Project ID and title are required" }, { status: 400 })
    }
    
    const task: Task = {
      id: generateId(),
      projectId,
      userId: auth.userId,
      title,
      description,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    await db.createTask(task)
    
    return NextResponse.json({ task })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { id, status, title, description } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }
    
    const updates: Partial<Task> = {}
    if (status) updates.status = status
    if (title) updates.title = title
    if (description !== undefined) updates.description = description
    
    await db.updateTask(id, updates)
    const task = await db.getTask(id)
    
    return NextResponse.json({ task })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}
