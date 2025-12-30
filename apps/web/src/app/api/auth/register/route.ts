import { NextRequest, NextResponse } from "next/server"
import { createUser, createSession, setSessionCookie } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName } = await request.json()
    
    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: "Email, password, and display name are required" },
        { status: 400 }
      )
    }
    
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }
    
    const user = await createUser(email, password, displayName)
    const session = await createSession(user.id)
    await setSessionCookie(session.id)
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
