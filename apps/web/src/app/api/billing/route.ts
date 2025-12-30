import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized } from "@/lib/auth/middleware"
import { upgradeTier, downgradeTier, getSubscriptionStatus, dismissTierWarning } from "@/lib/billing/subscription"
import { type Tier, type BillingCycle, TIERS } from "@/lib/billing/tiers"
import { db } from "@/lib/db/kv"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) return unauthorized()
    
    let user = auth.user
    if (!user) {
      user = await db.getUser(auth.userId) || undefined
    }
    
    if (!user) return unauthorized()
    
    const status = getSubscriptionStatus(user)
    const tierConfig = TIERS[user.tier]
    
    const creditsResponse = {
      used: user.creditsUsedToday,
      total: tierConfig.creditsPerDay,
      available: tierConfig.creditsPerDay - user.creditsUsedToday,
    }
    
    console.log(`[Billing API] User ${user.id} - Credits: used=${user.creditsUsedToday}, total=${tierConfig.creditsPerDay}, available=${creditsResponse.available}`)
    
    return NextResponse.json({
      tier: user.tier,
      tierConfig,
      status,
      credits: creditsResponse,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get billing info" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) return unauthorized()
    
    const { action, tier, cycle } = await request.json()
    
    if (action === "upgrade") {
      if (!tier || !["pro", "studio"].includes(tier)) {
        return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
      }
      
      const billingCycle: BillingCycle = cycle === "yearly" ? "yearly" : "monthly"
      
      if (process.env.NODE_ENV === "development") {
        const updatedUser = await upgradeTier(auth.userId, tier as Tier, billingCycle)
        
        return NextResponse.json({
          success: true,
          message: `Dev mode: Upgraded to ${tier}!`,
          user: updatedUser,
        })
      }
      
      return NextResponse.json({
        success: false,
        redirectTo: `/checkout?tier=${tier}&cycle=${billingCycle}`,
        message: "Redirecting to payment...",
      })
    }
    
    if (action === "downgrade") {
      const updatedUser = await downgradeTier(auth.userId)
      
      return NextResponse.json({
        success: true,
        message: "Downgraded to Free tier",
        user: updatedUser,
      })
    }
    
    if (action === "dismiss_warning") {
      await dismissTierWarning(auth.userId)
      
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Billing action failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
