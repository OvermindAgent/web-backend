import { NextResponse } from "next/server"
import { logout, clearSessionCookie } from "@/lib/auth/session"

export async function POST() {
  try {
    await logout()
    await clearSessionCookie()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
