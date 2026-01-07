import type { ToolDefinition } from "./tools"

export const CUSTOM_TOOLS: ToolDefinition[] = [
  {
    name: "web_search",
    description: "Search the web for current information. Returns up to 6 results with title, snippet, and URL. Use this when you need to find information that may not be in your training data.",
    category: "custom",
    parameters: [
      {
        name: "query",
        type: "string",
        required: true,
        description: "The search query to look up"
      }
    ]
  },
  {
    name: "web_outline",
    description: "Extract all text content from a webpage. Use this after web_search to read the full content of a specific page.",
    category: "custom",
    parameters: [
      {
        name: "url",
        type: "string",
        required: true,
        description: "The full URL of the webpage to extract content from"
      }
    ]
  },
  {
    name: "canvas_write",
    description: "Write content to the canvas side panel. This replaces all existing content. Use for creating diagrams, markdown, code, or any visual content. Supports mermaid diagrams, LaTeX math, and full markdown.",
    category: "custom",
    parameters: [
      {
        name: "content",
        type: "string",
        required: true,
        description: "The content to write to canvas (markdown, mermaid, math, code)"
      }
    ]
  },
  {
    name: "canvas_append",
    description: "Append content to the canvas side panel. Adds to existing content without replacing it.",
    category: "custom",
    parameters: [
      {
        name: "content",
        type: "string",
        required: true,
        description: "The content to append to canvas"
      }
    ]
  },
  {
    name: "canvas_clear",
    description: "Clear all content from the canvas side panel.",
    category: "custom",
    parameters: []
  }
]

export function getCustomTool(name: string): ToolDefinition | undefined {
  return CUSTOM_TOOLS.find(t => t.name === name)
}

export function isCustomTool(name: string): boolean {
  return CUSTOM_TOOLS.some(t => t.name === name)
}
