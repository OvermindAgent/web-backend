"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { RichMarkdown } from "./rich-markdown"
import { CodeBlock } from "./code-block"
import { cn } from "@/lib/utils"
import { 
  X, 
  Undo2, 
  Redo2, 
  Trash2, 
  Loader2,
  FileCode,
  Maximize2,
  Minimize2,
  GripVertical,
  Sparkles,
  Eye,
  Code2
} from "lucide-react"

export interface CanvasHistory {
  content: string
  timestamp: number
}

interface CanvasPanelProps {
  content: string
  onClose: () => void
  onClear: () => void
  history: CanvasHistory[]
  historyIndex: number
  onUndo: () => void
  onRedo: () => void
  status: "idle" | "drawing" | "processing"
  className?: string
}

const MIN_WIDTH = 320
const MAX_WIDTH = 800
const DEFAULT_WIDTH = 450

function isHtmlContent(content: string): boolean {
  if (!content) return false
  const trimmed = content.trim()
  const hasDoctype = /<!doctype\s+html/i.test(trimmed)
  const hasHtmlTag = /<html[\s>]/i.test(trimmed)
  const hasFullHtmlStructure = /<html[\s\S]*>[\s\S]*<head[\s\S]*>[\s\S]*<body[\s\S]*>/i.test(trimmed)
  const hasMultipleHtmlTags = (trimmed.match(/<(div|span|p|h[1-6]|section|article|nav|header|footer|main|form|input|button|a|img|table|ul|ol|li)\b/gi) || []).length >= 3
  
  return hasDoctype || hasHtmlTag || hasFullHtmlStructure || hasMultipleHtmlTags
}

function HtmlPreview({ html, className }: { html: string; className?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!iframeRef.current) return
    
    const doc = iframeRef.current.contentDocument
    if (!doc) return

    doc.open()
    doc.write(html)
    doc.close()
  }, [html])

  return (
    <iframe
      ref={iframeRef}
      className={cn("w-full h-full border-0 bg-white rounded-lg", className)}
      sandbox="allow-scripts allow-same-origin"
      title="HTML Preview"
    />
  )
}

type ViewMode = "preview" | "code"

export function CanvasPanel({
  content,
  onClose,
  onClear,
  history,
  historyIndex,
  onUndo,
  onRedo,
  status,
  className,
}: CanvasPanelProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("preview")
  const panelRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const isHtml = useMemo(() => isHtmlContent(content), [content])

  useEffect(() => {
    if (contentRef.current && status === "drawing") {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content, status])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const newWidth = window.innerWidth - e.clientX
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    if (isResizing) {
      document.body.style.cursor = "ew-resize"
      document.body.style.userSelect = "none"
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing])

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const statusConfig = {
    idle: { text: "Canvas", icon: FileCode, color: "text-muted-foreground", spin: false },
    drawing: { text: "AI drawing...", icon: Loader2, color: "text-violet-400", spin: true },
    processing: { text: "Processing...", icon: Sparkles, color: "text-amber-400", spin: true },
  }

  const currentStatus = statusConfig[status]
  const StatusIcon = currentStatus.icon

  const TabSwitcher = () => (
    <div className="flex items-center p-1 bg-zinc-900/80 rounded-lg border border-zinc-800/60">
      <button
        onClick={() => setViewMode("preview")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
          viewMode === "preview"
            ? "bg-violet-500/20 text-violet-300 shadow-sm"
            : "text-zinc-500 hover:text-zinc-300"
        )}
      >
        <Eye className="w-3.5 h-3.5" />
        <span>Preview</span>
      </button>
      <button
        onClick={() => setViewMode("code")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
          viewMode === "code"
            ? "bg-violet-500/20 text-violet-300 shadow-sm"
            : "text-zinc-500 hover:text-zinc-300"
        )}
      >
        <Code2 className="w-3.5 h-3.5" />
        <span>Code</span>
      </button>
    </div>
  )

  const renderContent = () => {
    if (!content) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
          <FileCode className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-sm">Canvas is empty</p>
          <p className="text-xs mt-1 opacity-70">AI will draw here when canvas mode is active</p>
        </div>
      )
    }

    if (isHtml) {
      if (viewMode === "preview") {
        return <HtmlPreview html={content} className="flex-1" />
      } else {
        return <CodeBlock language="html">{content}</CodeBlock>
      }
    }

    return <RichMarkdown content={content} className="text-sm" />
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <StatusIcon className={cn("w-5 h-5", currentStatus.color, currentStatus.spin && "animate-spin")} />
              <span className={cn("font-medium", currentStatus.color)}>{currentStatus.text}</span>
            </div>
            
            {isHtml && <TabSwitcher />}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {renderContent()}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        "flex flex-col h-full bg-card/95 backdrop-blur-lg border-l border-border/50 shadow-2xl animate-in slide-in-from-right-5 duration-300",
        className
      )}
      style={{ width: `${width}px` }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize group hover:bg-violet-500/30 transition-colors z-10"
        onMouseDown={(e) => {
          e.preventDefault()
          setIsResizing(true)
        }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-violet-400" />
        </div>
      </div>

      <div className="relative flex items-center justify-between p-3 border-b border-border/50 bg-background/50">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("w-4 h-4", currentStatus.color, currentStatus.spin && "animate-spin")} />
          <span className={cn("text-sm font-medium", currentStatus.color)}>{currentStatus.text}</span>
          
          {history.length > 1 && (
            <span className="text-xs text-muted-foreground ml-2">
              ({historyIndex + 1}/{history.length})
            </span>
          )}
        </div>

        {isHtml && content && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <TabSwitcher />
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              canUndo 
                ? "hover:bg-white/10 text-foreground" 
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              canRedo 
                ? "hover:bg-white/10 text-foreground" 
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          
          <div className="w-px h-4 bg-border/30 mx-1" />
          
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
            title="Clear canvas"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div 
        ref={contentRef}
        className="flex-1 overflow-auto p-4 scrollbar-thin"
      >
        {renderContent()}
      </div>

      {status !== "idle" && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-violet-500/20 overflow-hidden">
          <div className="h-full w-1/3 bg-violet-500 animate-pulse" 
            style={{ 
              animation: "slide 1.5s ease-in-out infinite",
            }} 
          />
        </div>
      )}

      <style jsx>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  )
}
