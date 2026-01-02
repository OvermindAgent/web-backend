export interface ToolDefinition {
  name: string
  description: string
  parameters: ToolParameter[]
  category: "filesystem" | "tasks" | "projects" | "signals" | "roblox_objects" | "custom"
}

export interface ToolParameter {
  name: string
  type: "string" | "number" | "boolean" | "object"
  required: boolean
  description: string
}

export interface ToolCall {
  name: string
  args: Record<string, unknown>
}

export const TOOLS: ToolDefinition[] = [
  {
    name: "create_file",
    description: "Create a new file with the specified content",
    category: "filesystem",
    parameters: [
      { name: "path", type: "string", required: true, description: "File path relative to project root" },
      { name: "content", type: "string", required: true, description: "File content" },
    ],
  },
  {
    name: "update_file",
    description: "Update an existing file with new content",
    category: "filesystem",
    parameters: [
      { name: "path", type: "string", required: true, description: "File path relative to project root" },
      { name: "content", type: "string", required: true, description: "New file content" },
    ],
  },
  {
    name: "delete_file",
    description: "Delete a file",
    category: "filesystem",
    parameters: [
      { name: "path", type: "string", required: true, description: "File path relative to project root" },
    ],
  },
  {
    name: "read_file",
    description: "Read the content of a file",
    category: "filesystem",
    parameters: [
      { name: "path", type: "string", required: true, description: "File path relative to project root" },
    ],
  },
  {
    name: "create_task",
    description: "Create a new task",
    category: "tasks",
    parameters: [
      { name: "title", type: "string", required: true, description: "Task title" },
      { name: "description", type: "string", required: false, description: "Task description" },
    ],
  },
  {
    name: "update_task",
    description: "Update an existing task",
    category: "tasks",
    parameters: [
      { name: "id", type: "string", required: true, description: "Task ID" },
      { name: "status", type: "string", required: false, description: "New status: pending, in_progress, blocked, completed, cancelled" },
      { name: "title", type: "string", required: false, description: "New title" },
    ],
  },
  {
    name: "complete_task",
    description: "Mark a task as completed",
    category: "tasks",
    parameters: [
      { name: "id", type: "string", required: true, description: "Task ID" },
    ],
  },
  {
    name: "list_projects",
    description: "List all available projects",
    category: "projects",
    parameters: [],
  },
  {
    name: "select_project",
    description: "Select a project as active",
    category: "projects",
    parameters: [
      { name: "id", type: "string", required: true, description: "Project ID" },
    ],
  },
  {
    name: "emit_signal",
    description: "Emit a signal to connected clients (Roblox/VSCode)",
    category: "signals",
    parameters: [
      { name: "action", type: "string", required: true, description: "Signal action type" },
      { name: "payload", type: "object", required: false, description: "Signal payload data" },
    ],
  },
  {
    name: "search_files",
    description: "Search for files in the project",
    category: "filesystem",
    parameters: [
      { name: "query", type: "string", required: true, description: "Search query or pattern" },
      { name: "fileTypes", type: "string", required: false, description: "File extensions to include, comma-separated" },
    ],
  },
  {
    name: "create_folder",
    description: "Create a new folder",
    category: "filesystem",
    parameters: [
      { name: "path", type: "string", required: true, description: "Folder path relative to project root" },
    ],
  },
  {
    name: "create_object",
    description: "Create any Roblox Instance dynamically (Parts, GUIs, Folders, RemoteEvents, etc.) - never use for scripts",
    category: "roblox_objects",
    parameters: [
      { name: "className", type: "string", required: true, description: "Roblox class name (Part, Folder, RemoteEvent, etc.)" },
      { name: "parent", type: "string", required: true, description: "Parent path (e.g., Workspace, ReplicatedStorage/Items)" },
      { name: "name", type: "string", required: false, description: "Object name" },
      { name: "properties", type: "object", required: false, description: "Key-value pairs for properties (e.g., {Size: '10,5,10', Transparency: 0.5})" },
      { name: "tags", type: "string", required: false, description: "Comma-separated CollectionService tags" },
    ],
  },
  {
    name: "update_object",
    description: "Update properties, parent, or tags of any Roblox Instance (except scripts)",
    category: "roblox_objects",
    parameters: [
      { name: "query", type: "string", required: true, description: "Name/path/tag to find object" },
      { name: "className", type: "string", required: false, description: "Filter by class type" },
      { name: "properties", type: "object", required: false, description: "Properties to update" },
      { name: "newParent", type: "string", required: false, description: "Move to new parent path" },
      { name: "tags", type: "string", required: false, description: "Tags to add (prefix with + or -)" },
    ],
  },
  {
    name: "delete_object",
    description: "Delete any Roblox Instance safely (except scripts)",
    category: "roblox_objects",
    parameters: [
      { name: "query", type: "string", required: true, description: "Name/path/tag to find object" },
      { name: "className", type: "string", required: false, description: "Filter by class type" },
      { name: "recursive", type: "boolean", required: false, description: "Delete all children (default: false)" },
    ],
  },
  {
    name: "move_object",
    description: "Move any Roblox Instance to a new parent or reorder in hierarchy",
    category: "roblox_objects",
    parameters: [
      { name: "query", type: "string", required: true, description: "Object to move" },
      { name: "newParent", type: "string", required: true, description: "Destination parent path" },
      { name: "newIndex", type: "number", required: false, description: "Position in parent's children" },
    ],
  },
  {
    name: "run_script",
    description: "Execute Lua code dynamically in Roblox (requires user confirmation)",
    category: "roblox_objects",
    parameters: [
      { name: "code", type: "string", required: true, description: "Lua code to execute" },
      { name: "scriptType", type: "string", required: true, description: "Script type: server, client, or module" },
      { name: "confirmation", type: "string", required: false, description: "Confirmation mode: accept, decline, or always" },
    ],
  },
  {
    name: "query_search",
    description: "Search for Roblox Instances by name (supports glob/regex), class, tags, or properties",
    category: "roblox_objects",
    parameters: [
      { name: "name", type: "string", required: false, description: "Name pattern (supports glob patterns like *.Part or regex)" },
      { name: "className", type: "string", required: false, description: "Filter by class type" },
      { name: "parent", type: "string", required: false, description: "Search within specific parent" },
      { name: "tags", type: "string", required: false, description: "Filter by CollectionService tags" },
      { name: "properties", type: "object", required: false, description: "Filter by property values" },
      { name: "maxResults", type: "number", required: false, description: "Maximum results to return (default: 50)" },
    ],
  },
  {
    name: "grep_search",
    description: "Search for text inside Roblox scripts (like ripgrep)",
    category: "roblox_objects",
    parameters: [
      { name: "pattern", type: "string", required: true, description: "Text or regex pattern to search" },
      { name: "scriptType", type: "string", required: false, description: "Filter by script type: server, client, or module" },
      { name: "parent", type: "string", required: false, description: "Search within specific parent" },
      { name: "caseSensitive", type: "boolean", required: false, description: "Case-sensitive search (default: false)" },
      { name: "maxResults", type: "number", required: false, description: "Maximum results (default: 100)" },
    ],
  },
  {
    name: "clone_object",
    description: "Duplicate an existing Roblox Instance including all children and properties",
    category: "roblox_objects",
    parameters: [
      { name: "query", type: "string", required: true, description: "Object to clone" },
      { name: "newParent", type: "string", required: false, description: "Parent for cloned object" },
      { name: "newName", type: "string", required: false, description: "Rename the clone" },
      { name: "properties", type: "object", required: false, description: "Override specific properties" },
      { name: "tags", type: "string", required: false, description: "Add tags to the clone" },
    ],
  },
  {
    name: "search",
    description: "Unified search across all Roblox Studio content - searches instances, scripts, and properties using text or regex",
    category: "roblox_objects",
    parameters: [
      { name: "query", type: "string", required: true, description: "Search pattern (text or regex)" },
      { name: "mode", type: "string", required: false, description: "Search mode: text (default), regex, or glob" },
      { name: "searchIn", type: "string", required: false, description: "What to search: all (default), instances, scripts, properties" },
      { name: "parent", type: "string", required: false, description: "Limit search to specific parent path" },
      { name: "className", type: "string", required: false, description: "Filter by class type" },
      { name: "caseSensitive", type: "boolean", required: false, description: "Case-sensitive search (default: false)" },
      { name: "maxResults", type: "number", required: false, description: "Maximum results (default: 100)" },
    ],
  },
]

import { CUSTOM_TOOLS } from "./custom-tools"

const ALL_TOOLS: ToolDefinition[] = [...TOOLS, ...CUSTOM_TOOLS]

export function getTool(name: string): ToolDefinition | undefined {
  return ALL_TOOLS.find((t) => t.name === name)
}

export function getToolsByCategory(category: ToolDefinition["category"]): ToolDefinition[] {
  return ALL_TOOLS.filter((t) => t.category === category)
}

export function getAllTools(): ToolDefinition[] {
  return ALL_TOOLS
}
