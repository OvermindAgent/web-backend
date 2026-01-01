import { type Tier, hasMinimumTier } from "./tiers"

export const LOCKED_FEATURES: Record<string, Tier> = {
  ai_provider: "pro",
}

export const LOCKED_TOOLS: Record<string, Tier> = {}

export const LOCKED_PRESETS: Record<string, Tier> = {}

export const LOCKED_MODELS: Record<string, Tier> = {}

export function isFeatureLocked(feature: string, userTier: Tier): boolean {
  const requiredTier = LOCKED_FEATURES[feature]
  if (!requiredTier) return false
  return !hasMinimumTier(userTier, requiredTier)
}

export function isToolLocked(tool: string, userTier: Tier): boolean {
  const requiredTier = LOCKED_TOOLS[tool]
  if (!requiredTier) return false
  return !hasMinimumTier(userTier, requiredTier)
}

export function isPresetLocked(preset: string, userTier: Tier): boolean {
  const requiredTier = LOCKED_PRESETS[preset]
  if (!requiredTier) return false
  return !hasMinimumTier(userTier, requiredTier)
}

export function isModelLocked(model: string, userTier: Tier): boolean {
  const requiredTier = LOCKED_MODELS[model]
  if (!requiredTier) return false
  return !hasMinimumTier(userTier, requiredTier)
}

export function getLockedToolsForTier(userTier: Tier): string[] {
  return Object.entries(LOCKED_TOOLS)
    .filter(([, requiredTier]) => !hasMinimumTier(userTier, requiredTier))
    .map(([tool]) => tool)
}

export function getLockedPresetsForTier(userTier: Tier): string[] {
  return Object.entries(LOCKED_PRESETS)
    .filter(([, requiredTier]) => !hasMinimumTier(userTier, requiredTier))
    .map(([preset]) => preset)
}

export function getLockedModelsForTier(userTier: Tier): string[] {
  return Object.entries(LOCKED_MODELS)
    .filter(([, requiredTier]) => !hasMinimumTier(userTier, requiredTier))
    .map(([model]) => model)
}

export function getRequiredTierForTool(tool: string): Tier | null {
  return LOCKED_TOOLS[tool] || null
}

export function getRequiredTierForPreset(preset: string): Tier | null {
  return LOCKED_PRESETS[preset] || null
}

export function getRequiredTierForModel(model: string): Tier | null {
  return LOCKED_MODELS[model] || null
}
