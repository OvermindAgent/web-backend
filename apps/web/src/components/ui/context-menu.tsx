"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface ContextMenuProps {
  children: React.ReactNode
  open: boolean
  onClose: () => void
  position: { x: number; y: number }
}

interface ContextMenuItemProps {
  children: React.ReactNode
  icon?: React.ReactNode
  onClick?: () => void
  variant?: "default" | "destructive"
  disabled?: boolean
}

interface ContextMenuSeparatorProps {
  className?: string
}

const ContextMenuContext = React.createContext<{
  onClose: () => void
}>({ onClose: () => {} })

function ContextMenu({ children, open, onClose, position }: ContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [isClosing, setIsClosing] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [adjustedPosition, setAdjustedPosition] = React.useState(position)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (open && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let x = position.x
      let y = position.y

      if (x + rect.width > viewportWidth - 8) {
        x = viewportWidth - rect.width - 8
      }
      if (y + rect.height > viewportHeight - 8) {
        y = viewportHeight - rect.height - 8
      }
      if (x < 8) x = 8
      if (y < 8) y = 8

      setAdjustedPosition({ x, y })
    }
  }, [open, position])

  React.useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose()
      }
    }

    function handleScroll() {
      handleClose()
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    window.addEventListener("scroll", handleScroll, true)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
      window.removeEventListener("scroll", handleScroll, true)
    }
  }, [open])

  function handleClose() {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 120)
  }

  if (!mounted || !open) return null

  return createPortal(
    <ContextMenuContext.Provider value={{ onClose: handleClose }}>
      <div
        className={cn(
          "fixed inset-0 z-[9998]",
          "bg-black/20 backdrop-blur-[2px]",
          isClosing ? "animate-context-backdrop-out" : "animate-context-backdrop-in"
        )}
        onClick={handleClose}
      />
      <div
        ref={menuRef}
        className={cn(
          "fixed z-[9999] min-w-[180px] overflow-hidden rounded-xl p-1.5",
          "bg-card/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40",
          isClosing ? "animate-context-menu-out" : "animate-context-menu-in"
        )}
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
        }}
      >
        {children}
      </div>
    </ContextMenuContext.Provider>,
    document.body
  )
}

function ContextMenuItem({
  children,
  icon,
  onClick,
  variant = "default",
  disabled = false,
}: ContextMenuItemProps) {
  const { onClose } = React.useContext(ContextMenuContext)

  function handleClick() {
    if (disabled) return
    onClick?.()
    onClose()
  }

  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
        "transition-colors duration-100",
        variant === "default" && "text-foreground hover:bg-accent/80",
        variant === "destructive" && "text-red-500 hover:bg-red-500/10",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}
      <span className="flex-1 text-left">{children}</span>
    </button>
  )
}

function ContextMenuSeparator({ className }: ContextMenuSeparatorProps) {
  return (
    <div
      className={cn(
        "h-px my-1.5 mx-2 bg-border/50",
        className
      )}
    />
  )
}

export { ContextMenu, ContextMenuItem, ContextMenuSeparator }
