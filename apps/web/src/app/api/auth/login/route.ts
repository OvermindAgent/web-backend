import { NextRequest, NextResponse } from "next/server"
import { authenticateUser, createSession, setSessionCookie } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    if (process.env.NODE_ENV === "development" && email === "dev@overmind.local") {
      const devSession = await createSession("dev-user-001")
      await setSessionCookie(devSession.id)
      
      return NextResponse.json({
        user: {
          id: "dev-user-001",
          email: "dev@overmind.local",
          displayName: "Dev User",
        },
      })
    }
    
    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      )
    }
    
    const user = await authenticateUser(email, password)
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }
    
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
    const message = error instanceof Error ? error.message : "Login failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
