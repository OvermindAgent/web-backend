# Overmind Roblox Plugin

AI-powered development assistant for Roblox Studio.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Install Wally packages (if using):

```bash
wally install
```

3. Build the plugin:

```bash
npm run build
```

4. Build the .rbxm file:

```bash
npm run build:plugin
```

5. Copy `overmind.rbxm` to your Roblox Studio plugins folder:
   - Windows: `%LOCALAPPDATA%\Roblox\Plugins`
   - macOS: `~/Documents/Roblox/Plugins`

## Development

Watch for changes:

```bash
npm run watch
```

Sync with Rojo:

```bash
npm run sync
```

## Features

- Connect to Overmind backend via WebSocket
- Chat with AI assistant
- AI can create/update/delete scripts in Studio
- Preset support (Fast, Edit, Planning)
- Automatic reconnection
