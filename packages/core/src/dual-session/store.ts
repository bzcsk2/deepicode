import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve, join } from "node:path"
import type { DualSessionSnapshot, SessionCheckpoint } from "./types.js"
import { SESSION_VERSION } from "./types.js"
import { DualSession } from "./session.js"

const SESSION_DIR = ".deepreef/sessions"
const DUAL_SESSION_FILE = "dual-session.json"

export interface SessionStoreOptions {
  sessionDir?: string
}

export class DualSessionStore {
  private sessionDir: string

  constructor(options: SessionStoreOptions = {}) {
    this.sessionDir = options.sessionDir ?? SESSION_DIR
  }

  private getSessionPath(sessionId: string): string {
    return join(this.sessionDir, sessionId, DUAL_SESSION_FILE)
  }

  save(session: DualSession): boolean {
    try {
      const sessionId = session.getSessionId()
      const dir = join(this.sessionDir, sessionId)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      const checkpoint = session.toCheckpoint()
      writeFileSync(this.getSessionPath(sessionId), JSON.stringify(checkpoint, null, 2), "utf8")
      return true
    } catch (error) {
      console.error("[dual-session] Failed to save session:", error)
      return false
    }
  }

  load(sessionId: string): DualSession | null {
    try {
      const path = this.getSessionPath(sessionId)
      if (!existsSync(path)) {
        return null
      }

      const raw = readFileSync(path, "utf8")
      const checkpoint = JSON.parse(raw) as SessionCheckpoint

      if (checkpoint.version !== SESSION_VERSION) {
        console.error(`[dual-session] Unsupported session version: ${checkpoint.version}`)
        return null
      }

      return DualSession.fromCheckpoint(checkpoint)
    } catch (error) {
      console.error("[dual-session] Failed to load session:", error)
      return null
    }
  }

  exists(sessionId: string): boolean {
    try {
      return existsSync(this.getSessionPath(sessionId))
    } catch {
      return false
    }
  }

  delete(sessionId: string): boolean {
    try {
      const dir = join(this.sessionDir, sessionId)
      if (existsSync(dir)) {
        const { rmSync } = require("node:fs")
        rmSync(dir, { recursive: true, force: true })
      }
      return true
    } catch (error) {
      console.error("[dual-session] Failed to delete session:", error)
      return false
    }
  }

  list(): string[] {
    try {
      if (!existsSync(this.sessionDir)) {
        return []
      }

      const { readdirSync } = require("node:fs")
      const entries = readdirSync(this.sessionDir, { withFileTypes: true })
      return entries
        .filter((entry: any) => entry.isDirectory())
        .map((entry: any) => entry.name)
    } catch (error) {
      console.error("[dual-session] Failed to list sessions:", error)
      return []
    }
  }
}
