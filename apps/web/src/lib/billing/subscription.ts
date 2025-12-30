import { type Tier, type BillingCycle, GRACE_PERIOD_DAYS } from "./tiers"
import { db, type User } from "../db/kv"

export interface SubscriptionStatus {
  tier: Tier
  isActive: boolean
  isInGracePeriod: boolean
  gracePeriodEndsAt: number | null
  expiresAt: number | null
  autoRenew: boolean
  paymentFailed: boolean
}

export function getSubscriptionStatus(user: User): SubscriptionStatus {
  const now = Date.now()
  
  if (user.tier === "free") {
    return {
      tier: "free",
      isActive: true,
      isInGracePeriod: false,
      gracePeriodEndsAt: null,
      expiresAt: null,
      autoRenew: false,
      paymentFailed: false,
    }
  }
  
  const isExpired = user.subscriptionExpiresAt && user.subscriptionExpiresAt < now
  const isInGracePeriod = user.gracePeriodEndsAt && user.gracePeriodEndsAt > now
  const paymentFailed = !!user.paymentFailedAt
  
  return {
    tier: user.tier,
    isActive: !isExpired || !!isInGracePeriod,
    isInGracePeriod: !!isInGracePeriod,
    gracePeriodEndsAt: user.gracePeriodEndsAt,
    expiresAt: user.subscriptionExpiresAt,
    autoRenew: user.autoRenew,
    paymentFailed,
  }
}

export function calculateExpirationDate(cycle: BillingCycle): number {
  const now = new Date()
  if (cycle === "monthly") {
    now.setMonth(now.getMonth() + 1)
  } else {
    now.setFullYear(now.getFullYear() + 1)
  }
  return now.getTime()
}

export function calculateGracePeriodEnd(): number {
  const now = new Date()
  now.setDate(now.getDate() + GRACE_PERIOD_DAYS)
  return now.getTime()
}

export async function upgradeTier(
  userId: string,
  newTier: Tier,
  cycle: BillingCycle
): Promise<User | null> {
  const user = await db.getUser(userId)
  if (!user) return null
  
  const updates: Partial<User> = {
    tier: newTier,
    billingCycle: cycle,
    subscriptionExpiresAt: calculateExpirationDate(cycle),
    autoRenew: true,
    gracePeriodEndsAt: null,
    paymentFailedAt: null,
    dismissedTierWarning: false,
  }
  
  await db.updateUser(userId, updates)
  return await db.getUser(userId)
}

export async function downgradeTier(userId: string): Promise<User | null> {
  const user = await db.getUser(userId)
  if (!user) return null
  
  const updates: Partial<User> = {
    tier: "free",
    billingCycle: null,
    subscriptionExpiresAt: null,
    autoRenew: false,
    gracePeriodEndsAt: null,
    paymentFailedAt: null,
    dismissedTierWarning: false,
  }
  
  await db.updateUser(userId, updates)
  return await db.getUser(userId)
}

export async function startGracePeriod(userId: string): Promise<User | null> {
  const user = await db.getUser(userId)
  if (!user) return null
  
  const updates: Partial<User> = {
    gracePeriodEndsAt: calculateGracePeriodEnd(),
    paymentFailedAt: Date.now(),
  }
  
  await db.updateUser(userId, updates)
  return await db.getUser(userId)
}

export async function dismissTierWarning(userId: string): Promise<void> {
  await db.updateUser(userId, { dismissedTierWarning: true })
}

export function shouldShowTierWarning(user: User): boolean {
  if (user.dismissedTierWarning) return false
  
  const status = getSubscriptionStatus(user)
  return status.isInGracePeriod || status.paymentFailed
}
