import { HttpService } from "@rbxts/services"
import { CONFIG } from "./config"
import { WebSocketMessage, AuthMessage, ChatMessage, SignalMessage } from "./types"

type ConnectionState = "disconnected" | "connecting" | "connected" | "authenticated"

export class WebSocketClient {
	private socket?: WebStreamClient
	private state: ConnectionState = "disconnected"
	private apiKey?: string
	private projectId?: string
	private reconnectAttempts = 0
	private maxReconnectAttempts = 5
	private reconnectDelay = 1000
	private connections: RBXScriptConnection[] = []

	public onMessage = new Instance("BindableEvent")
	public onStateChange = new Instance("BindableEvent")
	public onSignal = new Instance("BindableEvent")

	public connect(apiKey: string, projectId: string): void {
		this.apiKey = apiKey
		this.projectId = projectId
		this.doConnect()
	}

	private doConnect(): void {
		if (this.state === "connecting" || this.state === "connected") {
			return
		}

		this.setState("connecting")

		try {
			this.socket = HttpService.CreateWebStreamClient(
				Enum.WebStreamClientType.WebSocket,
				{ Url: CONFIG.WS_URL }
			)

			const openConn = this.socket.Opened.Connect((statusCode: number) => {
				print(`[Overmind] Connected with status: ${statusCode}`)
				this.setState("connected")
				this.reconnectAttempts = 0
				this.authenticate()
			})
			this.connections.push(openConn)

			const msgConn = this.socket.MessageReceived.Connect((msg: string) => {
				this.handleMessage(msg)
			})
			this.connections.push(msgConn)

			const closeConn = this.socket.Closed.Connect(() => {
				this.setState("disconnected")
				this.cleanupConnections()
				this.tryReconnect()
			})
			this.connections.push(closeConn)

			const errConn = this.socket.Error.Connect((statusCode: number, errMsg: string) => {
				warn(`[Overmind] WebSocket error (${statusCode}): ${errMsg}`)
				this.setState("disconnected")
				this.cleanupConnections()
				this.tryReconnect()
			})
			this.connections.push(errConn)
		} catch (e) {
			warn(`[Overmind] Failed to connect: ${e}`)
			this.setState("disconnected")
			this.tryReconnect()
		}
	}

	private cleanupConnections(): void {
		for (const conn of this.connections) {
			conn.Disconnect()
		}
		this.connections = []
	}

	private authenticate(): void {
		if (!this.apiKey) return

		const authMessage: AuthMessage = {
			type: "auth",
			source: "roblox",
			payload: {
				apiKey: this.apiKey,
			},
		}

		this.send(authMessage)
	}

	private handleMessage(raw: string): void {
		try {
			const message = HttpService.JSONDecode(raw) as WebSocketMessage
			this.onMessage.Fire(message)

			if (message.type === "auth" && message.payload?.success) {
				this.setState("authenticated")
			}

			if (message.type === "signal") {
				const signal = message as SignalMessage
				this.onSignal.Fire(signal.payload?.action, signal.payload?.data)
			}
		} catch (e) {
			warn(`[Overmind] Failed to parse message: ${e}`)
		}
	}

	public send(message: WebSocketMessage): void {
		if (!this.socket || this.state === "disconnected") {
			warn("[Overmind] Cannot send message: not connected")
			return
		}

		message.source = "roblox"
		message.projectId = this.projectId

		const json = HttpService.JSONEncode(message)
		this.socket.Send(json)
	}

	public sendChat(content: string, preset: "fast" | "edit" | "planning" = "fast"): void {
		const chatMessage: ChatMessage = {
			type: "chat",
			payload: {
				content,
				preset,
			},
		}
		this.send(chatMessage)
	}

	private setState(newState: ConnectionState): void {
		this.state = newState
		this.onStateChange.Fire(newState)
	}

	public getState(): ConnectionState {
		return this.state
	}

	private tryReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			warn("[Overmind] Max reconnect attempts reached")
			return
		}

		this.reconnectAttempts++
		const delaySeconds = (this.reconnectDelay * this.reconnectAttempts) / 1000

		task.delay(delaySeconds, () => {
			this.doConnect()
		})
	}

	public disconnect(): void {
		this.cleanupConnections()
		if (this.socket) {
			this.socket.Close()
			this.socket = undefined as never
		}
		this.setState("disconnected")
	}
}

interface WebStreamClient {
	Send(message: string): void
	Close(): void
	Opened: RBXScriptSignal<(statusCode: number, headers: Map<string, string>) => void>
	MessageReceived: RBXScriptSignal<(message: string) => void>
	Closed: RBXScriptSignal<() => void>
	Error: RBXScriptSignal<(statusCode: number, errorMessage: string) => void>
}

interface RequestOptions {
	Url: string
	Method?: string
	Headers?: Record<string, string>
	Body?: string
}

declare global {
	interface HttpService {
		CreateWebStreamClient(
			clientType: Enum.WebStreamClientType,
			requestOptions: RequestOptions
		): WebStreamClient
	}
}
