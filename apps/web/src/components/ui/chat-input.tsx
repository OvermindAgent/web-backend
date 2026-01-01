"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Send, Loader2, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react"

export interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  data: string
  preview?: string
}

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  className?: string
  files?: UploadedFile[]
  onFilesChange?: (files: UploadedFile[]) => void
  settingsButton?: React.ReactNode
}

const ACCEPTED_FILE_TYPES = {
  images: ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"],
  text: ["text/plain", "text/javascript", "text/css", "text/html", "text/markdown", "application/json"],
  code: [
    "application/javascript", "application/typescript", "application/x-python",
    "application/x-typescript", "text/x-python", "text/x-typescript"
  ],
  documents: ["application/pdf"]
}

const ALL_ACCEPTED = [...ACCEPTED_FILE_TYPES.images, ...ACCEPTED_FILE_TYPES.text, ...ACCEPTED_FILE_TYPES.code, ...ACCEPTED_FILE_TYPES.documents]

export function ChatInput({
  value,
  onChange,
  onSend,
  placeholder = "Type a message...",
  disabled = false,
  loading = false,
  className,
  files = [],
  onFilesChange,
  settingsButton,
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [focused, setFocused] = React.useState(false)

  React.useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "0"
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      if ((value.trim() || files.length > 0) && !disabled && !loading) {
        onSend()
      }
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || !onFilesChange) return

    const newFiles: UploadedFile[] = []

    for (const file of Array.from(selectedFiles)) {
      const reader = new FileReader()
      
      const fileData = await new Promise<string>((resolve) => {
        if (file.type.startsWith("image/")) {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        } else {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsText(file)
        }
      })

      newFiles.push({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        data: fileData,
        preview: file.type.startsWith("image/") ? fileData : undefined
      })
    }

    onFilesChange([...files, ...newFiles])
    e.target.value = ""
  }

  const removeFile = (id: string) => {
    if (onFilesChange) {
      onFilesChange(files.filter(f => f.id !== id))
    }
  }

  const isDisabled = disabled || loading
  const canSend = (value.trim() || files.length > 0) && !isDisabled

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "absolute -inset-1 rounded-2xl blur-xl transition-all duration-700 ease-out pointer-events-none",
          "bg-gradient-to-r from-violet-600/60 via-fuchsia-500/60 to-pink-500/60",
          focused && !isDisabled ? "opacity-50 scale-100" : "opacity-0 scale-95"
        )}
      />

      <div
        className={cn(
          "relative rounded-xl transition-all duration-300",
          "bg-card/95 backdrop-blur-md",
          "border",
          focused && !isDisabled
            ? "border-violet-500/60 shadow-lg shadow-violet-500/20"
            : "border-border/60",
          isDisabled && "opacity-60"
        )}
      >
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {files.map(file => (
              <div
                key={file.id}
                className="relative group flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10"
              >
                {file.preview ? (
                  <img src={file.preview} alt={file.name} className="w-8 h-8 rounded object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-muted-foreground">
                    {getFileIcon(file.type)}
                  </div>
                )}
                <span className="text-xs text-muted-foreground max-w-[100px] truncate">
                  {file.name}
                </span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={isDisabled}
          rows={1}
          className={cn(
            "w-full resize-none bg-transparent py-3 px-4",
            "min-h-[48px] max-h-[200px]",
            "text-sm text-foreground placeholder:text-muted-foreground/50",
            "focus:outline-none",
            "disabled:cursor-not-allowed",
            "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
          )}
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.js,.ts,.tsx,.jsx,.py,.css,.html,.md,.json,.pdf,.jpeg,.jpg,.png,.webp,.svg,.gif"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex items-center justify-between px-3 pb-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1.5 text-[10px] text-muted-foreground/40 transition-opacity duration-300",
                focused ? "opacity-100" : "opacity-0"
              )}
            >
              <kbd className="px-1 py-0.5 rounded bg-muted/30 font-mono text-[9px]">Enter</kbd>
              <span>send</span>
              <span className="mx-0.5">·</span>
              <kbd className="px-1 py-0.5 rounded bg-muted/30 font-mono text-[9px]">Shift+Enter</kbd>
              <span>newline</span>
            </div>

            <Button
              type="submit"
              size="icon"
              disabled={!canSend}
              onClick={(e) => {
                e.preventDefault()
                if (canSend) onSend()
              }}
              className={cn(
                "h-8 w-8 rounded-lg transition-all",
                canSend 
                  ? "bg-white text-neutral-900 hover:bg-neutral-200" 
                  : "bg-white/10 text-muted-foreground cursor-not-allowed"
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>

            {settingsButton}
          </div>
        </div>
      </div>
    </div>
  )
}
