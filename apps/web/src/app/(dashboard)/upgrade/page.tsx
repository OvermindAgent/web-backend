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
  ArrowRight,
  Shield,
  Infinity,
  Clock,
  HeadphonesIcon,
  Star
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TIERS as TIER_CONFIG, type Tier, type BillingCycle } from "@/lib/billing/tiers"

interface TierUI {
  id: Tier
  icon: React.ReactNode
  gradient: string
  glowColor: string
  accentColor: string
  iconBg: string
  highlighted?: boolean
  badge?: string
}

const TIER_UI: Record<Tier, TierUI> = {
  free: {
    id: "free",
    icon: <Zap className="w-6 h-6" />,
    gradient: "from-slate-600 via-slate-500 to-slate-600",
    glowColor: "shadow-slate-500/20",
    accentColor: "text-slate-400",
    iconBg: "from-slate-500 to-slate-600",
  },
  pro: {
    id: "pro",
    icon: <Rocket className="w-6 h-6" />,
    gradient: "from-violet-600 via-purple-500 to-fuchsia-600",
    glowColor: "shadow-violet-500/40",
    accentColor: "text-violet-400",
    iconBg: "from-violet-500 to-fuchsia-500",
    highlighted: true,
    badge: "MOST POPULAR",
  },
  studio: {
    id: "studio",
    icon: <Crown className="w-6 h-6" />,
    gradient: "from-amber-500 via-orange-500 to-yellow-500",
    glowColor: "shadow-amber-500/40",
    accentColor: "text-amber-400",
    iconBg: "from-amber-500 to-orange-500",
    badge: "BEST VALUE",
  },
}

const TRUST_BADGES = [
  { icon: <Shield className="w-5 h-5" />, text: "Secure Payments" },
  { icon: <Clock className="w-5 h-5" />, text: "Cancel Anytime" },
  { icon: <HeadphonesIcon className="w-5 h-5" />, text: "24/7 Support" },
]

export default function UpgradePage() {
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly")
  const [currentTier, setCurrentTier] = useState<Tier>("free")
  const [currentCycle, setCurrentCycle] = useState<BillingCycle | null>(null)
  const [loading, setLoading] = useState<Tier | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [hoveredTier, setHoveredTier] = useState<Tier | null>(null)

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
      ? (tier.yearlyPrice / 12).toFixed(0) 
      : tier.price.toFixed(0)
  }

  function getOriginalPrice(tierId: Tier) {
    const tier = TIER_CONFIG[tierId]
    return tier.price.toFixed(0)
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
    return `Upgrade to ${tier.name}`
  }

  function getSavingsPercent(tierId: Tier) {
    const tier = TIER_CONFIG[tierId]
    if (tier.price === 0) return 0
    const monthlyTotal = tier.price * 12
    const savings = ((monthlyTotal - tier.yearlyPrice) / monthlyTotal) * 100
    return Math.round(savings)
  }

  return (
    <div className="min-h-screen bg-[#08080c] overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.15),transparent)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(249,115,22,0.08),transparent_50%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(168,85,247,0.08),transparent_50%)]" />
      
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Button 
          variant="ghost" 
          className="mb-8 gap-2 text-muted-foreground hover:text-foreground group"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Dashboard
        </Button>

        {successMessage && (
          <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-center animate-fade-in backdrop-blur-sm">
            <Check className="w-5 h-5 inline-block mr-2" />
            {successMessage}
          </div>
        )}

        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-full text-violet-300 text-sm mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="font-medium">Limited Time: Save up to 17% with yearly billing</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 tracking-tight">
            Unlock Your Full{" "}
            <span className="relative">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400">
                Potential
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                <path d="M2 6C50 2 150 2 198 6" stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="200" y2="0">
                    <stop stopColor="#8b5cf6"/>
                    <stop offset="0.5" stopColor="#a855f7"/>
                    <stop offset="1" stopColor="#d946ef"/>
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Join thousands of developers building amazing experiences with Overmind
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="relative inline-flex items-center p-1.5 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-xl">
            <div 
              className={cn(
                "absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 transition-all duration-300 ease-out",
                billingCycle === "monthly" ? "left-1.5 w-[calc(50%-6px)]" : "left-[calc(50%+2px)] w-[calc(50%-6px)]"
              )}
            />
            <button
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "relative z-10 px-6 sm:px-10 py-3 rounded-xl text-sm font-semibold transition-colors duration-200",
                billingCycle === "monthly" ? "text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={cn(
                "relative z-10 px-6 sm:px-10 py-3 rounded-xl text-sm font-semibold transition-colors duration-200 flex items-center gap-2",
                billingCycle === "yearly" ? "text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-bold transition-all",
                billingCycle === "yearly"
                  ? "bg-emerald-400 text-emerald-950"
                  : "bg-emerald-500/20 text-emerald-400"
              )}>
                SAVE 17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto mb-16">
          {(["free", "pro", "studio"] as Tier[]).map((tierId) => {
            const tier = TIER_CONFIG[tierId]
            const ui = TIER_UI[tierId]
            const isCurrentPlan = currentTier === tierId && billingCycle === currentCycle
            const purchasable = canPurchase(tierId)
            const isHovered = hoveredTier === tierId
            const savings = getSavingsPercent(tierId)
            
            return (
              <div
                key={tierId}
                onMouseEnter={() => setHoveredTier(tierId)}
                onMouseLeave={() => setHoveredTier(null)}
                className={cn(
                  "relative group transition-all duration-500",
                  ui.highlighted && "lg:-mt-6 lg:mb-6 z-10"
                )}
              >
                {ui.highlighted && (
                  <div className="absolute -inset-[1px] bg-gradient-to-b from-violet-500 via-purple-500/50 to-transparent rounded-3xl opacity-100" />
                )}
                
                {ui.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-black tracking-wider shadow-2xl",
                      tierId === "pro" 
                        ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-violet-500/50" 
                        : "bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-amber-500/50"
                    )}>
                      {ui.badge}
                    </span>
                  </div>
                )}

                <div className={cn(
                  "relative h-full rounded-3xl p-8 backdrop-blur-xl transition-all duration-500",
                  "bg-gradient-to-b from-white/[0.08] to-white/[0.02]",
                  "border border-white/10",
                  ui.highlighted && "bg-gradient-to-b from-white/[0.12] to-white/[0.04] border-violet-500/30",
                  isHovered && !ui.highlighted && "border-white/20 shadow-2xl",
                  isHovered && ui.highlighted && "shadow-2xl shadow-violet-500/20"
                )}>
                  
                  {isCurrentPlan && (
                    <div className="absolute top-4 right-4">
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Check className="w-3 h-3" />
                        Current
                      </span>
                    </div>
                  )}

                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br text-white shadow-lg transition-transform duration-300",
                    ui.iconBg,
                    ui.glowColor,
                    isHovered && "scale-110"
                  )}>
                    {ui.icon}
                  </div>

                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground mb-8 min-h-[40px]">{tier.description}</p>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl sm:text-6xl font-bold tracking-tight">
                        ${getPrice(tierId)}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-sm">/month</span>
                        {billingCycle === "yearly" && tier.price > 0 && (
                          <span className="text-xs text-muted-foreground/60 line-through">
                            ${getOriginalPrice(tierId)}
                          </span>
                        )}
                      </div>
                    </div>
                    {tier.price > 0 && billingCycle === "yearly" && (
                      <p className="text-sm text-emerald-400 mt-2 font-medium">
                        Save ${(tier.price * 12 - tier.yearlyPrice).toFixed(0)}/year
                      </p>
                    )}
                    {tier.price === 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Free forever, no credit card required
                      </p>
                    )}
                  </div>

                  <Button
                    className={cn(
                      "w-full h-12 rounded-xl font-bold transition-all duration-300 gap-2 text-base",
                      tierId === "free" 
                        ? "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
                        : ui.highlighted
                          ? "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 text-white shadow-xl shadow-violet-500/30 hover:shadow-violet-500/40 hover:scale-[1.02]"
                          : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold shadow-xl shadow-amber-500/30 hover:shadow-amber-500/40 hover:scale-[1.02]"
                    )}
                    disabled={!purchasable || loading !== null}
                    onClick={() => handleSubscribe(tierId)}
                  >
                    {loading === tierId ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {getButtonText(tierId)}
                        {purchasable && tierId !== "free" && <ArrowRight className="w-4 h-4" />}
                      </>
                    )}
                  </Button>

                  <div className="mt-8 pt-8 border-t border-white/10">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      What's included
                    </p>
                    <ul className="space-y-3.5">
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
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </div>
                          <span className="text-foreground/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {ui.highlighted && (
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-violet-500/10 via-transparent to-fuchsia-500/10 pointer-events-none" />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap justify-center gap-8 mb-16">
          {TRUST_BADGES.map((badge, idx) => (
            <div key={idx} className="flex items-center gap-3 text-muted-foreground">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                {badge.icon}
              </div>
              <span className="text-sm font-medium">{badge.text}</span>
            </div>
          ))}
        </div>

        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold text-center mb-6">Secure Payment Methods</h2>
          <div className="flex gap-4">
            <div className="flex-1 flex items-center gap-4 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm hover:bg-white/[0.08] transition-colors group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold">Stripe</p>
                <p className="text-xs text-muted-foreground">Cards & More</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-4 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm hover:bg-white/[0.08] transition-colors group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-[#0070ba] flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-lg">PP</span>
              </div>
              <div>
                <p className="font-semibold">PayPal</p>
                <p className="text-xs text-muted-foreground">PayPal Balance</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Questions?{" "}
            <button className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Contact our support team
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
