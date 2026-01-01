import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth/session"
import { db } from "@/lib/db/kv"

async function getAuthenticatedUser() {
  if (process.env.NODE_ENV === "development") {
    let user = await db.getUser("dev-user-001")
    if (!user) {
      user = {
        id: "dev-user-001",
        email: "dev@overmind.local",
        passwordHash: "",
        displayName: "Dev User",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tier: "free",
        billingCycle: null,
        subscriptionExpiresAt: null,
        autoRenew: false,
        gracePeriodEndsAt: null,
        paymentFailedAt: null,
        creditsUsedToday: 0,
        creditsLastReset: Date.now(),
        requestsThisMinute: 0,
        minuteStartTime: Date.now(),
        dismissedTierWarning: false,
        preferredProvider: "chat.gpt-chatbot.ru",
      }
      await db.createUser(user)
    }
    return user
  }
  return await getCurrentUser()
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
        preferredProvider: user.preferredProvider,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email, displayName, preferredProvider } = await request.json()

    const updates: { email?: string; displayName?: string; preferredProvider?: string } = {}

    if (email && email !== user.email) {
      const emailLower = email.toLowerCase()
      const existing = await db.getUserByEmail(emailLower)
      if (existing && existing.id !== user.id) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 })
      }
      updates.email = emailLower
    }

    if (displayName && displayName !== user.displayName) {
      updates.displayName = displayName
    }

    if (preferredProvider !== undefined) {
      updates.preferredProvider = preferredProvider
    }

    if (Object.keys(updates).length > 0) {
      await db.updateUser(user.id, updates)
    }

    const updatedUser = await db.getUser(user.id)

    return NextResponse.json({
      user: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        displayName: updatedUser?.displayName,
        createdAt: updatedUser?.createdAt,
        preferredProvider: updatedUser?.preferredProvider,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { oldPassword, newPassword, confirmPassword } = await request.json()

    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "All password fields are required" }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New passwords do not match" }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    if (process.env.NODE_ENV !== "development") {
      const isValid = await verifyPassword(oldPassword, user.passwordHash)
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }
    }

    const newPasswordHash = await hashPassword(newPassword)
    await db.updateUser(user.id, { passwordHash: newPasswordHash })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}
