# Overmind VSCode Extension

AI-powered development assistant for Roblox developers.

## Installation

1. Install dependencies:

```bash
npm install
```

2. Compile the extension:

```bash
npm run compile
```

3. Package the extension:

```bash
npm run package
```

4. Install the `.vsix` file in VSCode.

## Development

Watch for changes:

```bash
npm run watch
```

Debug: Press F5 in VSCode to launch extension development host.

## Features

- Chat with Overmind AI
- Preset support (Fast, Edit, Planning)
- Context-aware (sends current file)
- Streaming responses
- File operations with Roblox suffix enforcement
- Secure API key storage

## Configuration

- `overmind.apiUrl`: Backend API URL
- `overmind.defaultPreset`: Default AI preset
- `overmind.streaming`: Enable streaming responses
