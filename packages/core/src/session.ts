import { mkdir, appendFile, readFile, readdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import type { ChatMessage } from "./types.js"

export interface SessionRecord {
  ts: number
  type: "event" | "messages" | "stats"
  payload: unknown
}

export interface SessionSummary {
  id: string
  ts: number
  messageCount: number
  userMessages: number
  inputTokens: number
  outputTokens: number
}

export class SessionLoader {
  static sessionDir = resolve(process.cwd(), ".deepicode", "sessions")

  static validateSessionId(id: string): boolean {
    if (!id || typeof id !== "string") return false
    if (id.length > 128 || id.length < 1) return false
    if (/[\x00-\x1f\x7f/\\:?*"<>|]/.test(id)) return false
    if (id === "." || id === "..") return false
    if (/\.\./.test(id)) return false
    return true
  }

  private static safePath(sessionId: string): string {
    if (!this.validateSessionId(sessionId)) {
      throw new Error(`Invalid session ID: ${sessionId}`)
    }
    return resolve(this.sessionDir, `${sessionId}.jsonl`)
  }

  static async read(sessionId: string): Promise<ChatMessage[]> {
    const path = this.safePath(sessionId)
    let raw: string
    try {
      raw = await readFile(path, "utf-8")
    } catch {
      return []
    }
    const lines = raw.trim().split("\n")
    // Scan from end to find the most recent valid messages record
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const rec: SessionRecord = JSON.parse(lines[i])
        if (rec.type === "messages" && Array.isArray(rec.payload)) {
          return rec.payload as ChatMessage[]
        }
      } catch {
        continue
      }
    }
    return []
  }

  static async list(): Promise<SessionSummary[]> {
    const entries: SessionSummary[] = []
    let files: string[]
    try {
      files = await readdir(this.sessionDir)
    } catch {
      return []
    }
    for (const f of files) {
      if (!f.endsWith(".jsonl")) continue
      const id = f.slice(0, -6)
      if (!this.validateSessionId(id)) continue
      const path = resolve(this.sessionDir, f)
      try {
        const raw = await readFile(path, "utf-8")
        const lines = raw.trim().split("\n")
        if (lines.length === 0) continue
        let messageCount = 0
        let userMessages = 0
        let inputTokens = 0
        let outputTokens = 0
        let lastTs = 0
        // scan for last valid records
        let lastInputTokens = 0
        let lastOutputTokens = 0
        for (const line of lines) {
          try {
            const rec = JSON.parse(line) as SessionRecord
            if (rec.ts > lastTs) lastTs = rec.ts
            if (rec.type === "messages" && Array.isArray(rec.payload)) {
              const msgs = rec.payload as ChatMessage[]
              messageCount = msgs.length
              userMessages = msgs.filter(m => m.role === "user").length
            }
            if (rec.type === "stats" && typeof rec.payload === "object" && rec.payload) {
              const s = rec.payload as Record<string, unknown>
              if (typeof s.inputTokens === "number") lastInputTokens = s.inputTokens
              if (typeof s.outputTokens === "number") lastOutputTokens = s.outputTokens
            }
          } catch { continue }
        }
        inputTokens = lastInputTokens
        outputTokens = lastOutputTokens
        entries.push({ id, ts: lastTs, messageCount, userMessages, inputTokens, outputTokens })
      } catch { continue }
    }
    entries.sort((a, b) => b.ts - a.ts)
    return entries.slice(0, 20)
  }
}

export class AsyncSessionWriter {
  private path: string
  private queue: string[] = []
  private queueRecords: SessionRecord[] = []
  private flushing = false
  private initPromise?: Promise<void>
  private droppedCount = 0

  private static MAX_QUEUE_SIZE = 500

  constructor(path: string) {
    this.path = path
  }

  async init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = mkdir(dirname(this.path), { recursive: true }).then(() => {})
    }
    await this.initPromise
  }

  enqueue(record: SessionRecord): void {
    try {
      const serialized = JSON.stringify(record) + "\n"
      this.queue.push(serialized)
      this.queueRecords.push(record)
      this.evictIfNeeded()
      this.flushSoon().catch(() => {})
    } catch {
      // best-effort: drop unserializable records silently
    }
  }

  private evictIfNeeded(): void {
    while (this.queue.length > AsyncSessionWriter.MAX_QUEUE_SIZE) {
      // Find the oldest "event" record to drop (least important)
      const idx = this.queueRecords.findIndex(r => r.type === "event")
      if (idx >= 0) {
        this.queue.splice(idx, 1)
        this.queueRecords.splice(idx, 1)
        this.droppedCount++
        continue
      }
      // No more events — drop oldest messages/stats (but keep at least 1)
      if (this.queue.length > 1) {
        this.queue.shift()
        this.queueRecords.shift()
        this.droppedCount++
      } else {
        break
      }
    }
  }

  getDroppedCount(): number {
    return this.droppedCount
  }

  private async flushSoon(): Promise<void> {
    if (this.flushing) return
    this.flushing = true
    try {
      if (this.initPromise) {
        await this.initPromise.catch(() => {}) // wait for init to finish (or fail)
      }
      while (this.queue.length > 0) {
        const chunk = this.queue.splice(0, 50).join("")
        this.queueRecords.splice(0, 50)
        await appendFile(this.path, chunk, "utf-8")
      }
    } catch {
      // best-effort: swallow write errors silently
    } finally {
      this.flushing = false
      if (this.queue.length > 0) {
        this.flushSoon().catch(() => {})
      }
    }
  }
}
