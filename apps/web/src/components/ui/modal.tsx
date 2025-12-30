"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { Button } from "./button"
import { Input } from "./input"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: React.ReactNode
  showCloseButton?: boolean
  className?: string
}

interface ModalActionsProps {
  children: React.ReactNode
  className?: string
}

interface ModalInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  onSubmit?: () => void
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  loading?: boolean
}

interface InputModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (value: string) => void
  title: string
  description?: string
  placeholder?: string
  initialValue?: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

function Modal({
  open,
  onClose,
  title,
  description,
  children,
  showCloseButton = true,
  className,
}: ModalProps) {
  const [isClosing, setIsClosing] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!open) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [open])

  function handleClose() {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 150)
  }

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm",
          isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"
        )}
        onClick={handleClose}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md overflow-hidden rounded-2xl",
          "bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50",
          isClosing ? "animate-modal-out" : "animate-modal-in",
          className
        )}
      >
        {showCloseButton && (
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {(title || description) && (
          <div className="px-6 pt-6 pb-2">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        )}

        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>,
    document.body
  )
}

function ModalActions({ children, className }: ModalActionsProps) {
  return (
    <div className={cn("flex items-center justify-end gap-2 mt-4", className)}>
      {children}
    </div>
  )
}

function ModalInput({
  value,
  onChange,
  placeholder,
  autoFocus = true,
  onSubmit,
}: ModalInputProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && onSubmit) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onKeyDown={handleKeyDown}
      className="mt-4"
    />
  )
}

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <ModalActions>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={variant === "destructive" ? "destructive" : "default"}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "..." : confirmText}
        </Button>
      </ModalActions>
    </Modal>
  )
}

function InputModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  placeholder,
  initialValue = "",
  confirmText = "Save",
  cancelText = "Cancel",
  loading = false,
}: InputModalProps) {
  const [value, setValue] = React.useState(initialValue)

  React.useEffect(() => {
    if (open) {
      setValue(initialValue)
    }
  }, [open, initialValue])

  function handleConfirm() {
    if (value.trim()) {
      onConfirm(value.trim())
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <ModalInput
        value={value}
        onChange={setValue}
        placeholder={placeholder}
        onSubmit={handleConfirm}
      />
      <ModalActions>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button onClick={handleConfirm} disabled={loading || !value.trim()}>
          {loading ? "..." : confirmText}
        </Button>
      </ModalActions>
    </Modal>
  )
}

export { Modal, ModalActions, ModalInput, ConfirmModal, InputModal }
