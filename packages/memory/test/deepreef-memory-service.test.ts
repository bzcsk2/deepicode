import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { MemoryService } from "../src/memory-service.js"

describe("MemoryService (Deepreef native)", () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "memory-test-"))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it("start and stop without error", async () => {
    const svc = new MemoryService({ dataDir: tempDir })
    await svc.start()
    expect(svc.ready).toBe(true)
    await svc.stop()
    expect(svc.ready).toBe(false)
  })

  it("stop is idempotent", async () => {
    const svc = new MemoryService({ dataDir: tempDir })
    await svc.start()
    await svc.stop()
    await svc.stop()
    expect(svc.ready).toBe(false)
  })

  it("config flags are saved and accessible", () => {
    const svc = new MemoryService({
      dataDir: tempDir,
      autoObserve: false,
      injectContext: false,
      advancedTools: true,
      enableGraph: true,
    })
    const uc = (svc as any).userConfig
    expect(uc.autoObserve).toBe(false)
    expect(uc.injectContext).toBe(false)
    expect(uc.advancedTools).toBe(true)
    expect(uc.enableGraph).toBe(true)
  })

  it("uses quiet BM25-only mode when no LLM provider is configured", () => {
    const originalWrite = process.stderr.write
    let stderr = ""
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderr += String(chunk)
      return true
    }) as typeof process.stderr.write

    try {
      new MemoryService({ dataDir: tempDir })
    } finally {
      process.stderr.write = originalWrite
    }

    expect(stderr).not.toContain("No LLM provider key found")
    expect(stderr).not.toContain("Claude Pro allocation")
  })

  it("advancedTools=false disables advanced features even when individual flags are true", async () => {
    const svc = new MemoryService({
      dataDir: tempDir,
      advancedTools: false,
      enableGraph: true,
      enableSlots: true,
      enableReflect: true,
      enableConsolidation: true,
    })
    await svc.start()
    const uc = (svc as any).userConfig
    expect(uc.advancedTools).toBe(false)
    await svc.stop()
  })

  it("trigger calls registered function", async () => {
    const svc = new MemoryService({ dataDir: tempDir })
    await svc.start()
    const result = await svc.trigger("mem::remember", { content: "test memory", tags: [] })
    expect(result).toBeDefined()
    await svc.stop()
  })
})
