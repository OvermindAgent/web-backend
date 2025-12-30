# Overmind

A unified, premium AI platform for Roblox developers. One backend powers all clients.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run the web app locally
pnpm dev:web
```

## Project Structure

```
overmindai/
├── apps/
│   ├── web/              # Next.js Dashboard + Backend
│   ├── roblox-plugin/    # Roblox Studio Plugin
│   └── vscode/           # VSCode Extension
├── packages/
│   └── shared/           # Shared types
├── internal_prompt.md    # AI System Prompt
└── pnpm-workspace.yaml
```

## Apps

### Web Dashboard

Next.js app with authentication, chat, and API.

```bash
cd apps/web
cp .env.example .env.local
pnpm dev
```

### Roblox Plugin

roblox-ts plugin with Roact UI.

```bash
cd apps/roblox-plugin
npm install
npm run build
npm run build:plugin
```

### VSCode Extension

VSCode extension with webview chat.

```bash
cd apps/vscode
npm install
npm run compile
npm run package
```

## Environment Variables

Create `apps/web/.env.local`:

```
AI_API_URL=https://ai-chat-api-lake.vercel.app
AI_API_KEY=your-key
KV_URL=your-vercel-kv-url
```

## Tech Stack

- **pnpm** + **Turborepo** monorepo
- **Next.js 15** + **shadcn/ui**
- **Vercel KV** for auth
- **roblox-ts** + **Roact**
- **VSCode Extension API**

## License

Private
