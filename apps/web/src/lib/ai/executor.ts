import { getTool, type ToolCall, type ToolDefinition } from "./tools"
import { db, type Task } from "../db/kv"
import { generateId } from "../utils"

interface ExecutionResult {
  success: boolean
  result?: unknown
  error?: string
}

const TOOL_REGEX = /<tool\s+name="([^"]+)">([\s\S]*?)<\/tool>/g
const ARG_REGEX = /<arg\s+name="([^"]+)">([\s\S]*?)<\/arg>/g

export function parseToolCalls(content: string): ToolCall[] {
  const calls: ToolCall[] = []
  
  let match: RegExpExecArray | null
  const regex = new RegExp(TOOL_REGEX.source, "g")
  while ((match = regex.exec(content)) !== null) {
    const [, toolName, argsContent] = match
    const args: Record<string, unknown> = {}
    
    let argMatch: RegExpExecArray | null
    const argRegex = new RegExp(ARG_REGEX.source, "g")
    while ((argMatch = argRegex.exec(argsContent)) !== null) {
      const [, argName, argValue] = argMatch
      args[argName] = parseArgValue(argValue.trim())
    }
    
    calls.push({ name: toolName, args })
  }
  
  return calls
}

function parseArgValue(value: string): unknown {
  if (value === "true") return true
  if (value === "false") return false
  if (/^\d+$/.test(value)) return parseInt(value, 10)
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value)
  
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function validateToolCall(call: ToolCall): { valid: boolean; errors: string[] } {
  const tool = getTool(call.name)
  const errors: string[] = []
  
  if (!tool) {
    return { valid: false, errors: [`Unknown tool: ${call.name}`] }
  }
  
  for (const param of tool.parameters) {
    if (param.required && !(param.name in call.args)) {
      errors.push(`Missing required parameter: ${param.name}`)
    }
  }
  
  return { valid: errors.length === 0, errors }
}

export async function executeTool(
  call: ToolCall,
  context: { projectId?: string; userId?: string }
): Promise<ExecutionResult> {
  const validation = validateToolCall(call)
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(", ") }
  }
  
  try {
    const result = await executeToolInternal(call, context)
    return { success: true, result }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: message }
  }
}

async function executeToolInternal(
  call: ToolCall,
  context: { projectId?: string; userId?: string }
): Promise<unknown> {
  const { name, args } = call
  const { projectId, userId } = context

  switch (name) {
    case "emit_signal": {
      const action = args.action as string
      const payload = args.payload as Record<string, unknown> | undefined
      
      console.log(`[Tool] emit_signal: ${action}`, payload)
      
      return { 
        emitted: true, 
        action, 
        payload,
        message: `Signal "${action}" queued for connected clients`
      }
    }

    case "create_task": {
      if (!userId || !projectId) {
        throw new Error("User ID and Project ID required for create_task")
      }

      const task: Task = {
        id: generateId(),
        projectId,
        userId,
        title: args.title as string,
        description: args.description as string | undefined,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await db.createTask(task)
      return { created: true, task }
    }

    case "update_task": {
      const taskId = args.id as string
      const updates: Partial<Task> = {}
      
      if (args.status) updates.status = args.status as Task["status"]
      if (args.title) updates.title = args.title as string
      if (args.description !== undefined) updates.description = args.description as string

      await db.updateTask(taskId, updates)
      const task = await db.getTask(taskId)
      return { updated: true, task }
    }

    case "complete_task": {
      const taskId = args.id as string
      await db.updateTask(taskId, { status: "completed" })
      return { completed: true, id: taskId }
    }

    case "list_projects": {
      if (!userId) {
        throw new Error("User ID required for list_projects")
      }
      const projects = await db.getUserProjects(userId)
      return { projects }
    }

    case "select_project": {
      const id = args.id as string
      const project = await db.getProject(id)
      if (!project) {
        throw new Error(`Project not found: ${id}`)
      }
      return { selected: true, project }
    }

    case "create_file":
    case "update_file":
    case "delete_file":
    case "read_file":
    case "search_files":
    case "create_folder": {
      console.log(`[Tool] ${name}:`, args)

      return {
        queued: true,
        action: name,
        args,
        message: `File operation "${name}" queued for connected clients`
      }
    }

    case "create_object":
    case "update_object":
    case "delete_object":
    case "move_object":
    case "clone_object": {
      console.log(`[Tool] ${name}:`, args)

      return {
        queued: true,
        action: name,
        args,
        message: `Roblox object operation "${name}" queued for connected clients`
      }
    }

    case "run_script": {
      console.log(`[Tool] run_script:`, { scriptType: args.scriptType, codeLength: (args.code as string)?.length })

      return {
        queued: true,
        action: "run_script",
        args,
        message: `Script execution queued (requires user confirmation in Roblox Studio)`
      }
    }

    case "query_search": {
      console.log(`[Tool] query_search:`, args)

      return {
        queued: true,
        action: "query_search",
        args,
        message: `Query search queued for connected clients`
      }
    }

    case "grep_search": {
      console.log(`[Tool] grep_search:`, { pattern: args.pattern, scriptType: args.scriptType })

      return {
        queued: true,
        action: "grep_search",
        args,
        message: `Grep search queued for connected clients`
      }
    }

    case "search": {
      console.log(`[Tool] search:`, { query: args.query, mode: args.mode, searchIn: args.searchIn })

      return {
        queued: true,
        action: "search",
        args,
        message: `Search queued for connected clients`
      }
    }

    case "web_search": {
      console.log(`[Tool] web_search:`, { query: args.query })

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const response = await fetch(`${baseUrl}/api/tools/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: args.query }),
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }

      return await response.json()
    }

    case "web_outline": {
      console.log(`[Tool] web_outline:`, { url: args.url })

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const response = await fetch(`${baseUrl}/api/tools/outline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: args.url }),
      })

      if (!response.ok) {
        throw new Error(`Outline failed: ${response.status}`)
      }

      return await response.json()
    }
      
    default:
      throw new Error(`Unimplemented tool: ${name}`)
  }
}

export function hasToolCall(content: string): boolean {
  const regex = new RegExp(TOOL_REGEX.source, "g")
  return regex.test(content)
}

export function extractTextContent(content: string): string {
  return content.replace(new RegExp(TOOL_REGEX.source, "g"), "").trim()
}
