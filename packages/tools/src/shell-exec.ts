import { spawn } from "node:child_process"
import * as os from "node:os"
import { resolve } from "node:path"
import type { AgentTool, ToolProgressUpdate } from "@deepicode/core"
import { safeStringify, hasBinaryEncoding } from "./safe-stringify.js"
import { isSensitive } from "./sensitive.js"

const DENY_PATTERNS = [
  /\brm\s+(?:-[A-Za-z]*r[A-Za-z]*\s+.*\/\*|.*-[A-Za-z]*r[A-Za-z]*\s+\/)/,
  /\bsudo\b/,
  /\bmkfs\b/,
  /\bdd\s+if=/,
  /\bchmod\s+-R\s+777\s+\//,
  /\bdd\b/,
  /\bfdisk\b/,
  /\bmkfs\.\w+\b/,
  /\bgit\s+push\b/,
  /\bgit\s+commit\b/,
]

function isDenied(command: string): string | null {
  for (const p of DENY_PATTERNS) {
    if (p.test(command.trim())) return p.source
  }
  return null
}

export function createBashTool(): AgentTool {
  return {
    name: "bash",
    description: "Run a shell command (bash). Returns stdout+stderr (truncated).",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute." },
        cwd: { type: "string", description: "Working directory (optional)." },
        timeout_ms: { type: "number", description: "Timeout in milliseconds." },
        max_chars: { type: "number", description: "Max chars for combined output." },
      },
      required: ["command"],
    },
    concurrency: "exclusive",
    approval: "exec",
    async execute(args, ctx) {
      if (typeof args.command !== "string" || !args.command.trim()) {
        return { content: safeStringify({ error: "command is required" }), isError: true }
      }
      const command = args.command.trim()
      const denied = isDenied(command)
      if (denied) {
        return { content: safeStringify({ error: `Command denied: matches dangerous pattern /${denied}/` }), isError: true }
      }
      const pathRe = /\b([\w./-]*(?:\.\w{1,10}))\b|\b([\w./-]*\/?\.[\w.-]+)\b|\b([\w./-]*(?:id_rsa|id_ed25519|credentials\.json|service-account\.json|token\.json))\b/g
      let pathMatch: RegExpExecArray | null
      while ((pathMatch = pathRe.exec(command)) !== null) {
        const fp = pathMatch[1] || pathMatch[2] || pathMatch[3]
        if (fp && isSensitive(fp)) {
          return { content: safeStringify({ error: `Command references sensitive file: ${fp}` }), isError: true }
        }
      }
      const cwd = typeof args.cwd === "string" ? resolve(ctx.cwd, args.cwd) : ctx.cwd
      const timeoutMs = typeof args.timeout_ms === "number" ? Math.max(0, Math.floor(args.timeout_ms)) : 30_000
      const maxChars = typeof args.max_chars === "number" ? Math.max(0, Math.floor(args.max_chars)) : 200_000

      const out = await runBash(command, cwd, timeoutMs, maxChars, ctx.signal, ctx.reportProgress)
      if (hasBinaryEncoding(out.stdout) || hasBinaryEncoding(out.stderr)) {
        ;(out as any).encoding_warning = "output contains non-UTF-8 binary data"
      }
      return { content: safeStringify(out), isError: out.exitCode !== 0, metadata: { exitCode: out.exitCode } }
    },
  }
}

interface BoundedBuffer {
  text: string
  max: number
  dropped: number
}

function pushBounded(buf: BoundedBuffer, chunk: string): void {
  buf.text += chunk
  if (buf.text.length > buf.max * 2) {
    const excess = buf.text.length - buf.max
    buf.text = buf.text.slice(excess)
    buf.dropped += excess
  }
}

function finalizeBounded(buf: BoundedBuffer): { text: string; dropped: number } {
  if (buf.dropped > 0) {
    return {
      text: buf.text.slice(-buf.max) + `\n... [dropped ${buf.dropped} earlier chars]`,
      dropped: buf.dropped,
    }
  }
  if (buf.text.length > buf.max) {
    return {
      text: buf.text.slice(-buf.max) + `\n... [truncated: ${buf.text.length - buf.max} more chars]`,
      dropped: buf.text.length - buf.max,
    }
  }
  return { text: buf.text, dropped: 0 }
}

// Rate-limiter: only emit progress if content changed significantly or 200ms elapsed
function createProgressThrottle(report?: (update: ToolProgressUpdate) => void): (update: ToolProgressUpdate) => void {
  if (!report) return () => {}
  let lastContent = ""
  let lastTs = 0
  const MIN_INTERVAL = 200
  return (update) => {
    const now = Date.now()
    // Always emit if content changed and enough time elapsed
    if (update.content !== lastContent && now - lastTs >= MIN_INTERVAL) {
      lastContent = update.content
      lastTs = now
      report(update)
    }
  }
}

async function runBash(command: string, cwd: string, timeoutMs: number, maxChars: number, signal?: AbortSignal, reportProgress?: (update: ToolProgressUpdate) => void): Promise<{
  command: string
  cwd: string
  stdout: string
  stderr: string
  exitCode: number
  timedOut: boolean
}> {
  return await new Promise((resolve, reject) => {
    const isWindows = os.platform() === "win32"
    const child = spawn("bash", ["-c", command], {
      cwd, detached: !isWindows,
      env: { ...process.env, GIT_EDITOR: "true", GIT_SEQUENCE_EDITOR: "true", EDITOR: "true" },
    })

    const stdoutBuf: BoundedBuffer = { text: "", max: maxChars, dropped: 0 }
    const stderrBuf: BoundedBuffer = { text: "", max: maxChars, dropped: 0 }
    let timedOut = false
    let done = false
    let sigtermTimer: ReturnType<typeof setTimeout> | null = null

    const report = createProgressThrottle(reportProgress)

    const killChild = (graceful = false) => {
      try {
        if (graceful) {
          if (!isWindows && child.pid) {
            process.kill(-child.pid, "SIGTERM")
          } else {
            child.kill("SIGTERM")
          }
          sigtermTimer = setTimeout(() => {
            try {
              if (!isWindows && child.pid) {
                process.kill(-child.pid, "SIGKILL")
              } else {
                child.kill("SIGKILL")
              }
            } catch {
              child.kill("SIGKILL")
            }
          }, 5000)
          return
        }
        if (!isWindows && child.pid) {
          process.kill(-child.pid, "SIGKILL")
        } else {
          child.kill("SIGKILL")
        }
      } catch {
        child.kill("SIGKILL")
      }
    }

    const cleanup = () => {
      if (sigtermTimer) {
        clearTimeout(sigtermTimer)
        sigtermTimer = null
      }
      if (signal) {
        signal.removeEventListener("abort", onAbort)
      }
    }

    const onAbort = () => {
      clearTimeout(timer)
      cleanup()
      killChild()
      finish(130)
    }

    const finish = (exitCode: number) => {
      if (done) return
      done = true
      cleanup()
      const stdoutFinal = finalizeBounded(stdoutBuf)
      const stderrFinal = finalizeBounded(stderrBuf)
      resolve({
        command,
        cwd,
        stdout: stdoutFinal.text,
        stderr: stderrFinal.text,
        exitCode,
        timedOut,
      })
    }

    const timer = setTimeout(() => {
      timedOut = true
      killChild(true)
      finish(124)
    }, timeoutMs)

    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer)
        cleanup()
        killChild()
        finish(130)
        return
      }
      signal.addEventListener("abort", onAbort, { once: true })
    }

    child.stdout.on("data", (b) => {
      const chunk = String(b)
      pushBounded(stdoutBuf, chunk)
      report({ content: `stdout: ${chunk.slice(-200)}` })
    })
    child.stderr.on("data", (b) => {
      const chunk = String(b)
      pushBounded(stderrBuf, chunk)
      report({ content: `stderr: ${chunk.slice(-200)}` })
    })
    child.on("error", (e) => {
      clearTimeout(timer)
      cleanup()
      reject(e) // spawn error — reject, not resolve
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      finish(code ?? 0)
    })
  })
}
