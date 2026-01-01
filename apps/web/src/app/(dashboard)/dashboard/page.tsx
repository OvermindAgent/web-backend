"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { 
  Brain, 
  Send, 
  Settings, 
  Folder, 
  MessageSquare, 
  Key, 
  LogOut,
  Zap,
  Pencil,
  Map,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plug,
  PlugZap,
  Terminal,
  FileCode,
  AlertCircle,
  Plus,
  Check,
  X,
  Skull,
  MoreVertical,
  Lightbulb,
  Thermometer,
  Wand2,
  Bug,
  Trash2,
  Lock,
  CheckCircle2,
  XCircle,
  Crown,
  Sparkles,
  Code
} from "lucide-react"
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu"
import { InputModal, ConfirmModal } from "@/components/ui/modal"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { CodeBlock, InlineCode } from "@/components/ui/code-block"
import { encryptdata, decryptdata } from "@/lib/crypto.browser"
import { getAllModels } from "@/lib/billing/models"

type Preset = "fast" | "edit" | "planning" | "unrestricted"
type ConnectionState = "disconnected" | "connecting" | "connected"

type ToolStatus = "pending" | "executing" | "success" | "error"

interface ToolCall {
  name: string
  args: Record<string, string>
  status: ToolStatus
  result?: string
  error?: string
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  reasoning?: string
  toolCalls?: ToolCall[]
}

interface Chat {
  id: string
  projectId: string
  name: string
  messages: Message[]
  messageCount: number
  manuallyRenamed: boolean
  createdAt: number
  updatedAt: number
}

interface Project {
  id: string
  name: string
}

const PRESETS: { id: Preset; name: string; icon: React.ReactNode; description: string }[] = [
  { id: "fast", name: "Fast", icon: <Zap className="w-4 h-4" />, description: "Speed-first responses" },
  { id: "edit", name: "Edit", icon: <Pencil className="w-4 h-4" />, description: "Complex edits & refactors" },
  { id: "planning", name: "Planning", icon: <Map className="w-4 h-4" />, description: "Structured thinking" },
  { id: "unrestricted", name: "Unrestricted", icon: <Skull className="w-4 h-4" />, description: "No restrictions" },
]

function parseToolCalls(content: string): { text: string; tools: ToolCall[]; thinking?: string } {
  const toolRegex = /<tool\s+name="([^"]+)">([\s\S]*?)<\/tool>/g
  const argRegex = /<arg\s+name="([^"]+)">([\s\S]*?)<\/arg>/g
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g
  
  const tools: ToolCall[] = []
  let thinking = ""
  
  // Extract thinking
  let thinkMatch: RegExpExecArray | null
  while ((thinkMatch = thinkRegex.exec(content)) !== null) {
    thinking += thinkMatch[1].trim() + "\n"
  }
  
  // Extract tools
  let match: RegExpExecArray | null
  while ((match = toolRegex.exec(content)) !== null) {
    const [, toolName, argsContent] = match
    const args: Record<string, string> = {}
    
    let argMatch: RegExpExecArray | null
    const argRegexCopy = new RegExp(argRegex.source, "g")
    while ((argMatch = argRegexCopy.exec(argsContent)) !== null) {
      const [, argName, argValue] = argMatch
      args[argName] = argValue.trim()
    }
    
    tools.push({ name: toolName, args, status: "pending" })
  }
  
  let text = content
    .replace(toolRegex, "")
    .replace(thinkRegex, "")
    .trim()

  return { text, tools, thinking: thinking.trim() || undefined }
}

function ToolCallCard({ tool }: { tool: ToolCall }) {
  const [expanded, setExpanded] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)
  
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [tool.args, expanded])
  
  const gettoolicon = (name: string) => {
    if (name.includes("file") || name.includes("script")) return FileCode
    if (name.includes("signal")) return PlugZap
    return Terminal
  }
  
  const getstatusconfig = (status: ToolStatus) => {
    switch (status) {
      case "pending":
        return {
          icon: Loader2,
          color: "text-muted-foreground",
          bg: "bg-muted/30",
          border: "border-border/50",
          label: "Queued",
          spin: false
        }
      case "executing":
        return {
          icon: Loader2,
          color: "text-violet-400",
          bg: "bg-violet-500/10",
          border: "border-violet-500/30",
          label: "Executing...",
          spin: true
        }
      case "success":
        return {
          icon: CheckCircle2,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          label: "Success",
          spin: false
        }
      case "error":
        return {
          icon: XCircle,
          color: "text-red-400",
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          label: "Failed",
          spin: false
        }
    }
  }
  
  const ToolIcon = gettoolicon(tool.name)
  const statusconfig = getstatusconfig(tool.status)
  const StatusIcon = statusconfig.icon
  
  const gettoolabel = (name: string) => {
    const labels: Record<string, string> = {
      emit_signal: "Emit Signal",
      create_file: "Create File",
      update_file: "Update File",
      delete_file: "Delete File",
      read_file: "Read File",
    }
    return labels[name] || name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <div className={cn(
      "rounded-lg p-3 my-2 animate-fade-in transition-all duration-200",
      statusconfig.bg,
      "border",
      statusconfig.border
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md", statusconfig.bg)}>
            <ToolIcon className={cn("w-4 h-4", statusconfig.color)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-foreground">{gettoolabel(tool.name)}</span>
              <span className={cn(
                "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                statusconfig.bg,
                statusconfig.color
              )}>
                <StatusIcon className={cn("w-3 h-3", statusconfig.spin && "animate-spin")} />
                {statusconfig.label}
              </span>
            </div>
            {tool.status === "error" && tool.error && (
              <p className="text-xs text-red-400 mt-1">{tool.error}</p>
            )}
          </div>
        </div>
        
        {Object.keys(tool.args).length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-background/50 transition-colors"
          >
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-300 ease-out",
              expanded && "rotate-180"
            )} />
          </button>
        )}
      </div>
      
      <div 
        className="overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ 
          height: expanded ? contentHeight : 0,
          opacity: expanded ? 1 : 0,
          transform: expanded ? 'translateY(0)' : 'translateY(-8px)'
        }}
      >
        <div ref={contentRef}>
          {Object.keys(tool.args).length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
              {Object.entries(tool.args).map(([key, value]) => (
                <div key={key} className="text-xs">
                  <span className="text-muted-foreground font-medium">{key}:</span>
                  <pre className="mt-1 p-2 rounded bg-background/50 text-foreground font-mono overflow-x-auto max-h-64 overflow-y-auto scrollbar-thin">
                    {value}
                  </pre>
                </div>
              ))}
              
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-violet-400 transition-colors mt-2"
              >
                <Code className="w-3 h-3" />
                {showRaw ? 'Hide' : 'View'} Raw Signal
              </button>
              
              <div 
                className="overflow-hidden transition-all duration-200 ease-out"
                style={{ 
                  height: showRaw ? 'auto' : 0,
                  opacity: showRaw ? 1 : 0
                }}
              >
                {showRaw && (
                  <pre className="p-2 rounded bg-violet-500/5 border border-violet-500/20 text-violet-300 font-mono text-xs overflow-x-auto max-h-48 overflow-y-auto scrollbar-thin">
                    {JSON.stringify({ action: tool.name, args: tool.args }, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
          
          {tool.status === "success" && tool.result && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <p className="text-xs text-emerald-400">✓ {tool.result}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ReasoningSection({ reasoning }: { reasoning: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className={cn("w-3 h-3 transition-transform duration-200", isOpen && "rotate-90")} />
        Show reasoning
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[5000px] opacity-100 mt-2" : "max-h-0 opacity-0"
        )}
      >
        <p className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-2 leading-relaxed">
          {reasoning}
        </p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<{ id: string; email: string; displayName: string } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [preset, setPreset] = useState<Preset>("fast")
  const [loading, setLoading] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showProjects, setShowProjects] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")

  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [chatContextMenu, setChatContextMenu] = useState<{ open: boolean; position: { x: number; y: number }; chat: Chat | null }>({
    open: false,
    position: { x: 0, y: 0 },
    chat: null,
  })
  const [renameModal, setRenameModal] = useState<{ open: boolean; chat: Chat | null }>({
    open: false,
    chat: null,
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; chat: Chat | null }>({
    open: false,
    chat: null,
  })

  const CACHE_KEY = "overmind_chats_cache"
  const CACHE_TIMESTAMP_KEY = "overmind_chats_timestamp"
  const CACHE_DURATION = 5 * 60 * 1000

  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuClosing, setContextMenuClosing] = useState(false)
  const [showModesMenu, setShowModesMenu] = useState(false)
  const [modesMenuClosing, setModesMenuClosing] = useState(false)
  const [thinkingMode, setThinkingMode] = useState(false)
  const [highTemperature, setHighTemperature] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [creativeMode, setCreativeMode] = useState(false)
  const [showPresetsClosing, setShowPresetsClosing] = useState(false)

  const [selectedModel, setSelectedModel] = useState("chatgpt-4o-latest")
  const [showModelsMenu, setShowModelsMenu] = useState(false)
  
  const [tierWarning, setTierWarning] = useState<{ show: boolean; message: string; gracePeriodEnds?: number } | null>(null)
  const [credits, setCredits] = useState<{ used: number; total: number; available: number } | null>(null)
  const [currentTier, setCurrentTier] = useState<"free" | "pro" | "studio">("free")

  const MODELS = getAllModels()
  
  async function fetchBillingInfo() {
    try {
      const res = await fetch("/api/billing")
      const data = await res.json()
      
      console.log("[Dashboard] Billing info received:", data)
      
      if (data.tier) {
        setCurrentTier(data.tier)
        console.log("[Dashboard] Updated tier to:", data.tier)
      }
      
      if (data.credits) {
        setCredits(data.credits)
        console.log("[Dashboard] Updated credits to:", data.credits)
      }
      
      if (data.status?.isInGracePeriod) {
        setTierWarning({
          show: true,
          message: "Your subscription payment failed. Please update your payment method to avoid losing access.",
          gracePeriodEnds: data.status.gracePeriodEndsAt,
        })
      } else if (data.status?.paymentFailed) {
        setTierWarning({
          show: true,
          message: "Payment failed. Your account will be downgraded if not resolved.",
        })
      }
    } catch (error) {
      console.error("[Dashboard] Failed to fetch billing info:", error)
    }
  }
  
  
  async function dismissTierWarning() {
    setTierWarning(null)
    try {
      await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss_warning" }),
      })
    } catch {}
  }

  const closeContextMenu = () => {
    setContextMenuClosing(true)
    setModesMenuClosing(true)
    setShowModelsMenu(false)
    setTimeout(() => {
      setShowContextMenu(false)
      setShowModesMenu(false)
      setContextMenuClosing(false)
      setModesMenuClosing(false)
    }, 120)
  }

  const closePresets = () => {
    setShowPresetsClosing(true)
    setTimeout(() => {
      setShowPresets(false)
      setShowPresetsClosing(false)
    }, 120)
  }

  async function fetchUser() {
    try {
      const res = await fetch("/api/auth/me")
      const data = await res.json()
      if (data) setUser(data)
    } catch {}
  }

  useEffect(() => {
    fetchUser()
    fetchProjects()
    fetchBillingInfo()
  }, [])

  useEffect(() => {
    const chatId = searchParams.get("chat")
    if (chatId && chats.length > 0 && !selectedChat) {
      const chat = chats.find(c => c.id === chatId)
      if (chat) {
        selectChat(chat)
      }
    }
  }, [chats, searchParams, selectedChat])

  useEffect(() => {
    if (selectedProject) {
      fetchChats(selectedProject.id)
    }
  }, [selectedProject])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects")
      const data = await res.json()
      let projectsList = data.projects || []
      
      if (projectsList.length === 0) {
        const createRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Default Project", description: "Auto-created default project" }),
        })
        const createData = await createRes.json()
        if (createData.project) {
          projectsList = [createData.project]
        }
      }
      
      setProjects(projectsList)
      if (projectsList.length > 0 && !selectedProject) {
        setSelectedProject(projectsList[0])
      }
    } catch {}
  }

  function savechatstocache(chatlist: Chat[]) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(chatlist))
      sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
    } catch {}
  }

  function loadchatsfromcache(): Chat[] | null {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      const timestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY)
      
      if (!cached || !timestamp) return null
      
      const age = Date.now() - parseInt(timestamp)
      if (age > CACHE_DURATION) {
        sessionStorage.removeItem(CACHE_KEY)
        sessionStorage.removeItem(CACHE_TIMESTAMP_KEY)
        return null
      }
      
      return JSON.parse(cached)
    } catch {
      return null
    }
  }

  async function fetchChats(projectId: string) {
    const cached = loadchatsfromcache()
    if (cached && cached.length > 0) {
      setChats(cached)
    }
    
    try {
      const res = await fetch(`/api/chats?projectId=${projectId}`)
      const data = await res.json()
      const fetchedchats = data.chats || []
      
      setChats(fetchedchats)
      savechatstocache(fetchedchats)
    } catch {}
  }

  async function createChat() {
    if (!selectedProject) return
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id }),
      })
      const data = await res.json()
      if (data.chat) {
        const newchats = [data.chat, ...chats]
        setChats(newchats)
        savechatstocache(newchats)
        setSelectedChat(data.chat)
        setMessages([])
        router.push(`/dashboard?chat=${data.chat.id}`, { scroll: false })
      }
    } catch {}
  }

  async function deleteChat(chatId: string) {
    try {
      await fetch(`/api/chats?id=${chatId}`, { method: "DELETE" })
      const updatedchats = chats.filter((c) => c.id !== chatId)
      setChats(updatedchats)
      savechatstocache(updatedchats)
      if (selectedChat?.id === chatId) {
        setSelectedChat(null)
        setMessages([])
        router.push("/dashboard", { scroll: false })
      }
    } catch {}
  }

  async function renameChat(chatId: string, newName: string, manual: boolean = true) {
    try {
      const res = await fetch("/api/chats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: chatId, name: newName, manuallyRenamed: manual }),
      })
      const data = await res.json()
      if (data.chat) {
        const updatedchats = chats.map((c) => (c.id === chatId ? data.chat : c))
        setChats(updatedchats)
        savechatstocache(updatedchats)
        if (selectedChat?.id === chatId) {
          setSelectedChat(data.chat)
        }
      }
    } catch {}
  }

  async function generateChatName(chatMessages: Message[]): Promise<string> {
    try {
      const context = chatMessages.slice(-5).map(m => `${m.role}: ${m.content.slice(0, 100)}`).join("\n")
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Generate a concise, short chat name (max 25 chars, can include one emoji at the start) based on this conversation. Reply with ONLY the name, nothing else:\n\n${context}`,
          }],
          preset: "fast",
          stream: false,
          skipCredits: true,
        }),
      })
      const data = await res.json()
      return data.content?.trim().slice(0, 30) || "New Chat"
    } catch {
      return "New Chat"
    }
  }

  async function selectChat(chat: Chat) {
    try {
      const res = await fetch(`/api/chats/${chat.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.chat) {
          setSelectedChat(data.chat)
          setMessages(data.chat.messages.map((m: { id?: string; role: string; content: string; reasoning?: string }) => ({
            id: m.id || crypto.randomUUID(),
            role: m.role as "user" | "assistant",
            content: m.content,
            reasoning: m.reasoning,
          })))
          router.push(`/dashboard?chat=${chat.id}`, { scroll: false })
          const updatedchats = chats.map((c) => (c.id === chat.id ? data.chat : c))
          setChats(updatedchats)
          savechatstocache(updatedchats)
          return
        }
      }
    } catch {}
    
    setSelectedChat(chat)
    setMessages(chat.messages.map(m => ({
      id: m.id || crypto.randomUUID(),
      role: m.role,
      content: m.content,
      reasoning: m.reasoning,
    })))
  }

  function handleChatContextMenu(e: React.MouseEvent, chat: Chat) {
    e.preventDefault()
    setChatContextMenu({
      open: true,
      position: { x: e.clientX, y: e.clientY },
      chat,
    })
  }

  async function createProject() {
    if (!newProjectName.trim()) return
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName }),
      })
      const data = await res.json()
      if (data.project) {
        setProjects((prev) => [...prev, data.project])
        setSelectedProject(data.project)
        setNewProjectName("")
      }
    } catch {}
  }

  async function checkPluginConnection() {
    try {
      const res = await fetch("/api/rivet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check_connection",
          source: "web",
          data: {},
        }),
      })
      const data = await res.json()
      return data.connected === true
    } catch {
      return false
    }
  }


  async function handleConnect() {
    if (connectionState === "connected") {
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current)
        connectionCheckRef.current = null
      }
      setConnectionState("disconnected")
      return
    }

    setConnectionState("connecting")
    
    // Handshake Part 1: Broadcast discovery to all user's plugins
    if (user) {
      await fetch("/api/rivet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_signal",
          source: "web",
          data: {
            signalAction: "WEB_DISCOVERY",
            signalData: { timestamp: Date.now() },
            targetUserId: user.id
          },
        }),
      })
    }
    
    const isConnected = await checkPluginConnection()
    if (isConnected) {
      setConnectionState("connected")
      connectionCheckRef.current = setInterval(async () => {
        const stillConnected = await checkPluginConnection()
        if (!stillConnected) {
          setConnectionState("disconnected")
          if (connectionCheckRef.current) {
            clearInterval(connectionCheckRef.current)
            connectionCheckRef.current = null
          }
        }
      }, 5000)
    } else {
      setConnectionState("disconnected")
    }
  }

  async function emitSignal(action: string, payload: Record<string, unknown>): Promise<boolean> {
    try {
      console.log("[Rivet] Sending signal:", action, payload)
      const res = await fetch("/api/rivet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_signal",
          source: "web",
          data: {
            signalAction: action,
            signalData: payload,
          },
        }),
      })
      const data = await res.json()
      
      if (data.success) {
        if (!data.pluginConnected) {
          console.warn("[Rivet] Signal queued but no plugin connected yet")
        }
        return data.pluginConnected
      }
      return false
    } catch (e) {
      console.error("[Rivet] Failed to send signal:", e)
      return false
    }

  }

  async function handleSend() {
    if (!input.trim() || loading || !selectedProject) return

    let currentChat = selectedChat
    if (!currentChat) {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id }),
      })
      const data = await res.json()
      if (data.chat) {
        currentChat = data.chat
        setChats((prev) => [data.chat, ...prev])
        setSelectedChat(data.chat)
      } else {
        return
      }
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)


    if (currentChat) {
      const chatToUpdate = currentChat
      const res = await fetch("/api/chats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chatToUpdate.id,
          message: { role: "user", content: userMessage.content },
        }),
      })
      const data = await res.json()
      if (data.chat) {
        const updatedchats = chats.map((c) => (c.id === chatToUpdate.id ? data.chat : c))
        setChats(updatedchats)
        savechatstocache(updatedchats)
        setSelectedChat(data.chat)
        currentChat = data.chat
      }
    }


    try {
      const connectionContext = connectionState === "connected"
        ? "\n\n[ROBLOX STUDIO CONNECTED - emit_signal tool is available]"
        : "\n\n[ROBLOX STUDIO NOT CONNECTED - emit_signal tool will not work, inform user to connect first]"

      const projectContext = selectedProject
        ? `\n\n[ACTIVE PROJECT: ${selectedProject.name} (${selectedProject.id})]`
        : ""

      const payload = {
        messages: [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        })),
        preset,
        provider: MODELS.find((m) => m.id === selectedModel)?.provider,
        model: selectedModel,
        projectContext: connectionContext + projectContext,
        projectId: selectedProject?.id,
        stream: true,
      }
      
      const encryptedpayload = encryptdata(JSON.stringify(payload))
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encrypted: encryptedpayload }),
      })

      if (!response.ok) {
        throw new Error("Chat failed")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let assistantContent = ""
      let assistantReasoning = ""
      const assistantId = crypto.randomUUID()
      const toolStatuses: Record<string, { status: ToolStatus; result?: string; error?: string }> = {}
      let streamBuffer = ""

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", reasoning: "" },
      ])
      setLoading(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        streamBuffer += decoder.decode(value, { stream: true })
        const lines = streamBuffer.split("\n")
        streamBuffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const encrypteddata = line.slice(6)
            if (!encrypteddata.trim()) continue
            
            const data = decryptdata(encrypteddata)
            
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === "content") {
                assistantContent += parsed.content
              } else if (parsed.type === "reasoning") {
                assistantReasoning += parsed.content
              } else if (parsed.type === "tool_result") {
                const toolCall = parsed.call as { name: string; args: Record<string, unknown> }
                console.log("[Chat] Tool result received:", toolCall.name)
                
                let signalSent = false
                let errorMsg = ""
                
                if (connectionState !== "connected") {
                  errorMsg = "Not connected to Roblox Studio"
                  console.log("[Chat] Tool error: not connected")
                } else if (toolCall.name === "emit_signal") {
                  const action = toolCall.args.action as string
                  const payload = toolCall.args.payload as Record<string, unknown>
                  console.log("[Chat] Emitting signal to Roblox:", action)
                  signalSent = await emitSignal(action, payload)
                  if (!signalSent) errorMsg = "Failed to send signal"
                } else if (toolCall.name === "create_file") {
                  console.log("[Chat] Emitting create_script signal")
                  signalSent = await emitSignal("create_script", { 
                    path: toolCall.args.path, 
                    content: toolCall.args.content 
                  })
                  if (!signalSent) errorMsg = "Failed to create file"
                } else if (toolCall.name === "update_file") {
                  console.log("[Chat] Emitting update_script signal")
                  signalSent = await emitSignal("update_script", { 
                    path: toolCall.args.path, 
                    content: toolCall.args.content 
                  })
                  if (!signalSent) errorMsg = "Failed to update file"
                } else if (toolCall.name === "delete_file") {
                  console.log("[Chat] Emitting delete_file signal")
                  signalSent = await emitSignal("delete_file", { 
                    path: toolCall.args.path 
                  })

                  if (!signalSent) errorMsg = "Failed to delete file"
                } else {
                  signalSent = true
                }
                
                toolStatuses[toolCall.name] = {
                  status: signalSent ? "success" : "error",
                  result: signalSent ? "Signal sent to Roblox Studio" : undefined,
                  error: errorMsg || undefined
                }
              }

              const { tools: parsedTools, thinking } = parseToolCalls(assistantContent)
              
              if (parsedTools.length > 0) {
                console.log("[Chat] Parsed tools:", parsedTools.map(t => t.name), "Statuses:", toolStatuses)
              }
              
              const mergedTools: ToolCall[] = parsedTools.map((pt) => {
                const statusInfo = toolStatuses[pt.name]
                const finalStatus = statusInfo ? statusInfo.status : "executing"
                console.log("[Chat] Tool", pt.name, "-> status:", finalStatus)
                
                if (statusInfo) {
                  return {
                    name: pt.name,
                    args: pt.args,
                    status: statusInfo.status,
                    result: statusInfo.result,
                    error: statusInfo.error
                  }
                }
                return {
                  name: pt.name,
                  args: pt.args,
                  status: "executing" as ToolStatus
                }
              })

              setMessages((prev) =>
                prev.map((m) => 
                  m.id === assistantId
                    ? { 
                        ...m, 
                        content: assistantContent, 
                        reasoning: thinking || assistantReasoning, 
                        toolCalls: mergedTools 
                      }
                    : m
                )
              )
            } catch {
              continue
            }
          }
        }
      }


      if (currentChat && assistantContent) {
        const chatToSave = currentChat
        try {
          const res = await fetch("/api/chats", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: chatToSave.id,
              message: { role: "assistant", content: assistantContent, reasoning: assistantReasoning },
            }),
          })
          const data = await res.json()
          if (res.ok && data.chat) {
            const updatedchats = chats.map((c) => (c.id === chatToSave.id ? data.chat : c))
            setChats(updatedchats)
            savechatstocache(updatedchats)
            setSelectedChat(data.chat)
            currentChat = data.chat
          } else {
            console.error("Failed to save assistant message:", data)
          }
        } catch (error) {
          console.error("Error saving assistant message:", error)
        }
      }

      if (currentChat && !currentChat.manuallyRenamed) {
        const chatForRename = currentChat
        const newMessages = [...messages, userMessage, { id: assistantId, role: "assistant" as const, content: assistantContent }]
        const totalMessages = newMessages.length
        
        if (totalMessages <= 2 || totalMessages % 10 === 0) {
          const newName = await generateChatName(newMessages)
          await renameChat(chatForRename.id, newName, false)
        }
      }

      
      fetchBillingInfo()
    } catch (error) {
      console.error("[Chat] Error in handleSend:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, an error occurred. Please try again.",
        },
      ])
    } finally {
      setLoading(false)
      fetchBillingInfo()
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-card/50 p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">Overmind</span>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Button
              variant="outline"
              className="w-full justify-between text-left"
              onClick={() => setShowProjects(!showProjects)}
            >
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4" />
                <span className="truncate">{selectedProject?.name || "Select Project"}</span>
              </div>
              <ChevronDown className="w-4 h-4" />
            </Button>

            {showProjects && (
              <Card className="absolute left-0 right-0 top-full mt-1 p-2 z-50 max-h-48 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    className={cn(
                      "w-full p-2 rounded text-left text-sm hover:bg-accent transition-colors",
                      selectedProject?.id === p.id && "bg-accent"
                    )}
                    onClick={() => {
                      setSelectedProject(p)
                      setShowProjects(false)
                    }}
                  >
                    {p.name}
                  </button>
                ))}
                <div className="border-t mt-2 pt-2">
                  <div className="flex gap-1">
                    <Input
                      placeholder="New project..."
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="h-8 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && createProject()}
                    />
                    <Button size="sm" className="h-8 px-2" onClick={createProject}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Your Chats
            </span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={createChat}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {chats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No chats yet</p>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors",
                    "hover:bg-accent/50",
                    selectedChat?.id === chat.id && "bg-accent"
                  )}
                  onClick={() => selectChat(chat)}
                  onContextMenu={(e) => handleChatContextMenu(e, chat)}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{chat.name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="border-t pt-4 space-y-3">
          <Button 
            className="w-full justify-between gap-3 relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 border-0 text-white shadow-lg shadow-purple-500/25 group"
            onClick={() => router.push("/upgrade")}
          >
            <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:200%_100%] animate-shimmer" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-1 bg-white/20 rounded-md">
                <Crown className="w-4 h-4" />
              </div>
              <span className="font-semibold">Go Pro</span>
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">50% OFF</span>
              <Sparkles className="w-4 h-4" />
            </div>
          </Button>
          <div className="flex gap-1">
            <Button variant="ghost" className="flex-1 justify-start gap-2 px-3" size="sm" onClick={() => router.push("/settings?tab=account")}>
              <Settings className="w-4 h-4" />
              Settings
            </Button>
            <Button variant="ghost" className="flex-1 justify-start gap-2 px-3" size="sm" onClick={() => router.push("/settings?tab=api-keys")}>
              <Key className="w-4 h-4" />
              Keys
            </Button>
          </div>

          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border border-violet-500/20">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                currentTier === "free" && "bg-violet-500/20 text-violet-300 border border-violet-400/30",
                currentTier === "pro" && "bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 text-violet-300 border border-violet-400/40",
                currentTier === "studio" && "bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 border border-amber-400/40"
              )}>
                {currentTier}
              </div>
              {credits && (
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="p-1 rounded-md bg-violet-500/20">
                    <Zap className="w-3 h-3 text-violet-400" />
                  </div>
                  <span className="font-bold text-foreground">{credits.available}</span>
                  <span className="text-muted-foreground/70">/</span>
                  <span className="text-muted-foreground">{credits.total}</span>
                </div>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-violet-500/10 transition-colors" 
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="border-b bg-card/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Chat</h1>
          </div>

          
          <div className="flex items-center gap-3">
            <Button
              variant={connectionState === "connected" ? "default" : "outline"}
              size="sm"
              className={cn("gap-2", connectionState === "connected" && "bg-green-600 hover:bg-green-700")}
              onClick={handleConnect}
              disabled={connectionState === "connecting"}
            >
              {connectionState === "connecting" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : connectionState === "connected" ? (
                <PlugZap className="w-4 h-4" />
              ) : (
                <Plug className="w-4 h-4" />
              )}
              {connectionState === "connected" ? "Connected" : connectionState === "connecting" ? "Connecting..." : "Connect Roblox"}
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => showPresets ? closePresets() : setShowPresets(true)}
              >
                {PRESETS.find((p) => p.id === preset)?.icon}
                {PRESETS.find((p) => p.id === preset)?.name}
                <ChevronDown className="w-4 h-4" />
              </Button>

              {showPresets && (
                <Card className={cn(
                  "absolute right-0 top-full mt-2 w-56 p-2 z-50 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl",
                  showPresetsClosing ? "animate-dropdown-out" : "animate-dropdown-in"
                )}>
                  <div className="px-2 py-1.5 mb-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Presets</p>
                  </div>
                  {PRESETS.map((p) => {
                    const isproduction = process.env.NODE_ENV === "production"
                    const islocked = isproduction && p.id === "unrestricted"
                    const isActive = preset === p.id && !islocked
                    
                    return (
                      <button
                        key={p.id}
                        className={cn(
                          "relative w-full p-2 rounded-lg text-left transition-colors flex items-center gap-2",
                          islocked
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-accent/50",
                          isActive && "bg-accent"
                        )}
                        onClick={() => {
                          if (islocked) return
                          setPreset(p.id)
                          closePresets()
                        }}
                        disabled={islocked}
                      >
                        <span className="text-base">{islocked ? "🔒" : p.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{p.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.description}</div>
                        </div>
                        {isActive && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Check className="w-4 h-4 text-green-500" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </Card>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden flex flex-col">
          {/* Fixed Overlay Warnings */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4 flex flex-col gap-2 pointer-events-none">
            {connectionState === "disconnected" && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 rounded-xl text-yellow-500 text-sm shadow-xl animate-in fade-in slide-in-from-top-4 pointer-events-auto">
                <AlertCircle className="w-4 h-4" />
                <span className="flex-1">Roblox Studio not connected. Click "Connect Roblox" to enable script creation.</span>
              </div>
            )}

            {tierWarning?.show && (
              <div className="flex items-center justify-between gap-3 p-3 bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-xl text-red-400 text-sm shadow-xl animate-in fade-in slide-in-from-top-4 pointer-events-auto">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <span>{tierWarning.message}</span>
                    {tierWarning.gracePeriodEnds && (
                      <span className="ml-2 text-red-300">
                        (Expires: {new Date(tierWarning.gracePeriodEnds).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button 
                    size="sm" 
                    className="bg-red-500 hover:bg-red-600 text-white h-7 px-3 rounded-lg"
                    onClick={() => router.push("/upgrade")}
                  >
                    Fix Payment
                  </Button>
                  <button 
                    onClick={dismissTierWarning}
                    className="p-1 hover:bg-red-500/20 rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin pt-20">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl flex items-center justify-center mb-6">
                <Brain className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Overmind</h2>
              <p className="text-muted-foreground max-w-md">
                Your AI-powered assistant for Roblox development. Ask anything about your project, request code changes, or get help with architecture.
              </p>
            </div>
          )}

          {messages.map((message) => {
            const parsed = message.role === "assistant" 
              ? parseToolCalls(message.content)
              : { text: message.content, tools: [], thinking: undefined }
            
            const text = parsed.text
            const tools = message.toolCalls && message.toolCalls.length > 0 
              ? message.toolCalls 
              : parsed.tools
            const displayReasoning = parsed.thinking || message.reasoning

            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-fade-in",
                  message.role === "user" && "justify-end"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl p-4 font-sans",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border"
                  )}
                >
                  {displayReasoning && <ReasoningSection reasoning={displayReasoning} />}
                  
                  {tools.length > 0 && (
                    <div className="mb-2">
                      {tools.map((tool, idx) => (
                        <ToolCallCard key={idx} tool={tool} />
                      ))}
                    </div>
                  )}
                  
                  {text && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "")
                            const isblock = String(children).includes("\n") || match
                            
                            if (isblock) {
                              return (
                                <CodeBlock language={match?.[1]}>
                                  {String(children).replace(/\n$/, "")}
                                </CodeBlock>
                              )
                            }
                            
                            return <InlineCode {...props}>{children}</InlineCode>
                          },
                          pre({ children }) {
                            return <>{children}</>
                          }
                        }}
                      >
                        {text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {loading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="bg-card border rounded-2xl p-4">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t bg-card/50 p-4">
          <form
            className="flex gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Overmind anything..."
              className="flex-1 bg-background"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
            
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => showContextMenu ? closeContextMenu() : setShowContextMenu(true)}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>

              {showContextMenu && (
                <Card className={cn(
                  "absolute right-0 bottom-full mb-2 w-72 p-2 z-50 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl",
                  contextMenuClosing ? "animate-dropdown-up-out" : "animate-dropdown-up"
                )}>
                  <div className="px-2 py-1.5 mb-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Settings</p>
                  </div>
                  
                  <div 
                    className="relative"
                    onMouseEnter={() => setShowModesMenu(true)}
                    onMouseLeave={() => setShowModesMenu(false)}
                  >
                    <button
                      className="w-full p-2.5 rounded-xl text-left hover:bg-white/5 transition-all duration-200 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Settings className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">AI Modes</div>
                        <p className="text-xs text-muted-foreground">
                          {[thinkingMode && "Thinking", highTemperature && "Hot", creativeMode && "Creative", debugMode && "Debug"].filter(Boolean).join(", ") || "None active"}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {showModesMenu && (
                      <div className="absolute right-full bottom-0 pr-1">
                        <Card className={cn(
                          "w-64 p-2 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl",
                          modesMenuClosing ? "animate-slide-left-out" : "animate-slide-left"
                        )}>
                          <div className="px-2 py-1.5 mb-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Toggle Modes</p>
                          </div>
                          
                        <button
                          className={cn(
                            "w-full p-2.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3",
                            thinkingMode ? "bg-yellow-500/10 border border-yellow-500/20" : "hover:bg-white/5"
                          )}
                          onClick={() => setThinkingMode(!thinkingMode)}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            thinkingMode ? "bg-yellow-500/20" : "bg-muted"
                          )}>
                            <Lightbulb className={cn("w-4 h-4", thinkingMode ? "text-yellow-500" : "text-muted-foreground")} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">Thinking Mode</div>
                            <p className="text-xs text-muted-foreground">Deep reasoning</p>
                          </div>
                          {thinkingMode && <Check className="w-4 h-4 text-yellow-500" />}
                        </button>

                        <button
                          className={cn(
                            "w-full p-2.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3",
                            highTemperature ? "bg-red-500/10 border border-red-500/20" : "hover:bg-white/5"
                          )}
                          onClick={() => setHighTemperature(!highTemperature)}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            highTemperature ? "bg-red-500/20" : "bg-muted"
                          )}>
                            <Thermometer className={cn("w-4 h-4", highTemperature ? "text-red-500" : "text-muted-foreground")} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">High Temperature</div>
                            <p className="text-xs text-muted-foreground">More creative</p>
                          </div>
                          {highTemperature && <Check className="w-4 h-4 text-red-500" />}
                        </button>

                        <button
                          className={cn(
                            "w-full p-2.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3",
                            creativeMode ? "bg-purple-500/10 border border-purple-500/20" : "hover:bg-white/5"
                          )}
                          onClick={() => setCreativeMode(!creativeMode)}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            creativeMode ? "bg-purple-500/20" : "bg-muted"
                          )}>
                            <Wand2 className={cn("w-4 h-4", creativeMode ? "text-purple-500" : "text-muted-foreground")} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">Creative Mode</div>
                            <p className="text-xs text-muted-foreground">Imaginative</p>
                          </div>
                          {creativeMode && <Check className="w-4 h-4 text-purple-500" />}
                        </button>

                        <button
                          className={cn(
                            "w-full p-2.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3",
                            debugMode ? "bg-orange-500/10 border border-orange-500/20" : "hover:bg-white/5"
                          )}
                          onClick={() => setDebugMode(!debugMode)}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            debugMode ? "bg-orange-500/20" : "bg-muted"
                          )}>
                            <Bug className={cn("w-4 h-4", debugMode ? "text-orange-500" : "text-muted-foreground")} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">Debug Mode</div>
                            <p className="text-xs text-muted-foreground">Verbose logs</p>
                          </div>
                          {debugMode && <Check className="w-4 h-4 text-orange-500" />}
                        </button>
                        </Card>
                      </div>
                    )}
                  </div>

                  <div 
                    className="relative"
                    onMouseEnter={() => setShowModelsMenu(true)}
                    onMouseLeave={() => setShowModelsMenu(false)}
                  >
                    <button
                      className="w-full p-2.5 rounded-xl text-left hover:bg-white/5 transition-all duration-200 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">AI Model</div>
                        <p className="text-xs text-muted-foreground">
                          {MODELS.find(m => m.id === selectedModel)?.name || "ChatGPT 4o"}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {showModelsMenu && (
                      <div className="absolute right-full bottom-0 pr-1">
                        <Card className="w-56 p-2 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl animate-slide-left">
                          <div className="px-2 py-1.5 mb-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Model</p>
                          </div>
                          {MODELS.map((model) => {
                            const isActive = selectedModel === model.id
                            return (
                              <button
                                key={model.id}
                                className={cn(
                                  "relative w-full p-2 rounded-lg text-left transition-colors flex items-center gap-2",
                                  isActive ? "bg-accent" : "hover:bg-accent/50"
                                )}
                                onClick={() => setSelectedModel(model.id)}
                              >
                                <span className="text-base">{model.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{model.name}</div>
                                  <div className="text-xs text-muted-foreground">{model.creditCost}x credits</div>
                                </div>
                                {isActive && (
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <Check className="w-4 h-4 text-green-500" />
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </Card>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/5 my-2" />

                  <button
                    className="w-full p-2.5 rounded-xl text-left hover:bg-red-500/10 transition-all duration-200 flex items-center gap-3 text-red-400"
                    onClick={() => {
                      setMessages([])
                      closeContextMenu()
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">Clear Chat</div>
                      <p className="text-xs text-red-400/60">Remove all messages</p>
                    </div>
                  </button>
                </Card>
              )}
            </div>
          </form>
        </div>
      </main>

      <ContextMenu
        open={chatContextMenu.open}
        onClose={() => setChatContextMenu({ open: false, position: { x: 0, y: 0 }, chat: null })}
        position={chatContextMenu.position}
      >
        <ContextMenuItem
          icon={<Trash2 className="w-4 h-4" />}
          variant="destructive"
          onClick={() => {
            if (chatContextMenu.chat) {
              setDeleteModal({ open: true, chat: chatContextMenu.chat })
            }
          }}
        >
          Delete
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          icon={<Pencil className="w-4 h-4" />}
          onClick={() => {
            if (chatContextMenu.chat) {
              setRenameModal({ open: true, chat: chatContextMenu.chat })
            }
          }}
        >
          Rename
        </ContextMenuItem>
      </ContextMenu>

      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, chat: null })}
        onConfirm={() => {
          if (deleteModal.chat) {
            deleteChat(deleteModal.chat.id)
          }
          setDeleteModal({ open: false, chat: null })
        }}
        title="Delete Chat"
        description={`Are you sure you want to delete "${deleteModal.chat?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />

      <InputModal
        open={renameModal.open}
        onClose={() => setRenameModal({ open: false, chat: null })}
        onConfirm={(newName) => {
          if (renameModal.chat) {
            renameChat(renameModal.chat.id, newName, true)
          }
          setRenameModal({ open: false, chat: null })
        }}
        title="Rename Chat"
        description="Enter a new name for this chat."
        placeholder="Chat name..."
        initialValue={renameModal.chat?.name || ""}
        confirmText="Rename"
      />
    </div>
  )
}
