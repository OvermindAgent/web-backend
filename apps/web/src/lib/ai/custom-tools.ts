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
  }
]

export function getCustomTool(name: string): ToolDefinition | undefined {
  return CUSTOM_TOOLS.find(t => t.name === name)
}

export function isCustomTool(name: string): boolean {
  return CUSTOM_TOOLS.some(t => t.name === name)
}
