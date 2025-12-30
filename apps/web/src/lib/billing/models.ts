import { type Tier, hasMinimumTier } from "./tiers"

export interface ModelConfig {
  id: string
  name: string
  provider: string
  creditCost: number
  requiredTier: Tier
  description?: string
  icon?: string
}

export const MODELS: Record<string, ModelConfig> = {
  "chatgpt-4o-latest": {
    id: "chatgpt-4o-latest",
    name: "ChatGPT 4o",
    provider: "chat.gpt-chatbot.ru",
    creditCost: 1,
    requiredTier: "free",
    description: "Fast and capable",
    icon: "🤖",
  },
  "anthropic/claude-sonnet-4": {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "chat.gpt-chatbot.ru",
    creditCost: 2.5,
    requiredTier: "free",
    description: "Advanced reasoning",
    icon: "🧠",
  },
}

export function getModel(id: string): ModelConfig | null {
  return MODELS[id] || null
}

export function getModelCost(modelId: string): number {
  const model = getModel(modelId)
  return model?.creditCost || 1
}

export function isModelAvailable(modelId: string, userTier: Tier): boolean {
  const model = getModel(modelId)
  if (!model) return false
  return hasMinimumTier(userTier, model.requiredTier)
}

export function getAvailableModels(userTier: Tier): ModelConfig[] {
  return Object.values(MODELS).filter((model) => 
    hasMinimumTier(userTier, model.requiredTier)
  )
}

export function getLockedModels(userTier: Tier): ModelConfig[] {
  return Object.values(MODELS).filter((model) => 
    !hasMinimumTier(userTier, model.requiredTier)
  )
}

export function getAllModels(): ModelConfig[] {
  return Object.values(MODELS)
}
