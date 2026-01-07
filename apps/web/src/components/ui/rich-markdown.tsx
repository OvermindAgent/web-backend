"use client"

import { useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { MermaidRenderer } from "./mermaid-renderer"
import { CodeBlock, InlineCode } from "./code-block"
import { cn } from "@/lib/utils"

interface RichMarkdownProps {
  content: string
  className?: string
}

export function RichMarkdown({ content, className }: RichMarkdownProps) {
  const processedContent = useMemo(() => {
    return content
  }, [content])

  return (
    <div className={cn("rich-markdown", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        components={{
          code({ className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || "")
            const language = match?.[1]
            const codeContent = String(children).replace(/\n$/, "")
            
            if (language === "mermaid") {
              return <MermaidRenderer chart={codeContent} className="my-4" />
            }
            
            const isBlock = codeContent.includes("\n") || match
            
            if (isBlock) {
              return (
                <CodeBlock language={language}>
                  {codeContent}
                </CodeBlock>
              )
            }
            
            return <InlineCode {...props}>{children}</InlineCode>
          },
          pre({ children }) {
            return <>{children}</>
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-lg border border-border/50">
                <table className="min-w-full divide-y divide-border/30">
                  {children}
                </table>
              </div>
            )
          },
          thead({ children }) {
            return (
              <thead className="bg-violet-500/10">
                {children}
              </thead>
            )
          },
          th({ children }) {
            return (
              <th className="px-4 py-2 text-left text-xs font-semibold text-violet-300 uppercase tracking-wider">
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td className="px-4 py-2 text-sm text-foreground border-t border-border/20">
                {children}
              </td>
            )
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-violet-500/50 pl-4 py-2 my-4 bg-violet-500/5 rounded-r-lg italic text-muted-foreground">
                {children}
              </blockquote>
            )
          },
          ul({ children }) {
            return (
              <ul className="list-disc list-inside space-y-1 my-2 ml-2">
                {children}
              </ul>
            )
          },
          ol({ children }) {
            return (
              <ol className="list-decimal list-inside space-y-1 my-2 ml-2">
                {children}
              </ol>
            )
          },
          li({ children }) {
            return (
              <li className="text-foreground">
                {children}
              </li>
            )
          },
          h1({ children }) {
            return <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-xl font-semibold mt-5 mb-3 text-foreground">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-lg font-medium mt-4 mb-2 text-foreground">{children}</h3>
          },
          hr() {
            return <hr className="my-6 border-border/30" />
          },
          a({ href, children }) {
            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
              >
                {children}
              </a>
            )
          },
          p({ children }) {
            return <p className="my-2 leading-relaxed">{children}</p>
          },
          strong({ children }) {
            return <strong className="font-semibold text-foreground">{children}</strong>
          },
          em({ children }) {
            return <em className="italic">{children}</em>
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
