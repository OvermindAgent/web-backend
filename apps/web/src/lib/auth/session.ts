import bcrypt from "bcryptjs"
import { db, type User, type Session } from "../db/kv"
import { AUTH_CONFIG } from "../config"
import { generateId } from "../utils"
import { cookies } from "next/headers"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, AUTH_CONFIG.hashRounds)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createUser(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const existing = await db.getUserByEmail(email)
  if (existing) {
    throw new Error("Email already registered")
  }
  
  const now = Date.now()
  const user: User = {
    id: generateId(),
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    displayName,
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
  return user
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  const user = await db.getUserByEmail(email.toLowerCase())
  if (!user) return null
  
  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) return null
  
  return user
}

export async function createSession(userId: string): Promise<Session> {
  const session: Session = {
    id: generateId(),
    userId,
    expiresAt: Date.now() + AUTH_CONFIG.sessionDuration,
    createdAt: Date.now(),
  }
  
  await db.createSession(session)
  return session
}

export async function getSessionFromCookies(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session")?.value
  if (!sessionId) return null
  
  const session = await db.getSession(sessionId)
  if (!session) return null
  
  if (session.expiresAt < Date.now()) {
    await db.deleteSession(session.id)
    return null
  }
  
  return session
}

export async function getCurrentUser(): Promise<User | null> {
  if (process.env.NODE_ENV === "development") {
    const now = Date.now()
    return {
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
  }

  const session = await getSessionFromCookies()
  if (!session) return null
  
  return await db.getUser(session.userId)
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session")?.value
  if (sessionId) {
    await db.deleteSession(sessionId)
  }
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set("session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_CONFIG.sessionDuration / 1000,
    path: "/",
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete("session")
}
