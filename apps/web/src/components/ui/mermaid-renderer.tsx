"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import mermaid from "mermaid"
import { cn } from "@/lib/utils"
import { Loader2, AlertCircle, Maximize2, Minimize2, Copy, Check } from "lucide-react"

interface MermaidRendererProps {
  chart: string
  className?: string
}

let mermaidInitialized = false

function initMermaid() {
  if (mermaidInitialized) return
  mermaidInitialized = true
  
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    themeVariables: {
      primaryColor: "#7c3aed",
      primaryTextColor: "#fff",
      primaryBorderColor: "#8b5cf6",
      lineColor: "#a78bfa",
      secondaryColor: "#1e1b4b",
      tertiaryColor: "#312e81",
      background: "transparent",
      mainBkg: "#18181b",
      secondBkg: "#27272a",
      border1: "#3f3f46",
      border2: "#52525b",
      arrowheadColor: "#a78bfa",
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: "13px",
      textColor: "#e4e4e7",
      nodeTextColor: "#fafafa",
      nodeBorder: "#8b5cf6",
      clusterBkg: "#27272a",
      clusterBorder: "#3f3f46",
      edgeLabelBackground: "#18181b",
      actorBkg: "#27272a",
      actorBorder: "#8b5cf6",
      actorTextColor: "#fafafa",
      actorLineColor: "#52525b",
      signalColor: "#a78bfa",
      signalTextColor: "#fafafa",
      labelBoxBkgColor: "#27272a",
      labelBoxBorderColor: "#3f3f46",
      labelTextColor: "#e4e4e7",
      loopTextColor: "#e4e4e7",
      noteBorderColor: "#8b5cf6",
      noteBkgColor: "#27272a",
      noteTextColor: "#e4e4e7",
      activationBorderColor: "#8b5cf6",
      activationBkgColor: "#27272a",
      sequenceNumberColor: "#fafafa",
      sectionBkgColor: "#27272a",
      altSectionBkgColor: "#18181b",
      sectionBkgColor2: "#1e1b4b",
      taskBorderColor: "#8b5cf6",
      taskBkgColor: "#27272a",
      taskTextColor: "#fafafa",
      taskTextLightColor: "#a1a1aa",
      taskTextOutsideColor: "#e4e4e7",
      taskTextClickableColor: "#c4b5fd",
      activeTaskBorderColor: "#a78bfa",
      activeTaskBkgColor: "#3b0764",
      gridColor: "#3f3f46",
      doneTaskBkgColor: "#27272a",
      doneTaskBorderColor: "#52525b",
      critBorderColor: "#f87171",
      critBkgColor: "#7f1d1d",
      todayLineColor: "#f59e0b",
      pie1: "#8b5cf6",
      pie2: "#06b6d4",
      pie3: "#10b981",
      pie4: "#f59e0b",
      pie5: "#ef4444",
      pie6: "#ec4899",
      pie7: "#6366f1",
      pieTitleTextSize: "18px",
      pieTitleTextColor: "#fafafa",
      pieStrokeColor: "#18181b",
      pieStrokeWidth: "2px",
      pieOpacity: "0.85",
      pieLegendTextSize: "13px",
      pieLegendTextColor: "#e4e4e7",
    },
    flowchart: {
      htmlLabels: true,
      curve: "basis",
      padding: 15,
      nodeSpacing: 50,
      rankSpacing: 50,
      diagramPadding: 8,
    },
    sequence: {
      diagramMarginX: 30,
      diagramMarginY: 10,
      actorMargin: 50,
      width: 150,
      height: 65,
      boxMargin: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 35,
      mirrorActors: false,
      useMaxWidth: true,
    },
    gantt: {
      titleTopMargin: 25,
      barHeight: 20,
      barGap: 4,
      topPadding: 50,
      leftPadding: 75,
      gridLineStartPadding: 35,
      fontSize: 12,
      sectionFontSize: 14,
      numberSectionStyles: 4,
    },
  })
}

const svgCache = new Map<string, string>()

export function MermaidRenderer({ chart, className }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartKey = useMemo(() => chart.trim(), [chart])
  const cachedSvg = svgCache.get(chartKey)
  
  const [svg, setSvg] = useState<string>(cachedSvg || "")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!cachedSvg)
  const [fullscreen, setFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!chartKey) {
      setLoading(false)
      return
    }

    if (cachedSvg) {
      setSvg(cachedSvg)
      setLoading(false)
      return
    }

    const renderDiagram = async () => {
      try {
        initMermaid()
        setLoading(true)
        setError(null)
        
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const { svg: renderedSvg } = await mermaid.render(id, chartKey)
        
        svgCache.set(chartKey, renderedSvg)
        setSvg(renderedSvg)
      } catch (err) {
        console.error("[Mermaid] Render error:", err)
        setError(err instanceof Error ? err.message : "Failed to render diagram")
      } finally {
        setLoading(false)
      }
    }

    renderDiagram()
  }, [chartKey, cachedSvg])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(chart)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading && !svg) {
    return (
      <div className={cn(
        "flex items-center justify-center p-8 rounded-xl",
        "bg-gradient-to-br from-zinc-900/80 to-zinc-950/80",
        "border border-zinc-800/60",
        className
      )}>
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="relative">
            <div className="absolute inset-0 bg-violet-500/20 blur-lg rounded-full" />
            <Loader2 className="w-5 h-5 animate-spin relative" />
          </div>
          <span className="text-sm font-medium">Rendering diagram...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn(
        "p-4 rounded-xl",
        "bg-gradient-to-br from-red-950/40 to-red-900/20",
        "border border-red-800/40",
        className
      )}>
        <div className="flex items-start gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Diagram Error</p>
            <p className="text-xs mt-1 opacity-80">{error}</p>
            <pre className="mt-3 p-3 bg-red-950/50 rounded-lg text-xs overflow-auto max-h-32 border border-red-800/30">
              {chart}
            </pre>
          </div>
        </div>
      </div>
    )
  }

  const diagramContent = (
    <div
      ref={containerRef}
      className={cn(
        "mermaid-container overflow-auto",
        "[&_svg]:mx-auto [&_svg]:max-w-full",
        "[&_.node_rect]:!rx-2 [&_.node_rect]:!ry-2",
        "[&_.cluster_rect]:!rx-3 [&_.cluster_rect]:!ry-3",
        fullscreen ? "h-full p-6" : "max-h-[500px] p-5"
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg">
        <div className="absolute inset-4 flex flex-col bg-zinc-900 rounded-2xl border border-zinc-700/50 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-sm font-medium text-zinc-300">Diagram View</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setFullscreen(false)}
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
            {diagramContent}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "group relative rounded-xl overflow-hidden",
      "bg-gradient-to-br from-zinc-900/90 via-zinc-900/70 to-zinc-950/90",
      "border border-zinc-800/60",
      "shadow-lg shadow-black/20",
      className
    )}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
      
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-xs font-medium text-zinc-400">Mermaid Diagram</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-300"
            title="Copy source"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setFullscreen(true)}
            className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-300"
            title="Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {diagramContent}
    </div>
  )
}
