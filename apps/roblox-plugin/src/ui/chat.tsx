import Roact from "@rbxts/roact"
import { Button, Input, DARK_THEME } from "./components"

interface Message {
	id: string
	role: "user" | "assistant"
	content: string
}

interface ChatViewProps {
	messages: Message[]
	input: string
	onInputChange: (value: string) => void
	onSend: () => void
	preset: "fast" | "edit" | "planning"
	onPresetChange: (preset: "fast" | "edit" | "planning") => void
	onDisconnect: () => void
	isLoading: boolean
}

function markdownToRichText(text: string): string {
	let result = text
	
	result = string.gsub(result, "%*%*(.-)%*%*", "<b>%1</b>")[0] as string
	result = string.gsub(result, "__(.-)__", "<b>%1</b>")[0] as string
	result = string.gsub(result, "%*(.-)%*", "<i>%1</i>")[0] as string
	result = string.gsub(result, "_(.-)_", "<i>%1</i>")[0] as string
	result = string.gsub(result, "~~(.-)~~", "<s>%1</s>")[0] as string
	result = string.gsub(result, "`(.-)`", '<font family="rbxasset://fonts/families/RobotoMono.json">%1</font>')[0] as string
	result = string.gsub(result, "^### (.-)\n", "<b>%1</b>\n")[0] as string
	result = string.gsub(result, "\n### (.-)\n", "\n<b>%1</b>\n")[0] as string
	result = string.gsub(result, "^## (.-)\n", "<b><font size=\"14\">%1</font></b>\n")[0] as string
	result = string.gsub(result, "\n## (.-)\n", "\n<b><font size=\"14\">%1</font></b>\n")[0] as string
	result = string.gsub(result, "^# (.-)\n", "<b><font size=\"16\">%1</font></b>\n")[0] as string
	result = string.gsub(result, "\n# (.-)\n", "\n<b><font size=\"16\">%1</font></b>\n")[0] as string
	result = string.gsub(result, "\n%- ", "\n• ")[0] as string
	result = string.gsub(result, "^%- ", "• ")[0] as string
	result = string.gsub(result, "✅", '<font color="#4ade80">✓</font>')[0] as string
	result = string.gsub(result, "❌", '<font color="#f87171">✗</font>')[0] as string
	
	return result
}

export function ChatView(props: ChatViewProps): Roact.Element {
	return (
		<frame BackgroundColor3={DARK_THEME.background} Size={new UDim2(1, 0, 1, 0)} BorderSizePixel={0}>
			<frame
				BackgroundColor3={DARK_THEME.surface}
				Size={new UDim2(1, 0, 0, 36)}
				Position={new UDim2(0, 0, 0, 0)}
				BorderSizePixel={0}
			>
				<uistroke Color={DARK_THEME.border} Thickness={1} />
				<uipadding
					PaddingLeft={new UDim(0, 8)}
					PaddingRight={new UDim(0, 8)}
				/>

				<textlabel
					Text="Overmind"
					TextColor3={DARK_THEME.text}
					TextSize={12}
					Font={Enum.Font.GothamBold}
					BackgroundTransparency={1}
					Size={new UDim2(0, 60, 1, 0)}
					TextXAlignment={Enum.TextXAlignment.Left}
				/>

				<frame
					BackgroundTransparency={1}
					Size={new UDim2(0, 120, 0, 24)}
					Position={new UDim2(0, 65, 0.5, -12)}
				>
					<uilistlayout
						FillDirection={Enum.FillDirection.Horizontal}
						Padding={new UDim(0, 2)}
						SortOrder={Enum.SortOrder.LayoutOrder}
					/>

					{(() => {
						const children: Record<string, Roact.Element> = {};
						(["fast", "edit", "planning"] as const).forEach((preset, index) => {
							children[preset] = (
								<textbutton
									Text={preset.sub(1, 1).upper() + preset.sub(2, 4)}
									TextColor3={props.preset === preset ? DARK_THEME.text : DARK_THEME.textMuted}
									TextSize={10}
									Font={Enum.Font.GothamBold}
									BackgroundColor3={props.preset === preset ? DARK_THEME.primary : DARK_THEME.background}
									Size={new UDim2(0, 38, 1, 0)}
									LayoutOrder={index}
									Event={{
										MouseButton1Click: () => props.onPresetChange(preset),
									}}
								>
									<uicorner CornerRadius={new UDim(0, 4)} />
								</textbutton>
							)
						})
						return children as unknown as Roact.Element
					})()}
				</frame>

				<textbutton
					Text="X"
					TextColor3={DARK_THEME.error}
					TextSize={12}
					Font={Enum.Font.GothamBold}
					BackgroundTransparency={1}
					Size={new UDim2(0, 24, 1, 0)}
					Position={new UDim2(1, -24, 0, 0)}
					Event={{
						MouseButton1Click: props.onDisconnect,
					}}
				/>
			</frame>

			<scrollingframe
				BackgroundTransparency={1}
				Size={new UDim2(1, 0, 1, -80)}
				Position={new UDim2(0, 0, 0, 36)}
				CanvasSize={new UDim2(0, 0, 0, 0)}
				AutomaticCanvasSize={Enum.AutomaticSize.Y}
				ScrollBarThickness={3}
				ScrollBarImageColor3={DARK_THEME.border}
				BorderSizePixel={0}
			>
				<uilistlayout Padding={new UDim(0, 6)} SortOrder={Enum.SortOrder.LayoutOrder} />
				<uipadding
					PaddingTop={new UDim(0, 6)}
					PaddingBottom={new UDim(0, 6)}
					PaddingLeft={new UDim(0, 8)}
					PaddingRight={new UDim(0, 8)}
				/>

				{(() => {
					const children: Record<string, Roact.Element> = {}
					props.messages.forEach((message, index) => {
						children[message.id] = (
							<frame
								BackgroundColor3={message.role === "user" ? DARK_THEME.primary : DARK_THEME.surface}
								Size={new UDim2(0.85, 0, 0, 0)}
								AutomaticSize={Enum.AutomaticSize.Y}
								AnchorPoint={message.role === "user" ? new Vector2(1, 0) : new Vector2(0, 0)}
								Position={message.role === "user" ? new UDim2(1, 0, 0, 0) : new UDim2(0, 0, 0, 0)}
								BorderSizePixel={0}
								LayoutOrder={index}
							>
								<uicorner CornerRadius={new UDim(0, 8)} />
								<uipadding
									PaddingTop={new UDim(0, 8)}
									PaddingBottom={new UDim(0, 8)}
									PaddingLeft={new UDim(0, 8)}
									PaddingRight={new UDim(0, 8)}
								/>

								<textlabel
									Text={message.role === "assistant" ? markdownToRichText(message.content) : message.content}
									RichText={message.role === "assistant"}
									TextColor3={DARK_THEME.text}
									TextSize={11}
									Font={Enum.Font.Gotham}
									BackgroundTransparency={1}
									Size={new UDim2(1, 0, 0, 0)}
									AutomaticSize={Enum.AutomaticSize.Y}
									TextWrapped
									TextXAlignment={Enum.TextXAlignment.Left}
								/>
							</frame>
						)
					})
					return children as unknown as Roact.Element
				})()}

				{props.isLoading && (
					<frame
						BackgroundColor3={DARK_THEME.surface}
						Size={new UDim2(0.5, 0, 0, 28)}
						BorderSizePixel={0}
						LayoutOrder={props.messages.size() + 1}
					>
						<uicorner CornerRadius={new UDim(0, 8)} />
						<uipadding PaddingLeft={new UDim(0, 8)} />
						<textlabel
							Text="..."
							TextColor3={DARK_THEME.textMuted}
							TextSize={12}
							Font={Enum.Font.Gotham}
							BackgroundTransparency={1}
							Size={new UDim2(1, 0, 1, 0)}
							TextXAlignment={Enum.TextXAlignment.Left}
						/>
					</frame>
				)}
			</scrollingframe>

			<frame
				BackgroundColor3={DARK_THEME.surface}
				Size={new UDim2(1, 0, 0, 44)}
				Position={new UDim2(0, 0, 1, -44)}
				BorderSizePixel={0}
			>
				<uistroke Color={DARK_THEME.border} Thickness={1} />
				<uipadding
					PaddingTop={new UDim(0, 6)}
					PaddingBottom={new UDim(0, 6)}
					PaddingLeft={new UDim(0, 8)}
					PaddingRight={new UDim(0, 8)}
				/>

				<frame BackgroundTransparency={1} Size={new UDim2(1, 0, 1, 0)}>
					<uilistlayout
						FillDirection={Enum.FillDirection.Horizontal}
						Padding={new UDim(0, 6)}
						VerticalAlignment={Enum.VerticalAlignment.Center}
					/>

					<Input
						placeholder="Ask..."
						value={props.input}
						onChange={props.onInputChange}
						size={new UDim2(1, -46, 1, 0)}
					/>

					<Button
						text=">"
						onClick={props.onSend}
						size_={new UDim2(0, 40, 1, 0)}
						disabled={props.isLoading || props.input.size() === 0}
					/>
				</frame>
			</frame>
		</frame>
	)
}
