import Roact from "@rbxts/roact"
import { useState, useEffect, withHooks } from "@rbxts/roact-hooked"
import { LoginView } from "./ui/login"
import { ChatView } from "./ui/chat"
import { HttpClient } from "./http-client"
import { handleSignal } from "./signals"
import { SignalAction } from "./types"

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
	const [client] = useState(() => new HttpClient())

	useEffect(() => {
		const stateConnection = client.onStateChange.Event.Connect((newState: string) => {
			if (newState === "connected") {
				setState("chat")
				setErrorMsg(undefined)
			} else if (newState === "disconnected") {
				if (state === "connecting") {
					setErrorMsg("Connection failed - check your API key")
				}
				setState("login")
			}
		})

		const signalConnection = client.onSignal.Event.Connect((action: SignalAction, data: Record<string, unknown>) => {
			print(`[Overmind] Executing signal: ${action}`)
			handleSignal(action, data)
		})

		return () => {
			stateConnection.Disconnect()
			signalConnection.Disconnect()
		}
	}, [])

	function handleConnect() {
		if (apiKey.size() === 0) {
			setErrorMsg("Please enter your API key")
			return
		}
		setErrorMsg(undefined)
		setState("connecting")
		client.connect(apiKey)
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
