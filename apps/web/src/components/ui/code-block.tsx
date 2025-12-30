"use client"

import { useState } from "react"
import { Check, Copy, Code2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Highlight, themes } from "prism-react-renderer"

interface CodeBlockProps {
  children: string
  language?: string
  className?: string
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

export function CodeBlock({ children, language, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const rawlang = language?.toLowerCase() || "text"
  const lang = LANGUAGE_MAP[rawlang] || rawlang
  const displayLang = LANGUAGE_LABELS[lang] || language?.toUpperCase() || "Code"

  async function handlecopy() {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn(
      "group relative my-4 overflow-hidden rounded-lg",
      "bg-card/80 backdrop-blur-sm",
      "border border-border/60",
      "shadow-lg shadow-black/5",
      className
    )}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary/70" />
          <span className="text-xs font-semibold text-foreground/80">{displayLang}</span>
        </div>
        
        <button
          onClick={handlecopy}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
            copied
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-background/50 text-muted-foreground border border-border/50 hover:bg-background hover:text-foreground hover:border-border"
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
      
      <Highlight
        theme={themes.vsDark}
        code={children}
        language={lang as never}
      >
        {({ className: highlightClass, style, tokens, getLineProps, getTokenProps }) => (
          <pre 
            className={cn(highlightClass, "overflow-x-auto p-4 text-[13px] leading-6 !bg-transparent !m-0")}
            style={{ ...style, background: "transparent" }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })} className="table-row">
                <span className="table-cell pr-4 text-muted-foreground/40 select-none text-right w-8 text-xs">
                  {i + 1}
                </span>
                <span className="table-cell">
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
  )
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[13px] font-mono text-primary">
      {children}
    </code>
  )
}
