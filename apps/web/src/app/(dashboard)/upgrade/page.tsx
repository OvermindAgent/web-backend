"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  Crown, 
  Sparkles, 
  Check, 
  Zap, 
  ArrowLeft,
  CreditCard,
  Building2,
  Rocket,
  ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TIERS as TIER_CONFIG, type Tier, type BillingCycle } from "@/lib/billing/tiers"

interface TierUI {
  id: Tier
  icon: React.ReactNode
  gradient: string
  bgGradient: string
  borderColor: string
  highlighted?: boolean
  badge?: string
  badgeColor?: string
}

const TIER_UI: Record<Tier, TierUI> = {
  free: {
    id: "free",
    icon: <Zap className="w-5 h-5" />,
    gradient: "from-slate-500 to-slate-600",
    bgGradient: "from-slate-500/5 to-slate-600/5",
    borderColor: "border-slate-500/20",
  },
  pro: {
    id: "pro",
    icon: <Rocket className="w-5 h-5" />,
    gradient: "from-violet-500 to-purple-600",
    bgGradient: "from-violet-500/10 to-purple-600/10",
    borderColor: "border-violet-500/30",
    highlighted: true,
    badge: "Most Popular",
    badgeColor: "from-violet-600 to-purple-600",
  },
  studio: {
    id: "studio",
    icon: <Building2 className="w-5 h-5" />,
    gradient: "from-amber-500 to-orange-600",
    bgGradient: "from-amber-500/10 to-orange-600/10",
    borderColor: "border-amber-500/30",
    badge: "Best Value",
    badgeColor: "from-amber-500 to-orange-500",
  },
}

export default function UpgradePage() {
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")
  const [currentTier, setCurrentTier] = useState<Tier>("free")
  const [currentCycle, setCurrentCycle] = useState<BillingCycle | null>(null)
  const [loading, setLoading] = useState<Tier | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchCurrentTier()
  }, [])

  async function fetchCurrentTier() {
    try {
      const res = await fetch("/api/billing")
      const data = await res.json()
      if (data.tier) {
        setCurrentTier(data.tier)
        setCurrentCycle(data.tierConfig?.billingCycle || null)
      }
    } catch {}
  }

  async function handleSubscribe(tier: Tier) {
    if (tier === "free") return
    
    const isSameTierDifferentCycle = tier === currentTier && billingCycle !== currentCycle
    const isUpgrade = tier !== currentTier
    
    if (!isUpgrade && !isSameTierDifferentCycle) return
    
    setLoading(tier)
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upgrade",
          tier,
          cycle: billingCycle,
        }),
      })
      
      const data = await res.json()
      
      if (data.success) {
        setSuccessMessage(data.message)
        setCurrentTier(tier)
        setCurrentCycle(billingCycle)
        setTimeout(() => setSuccessMessage(null), 3000)
      } else if (data.redirectTo) {
        router.push(data.redirectTo)
      }
    } catch (error) {
      console.error("upgrade failed:", error)
    } finally {
      setLoading(null)
    }
  }

  function getPrice(tierId: Tier) {
    const tier = TIER_CONFIG[tierId]
    if (tier.price === 0) return "0"
    return billingCycle === "yearly" 
      ? (tier.yearlyPrice / 12).toFixed(2) 
      : tier.price.toFixed(2)
  }

  function getTotalPrice(tierId: Tier) {
    const tier = TIER_CONFIG[tierId]
    return billingCycle === "yearly" ? tier.yearlyPrice : tier.price
  }

  function canPurchase(tierId: Tier) {
    if (tierId === "free") return false
    if (tierId !== currentTier) return true
    return billingCycle !== currentCycle
  }

  function getButtonText(tierId: Tier) {
    const tier = TIER_CONFIG[tierId]
    if (tierId === "free") {
      return currentTier === "free" ? "Current Plan" : "Free Forever"
    }
    if (loading === tierId) return "Processing..."
    if (tierId === currentTier && billingCycle === currentCycle) return "Current Plan"
    if (tierId === currentTier && billingCycle !== currentCycle) {
      return billingCycle === "yearly" ? "Switch to Yearly" : "Switch to Monthly"
    }
    return `Get ${tier.name}`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,rgba(139,92,246,0.12),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.08),transparent_40%)]" />
      
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Button 
          variant="ghost" 
          className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-center animate-fade-in backdrop-blur-sm">
            <Check className="w-5 h-5 inline-block mr-2" />
            {successMessage}
          </div>
        )}

        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 text-sm mb-5 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            <span>Supercharge your workflow</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
            Choose Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400">
              Plan
            </span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Unlock more credits, higher rate limits, and priority support
          </p>
        </div>

        <div className="flex justify-center mb-10 sm:mb-14">
          <div className="inline-flex items-center p-1.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "px-5 sm:px-8 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                billingCycle === "monthly"
                  ? "bg-white text-black shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={cn(
                "px-5 sm:px-8 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2",
                billingCycle === "yearly"
                  ? "bg-white text-black shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-semibold transition-colors",
                billingCycle === "yearly"
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-500/20 text-emerald-400"
              )}>
                -17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 max-w-5xl mx-auto">
          {(["free", "pro", "studio"] as Tier[]).map((tierId) => {
            const tier = TIER_CONFIG[tierId]
            const ui = TIER_UI[tierId]
            const isCurrentPlan = currentTier === tierId && billingCycle === currentCycle
            const purchasable = canPurchase(tierId)
            
            return (
              <div
                key={tierId}
                className={cn(
                  "relative group rounded-3xl p-[1px] transition-all duration-300",
                  ui.highlighted && "md:-mt-4 md:mb-4",
                  ui.highlighted 
                    ? "bg-gradient-to-b from-violet-500/50 via-purple-500/20 to-transparent"
                    : "bg-gradient-to-b from-white/10 to-transparent"
                )}
              >
                {ui.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r text-white shadow-lg",
                      ui.badgeColor
                    )}>
                      {ui.badge}
                    </span>
                  </div>
                )}

                <div className={cn(
                  "relative h-full rounded-3xl p-6 sm:p-7 backdrop-blur-xl transition-all duration-300",
                  `bg-gradient-to-b ${ui.bgGradient}`,
                  "bg-[#111118]",
                  ui.highlighted && "shadow-2xl shadow-violet-500/10"
                )}>
                  {isCurrentPlan && (
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Current
                      </span>
                    </div>
                  )}

                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center mb-5 bg-gradient-to-br text-white",
                    ui.gradient
                  )}>
                    {ui.icon}
                  </div>

                  <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>

                  <div className="mb-6">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl sm:text-5xl font-bold tracking-tight">
                        ${getPrice(tierId)}
                      </span>
                      <span className="text-muted-foreground mb-1.5">/mo</span>
                    </div>
                    {tier.price > 0 && billingCycle === "yearly" && (
                      <p className="text-sm text-muted-foreground mt-1.5">
                        ${tier.yearlyPrice.toFixed(2)} billed yearly
                      </p>
                    )}
                  </div>

                  <Button
                    className={cn(
                      "w-full h-11 rounded-xl font-semibold transition-all duration-200 gap-2",
                      tierId === "free" 
                        ? "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
                        : ui.highlighted
                          ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25"
                          : "bg-white text-black hover:bg-white/90"
                    )}
                    disabled={!purchasable || loading !== null}
                    onClick={() => handleSubscribe(tierId)}
                  >
                    {getButtonText(tierId)}
                    {purchasable && tierId !== "free" && <ArrowRight className="w-4 h-4" />}
                  </Button>

                  <div className="mt-6 pt-6 border-t border-white/5">
                    <ul className="space-y-3">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                            tierId === "free" 
                              ? "bg-slate-500/20 text-slate-400"
                              : ui.highlighted
                                ? "bg-violet-500/20 text-violet-400"
                                : "bg-amber-500/20 text-amber-400"
                          )}>
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-16 sm:mt-20">
          <h2 className="text-xl font-bold text-center mb-8">Payment Methods</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto">
            <div className="flex-1 flex items-center gap-4 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Stripe</p>
                <p className="text-xs text-muted-foreground">Cards & More</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-4 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-[#0070ba] flex items-center justify-center">
                <span className="text-white font-bold text-sm">PP</span>
              </div>
              <div>
                <p className="font-medium">PayPal</p>
                <p className="text-xs text-muted-foreground">PayPal Balance</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Questions? <span className="text-violet-400 hover:text-violet-300 cursor-pointer">Contact Support</span></p>
        </div>
      </div>
    </div>
  )
}
