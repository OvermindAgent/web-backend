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
	private isPolling = false
	private shouldPoll = false
	private pollInterval = CONFIG.POLL_INTERVAL

	public onStateChange = new Instance("BindableEvent")
	public onSignal = new Instance("BindableEvent")

	public connect(apiKey: string): void {
		this.apiKey = apiKey
		if (this.state === "connected") return
		
		this.doConnect()
	}

	private doConnect(): void {
		this.setState("connecting")

		const success = this.sendRequest("connect")
		if (success) {
			this.setState("connected")
			this.pollInterval = CONFIG.POLL_INTERVAL
			this.startPolling()
			
			// Notify web that we are connected
			this.sendRequest("send_signal", {
				signalAction: "PLUGIN_CONNECTED",
				signalData: { timestamp: os.time() }
			})
		} else {
			this.setState("disconnected")
		}
	}

	private sendRequest(action: string, extraData?: Record<string, unknown>): boolean {
		if (!this.apiKey) return false
		
		try {
			const body = {
				action,
				apiKey: this.apiKey,
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

			return false
		} catch (e) {
			return false
		}
	}

	public startPolling(apiKey?: string): void {
		if (apiKey) this.apiKey = apiKey
		if (!this.apiKey) return
		
		if (this.isPolling) return
		this.isPolling = true
		this.shouldPoll = true

		task.spawn(() => {
			while (this.shouldPoll) {
				this.poll()
				task.wait(this.pollInterval)
			}
			this.isPolling = false
		})
	}

	public stopPolling(): void {
		this.shouldPoll = false
	}

	private poll(): void {
		if (!this.apiKey) return
		
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
					if (this.state === "connected") {
						this.setState("disconnected")
						this.pollInterval = 5 // Slow down on disconnect
					}
				}
				return
			}

			const data = HttpService.JSONDecode(response.Body) as PollResponse

			if (this.state === "connected" && !data.connected) {
				this.setState("disconnected")
				this.pollInterval = 5
				return
			} else if (this.state === "disconnected" && data.connected) {
				this.setState("connected")
				this.pollInterval = CONFIG.POLL_INTERVAL
			}

			if (data.signals && data.signals.size() > 0) {
				for (const signal of data.signals) {
					print(`[Overmind] Signal: ${signal.action}`)
					
					// Handshake: Auto-connect if web asks
					if (signal.action === "WEB_DISCOVERY" && this.state !== "connected") {
						print("[Overmind] Auto-connecting via web discovery")
						this.doConnect()
					}
					
					this.onSignal.Fire(signal.action, signal.data)
				}
			}
		} catch (e) {
			// ignore poll errors to prevent spam
		}
	}

	private setState(newState: ConnectionState): void {
		if (this.state === newState) return
		this.state = newState
		this.onStateChange.Fire(newState)
		print(`[Overmind] Connection: ${newState}`)
	}

	public getState(): ConnectionState {
		return this.state
	}

	public disconnect(): void {
		if (this.apiKey) {
			this.sendRequest("disconnect")
		}
		this.setState("disconnected")
		this.pollInterval = 5 // Stay in standby
	}
}
