export type MessageType = "event" | "signal" | "auth" | "chat" | "error"

export interface WebSocketMessage {
	type: MessageType
	source?: "roblox" | "vscode" | "web"
	projectId?: string
	payload?: Record<string, unknown>
}

export interface AuthMessage extends WebSocketMessage {
	type: "auth"
	payload: {
		apiKey: string
	}
}

export interface ChatMessage extends WebSocketMessage {
	type: "chat"
	payload: {
		content: string
		preset?: "fast" | "edit" | "planning"
	}
}

export interface SignalMessage extends WebSocketMessage {
	type: "signal"
	payload: {
		action: string
		data?: Record<string, unknown>
	}
}

export type SignalAction =
	| "create_file"
	| "update_file"
	| "delete_file"
	| "create_script"
	| "update_script"
	| "notify"
	| "create_object"
	| "update_object"
	| "delete_object"
	| "move_object"
	| "run_script"
	| "query_search"
	| "grep_search"
	| "clone_object"
	| "search"
