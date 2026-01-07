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

function generateCustomToolsContext(): string {
  return `## CUSTOM TOOLS (No Roblox Connection Required)

**web_search** - Search the web for current information
- Returns up to 6 results with title, snippet, and URL
- Use when you need information not in your training data

**web_outline** - Extract text content from a webpage
- Returns the page title, text content, and word count  
- Use after web_search to read full page content`
}

function generateToolExecutionContext(): string {
  return `## TOOL EXECUTION FLOW (CRITICAL)

When you call a tool:
1. Your response ends after the tool call
2. The system executes the tool
3. You receive the result in a follow-up message
4. THEN you can comment on success/failure

**IMPORTANT:** Do NOT write success messages, confirmations, or summaries about tool actions in the same response as the tool call. You don't know if it succeeded yet. The system will tell you the result, and then you respond based on that.

Example - WRONG:
\`\`\`
<tool name="create_file">...</tool>
✅ Created the script! It includes...
\`\`\`

Example - CORRECT:
\`\`\`
<tool name="create_file">...</tool>
\`\`\`
(Then wait for result, then respond)`
}

export type FeatureFlags = {
  webSearchEnabled?: boolean
  canvasEnabled?: boolean
  mentorEnabled?: boolean
}

function generateFeatureFlagsContext(flags?: FeatureFlags): string {
  if (!flags) return ""
  
  let context = ""
  
  if (flags.webSearchEnabled) {
    context += `## WEB SEARCH MODE (FORCED)

Web search is ENABLED and REQUIRED. You MUST use the web_search tool for:
- Any factual questions you're not 100% certain about
- Current events, news, real-time information
- Complex scripting that needs documentation or code examples
- Any topic that might have changed since your training data
- Technical questions about APIs, libraries, or frameworks

DO NOT answer from memory alone when this mode is active - search first, then respond with accurate, up-to-date information.

`
  }
  
  if (flags.mentorEnabled) {
    context += `## ACADEMY MODE (LEARNING COMPANION)

You are now a study buddy helping the user LEARN, not just get answers.

**Your teaching approach:**
- Explain concepts step-by-step, like a patient friend would
- Ask guiding questions to help them think through problems
- Don't just give answers - help them understand WHY things work
- Break complex topics into bite-sized, digestible pieces
- Use analogies and real-world examples they can relate to
- Check understanding: "Does that make sense?" "What do you think would happen if...?"
- Celebrate their progress and encourage curiosity
- If they're stuck, give hints before full answers

**Tone:** Friendly, casual, supportive - like a classmate who's really good at this subject and genuinely wants to help you understand.

`
  }
  
  if (flags.canvasEnabled) {
    context += `## CANVAS MODE

Canvas is enabled. You can use canvas tools to create visual content that appears in a side panel.

**Canvas tools:**
- canvas_write: Write/replace all content in the canvas
- canvas_append: Add content to the end of canvas
- canvas_clear: Clear the canvas

**Supported content types:**
- Markdown with full formatting
- Mermaid diagrams (flowchart, sequence, class, state, ER, pie, mindmap, timeline, gitGraph)
- Math equations using LaTeX syntax (wrapped in $$ for block or $ for inline)
- Code blocks with syntax highlighting
- Tables, lists, and all standard markdown

Use the canvas when you need to show diagrams, structured content, or anything visual that benefits from a dedicated space.

`
  }
  
  return context
}

function generateToolDocs(userTier?: Tier): string {
  const categories = ["filesystem", "tasks", "projects", "signals", "roblox_objects", "custom"] as const
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

function generateTierContext(userTier: Tier, userInfo?: { displayName?: string; creditsUsed?: number; creditsTotal?: number }): string {
  const lockedTools = getLockedToolsForTier(userTier)
  const lockedPresets = getLockedPresetsForTier(userTier)
  const lockedModels = getLockedModels(userTier)
  const availableModels = getAvailableModels(userTier)
  
  let context = "## USER CONTEXT\n\n"
  
  context += `**Current User Tier:** ${userTier.toUpperCase()}\n`
  if (userInfo?.displayName) {
    context += `**Display Name:** ${userInfo.displayName}\n`
  }
  if (userInfo?.creditsTotal !== undefined) {
    const available = (userInfo.creditsTotal || 0) - (userInfo.creditsUsed || 0)
    context += `**Credits:** ${available}/${userInfo.creditsTotal} available today\n`
  }
  context += "\n"
  
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
  userInfo?: { displayName?: string; creditsUsed?: number; creditsTotal?: number }
}

export function buildSystemPrompt(
  preset: Preset, 
  projectContext?: string, 
  userTier?: Tier,
  userInfo?: { displayName?: string; creditsUsed?: number; creditsTotal?: number },
  featureFlags?: FeatureFlags
): string {
  const basePrompt = loadInternalPrompt()
  const presetConfig = getPreset(preset)
  const toolDocs = generateToolDocs(userTier)
  const tierContext = userTier ? generateTierContext(userTier, userInfo) : ""
  const featureFlagsContext = generateFeatureFlagsContext(featureFlags)
  
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

  const customToolsContext = generateCustomToolsContext()
  systemPrompt += "\n\n" + customToolsContext
  
  const toolExecutionContext = generateToolExecutionContext()
  systemPrompt += "\n\n" + toolExecutionContext
  
  if (featureFlagsContext) {
    systemPrompt += "\n\n" + featureFlagsContext
  }
  
  if (tierContext) {
    systemPrompt += "\n\n" + tierContext
  }
  
  if (projectContext) {
    systemPrompt += `\n\n## PROJECT CONTEXT\n\n${projectContext}`
  }
  
  const activeFlags = []
  if (featureFlags?.webSearchEnabled) activeFlags.push("webSearch")
  if (featureFlags?.mentorEnabled) activeFlags.push("mentor")
  if (featureFlags?.canvasEnabled) activeFlags.push("canvas")
  
  console.log(`[Prompt] Building for preset: ${preset}, tier: ${userTier || "none"}, flags: [${activeFlags.join(", ")}]`)
  
  return systemPrompt
}

export function clearPromptCache(): void {
  cachedPrompt = null
}

