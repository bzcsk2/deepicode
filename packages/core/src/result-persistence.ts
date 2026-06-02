/**
 * P4: Result Overflow Persistence
 *
 * When tool results exceed a size threshold, the full content is written to
 * a file under `.deepicode/results/<sessionId>/` and the context receives
 * only a preview with metadata pointing to the persisted file.
 *
 * AUD-02: Per-session quota accounting, preview fallback, file cleanup.
 */

import { mkdir, writeFile, readdir, rm, stat } from "node:fs/promises"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import { noopRuntimeLogger, type RuntimeLogger } from "./runtime-logger.js"

const DEFAULT_MAX_RESULT_CHARS = 200_000
const DEFAULT_PREVIEW_CHARS = 2_000
const DEFAULT_SESSION_QUOTA_BYTES = 50 * 1024 * 1024 // 50 MiB
const DEFAULT_MAX_FILES_PER_SESSION = 200

export interface ResultPersistenceConfig {
  maxResultSizeChars?: number
  previewChars?: number
  sessionQuotaBytes?: number
  maxFilesPerSession?: number
}

export interface PersistedResult {
  /** The preview text to use in context */
  preview: string
  /** Path to the full persisted file */
  persistedPath: string
  /** Original content size in chars */
  originalChars: number
  /** Preview size in chars */
  previewChars: number
}

/** Per-session byte usage tracker (in-memory, resets on restart) */
const sessionByteUsage = new Map<string, number>()

/**
 * Check if a tool result needs persistence and optionally persist it.
 * Returns the original result if under threshold, or a modified result
 * with preview + metadata if over threshold.
 *
 * Write failures fall back to truncated preview with a warning — never blocks main flow.
 */
export async function maybePersistResult(
  content: string,
  sessionId: string,
  toolName: string,
  config?: ResultPersistenceConfig,
  logger: RuntimeLogger = noopRuntimeLogger,
): Promise<{ content: string; persisted?: PersistedResult; warning?: string }> {
  const maxChars = config?.maxResultSizeChars ?? DEFAULT_MAX_RESULT_CHARS
  if (content.length <= maxChars) {
    return { content }
  }

  const previewLen = config?.previewChars ?? DEFAULT_PREVIEW_CHARS
  const preview = content.slice(0, previewLen)

  if (logger.isEnabled("info")) {
    logger.info("tool.result.overflow", { toolName, originalChars: content.length, previewChars: previewLen })
  }

  // AUD-02: Check session quota before persisting
  const quota = config?.sessionQuotaBytes ?? DEFAULT_SESSION_QUOTA_BYTES
  const contentBytes = Buffer.byteLength(content, "utf-8")
  const used = sessionByteUsage.get(sessionId) ?? 0

  if (used + contentBytes > quota) {
    if (logger.isEnabled("warn")) {
      logger.warn("tool.result.quota_exceeded", {
        toolName,
        sessionId,
        used,
        quota,
        required: contentBytes,
      })
    }
    return {
      content: preview,
      warning: `Session result quota exceeded (${used}/${quota} bytes). Result truncated to preview.`,
    }
  }

  try {
    const dir = join(process.cwd(), ".deepicode", "results", sanitizeId(sessionId))
    await mkdir(dir, { recursive: true, mode: 0o700 })

    const filename = `${sanitizeId(toolName)}-${randomUUID()}.txt`
    const filePath = join(dir, filename)
    await writeFile(filePath, content, { mode: 0o600 })

    // AUD-02: Track byte usage
    sessionByteUsage.set(sessionId, used + contentBytes)

    const persisted: PersistedResult = {
      preview,
      persistedPath: filePath,
      originalChars: content.length,
      previewChars: previewLen,
    }

    if (logger.isEnabled("info")) {
      logger.info("tool.result.persisted", { toolName, persistedPath: filePath, originalChars: content.length })
    }

    // AUD-02: Cleanup old files if exceeding max count
    const maxFiles = config?.maxFilesPerSession ?? DEFAULT_MAX_FILES_PER_SESSION
    cleanupOldFiles(dir, maxFiles, logger).catch(() => {})

    return {
      content: preview,
      persisted,
    }
  } catch (e) {
    const warning = `Result persistence failed: ${e instanceof Error ? e.message : String(e)}`
    if (logger.isEnabled("warn")) {
      logger.warn("tool.result.persist_error", { toolName, error: e instanceof Error ? e.message : String(e) })
    }
    return {
      content: preview,
      warning,
    }
  }
}

async function cleanupOldFiles(dir: string, maxFiles: number, logger: RuntimeLogger): Promise<void> {
  let files: string[]
  try {
    files = await readdir(dir)
  } catch {
    return
  }

  if (files.length <= maxFiles) return

  const entries = await Promise.all(
    files.map(async (name) => {
      const fullPath = join(dir, name)
      try {
        const s = await stat(fullPath)
        return { name, mtimeMs: s.mtimeMs, size: s.size }
      } catch {
        return null
      }
    }),
  )

  const valid = entries.filter((e): e is NonNullable<typeof e> => e !== null)
  valid.sort((a, b) => b.mtimeMs - a.mtimeMs) // newest first

  const toRemove = valid.slice(maxFiles)
  for (const entry of toRemove) {
    try {
      await rm(join(dir, entry.name))
      if (logger.isEnabled("debug")) {
        logger.debug("tool.result.cleanup", { removed: entry.name })
      }
    } catch {
      // best-effort
    }
  }
}

/**
 * Reset session byte usage (for testing).
 */
export function resetSessionByteUsage(sessionId?: string): void {
  if (sessionId) {
    sessionByteUsage.delete(sessionId)
  } else {
    sessionByteUsage.clear()
  }
}

/**
 * Get current byte usage for a session (for testing).
 */
export function getSessionByteUsage(sessionId: string): number {
  return sessionByteUsage.get(sessionId) ?? 0
}

/**
 * Sanitize an ID for use in file paths. Replaces non-alphanumeric chars
 * with hyphens, prevents path traversal.
 */
function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64)
}

export { DEFAULT_MAX_RESULT_CHARS, DEFAULT_PREVIEW_CHARS, DEFAULT_SESSION_QUOTA_BYTES }
