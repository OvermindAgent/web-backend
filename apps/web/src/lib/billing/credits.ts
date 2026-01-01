import { type Tier, getDailyCredits, TIERS } from "./tiers"
import { getModelCost } from "./models"

export { getDailyCredits }

export interface CreditStatus {
  available: number
  used: number
  total: number
  isFridayBonus: boolean
  bonusAmount: number
  resetsAt: number
}

export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const d1 = new Date(timestamp1)
  const d2 = new Date(timestamp2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

export function getNextResetTime(): number {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow.getTime()
}

export function calculateCreditStatus(
  tier: Tier,
  creditsUsedToday: number,
  creditsLastReset: number
): CreditStatus {
  const now = Date.now()
  const needsReset = !isSameDay(creditsLastReset, now)
  
  const isFriday = new Date().getDay() === 5
  const config = TIERS[tier]
  const bonusAmount = isFriday ? config.fridayBonusCredits : 0
  const total = getDailyCredits(tier)
  
  const used = needsReset ? 0 : creditsUsedToday
  const available = Math.max(0, total - used)
  
  return {
    available,
    used,
    total,
    isFridayBonus: isFriday && bonusAmount > 0,
    bonusAmount,
    resetsAt: getNextResetTime(),
  }
}

export function canUseCredits(
  tier: Tier,
  creditsUsedToday: number,
  creditsLastReset: number,
  modelId?: string
): boolean {
  const cost = modelId ? getModelCost(modelId) : 1
  const status = calculateCreditStatus(tier, creditsUsedToday, creditsLastReset)
  return status.available >= cost
}

export function calculateCreditCost(modelId: string): number {
  return getModelCost(modelId)
}

export interface RateLimitStatus {
  allowed: boolean
  remaining: number
  limit: number
  resetsAt: number
}

export function checkRateLimit(
  tier: Tier,
  requestsThisMinute: number,
  minuteStartTime: number
): RateLimitStatus {
  const now = Date.now()
  const limit = TIERS[tier].rateLimitPerMinute
  const minuteElapsed = now - minuteStartTime >= 60000
  
  const currentRequests = minuteElapsed ? 0 : requestsThisMinute
  const remaining = Math.max(0, limit - currentRequests)
  
  return {
    allowed: remaining > 0,
    remaining,
    limit,
    resetsAt: minuteElapsed ? now + 60000 : minuteStartTime + 60000,
  }
}
