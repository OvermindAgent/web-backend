export type Tier = "free" | "pro" | "studio"
export type BillingCycle = "monthly" | "yearly"

export interface TierConfig {
  id: Tier
  name: string
  description: string
  price: number
  yearlyPrice: number
  creditsPerDay: number
  fridayBonusCredits: number
  rateLimitPerMinute: number
  features: string[]
  highlighted?: boolean
}

export const TIERS: Record<Tier, TierConfig> = {
  free: {
    id: "free",
    name: "Free",
    description: "Perfect for hobbyists and beginners",
    price: 0,
    yearlyPrice: 0,
    creditsPerDay: 150,
    fridayBonusCredits: 0,
    rateLimitPerMinute: 15,
    features: [
      "150 credits per day",
      "All current AI tools",
      "File & folder operations",
      "Task management",
      "Roblox object manipulation",
      "Community support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For independent developers and small teams",
    price: 9.99,
    yearlyPrice: 99.90,
    creditsPerDay: 500,
    fridayBonusCredits: 50,
    rateLimitPerMinute: 30,
    highlighted: true,
    features: [
      "500 credits per day",
      "+50 bonus credits on Fridays",
      "Everything in Free",
      "Higher rate limits",
      "Priority support",
    ],
  },
  studio: {
    id: "studio",
    name: "Studio",
    description: "For agencies and professional studios",
    price: 19.99,
    yearlyPrice: 199.90,
    creditsPerDay: 1500,
    fridayBonusCredits: 500,
    rateLimitPerMinute: 60,
    features: [
      "1,500 credits per day",
      "+500 bonus credits on Fridays",
      "Everything in Pro",
      "Highest rate limits",
      "Dedicated support",
    ],
  },
}

export const TIER_ORDER: Tier[] = ["free", "pro", "studio"]

export const GRACE_PERIOD_DAYS = 3

export const AUTO_RENEWAL_NAME = "Auto-Renew"

export function getTier(id: Tier): TierConfig {
  return TIERS[id] || TIERS.free
}

export function getTierIndex(tier: Tier): number {
  return TIER_ORDER.indexOf(tier)
}

export function hasMinimumTier(userTier: Tier, requiredTier: Tier): boolean {
  return getTierIndex(userTier) >= getTierIndex(requiredTier)
}

export function getYearlySavings(tier: Tier): number {
  const config = TIERS[tier]
  const monthlyTotal = config.price * 12
  const yearlySavings = monthlyTotal - config.yearlyPrice
  return Math.round(yearlySavings * 100) / 100
}

export function getYearlySavingsPercent(tier: Tier): number {
  const config = TIERS[tier]
  if (config.price === 0) return 0
  const monthlyTotal = config.price * 12
  return Math.round(((monthlyTotal - config.yearlyPrice) / monthlyTotal) * 100)
}

export function isFriday(): boolean {
  return new Date().getDay() === 5
}

export function getDailyCredits(tier: Tier): number {
  const config = TIERS[tier]
  const base = config.creditsPerDay
  const bonus = isFriday() ? config.fridayBonusCredits : 0
  return base + bonus
}
