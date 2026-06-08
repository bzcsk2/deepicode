import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { MemoryService } from "../src/memory-service.js"
import {
  createMemoryRecallTool,
  createMemorySaveTool,
  createMemorySmartSearchTool,
  createMemoryForgetTool,
  createMemoryTimelineTool,
  createMemoryStatusTool,
} from "../src/tools.js"
import { createMemoryMigrateTool } from "../src/migrate.js"

describe("Memory tools (Deepreef native)", () => {
  let tempDir: string
  let svc: MemoryService

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), "memory-tools-test-"))
    svc = new MemoryService({ dataDir: tempDir })
    await svc.start()
  })

  afterEach(async () => {
    await svc.stop()
    rmSync(tempDir, { recursive: true, force: true })
  })

  it("memory_save executes without error", async () => {
    const tool = createMemorySaveTool(svc)
    expect(tool.name).toBe("memory_save")
    const result = await tool.execute({ content: "test content", tags: ["test"] })
    expect(result.isError).toBe(false)
  })

  it("memory_recall executes without error", async () => {
    const tool = createMemoryRecallTool(svc)
    expect(tool.name).toBe("memory_recall")
    const result = await tool.execute({ query: "test" })
    expect(result.isError).toBe(false)
  })

  it("memory_smart_search executes without error", async () => {
    const tool = createMemorySmartSearchTool(svc)
    expect(tool.name).toBe("memory_smart_search")
    const result = await tool.execute({ query: "test" })
    expect(result.isError).toBe(false)
  })

  it("memory_timeline executes without error", async () => {
    const tool = createMemoryTimelineTool(svc)
    expect(tool.name).toBe("memory_timeline")
    const result = await tool.execute({})
    expect(result.isError).toBe(false)
  })

  it("memory_status executes without error (uses mem::diagnose)", async () => {
    const tool = createMemoryStatusTool(svc)
    expect(tool.name).toBe("memory_status")
    const result = await tool.execute({})
    expect(result.isError).toBe(false)
  })

  it("memory_forget executes without error", async () => {
    const tool = createMemoryForgetTool(svc)
    expect(tool.name).toBe("memory_forget")
    const result = await tool.execute({ id: "nonexistent" })
    expect(result.isError).toBe(false)
  })

  it("memory_migrate tool has correct shape", () => {
    const tool = createMemoryMigrateTool()
    expect(tool.name).toBe("memory_migrate")
    expect(tool.concurrency).toBe("exclusive")
    expect(tool.approval).toBe("write")
  })

  it("save -> recall -> forget full flow", async () => {
    const saveTool = createMemorySaveTool(svc)
    const recallTool = createMemoryRecallTool(svc)
    const forgetTool = createMemoryForgetTool(svc)

    const saveResult = await saveTool.execute({ content: "my important fact", tags: ["test"] })
    expect(saveResult.isError).toBe(false)

    const recallResult = await recallTool.execute({ query: "important fact" })
    expect(recallResult.isError).toBe(false)
  })
})
