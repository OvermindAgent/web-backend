"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Settings,
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Check,
  ArrowLeft,
  Loader2,
  AlertCircle,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { ConfirmModal } from "@/components/ui/modal"

interface ApiKey {
  id: string
  name: string
  prefix: string
  expiresAt: number | null
  createdAt: number
  lastUsedAt: number | null
}

interface UserProfile {
  id: string
  email: string
  displayName: string
  createdAt: number
}

type Tab = "account" | "security" | "api-keys"

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("account")
  
  const [user, setUser] = useState<UserProfile | null>(null)
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState("")
  const [profileError, setProfileError] = useState("")

  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const [keys, setKeys] = useState<ApiKey[]>([])
  const [keysLoading, setKeysLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyDays, setNewKeyDays] = useState("")
  const [newPlainKey, setNewPlainKey] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  const [keysError, setKeysError] = useState("")
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; key: ApiKey | null }>({ open: false, key: null })
  const [copyingKey, setCopyingKey] = useState<string | null>(null)

  useEffect(() => {
    fetchUser()
    fetchKeys()
    
    const tab = new URLSearchParams(window.location.search).get("tab") as Tab
    if (tab && ["account", "security", "api-keys"].includes(tab)) {
      setActiveTab(tab)
    }
  }, [])

  async function fetchUser() {
    try {
      const res = await fetch("/api/user")
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        setEmail(data.user.email)
        setDisplayName(data.user.displayName)
      }
    } catch {
      setProfileError("Failed to load profile")
    } finally {
      setProfileLoading(false)
    }
  }

  async function fetchKeys() {
    try {
      const res = await fetch("/api/keys")
      const data = await res.json()
      setKeys(data.keys || [])
    } catch {
      setKeysError("Failed to fetch API keys")
    } finally {
      setKeysLoading(false)
    }
  }

  async function handleSaveProfile() {
    setProfileSaving(true)
    setProfileError("")
    setProfileSuccess("")

    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      setUser(data.user)
      setProfileSuccess("Profile updated successfully")
      setTimeout(() => setProfileSuccess(""), 3000)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleChangePassword() {
    setPasswordSaving(true)
    setPasswordError("")
    setPasswordSuccess("")

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match")
      setPasswordSaving(false)
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      setPasswordSaving(false)
      return
    }

    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordSuccess("Password changed successfully")
      setTimeout(() => setPasswordSuccess(""), 3000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password")
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleCreateKey() {
    if (!newKeyName.trim()) return

    setCreating(true)
    setKeysError("")

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName,
          expiresInDays: newKeyDays ? parseInt(newKeyDays) : null,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      setNewPlainKey(data.plainKey)
      setKeys((prev) => [...prev, data.key])
      setNewKeyName("")
      setNewKeyDays("")
    } catch (err) {
      setKeysError(err instanceof Error ? err.message : "Failed to create key")
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteKey(id: string) {
    try {
      const res = await fetch("/api/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id))
      }
    } catch {
      setKeysError("Failed to revoke key")
    }
  }

  function handleCopy(text: string, id?: string) {
    navigator.clipboard.writeText(text)
    setCopied(id || "new")
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleCopyFullKey(keyId: string) {
    setCopyingKey(keyId)
    try {
      const res = await fetch("/api/keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: keyId }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      navigator.clipboard.writeText(data.key)
      setCopied(`full-${keyId}`)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      setKeysError(err instanceof Error ? err.message : "Failed to copy key")
    } finally {
      setCopyingKey(null)
    }
  }

  const tabs = [
    { id: "account" as Tab, label: "Account", icon: <User className="w-4 h-4" /> },
    { id: "security" as Tab, label: "Security", icon: <Lock className="w-4 h-4" /> },
    { id: "api-keys" as Tab, label: "API Keys", icon: <Key className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-8">
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account, security, and API keys</p>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="w-48 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    const url = new URL(window.location.href)
                    url.searchParams.set("tab", tab.id)
                    window.history.replaceState({}, "", url.toString())
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 min-w-0">
            {activeTab === "account" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your account details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profileError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {profileError}
                      </div>
                    )}
                    {profileSuccess && (
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {profileSuccess}
                      </div>
                    )}
                    
                    {profileLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Display Name</label>
                          <Input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your display name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Email</label>
                          <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                          />
                        </div>
                        <Button 
                          onClick={handleSaveProfile} 
                          disabled={profileSaving}
                          className="w-full sm:w-auto"
                        >
                          {profileSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Update your password to keep your account secure</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {passwordError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {passwordError}
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {passwordSuccess}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Current Password</label>
                      <div className="relative">
                        <Input
                          type={showOldPassword ? "text" : "password"}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">New Password</label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Confirm New Password</label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                    </div>
                    <Button 
                      onClick={handleChangePassword} 
                      disabled={passwordSaving || !oldPassword || !newPassword || !confirmPassword}
                      className="w-full sm:w-auto"
                    >
                      {passwordSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Changing...
                        </>
                      ) : (
                        "Change Password"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "api-keys" && (
              <div className="space-y-6">
                {keysError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {keysError}
                  </div>
                )}

                {newPlainKey && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        Save Your API Key
                      </CardTitle>
                      <CardDescription>
                        Copy this key now. You won&apos;t be able to see it again!
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Input value={newPlainKey} readOnly className="font-mono text-sm" />
                        <Button onClick={() => handleCopy(newPlainKey)}>
                          {copied === "new" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <Button variant="ghost" className="mt-4" onClick={() => setNewPlainKey("")}>
                        I&apos;ve saved the key
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Create New API Key</CardTitle>
                    <CardDescription>Generate a new key for Roblox Plugin or VSCode Extension</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <Input
                        placeholder="Key name (e.g., Roblox Plugin)"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Expiry (days)"
                        value={newKeyDays}
                        onChange={(e) => setNewKeyDays(e.target.value)}
                        className="w-32"
                      />
                      <Button onClick={handleCreateKey} disabled={creating || !newKeyName.trim()}>
                        {creating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Create
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Your API Keys</CardTitle>
                    <CardDescription>Manage your existing API keys</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {keysLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : keys.length === 0 ? (
                      <div className="text-center py-8">
                        <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No API keys yet</p>
                        <p className="text-sm text-muted-foreground/70">Create one to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {keys.map((key) => (
                          <div
                            key={key.id}
                            className="flex items-center gap-4 p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Key className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{key.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                                  {key.prefix}...
                                </code>
                                <button
                                  onClick={() => handleCopy(key.prefix, key.id)}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                  title="Copy prefix"
                                >
                                  {copied === key.id ? (
                                    <Check className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                <span>Created {formatDate(new Date(key.createdAt))}</span>
                                {key.lastUsedAt && (
                                  <span>Last used {formatDate(new Date(key.lastUsedAt))}</span>
                                )}
                                {key.expiresAt && (
                                  <span className={cn(
                                    key.expiresAt < Date.now() && "text-destructive"
                                  )}>
                                    {key.expiresAt < Date.now() ? "Expired" : `Expires ${formatDate(new Date(key.expiresAt))}`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => handleCopyFullKey(key.id)}
                                disabled={copyingKey === key.id}
                              >
                                {copyingKey === key.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : copied === `full-${key.id}` ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteModal({ open: true, key })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, key: null })}
        onConfirm={() => {
          if (deleteModal.key) {
            handleDeleteKey(deleteModal.key.id)
          }
          setDeleteModal({ open: false, key: null })
        }}
        title="Revoke API Key"
        description={`Are you sure you want to revoke "${deleteModal.key?.name}"? This action cannot be undone and any applications using this key will stop working.`}
        confirmText="Revoke"
        variant="destructive"
      />
    </div>
  )
}
