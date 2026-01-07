"use client"

import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"
import { cn } from "@/lib/utils"
import { Loader2, AlertCircle, Maximize2, Minimize2 } from "lucide-react"

interface MermaidRendererProps {
  chart: string
  className?: string
}

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    primaryColor: "#8b5cf6",
    primaryTextColor: "#fff",
    primaryBorderColor: "#7c3aed",
    lineColor: "#a78bfa",
    secondaryColor: "#1e1b4b",
    tertiaryColor: "#312e81",
    background: "#0f0f0f",
    mainBkg: "#1a1a2e",
    secondBkg: "#16213e",
    border1: "#7c3aed",
    border2: "#5b21b6",
    arrowheadColor: "#a78bfa",
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
    textColor: "#e2e8f0",
    nodeTextColor: "#fff",
  },
  flowchart: {
    htmlLabels: true,
    curve: "basis",
  },
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
  },
})

export function MermaidRenderer({ chart, className }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const renderDiagram = async () => {
      if (!chart.trim()) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const { svg: renderedSvg } = await mermaid.render(id, chart)
        setSvg(renderedSvg)
      } catch (err) {
        console.error("[Mermaid] Render error:", err)
        setError(err instanceof Error ? err.message : "Failed to render diagram")
      } finally {
        setLoading(false)
      }
    }

    renderDiagram()
  }, [chart])

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-8 bg-background/50 rounded-lg border border-border/30", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Rendering diagram...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("p-4 bg-red-500/10 border border-red-500/30 rounded-lg", className)}>
        <div className="flex items-start gap-2 text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Diagram Error</p>
            <p className="text-xs mt-1 opacity-80">{error}</p>
            <pre className="mt-2 p-2 bg-red-500/10 rounded text-xs overflow-auto max-h-32">
              {chart}
            </pre>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative group", fullscreen && "fixed inset-4 z-50 bg-background/95 backdrop-blur-lg rounded-xl shadow-2xl")}>
      <button
        onClick={() => setFullscreen(!fullscreen)}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-background"
      >
        {fullscreen ? (
          <Minimize2 className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Maximize2 className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      <div
        ref={containerRef}
        className={cn(
          "mermaid-container overflow-auto rounded-lg bg-gradient-to-br from-violet-500/5 to-purple-500/5 border border-violet-500/20 p-4",
          fullscreen ? "h-full" : "max-h-[500px]",
          className
        )}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  )
}
