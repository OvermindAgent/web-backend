import { streamChat, type ChatMessage, type ChatRequest, type StreamChunk } from "./router"
import { parseToolCalls, executeTool, hasToolCall, extractTextContent } from "./executor"
import { getTool } from "./tools"

export interface AgentStep {
  type: "thinking" | "tool_call" | "tool_result" | "response"
  content: string
  toolName?: string
  toolArgs?: Record<string, unknown>
  toolResult?: unknown
  toolError?: string
  timestamp: number
}

export interface AgentState {
  messages: ChatMessage[]
  steps: AgentStep[]
  currentStep: number
  maxSteps: number
  isComplete: boolean
}

export interface AgentChunk {
  type: "content" | "reasoning" | "tool_start" | "tool_result" | "step" | "done" | "error"
  content?: string
  step?: AgentStep
  toolName?: string
  toolArgs?: Record<string, unknown>
  toolResult?: unknown
  error?: string
}

const MAX_AGENT_STEPS = 25
const CUSTOM_TOOL_NAMES = ["web_search", "web_outline"]

function isCustomTool(name: string): boolean {
  return CUSTOM_TOOL_NAMES.includes(name)
}

export async function* runAgent(
  request: ChatRequest,
  context: { projectId?: string; userId?: string }
): AsyncGenerator<AgentChunk> {
  const state: AgentState = {
    messages: [...request.messages],
    steps: [],
    currentStep: 0,
    maxSteps: MAX_AGENT_STEPS,
    isComplete: false,
  }

  while (!state.isComplete && state.currentStep < state.maxSteps) {
    state.currentStep++

    let fullContent = ""
    let fullReasoning = ""

    for await (const chunk of streamChat({ ...request, messages: state.messages })) {
      if (chunk.done) break

      if (chunk.content) {
        fullContent += chunk.content
        yield { type: "content", content: chunk.content }
      }

      if (chunk.reasoning_content) {
        fullReasoning += chunk.reasoning_content
        yield { type: "reasoning", content: chunk.reasoning_content }
      }
    }

    if (!hasToolCall(fullContent)) {
      state.isComplete = true
      state.steps.push({
        type: "response",
        content: extractTextContent(fullContent),
        timestamp: Date.now(),
      })
      yield { type: "done" }
      return
    }

    const toolCalls = parseToolCalls(fullContent)
    const customToolCalls = toolCalls.filter(tc => isCustomTool(tc.name))

    if (customToolCalls.length === 0) {
      for (const call of toolCalls) {
        yield {
          type: "tool_start",
          toolName: call.name,
          toolArgs: call.args,
        }

        const result = await executeTool(call, context)

        state.steps.push({
          type: "tool_call",
          content: `Called ${call.name}`,
          toolName: call.name,
          toolArgs: call.args,
          toolResult: result.result,
          toolError: result.error,
          timestamp: Date.now(),
        })

        yield {
          type: "tool_result",
          toolName: call.name,
          toolResult: result.result,
          error: result.error,
        }
      }

      state.isComplete = true
      yield { type: "done" }
      return
    }

    for (const call of customToolCalls) {
      yield {
        type: "tool_start",
        toolName: call.name,
        toolArgs: call.args,
      }

      const result = await executeTool(call, context)

      state.steps.push({
        type: "tool_call",
        content: `Called ${call.name}`,
        toolName: call.name,
        toolArgs: call.args,
        toolResult: result.result,
        toolError: result.error,
        timestamp: Date.now(),
      })

      yield {
        type: "tool_result",
        toolName: call.name,
        toolResult: result.result,
        error: result.error,
      }

      const observationMessage: ChatMessage = {
        role: "assistant",
        content: fullContent,
      }

      const toolResultMessage: ChatMessage = {
        role: "user",
        content: `[TOOL OBSERVATION - ${call.name}]\n${result.success ? JSON.stringify(result.result, null, 2) : `Error: ${result.error}`}\n[END OBSERVATION]\n\nBased on this result, continue your response. If you need more information, use another tool. Otherwise, provide your final answer.`,
      }

      state.messages.push(observationMessage, toolResultMessage)

      state.steps.push({
        type: "tool_result",
        content: result.success ? JSON.stringify(result.result) : `Error: ${result.error}`,
        toolName: call.name,
        timestamp: Date.now(),
      })
    }

    for (const call of toolCalls.filter(tc => !isCustomTool(tc.name))) {
      const result = await executeTool(call, context)
      yield {
        type: "tool_result",
        toolName: call.name,
        toolResult: result.result,
        error: result.error,
      }
    }
  }

  if (state.currentStep >= state.maxSteps) {
    yield {
      type: "error",
      error: "Agent reached maximum steps limit",
    }
  }

  yield { type: "done" }
}

export function createAgentContext(projectId?: string, userId?: string) {
  return { projectId, userId }
}
