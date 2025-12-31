import { HttpService } from "@rbxts/services"
import { CONFIG } from "./config"

type ConnectionState = "disconnected" | "connecting" | "connected"

interface SignalData {
	id: string
	action: string
	data: Record<string, unknown>
}

interface PollResponse {
	connected: boolean
	signals: SignalData[]
}

export class HttpClient {
	private state: ConnectionState = "disconnected"
	private apiKey?: string
	private projectId?: string
	private pollThread?: thread
	private isPolling = false

	public onStateChange = new Instance("BindableEvent")
	public onSignal = new Instance("BindableEvent")

	public connect(apiKey: string, projectId: string): void {
		if (this.state !== "disconnected") {
			return
		}

		this.apiKey = apiKey
		this.projectId = projectId
		this.doConnect()
	}

	private doConnect(): void {
		this.setState("connecting")

		const success = this.sendRequest("connect")
		if (success) {
			this.setState("connected")
			this.startPolling()
		} else {
			this.setState("disconnected")
		}
	}

	private sendRequest(action: string, extraData?: Record<string, unknown>): boolean {
		try {
			const body = {
				action,
				apiKey: this.apiKey,
				projectId: this.projectId,
				source: "roblox",
				data: extraData,
			}

			const response = HttpService.RequestAsync({
				Url: `${CONFIG.API_URL}/api/rivet`,
				Method: "POST",
				Headers: {
					["Content-Type"]: "application/json",
				},
				Body: HttpService.JSONEncode(body),
			})

			if (response.Success) {
				const data = HttpService.JSONDecode(response.Body)
				return (data as { success?: boolean }).success === true
			}

			warn(`[Overmind] Request failed: ${response.StatusCode}`)
			return false
		} catch (e) {
			warn(`[Overmind] Request error: ${e}`)
			return false
		}
	}

	private startPolling(): void {
		if (this.isPolling) return
		this.isPolling = true

		this.pollThread = task.spawn(() => {
			while (this.isPolling && this.state === "connected") {
				this.poll()
				task.wait(CONFIG.POLL_INTERVAL)
			}
		})
	}

	private stopPolling(): void {
		this.isPolling = false
		if (this.pollThread) {
			task.cancel(this.pollThread)
			this.pollThread = undefined
		}
	}

	private poll(): void {
		try {
			const response = HttpService.RequestAsync({
				Url: `${CONFIG.API_URL}/api/rivet?apiKey=${this.apiKey}`,
				Method: "GET",
				Headers: {
					["Content-Type"]: "application/json",
				},
			})

			if (!response.Success) {
				if (response.StatusCode === 401) {
					this.setState("disconnected")
					this.stopPolling()
				}
				return
			}

			const data = HttpService.JSONDecode(response.Body) as PollResponse

			if (!data.connected) {
				this.setState("disconnected")
				this.stopPolling()
				return
			}

			for (const signal of data.signals) {
				print(`[Overmind] Received signal: ${signal.action}`)
				this.onSignal.Fire(signal.action, signal.data)
			}
		} catch (e) {
			warn(`[Overmind] Poll error: ${e}`)
		}
	}

	private setState(newState: ConnectionState): void {
		if (this.state === newState) return
		this.state = newState
		this.onStateChange.Fire(newState)
		print(`[Overmind] Connection state: ${newState}`)
	}

	public getState(): ConnectionState {
		return this.state
	}

	public disconnect(): void {
		this.stopPolling()
		this.sendRequest("disconnect")
		this.setState("disconnected")
	}

	public ping(): boolean {
		return this.sendRequest("ping")
	}
}
