import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { createApiKey, getUserApiKeys, revokeApiKey, decryptapikey } from "@/lib/auth/keys"
import { db } from "@/lib/db/kv"

export async function GET() {
  try {
    let userId: string
    
    if (process.env.NODE_ENV === "development") {
      userId = "dev-user-001"
    } else {
      const user = await getCurrentUser()
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = user.id
    }
    
    const keys = await getUserApiKeys(userId)
    
    return NextResponse.json({
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        expiresAt: k.expiresAt,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    let userId: string
    
    if (process.env.NODE_ENV === "development") {
      userId = "dev-user-001"
    } else {
      const user = await getCurrentUser()
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = user.id
    }
    
    const { name, expiresInDays } = await request.json()
    
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    
    const expiresAt = expiresInDays ? Date.now() + expiresInDays * 24 * 60 * 60 * 1000 : null
    const { apiKey, plainKey } = await createApiKey(userId, name, expiresAt)
    
    return NextResponse.json({
      key: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      plainKey,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let userId: string
    
    if (process.env.NODE_ENV === "development") {
      userId = "dev-user-001"
    } else {
      const user = await getCurrentUser()
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = user.id
    }
    
    const { id } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: "Key ID is required" }, { status: 400 })
    }
    
    const apiKey = await db.getApiKey(id)
    
    if (!apiKey || apiKey.userId !== userId) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 })
    }
    
    if (apiKey.revoked) {
      return NextResponse.json({ error: "Key has been revoked" }, { status: 400 })
    }
    
    if (!apiKey.encryptedKey) {
      return NextResponse.json({ error: "Key cannot be recovered" }, { status: 400 })
    }
    
    const decryptedKey = decryptapikey(apiKey.encryptedKey)
    
    if (!decryptedKey) {
      return NextResponse.json({ error: "Failed to decrypt key" }, { status: 500 })
    }
    
    return NextResponse.json({ key: decryptedKey })
  } catch {
    return NextResponse.json({ error: "Failed to get key" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let userId: string
    
    if (process.env.NODE_ENV === "development") {
      userId = "dev-user-001"
    } else {
      const user = await getCurrentUser()
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = user.id
    }
    
    const { id } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: "Key ID is required" }, { status: 400 })
    }
    
    const success = await revokeApiKey(id, userId)
    if (!success) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 })
  }
}
