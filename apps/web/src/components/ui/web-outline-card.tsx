"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { FileText, ChevronDown, CheckCircle2, Loader2, ExternalLink } from "lucide-react"

interface WebOutlineCardProps {
  url: string
  title?: string
  content?: string
  wordCount?: number
  status: "reading" | "read" | "error"
  error?: string
}

export function WebOutlineCard({ url, title, content, wordCount, status, error }: WebOutlineCardProps) {
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [content, expanded])

  const getStatusConfig = () => {
    switch (status) {
      case "reading":
        return {
          icon: Loader2,
          color: "text-purple-400",
          bg: "bg-purple-500/10",
          border: "border-purple-500/30",
          label: "Reading page...",
          spin: true,
        }
      case "read":
        return {
          icon: CheckCircle2,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          label: wordCount ? `${wordCount.toLocaleString()} words` : "Read",
          spin: false,
        }
      case "error":
        return {
          icon: FileText,
          color: "text-red-400",
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          label: "Failed",
          spin: false,
        }
    }
  }

  const config = getStatusConfig()
  const StatusIcon = config.icon

  const getDomain = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname.replace("www.", "")
    } catch {
      return urlStr
    }
  }

  const truncatedContent = content ? (content.length > 500 ? content.slice(0, 500) + "..." : content) : ""

  return (
    <div className={cn(
      "rounded-lg p-3 my-2 animate-fade-in transition-all duration-200",
      config.bg,
      "border",
      config.border
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md", config.bg)}>
            <FileText className={cn("w-4 h-4", config.color)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-foreground">Read Page</span>
              <span className={cn(
                "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                config.bg,
                config.color
              )}>
                <StatusIcon className={cn("w-3 h-3", config.spin && "animate-spin")} />
                {config.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {title || getDomain(url)}
              </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground/60 hover:text-blue-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {status === "read" && content && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-background/50 transition-colors"
          >
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-300",
              expanded && "rotate-180"
            )} />
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}

      <div 
        className="overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ 
          height: expanded ? contentHeight : 0,
          opacity: expanded ? 1 : 0
        }}
      >
        <div ref={contentRef} className="mt-3 pt-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {truncatedContent}
          </p>
          {content && content.length > 500 && (
            <p className="text-[10px] text-muted-foreground/60 mt-2 italic">
              Content truncated for display. Full content available to AI.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
