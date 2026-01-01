"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Brain, Zap, Search, FileCode, Sparkles, Code, Terminal, CheckCircle2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

const features = [
  {
    icon: Zap,
    title: "Real-time AI",
    description: "Instant responses from cutting-edge models"
  },
  {
    icon: Search,
    title: "Web Search",
    description: "Access real-time information"
  },
  {
    icon: FileCode,
    title: "Code Canvas",
    description: "Interactive code visualization"
  },
  {
    icon: Sparkles,
    title: "Academy",
    description: "AI-powered learning"
  },
  {
    icon: Code,
    title: "Multi-Model",
    description: "GPT-4, Claude, and more"
  },
  {
    icon: Terminal,
    title: "Tool Calling",
    description: "Advanced workflows"
  }
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple gradient background */}
      <div className="fixed inset-0 bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative border-b border-white/5 bg-transparent">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-neutral-900" />
              </div>
              <span className="text-lg font-semibold text-white">Overmind</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" className="text-neutral-400 hover:text-white">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button className="bg-white text-neutral-900 hover:bg-neutral-200">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-neutral-400 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Now in public beta
            </div>
            
            <h1 className="text-5xl md:text-6xl font-semibold text-white leading-tight mb-6">
              The AI assistant
              <br />
              <span className="text-neutral-500">built for developers</span>
            </h1>
            
            <p className="text-lg text-neutral-400 mb-8 max-w-xl">
              Overmind combines powerful AI models with integrated tools. Code faster, learn smarter, build better.
            </p>
            
            <div className="flex items-center gap-3">
              <Link href="/register">
                <Button size="lg" className="bg-white text-neutral-900 hover:bg-neutral-200 h-11 px-6">
                  Start for free
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white/10 text-white hover:bg-white/5 h-11 px-6">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-white mb-12">Features</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
              >
                <feature.icon className="w-5 h-5 text-neutral-400 mb-3" />
                <h3 className="font-medium text-white mb-1">{feature.title}</h3>
                <p className="text-sm text-neutral-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Pricing</h2>
          <p className="text-neutral-400 mb-12">Start free. Upgrade when you need more.</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white">Free</h3>
                <div className="text-3xl font-semibold text-white mt-2">$0<span className="text-sm text-neutral-500 font-normal">/mo</span></div>
                <p className="text-sm text-neutral-500 mt-2">150 credits/day</p>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-neutral-600" />
                  Basic models
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-neutral-600" />
                  Limited web search
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-neutral-600" />
                  Community support
                </li>
              </ul>
              <Link href="/register">
                <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                  Get started
                </Button>
              </Link>
            </div>

            {/* Pro */}
            <div className="p-6 rounded-xl bg-white/[0.04] border border-white/10 relative">
              <div className="absolute -top-3 left-4 px-2 py-0.5 bg-white text-neutral-900 text-xs font-medium rounded">
                Popular
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white">Pro</h3>
                <div className="text-3xl font-semibold text-white mt-2">$19<span className="text-sm text-neutral-500 font-normal">/mo</span></div>
                <p className="text-sm text-neutral-500 mt-2">500 credits/day</p>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  All AI models
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Unlimited web search
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Canvas & Academy
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Priority support
                </li>
              </ul>
              <Link href="/register">
                <Button className="w-full bg-white text-neutral-900 hover:bg-neutral-200">
                  Upgrade to Pro
                </Button>
              </Link>
            </div>

            {/* Studio */}
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white">Studio</h3>
                <div className="text-3xl font-semibold text-white mt-2">$49<span className="text-sm text-neutral-500 font-normal">/mo</span></div>
                <p className="text-sm text-neutral-500 mt-2">2000 credits/day</p>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-neutral-600" />
                  Everything in Pro
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-neutral-600" />
                  Team collaboration
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-neutral-600" />
                  Custom integrations
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-neutral-600" />
                  Dedicated support
                </li>
              </ul>
              <Link href="/register">
                <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                  Contact sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                <Brain className="w-4 h-4 text-neutral-900" />
              </div>
              <span className="text-sm font-medium text-neutral-400">Overmind</span>
            </div>
            <p className="text-sm text-neutral-600">© 2026 Overmind</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
