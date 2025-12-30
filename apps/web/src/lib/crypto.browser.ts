const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "overmind-client-encryption-key-32b"
const FAST_KEY = new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32))

export function encryptdata(plaintext: string): string {
  const data = new TextEncoder().encode(plaintext)
  const encrypted = new Uint8Array(data.length)
  
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ FAST_KEY[i % 32]
  }
  
  let binary = ""
  for (let i = 0; i < encrypted.length; i++) {
    binary += String.fromCharCode(encrypted[i])
  }
  return btoa(binary)
}

export function decryptdata(ciphertext: string): string {
  const data = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  const decrypted = new Uint8Array(data.length)
  
  for (let i = 0; i < data.length; i++) {
    decrypted[i] = data[i] ^ FAST_KEY[i % 32]
  }
  
  return new TextDecoder().decode(decrypted)
}

export async function encryptstream(readable: ReadableStream<Uint8Array>): Promise<ReadableStream<Uint8Array>> {
  const reader = readable.getReader()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  
  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const text = decoder.decode(value)
          const encrypted = await encryptdata(text)
          controller.enqueue(encoder.encode(encrypted + "\n"))
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
  })
}

export async function decryptstream(readable: ReadableStream<Uint8Array>): Promise<ReadableStream<Uint8Array>> {
  const reader = readable.getReader()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let buffer = ""
  
  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            if (buffer.trim()) {
              try {
                const decrypted = await decryptdata(buffer.trim())
                controller.enqueue(encoder.encode(decrypted))
              } catch {}
            }
            break
          }
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const decrypted = await decryptdata(line.trim())
                controller.enqueue(encoder.encode(decrypted))
              } catch {}
            }
          }
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
  })
}
