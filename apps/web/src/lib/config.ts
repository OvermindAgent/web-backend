export const AI_CONFIG = {
  baseUrl: process.env.AI_API_URL || "https://ai-chat-api-lake.vercel.app",
  apiKey: process.env.AI_API_KEY || "sk-aichat-dev-testing-key",
  defaultProvider: "chat.gpt-chatbot.ru",
  defaultModel: "chatgpt-4o-latest",
  defaultStreaming: true,
}

export const APP_CONFIG = {
  name: "Overmind",
  description: "AI-Powered Roblox Development",
  version: "0.1.0-alpha",
}

export const AUTH_CONFIG = {
  sessionDuration: 7 * 24 * 60 * 60 * 1000,
  apiKeyPrefix: "overmind_",
  hashRounds: 12,
}

export const WS_CONFIG = {
  port: parseInt(process.env.WS_PORT || "3001"),
  pingInterval: 30000,
  pingTimeout: 5000,
}
