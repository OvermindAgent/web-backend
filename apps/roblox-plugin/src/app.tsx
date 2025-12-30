import Roact from "@rbxts/roact"
import { useState, useEffect, withHooks } from "@rbxts/roact-hooked"
import { LoginView } from "./ui/login"
import { ChatView } from "./ui/chat"
import { WebSocketClient } from "./websocket"
import { handleSignal } from "./signals"
import { SignalAction } from "./types"
import { CONFIG } from "./config"

type AppState = "login" | "connecting" | "chat"

interface Message {
	id: string
	role: "user" | "assistant"
	content: string
}

function AppComponent(): Roact.Element {
	const [state, setState] = useState<AppState>("login")
	const [apiKey, setApiKey] = useState("")
	const [errorMsg, setErrorMsg] = useState<string | undefined>()
	const [messages, setMessages] = useState<Message[]>([])
	const [inputText, setInputText] = useState("")
	const [preset, setPreset] = useState<"fast" | "edit" | "planning">("fast")
	const [isLoading, setIsLoading] = useState(false)
	const [client] = useState(() => new WebSocketClient())

	useEffect(() => {
		const stateConnection = client.onStateChange.Event.Connect((newState: string) => {
			if (newState === "authenticated") {
				setState("chat")
				setErrorMsg(undefined)
			} else if (newState === "disconnected") {
				if (state === "connecting") {
					setErrorMsg("Connection failed")
				}
				setState("login")
			}
		})

		const signalConnection = client.onSignal.Event.Connect((action: SignalAction, data: Record<string, unknown>) => {
			print(`[Overmind] Signal received: ${action}`, data)
			handleSignal(action, data)
		})

		const messageConnection = client.onMessage.Event.Connect((message: { type: string; payload?: { content?: string } }) => {
			if (message.type === "chat" && message.payload?.content) {
				setMessages((prev) => [
					...prev,
					{
						id: tostring(tick()),
						role: "assistant",
						content: message.payload!.content!,
					},
				])
				setIsLoading(false)
			}
		})

		return () => {
			stateConnection.Disconnect()
			signalConnection.Disconnect()
			messageConnection.Disconnect()
		}
	}, [])

	function handleConnect() {
		if (apiKey.size() === 0) return
		setErrorMsg(undefined)
		setState("connecting")
		client.connect(apiKey, "default")
	}

	function handleDisconnect() {
		client.disconnect()
		setState("login")
		setMessages([])
	}

	function handleSend() {
		if (inputText.size() === 0 || isLoading) return

		const userMessage: Message = {
			id: tostring(tick()),
			role: "user",
			content: inputText,
		}

		setMessages((prev) => [...prev, userMessage])
		setInputText("")
		setIsLoading(true)

		client.sendChat(inputText, preset)
	}

	if (state === "login" || state === "connecting") {
		return (
			<LoginView
				apiKey={apiKey}
				onApiKeyChange={setApiKey}
				onConnect={handleConnect}
				errorMsg={errorMsg}
				isConnecting={state === "connecting"}
			/>
		)
	}

	return (
		<ChatView
			messages={messages}
			input={inputText}
			onInputChange={setInputText}
			onSend={handleSend}
			preset={preset}
			onPresetChange={setPreset}
			onDisconnect={handleDisconnect}
			isLoading={isLoading}
		/>
	)
}

export const App = withHooks(AppComponent)
