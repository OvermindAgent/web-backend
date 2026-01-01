"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Brain, Loader2, Sparkles, Zap, Search, Code, FileText, Wand2 } from "lucide-react"

type AIStatus = 
  | "idle"
  | "thinking"
  | "reasoning"
  | "searching"
  | "coding"
  | "generating"
  | "executing"
  | "reading"

interface AIStatusIndicatorProps {
  status: AIStatus
  className?: string
}

const statusConfig: Record<AIStatus, {
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  glowColor: string
}> = {
  idle: {
    label: "Ready",
    icon: Brain,
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
    glowColor: "",
  },
  thinking: {
    label: "Thinking",
    icon: Brain,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    glowColor: "shadow-violet-500/20",
  },
  reasoning: {
    label: "Reasoning",
    icon: Sparkles,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    glowColor: "shadow-amber-500/20",
  },
  searching: {
    label: "Searching",
    icon: Search,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    glowColor: "shadow-blue-500/20",
  },
  coding: {
    label: "Coding",
    icon: Code,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    glowColor: "shadow-emerald-500/20",
  },
  generating: {
    label: "Generating",
    icon: Wand2,
    color: "text-fuchsia-400",
    bgColor: "bg-fuchsia-500/10",
    glowColor: "shadow-fuchsia-500/20",
  },
  executing: {
    label: "Executing",
    icon: Zap,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    glowColor: "shadow-orange-500/20",
  },
  reading: {
    label: "Reading",
    icon: FileText,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    glowColor: "shadow-cyan-500/20",
  },
}

function AnimatedDots() {
  return (
    <span className="inline-flex ml-0.5">
      <span className="animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1s" }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: "150ms", animationDuration: "1s" }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: "300ms", animationDuration: "1s" }}>.</span>
    </span>
  )
}

export function AIStatusIndicator({ status, className }: AIStatusIndicatorProps) {
  const config = statusConfig[status]
  const Icon = config.icon
  const isActive = status !== "idle"

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300",
        config.bgColor,
        isActive && `shadow-lg ${config.glowColor}`,
        className
      )}
    >
      <div className="relative">
        {isActive ? (
          <Loader2 className={cn("w-4 h-4 animate-spin", config.color)} />
        ) : (
          <Icon className={cn("w-4 h-4", config.color)} />
        )}
        
        {isActive && (
          <div className={cn(
            "absolute inset-0 rounded-full animate-ping opacity-30",
            config.bgColor
          )} />
        )}
      </div>
      
      <span className={cn("text-xs font-medium", config.color)}>
        {config.label}
        {isActive && <AnimatedDots />}
      </span>
    </div>
  )
}

interface ThinkingIndicatorProps {
  isThinking: boolean
  label?: string
  className?: string
}

export function ThinkingIndicator({ isThinking, label = "Thinking", className }: ThinkingIndicatorProps) {
  if (!isThinking) return null

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-violet-500/10 shadow-lg shadow-violet-500/20",
        "animate-pulse",
        className
      )}
    >
      <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
      <span className="text-xs font-medium text-violet-400">
        {label}
        <AnimatedDots />
      </span>
    </div>
  )
}

interface StreamingIndicatorProps {
  isStreaming: boolean
  className?: string
}

export function StreamingIndicator({ isStreaming, className }: StreamingIndicatorProps) {
  if (!isStreaming) return null

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-xs text-muted-foreground ml-1">Streaming</span>
    </div>
  )
}
