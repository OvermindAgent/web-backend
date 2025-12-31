import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized, rateLimited, insufficientCredits, type AuthResult } from "@/lib/auth/middleware"
import { chat, streamChat, type ChatMessage } from "@/lib/ai/router"
import { parseToolCalls, executeTool, hasToolCall, extractTextContent } from "@/lib/ai/executor"
import type { Preset } from "@/lib/ai/presets"
import { decryptchat, encryptchat } from "@/lib/crypto"
import { calculateCreditCost, canUseCredits, checkRateLimit, isSameDay } from "@/lib/billing/credits"
import { db } from "@/lib/db/kv"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) {
      return unauthorized()
    }
    
    const body = await request.json()
    
    let messages: ChatMessage[]
    let preset: Preset | undefined
    let projectContext: string | undefined
    let stream: boolean | undefined
    let provider: string | undefined
    let model: string | undefined
    let projectId: string | undefined
    let skipCredits: boolean | undefined
    
    if (body.encrypted) {
      try {
        const decrypted = decryptchat(body.encrypted)
        const parsed = JSON.parse(decrypted)
        messages = parsed.messages
        preset = parsed.preset
        projectContext = parsed.projectContext
        stream = parsed.stream
        provider = parsed.provider
        model = parsed.model
        projectId = parsed.projectId
        skipCredits = parsed.skipCredits
      } catch (error) {
        console.error("decryption error:", error)
        return NextResponse.json({ error: "Invalid encrypted payload" }, { status: 400 })
      }
    } else {
      const data = body as {
        messages: ChatMessage[]
        preset?: Preset
        projectContext?: string
        stream?: boolean
        provider?: string
        model?: string
        projectId?: string
        skipCredits?: boolean
      }
      messages = data.messages
      preset = data.preset
      projectContext = data.projectContext
      stream = data.stream
      provider = data.provider
      model = data.model
      projectId = data.projectId
      skipCredits = data.skipCredits
    }
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 })
    }
    
    const userTier = auth.tier || "free"
    const selectedModel = model || "chatgpt-4o-latest"
    const creditCost = calculateCreditCost(selectedModel)
    
    console.log(`[Credits] Model: ${selectedModel}, Cost: ${creditCost}x, Tier: ${userTier}, Skip: ${skipCredits || false}`)
    
    let user = auth.user
    if (!user) {
      console.log(`[Credits] User not in auth, fetching from DB: ${auth.userId}`)
      user = await db.getUser(auth.userId) || undefined
    }
    
    if (user && !skipCredits) {
      console.log(`[Credits] User before: creditsUsed=${user.creditsUsedToday}, lastReset=${user.creditsLastReset}`)
      
      const now = Date.now()
      const needsReset = !isSameDay(user.creditsLastReset, now)
      const currentCredits = needsReset ? 0 : user.creditsUsedToday
      const minuteElapsed = now - user.minuteStartTime >= 60000
      const currentRequests = minuteElapsed ? 0 : user.requestsThisMinute
      
      console.log(`[Credits] needsReset=${needsReset}, currentCredits=${currentCredits}, newCredits=${needsReset ? creditCost : currentCredits + creditCost}`)
      
      const rateCheck = checkRateLimit(userTier, currentRequests, user.minuteStartTime)
      if (!rateCheck.allowed) {
        console.log(`[Credits] Rate limit exceeded`)
        return rateLimited(rateCheck.resetsAt)
      }
      
      if (!canUseCredits(userTier, currentCredits, user.creditsLastReset, selectedModel)) {
        console.log(`[Credits] Insufficient credits`)
        return insufficientCredits()
      }
      
      const newCreditsUsed = needsReset ? creditCost : currentCredits + creditCost
      
      await db.updateUser(auth.userId, {
        creditsUsedToday: newCreditsUsed,
        creditsLastReset: needsReset ? now : user.creditsLastReset,
        requestsThisMinute: minuteElapsed ? 1 : currentRequests + 1,
        minuteStartTime: minuteElapsed ? now : user.minuteStartTime,
      })
      
      console.log(`[Credits] Updated user credits to: ${newCreditsUsed}`)
      
      const verifyUser = await db.getUser(auth.userId)
      console.log(`[Credits] Verified DB state: creditsUsed=${verifyUser?.creditsUsedToday}`)
    } else {
      console.log(`[Credits] WARNING: No user found, skipping credit deduction`)
    }
    
    if (stream) {
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          try {
            let fullContent = ""
            let fullReasoning = ""
            
            for await (const chunk of streamChat({ messages, preset, projectContext, provider, model, userTier })) {
              if (chunk.done) {
                if (hasToolCall(fullContent)) {
                  const toolCalls = parseToolCalls(fullContent)
                  for (const call of toolCalls) {
                    const result = await executeTool(call, { projectId, userId: auth.userId })
                    const encrypted = encryptchat(JSON.stringify({ type: "tool_result", call, result }))
                    controller.enqueue(encoder.encode(`data: ${encrypted}\n\n`))
                  }
                }
                const doneencrypted = encryptchat("[DONE]")
                controller.enqueue(encoder.encode(`data: ${doneencrypted}\n\n`))
                controller.close()
                return
              }
              
              if (chunk.content) {
                fullContent += chunk.content
                const encrypted = encryptchat(JSON.stringify({ type: "content", content: chunk.content }))
                controller.enqueue(encoder.encode(`data: ${encrypted}\n\n`))
              }
              if (chunk.reasoning_content) {
                fullReasoning += chunk.reasoning_content
                const encrypted = encryptchat(JSON.stringify({ type: "reasoning", content: chunk.reasoning_content }))
                controller.enqueue(encoder.encode(`data: ${encrypted}\n\n`))
              }
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Stream error"
            const encrypted = encryptchat(JSON.stringify({ type: "error", error: message }))
            controller.enqueue(encoder.encode(`data: ${encrypted}\n\n`))
            controller.close()
          }
        },
      })
      
      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
          "Transfer-Encoding": "chunked",
        },
      })
    }
    
    const response = await chat({ messages, preset, projectContext, provider, model, userTier })
    
    let toolResults: { call: unknown; result: unknown }[] = []
    if (hasToolCall(response.content)) {
      const toolCalls = parseToolCalls(response.content)
      for (const call of toolCalls) {
        const result = await executeTool(call, { projectId, userId: auth.userId })
        toolResults.push({ call, result })
      }
    }
    
    return NextResponse.json({
      id: response.id,
      model: response.model,
      content: extractTextContent(response.content),
      rawContent: response.content,
      reasoning_content: response.reasoning_content,
      usage: response.usage,
      toolResults,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
