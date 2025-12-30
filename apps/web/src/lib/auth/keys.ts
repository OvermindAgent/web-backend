import { createHash, randomBytes } from "crypto"
import { db, type ApiKey } from "../db/kv"
import { AUTH_CONFIG } from "../config"
import { generateId } from "../utils"
import { encrypt, decrypt } from "../crypto"

export function generateApiKey(): { key: string; hash: string; prefix: string; encrypted: string } {
  const randomPart = randomBytes(32).toString("hex")
  const key = `${AUTH_CONFIG.apiKeyPrefix}${randomPart}`
  const hash = hashApiKey(key)
  const prefix = key.slice(0, 16)
  const encrypted = encrypt(key)
  
  return { key, hash, prefix, encrypted }
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

export async function createApiKey(
  userId: string,
  name: string,
  expiresAt?: number | null
): Promise<{ apiKey: ApiKey; plainKey: string }> {
  const { key, hash, prefix, encrypted } = generateApiKey()
  
  const apiKey: ApiKey = {
    id: generateId(),
    userId,
    name,
    keyHash: hash,
    encryptedKey: encrypted,
    prefix,
    expiresAt: expiresAt || null,
    createdAt: Date.now(),
    lastUsedAt: null,
    revoked: false,
  }
  
  await db.createApiKey(apiKey)
  return { apiKey, plainKey: key }
}

export async function validateApiKey(key: string): Promise<{ valid: boolean; userId?: string; keyId?: string }> {
  if (!key.startsWith(AUTH_CONFIG.apiKeyPrefix)) {
    return { valid: false }
  }
  
  const hash = hashApiKey(key)
  const apiKey = await db.getApiKeyByHash(hash)
  
  if (!apiKey) {
    return { valid: false }
  }
  
  if (apiKey.revoked) {
    return { valid: false }
  }
  
  if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
    return { valid: false }
  }
  
  await db.updateApiKey(apiKey.id, { lastUsedAt: Date.now() })
  
  return { valid: true, userId: apiKey.userId, keyId: apiKey.id }
}

export async function revokeApiKey(id: string, userId: string): Promise<boolean> {
  const apiKey = await db.getApiKey(id)
  
  if (!apiKey || apiKey.userId !== userId) {
    return false
  }
  
  await db.updateApiKey(id, { revoked: true })
  return true
}

export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  return await db.getUserApiKeys(userId)
}

export function decryptapikey(encryptedKey: string): string | null {
  try {
    return decrypt(encryptedKey)
  } catch {
    return null
  }
}
