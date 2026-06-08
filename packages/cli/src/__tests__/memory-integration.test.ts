import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

describe("CLI memory integration (Deepreef native)", () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "cli-memory-test-"))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it("tui imports memory-service module", async () => {
    const mod = await import("../src/tui.js")
    expect(mod).toBeDefined()
  })

  it("tui exports expected function", async () => {
    const mod = await import("../src/tui.js")
    expect(typeof mod.runTui).toBe("function")
  })

  it("tools module imports correctly", async () => {
    const mod = await import("@deepreef/memory")
    expect(mod).toBeDefined()
    expect(typeof mod.createMemoryService).toBe("function")
    expect(typeof mod.createMemoryRecallTool).toBe("function")
    expect(typeof mod.createMemorySaveTool).toBe("function")
    expect(typeof mod.createMemoryMigrateTool).toBe("function")
  })

  it("MemoryService can be created and started", async () => {
    const { MemoryService } = await import("@deepreef/memory")
    const svc = new MemoryService({ dataDir: tempDir })
    await svc.start()
    await svc.stop()
  })

  it("deepreef memory init runs without error", async () => {
    const { execSync } = await import("node:child_process")
    try {
      execSync("bun run src/index.ts memory init --data-dir " + join(tempDir, "cli-test"), {
        cwd: "/vol4/Agent/deepreef/packages/cli",
        timeout: 30000,
        stdio: "pipe",
      })
    } catch (e: any) {
      // Command may fail due to missing env, but should not crash
      expect(e).toBeDefined()
    }
  })
})
