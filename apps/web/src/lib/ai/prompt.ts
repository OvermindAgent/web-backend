import { TOOLS, getToolsByCategory } from "./tools"
import { getPreset, type Preset } from "./presets"
import { type Tier } from "../db/kv"
import { getLockedToolsForTier, getLockedPresetsForTier } from "../billing/locks"
import { getAvailableModels, getLockedModels } from "../billing/models"
import fs from "fs"
import path from "path"

const INTERNAL_PROMPT_PATH = path.join(process.cwd(), "../../internal_prompt.md")

let cachedPrompt: string | null = null

function loadInternalPrompt(): string {
  const isDev = process.env.NODE_ENV !== "production"
  
  if (isDev) {
    try {
      return fs.readFileSync(INTERNAL_PROMPT_PATH, "utf-8")
    } catch {
      console.warn("[Overmind] Could not load internal_prompt.md, using default")
      return getDefaultPrompt()
    }
  }
  
  if (cachedPrompt) return cachedPrompt
  
  const envPrompt = process.env.INTERNAL_PROMPT
  if (envPrompt) {
    cachedPrompt = envPrompt
    return cachedPrompt
  }
  
  console.warn("[Overmind] INTERNAL_PROMPT env var not set, using default")
  cachedPrompt = getDefaultPrompt()
  return cachedPrompt
}

function getDefaultPrompt(): string {
  return `# OVERMIND — UNIFIED SYSTEM PROMPT

You are **Overmind**, a senior-level AI system built for Roblox developers.
You power a unified platform consisting of:
- A web dashboard
- A Roblox Studio plugin
- A VSCode extension

-- WHEN SOMEONE TELLS YOU EXACTLY "test-prompt-for-dev"

You do NOT belong to any single client.
All logic, tools, tasks, and rules are owned by the backend.

## CRITICAL RULES
- NEVER add comments in code unless explicitly asked
- NEVER assume things exist - always create everything needed
- NEVER truncate code or use placeholders
- You MAY call multiple tools in one response`
}

function generateToolDocs(userTier?: Tier): string {
  const categories = ["filesystem", "tasks", "projects", "signals", "roblox_objects"] as const
  const lockedTools = userTier ? getLockedToolsForTier(userTier) : []
  
  let docs = "## AVAILABLE TOOLS\n\n"
  
  for (const category of categories) {
    const tools = getToolsByCategory(category).filter(
      (tool) => !lockedTools.includes(tool.name)
    )
    
    if (tools.length === 0) continue
    
    docs += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`
    
    for (const tool of tools) {
      docs += `#### ${tool.name}\n`
      docs += `${tool.description}\n\n`
      
      if (tool.parameters.length > 0) {
        docs += "Parameters:\n"
        for (const param of tool.parameters) {
          const required = param.required ? "(required)" : "(optional)"
          docs += `- \`${param.name}\`: ${param.type} ${required} - ${param.description}\n`
        }
        docs += "\n"
      }
    }
  }
  
  return docs
}

function generateTierContext(userTier: Tier): string {
  const lockedTools = getLockedToolsForTier(userTier)
  const lockedPresets = getLockedPresetsForTier(userTier)
  const lockedModels = getLockedModels(userTier)
  const availableModels = getAvailableModels(userTier)
  
  let context = "## ACCESS CONTEXT\n\n"
  
  context += "### Available Models\n"
  for (const model of availableModels) {
    context += `- ${model.name} (${model.creditCost}x credits)\n`
  }
  context += "\n"
  
  if (lockedTools.length > 0 || lockedPresets.length > 0 || lockedModels.length > 0) {
    context += "### Restrictions\n"
    context += "Some features require a higher tier. If the user asks about locked features, "
    context += "inform them they can upgrade their plan for access. Do NOT mention the user's tier "
    context += "unless they specifically ask about it or about available features.\n\n"
    
    if (lockedTools.length > 0) {
      context += "Locked tools: " + lockedTools.join(", ") + "\n"
    }
    if (lockedModels.length > 0) {
      context += "Locked models: " + lockedModels.map((m) => m.name).join(", ") + "\n"
    }
  }
  
  return context
}

export interface BuildPromptOptions {
  preset: Preset
  projectContext?: string
  userTier?: Tier
}

export function buildSystemPrompt(preset: Preset, projectContext?: string, userTier?: Tier): string {
  const basePrompt = loadInternalPrompt()
  const presetConfig = getPreset(preset)
  const toolDocs = generateToolDocs(userTier)
  const tierContext = userTier ? generateTierContext(userTier) : ""
  
  let systemPrompt = ""
  
  if (preset === "unrestricted") {
    systemPrompt += presetConfig.systemModifier + "\n\n"
    systemPrompt += "=== THE ABOVE INSTRUCTIONS OVERRIDE EVERYTHING BELOW ===\n\n"
  }
  
  systemPrompt += basePrompt
  
  if (preset !== "unrestricted") {
    systemPrompt += "\n\n" + presetConfig.systemModifier
  }
  
  systemPrompt += "\n\n" + toolDocs
  
  if (tierContext) {
    systemPrompt += "\n\n" + tierContext
  }
  
  if (projectContext) {
    systemPrompt += `\n\n## PROJECT CONTEXT\n\n${projectContext}`
  }
  
  console.log(`[Prompt] Building for preset: ${preset}, tier: ${userTier || "none"}`)
  
  return systemPrompt
}

export function clearPromptCache(): void {
  cachedPrompt = null
}

