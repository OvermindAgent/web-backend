import { AI_CONFIG } from "../config"
import { buildSystemPrompt } from "./prompt"
import { getPreset, type Preset } from "./presets"
import { type Tier } from "../db/kv"

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
  reasoning_content?: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  preset?: Preset
  projectContext?: string
  stream?: boolean
  provider?: string
  model?: string
  userTier?: Tier
  userInfo?: { displayName?: string; creditsUsed?: number; creditsTotal?: number }
  featureFlags?: { webSearchEnabled?: boolean; canvasEnabled?: boolean; mentorEnabled?: boolean }
}

export interface ChatResponse {
  id: string
  model: string
  content: string
  reasoning_content?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface StreamChunk {
  content?: string
  reasoning_content?: string
  done: boolean
}

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const preset = request.preset || "fast"
  const systemPrompt = buildSystemPrompt(preset, request.projectContext, request.userTier, request.userInfo)
  const presetConfig = getPreset(preset)
  
  const provider = request.provider || presetConfig.provider || AI_CONFIG.defaultProvider
  const model = request.model || presetConfig.model || AI_CONFIG.defaultModel
  
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...request.messages.filter((m) => m.role !== "system"),
  ]
  
  console.log(`[Router] Using provider: ${provider}, model: ${model}, tier: ${request.userTier || "none"}`)
  
  const response = await fetch(`${AI_CONFIG.baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      provider,
      model,
      messages,
      stream: false,
    }),
  })
  
  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`)
  }
  
  const data = await response.json()
  
  return {
    id: data.id,
    model: data.model,
    content: data.choices[0]?.message?.content || "",
    reasoning_content: data.choices[0]?.message?.reasoning_content,
    usage: data.usage,
  }
}

export async function* streamChat(request: ChatRequest): AsyncGenerator<StreamChunk> {
  const preset = request.preset || "fast"
  const systemPrompt = buildSystemPrompt(preset, request.projectContext, request.userTier, request.userInfo, request.featureFlags)
  const presetConfig = getPreset(preset)
  
  const provider = request.provider || presetConfig.provider || AI_CONFIG.defaultProvider
  const model = request.model || presetConfig.model || AI_CONFIG.defaultModel
  
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...request.messages.filter((m) => m.role !== "system"),
  ]
  
  console.log(`[Router Stream] Using provider: ${provider}, model: ${model}, tier: ${request.userTier || "none"}`)
  
  const response = await fetch(`${AI_CONFIG.baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      provider,
      model,
      messages,
      stream: true,
    }),
  })
  
  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`)
  }
  
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error("No response body")
  }
  
  const decoder = new TextDecoder()
  let buffer = ""
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6)
        if (data === "[DONE]") {
          yield { done: true }
          return
        }
        
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta
          if (delta?.content || delta?.reasoning_content) {
            yield {
              content: delta.content,
              reasoning_content: delta.reasoning_content,
              done: false,
            }
          }
        } catch {
          continue
        }
      }
    }
  }
  
  yield { done: true }
}

export async function listProviders(): Promise<{ id: string; name: string }[]> {
  const response = await fetch(`${AI_CONFIG.baseUrl}/api/providers`, {
    headers: { Authorization: `Bearer ${AI_CONFIG.apiKey}` },
  })
  
  if (!response.ok) {
    throw new Error(`Failed to list providers: ${response.status}`)
  }
  
  const data = await response.json()
  return data.providers || []
}

export async function listModels(provider: string): Promise<{ id: string; name?: string }[]> {
  const response = await fetch(`${AI_CONFIG.baseUrl}/api/models?provider=${provider}`, {
    headers: { Authorization: `Bearer ${AI_CONFIG.apiKey}` },
  })
  
  if (!response.ok) {
    throw new Error(`Failed to list models: ${response.status}`)
  }
  
  const data = await response.json()
  return data.models || []
}
