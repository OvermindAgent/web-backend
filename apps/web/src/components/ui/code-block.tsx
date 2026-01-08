"use client"

import { useState } from "react"
import { Check, Copy, Terminal, FileCode, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Highlight, themes } from "prism-react-renderer"

interface CodeBlockProps {
  children: string
  language?: string
  className?: string
  showLineNumbers?: boolean
  maxHeight?: number
}

const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  yml: "yaml",
  cs: "csharp",
  luau: "lua",
}

const LANGUAGE_ICONS: Record<string, string> = {
  javascript: "🟨",
  typescript: "🔷",
  python: "🐍",
  lua: "🌙",
  rust: "🦀",
  go: "🔵",
  java: "☕",
  html: "🌐",
  css: "🎨",
  json: "📋",
  bash: "💻",
  shell: "💻",
}

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  tsx: "TSX",
  jsx: "JSX",
  python: "Python",
  lua: "Lua",
  rust: "Rust",
  go: "Go",
  java: "Java",
  cpp: "C++",
  c: "C",
  csharp: "C#",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  json: "JSON",
  yaml: "YAML",
  markdown: "Markdown",
  sql: "SQL",
  bash: "Bash",
  shell: "Shell",
  powershell: "PowerShell",
  dockerfile: "Docker",
  xml: "XML",
  graphql: "GraphQL",
  ruby: "Ruby",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  dart: "Dart",
}

export function CodeBlock({ 
  children, 
  language, 
  className,
  showLineNumbers = true,
  maxHeight = 400 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const rawlang = language?.toLowerCase() || "text"
  const lang = LANGUAGE_MAP[rawlang] || rawlang
  const displayLang = LANGUAGE_LABELS[lang] || language?.toUpperCase() || "Code"
  const langIcon = LANGUAGE_ICONS[lang]
  
  const codeStr = children || ""
  const lines = codeStr.split("\n")
  const isLongCode = lines.length > 15
  const effectiveMaxHeight = expanded ? undefined : maxHeight

  if (!codeStr) return null

  async function handlecopy() {
    await navigator.clipboard.writeText(codeStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn(
      "group relative my-4 overflow-hidden rounded-xl w-full min-w-0",
      "bg-[#0d0d0d]",
      "border border-zinc-800/80",
      "shadow-xl shadow-black/30",
      className
    )}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
      
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/60">
        <div className="flex items-center gap-2">
          {langIcon ? (
            <span className="text-sm">{langIcon}</span>
          ) : (
            <FileCode className="w-3.5 h-3.5 text-violet-400" />
          )}
          <span className="text-xs font-medium text-zinc-400">{displayLang}</span>
        </div>
        
        <div className="flex items-center gap-1">
          {isLongCode && (
            <button
              onClick={() => setExpanded(!expanded)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              )}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>{lines.length} lines</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={handlecopy}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
              copied
                ? "bg-green-500/20 text-green-400"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            )}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      <div 
        className="overflow-auto scrollbar-thin"
        style={{ maxHeight: effectiveMaxHeight }}
      >
        <Highlight
          theme={themes.vsDark}
          code={children}
          language={lang as never}
        >
          {({ className: highlightClass, style, tokens, getLineProps, getTokenProps }) => (
            <pre 
              className={cn(
                highlightClass, 
                "overflow-x-auto py-4 text-[13px] leading-[1.7] !bg-transparent !m-0",
                "font-mono"
              )}
              style={{ ...style, background: "transparent" }}
            >
              {tokens.map((line, i) => (
                <div 
                  key={i} 
                  {...getLineProps({ line })} 
                  className={cn(
                    "table-row group/line",
                    "hover:bg-violet-500/5 transition-colors"
                  )}
                >
                  {showLineNumbers && (
                    <span className="table-cell px-4 text-zinc-600 select-none text-right w-12 text-xs font-mono sticky left-0 bg-[#0d0d0d]">
                      {i + 1}
                    </span>
                  )}
                  <span className={cn("table-cell pr-6", !showLineNumbers && "pl-4")}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
      
      {!expanded && isLongCode && (
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0d0d0d] to-transparent pointer-events-none" />
      )}
    </div>
  )
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className={cn(
      "px-1.5 py-0.5 rounded-md",
      "bg-violet-500/10 border border-violet-500/20",
      "text-[13px] font-mono text-violet-300",
      "break-words"
    )}>
      {children}
    </code>
  )
}

export function TerminalBlock({ children, title = "Terminal" }: { children: string; title?: string }) {
  const [copied, setCopied] = useState(false)

  async function handlecopy() {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn(
      "my-4 overflow-hidden rounded-xl",
      "bg-black",
      "border border-zinc-800",
      "shadow-xl shadow-black/30"
    )}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-xs font-medium text-zinc-400">{title}</span>
        </div>
        
        <button
          onClick={handlecopy}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
            copied
              ? "bg-green-500/20 text-green-400"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-green-400">
        <code>{children}</code>
      </pre>
    </div>
  )
}
