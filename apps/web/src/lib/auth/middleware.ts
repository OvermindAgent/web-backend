import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "./session"
import { validateApiKey } from "./keys"
import { type User, type Tier } from "../db/kv"

export interface AuthResult {
  userId: string
  user?: User
  tier: Tier
}

export async function authenticate(request: NextRequest): Promise<AuthResult | null> {
  if (process.env.NODE_ENV === "development") {
    const { db } = await import("../db/kv")
    let user = await db.getUser("dev-user-001")
    
    if (!user) {
      const now = Date.now()
      user = {
        id: "dev-user-001",
        email: "dev@overmind.local",
        passwordHash: "",
        displayName: "Dev User",
        createdAt: now,
        updatedAt: now,
        tier: "free",
        billingCycle: null,
        subscriptionExpiresAt: null,
        autoRenew: false,
        gracePeriodEndsAt: null,
        paymentFailedAt: null,
        creditsUsedToday: 0,
        creditsLastReset: now,
        requestsThisMinute: 0,
        minuteStartTime: now,
        dismissedTierWarning: false,
      }
      await db.createUser(user)
    }
    
    return { 
      userId: "dev-user-001", 
      user,
      tier: user.tier || "free",
    }
  }

  const authHeader = request.headers.get("authorization")
  
  if (authHeader?.startsWith("Bearer ")) {
    const key = authHeader.slice(7)
    const result = await validateApiKey(key)
    if (result.valid && result.userId) {
      const user = await getUserWithTier(result.userId)
      return { 
        userId: result.userId,
        user: user || undefined,
        tier: user?.tier || "free",
      }
    }
  }
  
  const user = await getCurrentUser()
  if (user) {
    return { 
      userId: user.id,
      user,
      tier: user.tier || "free",
    }
  }
  
  return null
}

async function getUserWithTier(userId: string): Promise<User | null> {
  const { db } = await import("../db/kv")
  return await db.getUser(userId)
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export function forbidden(message: string = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function rateLimited(resetsAt: number): NextResponse {
  return NextResponse.json(
    { 
      error: "Rate limit exceeded", 
      resetsAt,
      upgrade: true,
      message: "You've hit your rate limit. Upgrade your plan for higher limits!",
    }, 
    { status: 429 }
  )
}

export function insufficientCredits(): NextResponse {
  return NextResponse.json(
    { 
      error: "Insufficient credits", 
      upgrade: true,
      message: "You've used all your credits for today. Upgrade for more!",
    }, 
    { status: 402 }
  )
}
