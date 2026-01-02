"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Search, ChevronDown, ExternalLink, CheckCircle2, Loader2 } from "lucide-react"

interface SearchResult {
  title: string
  snippet: string
  url: string
}

interface WebSearchCardProps {
  query: string
  results?: SearchResult[]
  status: "searching" | "searched" | "error"
  error?: string
}

export function WebSearchCard({ query, results = [], status, error }: WebSearchCardProps) {
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [results, expanded])

  const getStatusConfig = () => {
    switch (status) {
      case "searching":
        return {
          icon: Loader2,
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          label: "Searching...",
          spin: true,
        }
      case "searched":
        return {
          icon: CheckCircle2,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          label: `${results.length} results`,
          spin: false,
        }
      case "error":
        return {
          icon: Search,
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

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "")
    } catch {
      return url
    }
  }

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
            <Search className={cn("w-4 h-4", config.color)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-foreground">Web Search</span>
              <span className={cn(
                "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                config.bg,
                config.color
              )}>
                <StatusIcon className={cn("w-3 h-3", config.spin && "animate-spin")} />
                {config.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">"{query}"</p>
          </div>
        </div>

        {status === "searched" && results.length > 0 && (
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
        <div ref={contentRef} className="mt-3 pt-3 border-t border-border/30 space-y-2">
          {results.map((result, i) => (
            <a
              key={i}
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2 rounded-lg hover:bg-background/50 transition-colors group"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground group-hover:text-blue-400 transition-colors truncate">
                      {result.title}
                    </span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {result.snippet}
                  </p>
                  <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                    {getDomain(result.url)}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
