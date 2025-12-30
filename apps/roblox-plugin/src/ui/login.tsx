import Roact from "@rbxts/roact"
import { Button, Input, Card, DARK_THEME } from "./components"

interface LoginViewProps {
	apiKey: string
	onApiKeyChange: (key: string) => void
	onConnect: () => void
	errorMsg?: string
	isConnecting: boolean
}

export function LoginView(props: LoginViewProps): Roact.Element {
	return (
		<frame
			BackgroundColor3={DARK_THEME.background}
			Size={new UDim2(1, 0, 1, 0)}
			BorderSizePixel={0}
		>
			<uipadding
				PaddingTop={new UDim(0, 16)}
				PaddingBottom={new UDim(0, 16)}
				PaddingLeft={new UDim(0, 12)}
				PaddingRight={new UDim(0, 12)}
			/>
			<uilistlayout
				Padding={new UDim(0, 12)}
				HorizontalAlignment={Enum.HorizontalAlignment.Center}
				VerticalAlignment={Enum.VerticalAlignment.Center}
			/>

			<imagelabel
				Image="rbxassetid://0"
				Size={new UDim2(0, 48, 0, 48)}
				BackgroundColor3={DARK_THEME.primary}
				BackgroundTransparency={0}
				BorderSizePixel={0}
			>
				<uicorner CornerRadius={new UDim(0, 12)} />
			</imagelabel>

			<textlabel
				Text="Overmind"
				TextColor3={DARK_THEME.text}
				TextSize={20}
				Font={Enum.Font.GothamBold}
				BackgroundTransparency={1}
				Size={new UDim2(1, 0, 0, 24)}
				TextXAlignment={Enum.TextXAlignment.Center}
			/>

			<textlabel
				Text="Connect with your API key"
				TextColor3={DARK_THEME.textMuted}
				TextSize={12}
				Font={Enum.Font.Gotham}
				BackgroundTransparency={1}
				Size={new UDim2(1, 0, 0, 16)}
				TextXAlignment={Enum.TextXAlignment.Center}
				TextWrapped={true}
			/>

			<frame
				BackgroundColor3={DARK_THEME.surface}
				Size={new UDim2(1, 0, 0, 140)}
				BorderSizePixel={0}
			>
				<uicorner CornerRadius={new UDim(0, 8)} />
				<uistroke Color={DARK_THEME.border} Thickness={1} />
				<uipadding
					PaddingTop={new UDim(0, 12)}
					PaddingBottom={new UDim(0, 12)}
					PaddingLeft={new UDim(0, 12)}
					PaddingRight={new UDim(0, 12)}
				/>
				<uilistlayout Padding={new UDim(0, 8)} />

				<Input
					placeholder="Enter your API key"
					value={props.apiKey}
					onChange={props.onApiKeyChange}
					password
				/>

				{props.errorMsg !== undefined && props.errorMsg !== "" ? (
					<textlabel
						Text={props.errorMsg}
						TextColor3={DARK_THEME.error}
						TextSize={11}
						Font={Enum.Font.Gotham}
						BackgroundTransparency={1}
						Size={new UDim2(1, 0, 0, 16)}
						TextXAlignment={Enum.TextXAlignment.Left}
					/>
				) : undefined}

				<Button
					text={props.isConnecting ? "Connecting..." : "Connect"}
					onClick={props.onConnect}
					disabled={props.isConnecting || props.apiKey.size() === 0}
					size="sm"
				/>

				<textlabel
					Text="Get key from overmind.vercel.app"
					TextColor3={DARK_THEME.textMuted}
					TextSize={10}
					Font={Enum.Font.Gotham}
					BackgroundTransparency={1}
					Size={new UDim2(1, 0, 0, 14)}
					TextXAlignment={Enum.TextXAlignment.Center}
				/>
			</frame>
		</frame>
	)
}
