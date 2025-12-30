import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { validateApiKey } from "@/lib/auth/keys"
import { db, type Project } from "@/lib/db/kv"
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
    
    const projects = await db.getUserProjects(auth.userId)
    
    return NextResponse.json({ projects })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { name, description } = await request.json()
    
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    
    const project: Project = {
      id: generateId(),
      userId: auth.userId,
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    await db.createProject(project)
    
    return NextResponse.json({ project })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}
