import { kv } from "@vercel/kv"

export type Tier = "free" | "pro" | "studio"
export type BillingCycle = "monthly" | "yearly"

export interface User {
  id: string
  email: string
  passwordHash: string
  displayName: string
  createdAt: number
  updatedAt: number
  tier: Tier
  billingCycle: BillingCycle | null
  subscriptionExpiresAt: number | null
  autoRenew: boolean
  gracePeriodEndsAt: number | null
  paymentFailedAt: number | null
  creditsUsedToday: number
  creditsLastReset: number
  requestsThisMinute: number
  minuteStartTime: number
  dismissedTierWarning: boolean
}

export interface Session {
  id: string
  userId: string
  expiresAt: number
  createdAt: number
}

export interface ApiKey {
  id: string
  userId: string
  name: string
  keyHash: string
  encryptedKey: string
  prefix: string
  expiresAt: number | null
  createdAt: number
  lastUsedAt: number | null
  revoked: boolean
}

export interface Project {
  id: string
  userId: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
}

export interface Task {
  id: string
  projectId: string
  userId: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "blocked" | "completed" | "cancelled"
  createdAt: number
  updatedAt: number
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  reasoning?: string
  createdAt: number
}

export interface Chat {
  id: string
  projectId: string
  userId: string
  name: string
  messages: ChatMessage[]
  messageCount: number
  manuallyRenamed: boolean
  createdAt: number
  updatedAt: number
}

export interface Conversation {
  id: string
  projectId: string
  userId: string
  messages: ConversationMessage[]
  createdAt: number
  updatedAt: number
}

export interface ConversationMessage {
  role: "user" | "assistant"
  content: string
  reasoning_content?: string
  createdAt: number
}

const KEYS = {
  user: (id: string) => `user:${id}`,
  userByEmail: (email: string) => `user:email:${email}`,
  session: (id: string) => `session:${id}`,
  apiKey: (id: string) => `apikey:${id}`,
  apiKeyByHash: (hash: string) => `apikey:hash:${hash}`,
  userApiKeys: (userId: string) => `user:${userId}:apikeys`,
  project: (id: string) => `project:${id}`,
  userProjects: (userId: string) => `user:${userId}:projects`,
  task: (id: string) => `task:${id}`,
  projectTasks: (projectId: string) => `project:${projectId}:tasks`,
  conversation: (id: string) => `conversation:${id}`,
  projectConversation: (projectId: string) => `project:${projectId}:conversation`,
  chat: (id: string) => `chat:${id}`,
  projectChats: (projectId: string) => `project:${projectId}:chats`,
}

const isProduction = process.env.NODE_ENV === "production"
const hasKvConfig = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

const memoryStore = new Map<string, unknown>()
const memorySets = new Map<string, Set<string>>()

const memoryDb = {
  async get<T>(key: string): Promise<T | null> {
    return (memoryStore.get(key) as T) ?? null
  },
  async set(key: string, value: unknown, _options?: { ex?: number }): Promise<void> {
    memoryStore.set(key, value)
  },
  async del(key: string): Promise<void> {
    memoryStore.delete(key)
  },
  async sadd(key: string, value: string): Promise<void> {
    if (!memorySets.has(key)) {
      memorySets.set(key, new Set())
    }
    memorySets.get(key)!.add(value)
  },
  async smembers<T>(key: string): Promise<T> {
    const set = memorySets.get(key)
    return (set ? Array.from(set) : []) as T
  },
  async srem(key: string, value: string): Promise<void> {
    memorySets.get(key)?.delete(value)
  },
}

const store = hasKvConfig ? kv : memoryDb

if (!hasKvConfig && !isProduction) {
  console.log("[Overmind] Using in-memory store (dev mode)")
}

export const db = {
  async getUser(id: string): Promise<User | null> {
    return await store.get<User>(KEYS.user(id))
  },
  
  async getUserByEmail(email: string): Promise<User | null> {
    const userId = await store.get<string>(KEYS.userByEmail(email))
    if (!userId) return null
    return await this.getUser(userId)
  },
  
  async createUser(user: User): Promise<void> {
    await store.set(KEYS.user(user.id), user)
    await store.set(KEYS.userByEmail(user.email), user.id)
  },
  
  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    const user = await this.getUser(id)
    if (!user) throw new Error("User not found")
    await store.set(KEYS.user(id), { ...user, ...updates, updatedAt: Date.now() })
  },
  
  async getSession(id: string): Promise<Session | null> {
    return await store.get<Session>(KEYS.session(id))
  },
  
  async createSession(session: Session): Promise<void> {
    const ttl = Math.floor((session.expiresAt - Date.now()) / 1000)
    await store.set(KEYS.session(session.id), session, { ex: ttl })
  },
  
  async deleteSession(id: string): Promise<void> {
    await store.del(KEYS.session(id))
  },
  
  async getApiKey(id: string): Promise<ApiKey | null> {
    return await store.get<ApiKey>(KEYS.apiKey(id))
  },
  
  async getApiKeyByHash(hash: string): Promise<ApiKey | null> {
    const keyId = await store.get<string>(KEYS.apiKeyByHash(hash))
    if (!keyId) return null
    return await this.getApiKey(keyId)
  },
  
  async createApiKey(key: ApiKey): Promise<void> {
    await store.set(KEYS.apiKey(key.id), key)
    await store.set(KEYS.apiKeyByHash(key.keyHash), key.id)
    await store.sadd(KEYS.userApiKeys(key.userId), key.id)
  },
  
  async updateApiKey(id: string, updates: Partial<ApiKey>): Promise<void> {
    const key = await this.getApiKey(id)
    if (!key) throw new Error("API key not found")
    await store.set(KEYS.apiKey(id), { ...key, ...updates })
  },
  
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    const keyIds = await store.smembers<string[]>(KEYS.userApiKeys(userId))
    const keys = await Promise.all(keyIds.map((id: string) => this.getApiKey(id)))
    return keys.filter((k): k is ApiKey => k !== null && !k.revoked)
  },
  
  async getProject(id: string): Promise<Project | null> {
    return await store.get<Project>(KEYS.project(id))
  },
  
  async createProject(project: Project): Promise<void> {
    await store.set(KEYS.project(project.id), project)
    await store.sadd(KEYS.userProjects(project.userId), project.id)
  },
  
  async getUserProjects(userId: string): Promise<Project[]> {
    const projectIds = await store.smembers<string[]>(KEYS.userProjects(userId))
    const projects = await Promise.all(projectIds.map((id: string) => this.getProject(id)))
    return projects.filter((p): p is Project => p !== null)
  },
  
  async getTask(id: string): Promise<Task | null> {
    return await store.get<Task>(KEYS.task(id))
  },
  
  async createTask(task: Task): Promise<void> {
    await store.set(KEYS.task(task.id), task)
    await store.sadd(KEYS.projectTasks(task.projectId), task.id)
  },
  
  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    const task = await this.getTask(id)
    if (!task) throw new Error("Task not found")
    await store.set(KEYS.task(id), { ...task, ...updates, updatedAt: Date.now() })
  },
  
  async getProjectTasks(projectId: string): Promise<Task[]> {
    const taskIds = await store.smembers<string[]>(KEYS.projectTasks(projectId))
    const tasks = await Promise.all(taskIds.map((id: string) => this.getTask(id)))
    return tasks.filter((t): t is Task => t !== null)
  },
  
  async getConversation(projectId: string): Promise<Conversation | null> {
    return await store.get<Conversation>(KEYS.projectConversation(projectId))
  },
  
  async saveConversation(conversation: Conversation): Promise<void> {
    await store.set(KEYS.projectConversation(conversation.projectId), conversation)
    await store.set(KEYS.conversation(conversation.id), conversation)
  },

  async getChat(id: string): Promise<Chat | null> {
    return await store.get<Chat>(KEYS.chat(id))
  },

  async createChat(chat: Chat): Promise<void> {
    await store.set(KEYS.chat(chat.id), chat)
    await store.sadd(KEYS.projectChats(chat.projectId), chat.id)
  },

  async updateChat(id: string, updates: Partial<Chat>): Promise<void> {
    const chat = await this.getChat(id)
    if (!chat) throw new Error("Chat not found")
    await store.set(KEYS.chat(id), { ...chat, ...updates, updatedAt: Date.now() })
  },

  async deleteChat(id: string): Promise<void> {
    const chat = await this.getChat(id)
    if (!chat) return
    await store.del(KEYS.chat(id))
    await store.srem(KEYS.projectChats(chat.projectId), id)
  },

  async getProjectChats(projectId: string): Promise<Chat[]> {
    const chatIds = await store.smembers<string[]>(KEYS.projectChats(projectId))
    const chats = await Promise.all(chatIds.map((id: string) => this.getChat(id)))
    return chats
      .filter((c): c is Chat => c !== null)
      .sort((a: Chat, b: Chat) => b.updatedAt - a.updatedAt)
  },

  async addMessageToChat(chatId: string, message: ChatMessage): Promise<Chat | null> {
    const chat = await this.getChat(chatId)
    if (!chat) return null
    
    const updatedChat: Chat = {
      ...chat,
      messages: [...chat.messages, message],
      messageCount: chat.messageCount + 1,
      updatedAt: Date.now(),
    }
    
    await store.set(KEYS.chat(chatId), updatedChat)
    return updatedChat
  },
}
