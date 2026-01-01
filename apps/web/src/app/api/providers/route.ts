import { NextResponse } from "next/server"
import { AI_CONFIG } from "@/lib/config"

const PROVIDER_NAMES: Record<string, string> = {
  "chat.gpt-chatbot.ru": "Overmind",
  "oui.gpt-chatbotru-4-o1.ru": "Quantum",
}

export async function GET() {
  try {
    const response = await fetch(`${AI_CONFIG.baseUrl}/api/providers`, {
      headers: { Authorization: `Bearer ${AI_CONFIG.apiKey}` },
      next: { revalidate: 60 }
    })
    
    if (!response.ok) {
      throw new Error("Failed to fetch providers")
    }
    
    const data = await response.json()
    const providers = data.providers?.map((p: { id: string; name: string; modelCount: number }) => ({
      ...p,
      name: PROVIDER_NAMES[p.id] || p.name
    })) || []
    
    return NextResponse.json({ ...data, providers })
  } catch {
    return NextResponse.json({
      providers: [
        { id: "chat.gpt-chatbot.ru", name: "Nexus", modelCount: 26 },
        { id: "oui.gpt-chatbotru-4-o1.ru", name: "Quantum", modelCount: 27 }
      ],
      default: AI_CONFIG.defaultProvider
    })
  }
}
