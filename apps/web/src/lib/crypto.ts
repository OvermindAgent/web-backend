import { createCipheriv, createDecipheriv, randomBytes, scryptSync, pbkdf2Sync } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const SALT_LENGTH = 32
const TAG_LENGTH = 16
const KEY_LENGTH = 32

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || "overmind-default-secret-key-change-in-production"

function derivekey(salt: Buffer): Buffer {
  return scryptSync(ENCRYPTION_SECRET, salt, KEY_LENGTH)
}

export function encrypt(plaintext: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)
  const key = derivekey(salt)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  const result = Buffer.concat([salt, iv, tag, encrypted])
  return result.toString("base64")
}

export function decrypt(ciphertext: string): string {
  const data = Buffer.from(ciphertext, "base64")

  const salt = data.subarray(0, SALT_LENGTH)
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

  const key = derivekey(salt)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString("utf8")
}

const CHAT_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "overmind-client-encryption-key-32b"
const FAST_KEY = Buffer.from(CHAT_KEY.padEnd(32, "0").slice(0, 32), "utf8")

export function encryptchat(plaintext: string): string {
  const data = Buffer.from(plaintext, "utf8")
  const encrypted = Buffer.alloc(data.length)
  
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ FAST_KEY[i % 32]
  }
  
  return encrypted.toString("base64")
}

export function decryptchat(ciphertext: string): string {
  const data = Buffer.from(ciphertext, "base64")
  const decrypted = Buffer.alloc(data.length)
  
  for (let i = 0; i < data.length; i++) {
    decrypted[i] = data[i] ^ FAST_KEY[i % 32]
  }
  
  return decrypted.toString("utf8")
}

export function encryptsafe(plaintext: string): string | null {
  try {
    return encrypt(plaintext)
  } catch {
    return null
  }
}

export function decryptsafe(ciphertext: string): string | null {
  try {
    return decrypt(ciphertext)
  } catch {
    return null
  }
}
