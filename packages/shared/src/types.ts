export type Preset = "fast" | "edit" | "planning"

export type TaskStatus = "pending" | "in_progress" | "blocked" | "completed" | "cancelled"

export type ClientSource = "web" | "roblox" | "vscode"

export type ToolCategory = "filesystem" | "tasks" | "projects" | "signals"

export interface User {
  id: string
  email: string
  displayName: string
}

export interface Project {
  id: string
  name: string
  description?: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string
  status: TaskStatus
}

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
  reasoning_content?: string
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  expiresAt: number | null
  createdAt: number
  lastUsedAt: number | null
}

export interface WebSocketMessage {
  type: "event" | "signal" | "auth" | "chat" | "error"
  source?: ClientSource
  projectId?: string
  payload?: Record<string, unknown>
}

export interface Signal {
  action: string
  payload?: Record<string, unknown>
}

export interface ToolCall {
  name: string
  args: Record<string, unknown>
}

export interface ToolResult {
  success: boolean
  result?: unknown
  error?: string
}
