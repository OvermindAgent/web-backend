/// <reference types="@rbxts/types/plugin" />
import Roact from "@rbxts/roact"
import { App } from "./app"
import { CONFIG } from "./config"

const toolbar = plugin.CreateToolbar(CONFIG.PLUGIN_NAME)
const button = toolbar.CreateButton(
	"Open Overmind",
	"Open the Overmind AI assistant",
	"rbxassetid://16029524022",
	"Overmind"
)

const widgetInfo = new DockWidgetPluginGuiInfo(
	Enum.InitialDockState.Float,
	false,
	false,
	280,
	380,
	200,
	300
)

const widget = plugin.CreateDockWidgetPluginGui("OvermindWidget", widgetInfo)
widget.Name = CONFIG.PLUGIN_NAME

let mounted = false

button.Click.Connect(() => {
	widget.Enabled = !widget.Enabled
})

widget.GetPropertyChangedSignal("Enabled").Connect(() => {
	if (widget.Enabled && !mounted) {
		const element = Roact.createElement(App)
		Roact.mount(element, widget, "OvermindApp")
		mounted = true
	}
})

print(`[${CONFIG.PLUGIN_NAME}] Plugin loaded (v${CONFIG.VERSION})`)
