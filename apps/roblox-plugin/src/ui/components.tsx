import Roact from "@rbxts/roact"

interface Theme {
	background: Color3
	surface: Color3
	primary: Color3
	primaryHover: Color3
	text: Color3
	textMuted: Color3
	border: Color3
	success: Color3
	error: Color3
}

export const DARK_THEME: Theme = {
	background: Color3.fromRGB(17, 17, 17),
	surface: Color3.fromRGB(30, 30, 30),
	primary: Color3.fromRGB(139, 92, 246),
	primaryHover: Color3.fromRGB(124, 58, 237),
	text: Color3.fromRGB(255, 255, 255),
	textMuted: Color3.fromRGB(156, 163, 175),
	border: Color3.fromRGB(55, 55, 55),
	success: Color3.fromRGB(34, 197, 94),
	error: Color3.fromRGB(239, 68, 68),
}

interface ButtonProps {
	text: string
	onClick: () => void
	variant?: "primary" | "secondary" | "ghost"
	size?: "sm" | "md" | "lg"
	disabled?: boolean
	position?: UDim2
	size_?: UDim2
}

export function Button(props: ButtonProps): Roact.Element {
	const variant = props.variant ?? "primary"
	const size = props.size ?? "md"

	let bgColor = DARK_THEME.primary
	let textColor = DARK_THEME.text

	if (variant === "secondary") {
		bgColor = DARK_THEME.surface
	} else if (variant === "ghost") {
		bgColor = Color3.fromRGB(0, 0, 0)
	}

	let height = 36
	let fontSize = 14
	if (size === "sm") {
		height = 28
		fontSize = 12
	} else if (size === "lg") {
		height = 44
		fontSize = 16
	}

	return (
		<textbutton
			Text={props.text}
			TextColor3={textColor}
			TextSize={fontSize}
			Font={Enum.Font.GothamBold}
			BackgroundColor3={bgColor}
			Size={props.size_ ?? new UDim2(1, 0, 0, height)}
			Position={props.position}
			AutoButtonColor={!props.disabled}
			Event={{
				MouseButton1Click: props.disabled ? () => {} : props.onClick,
			}}
		>
			<uicorner CornerRadius={new UDim(0, 8)} />
		</textbutton>
	)
}

interface InputProps {
	placeholder?: string
	value: string
	onChange: (value: string) => void
	password?: boolean
	position?: UDim2
	size?: UDim2
}

export function Input(props: InputProps): Roact.Element {
	return (
		<textbox
			Text={props.value}
			PlaceholderText={props.placeholder}
			TextColor3={DARK_THEME.text}
			PlaceholderColor3={DARK_THEME.textMuted}
			TextSize={14}
			Font={Enum.Font.Gotham}
			BackgroundColor3={DARK_THEME.surface}
			Size={props.size ?? new UDim2(1, 0, 0, 40)}
			Position={props.position}
			ClearTextOnFocus={false}
			Change={{
				Text: (rbx) => props.onChange(rbx.Text),
			}}
		>
			<uicorner CornerRadius={new UDim(0, 8)} />
			<uistroke Color={DARK_THEME.border} Thickness={1} />
			<uipadding
				PaddingLeft={new UDim(0, 12)}
				PaddingRight={new UDim(0, 12)}
			/>
		</textbox>
	)
}

interface CardProps {
	children?: Roact.Children
	size?: UDim2
	position?: UDim2
}

export function Card(props: CardProps): Roact.Element {
	return (
		<frame
			BackgroundColor3={DARK_THEME.surface}
			Size={props.size ?? new UDim2(1, 0, 1, 0)}
			Position={props.position}
		>
			<uicorner CornerRadius={new UDim(0, 12)} />
			<uistroke Color={DARK_THEME.border} Thickness={1} />
			<uipadding
				PaddingTop={new UDim(0, 16)}
				PaddingBottom={new UDim(0, 16)}
				PaddingLeft={new UDim(0, 16)}
				PaddingRight={new UDim(0, 16)}
			/>
			{props.children}
		</frame>
	)
}
