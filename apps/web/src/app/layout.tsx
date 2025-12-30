import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { cn } from "@/lib/utils"
import "./globals.css"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Overmind | AI-Powered Roblox Development",
  description: "Premium AI platform for Roblox developers. Build faster with intelligent assistance.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("dark", inter.variable)} style={{ colorScheme: "dark" }}>
      <body className={cn(inter.className, "antialiased bg-background text-foreground")}>
        {children}
      </body>
    </html>
  )
}
