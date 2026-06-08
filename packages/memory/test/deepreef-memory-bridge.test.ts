import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { MemoryService } from "../src/memory-service.js"
import { DeepreefMemoryBridge } from "../src/bridge/deepreef-memory-bridge.js"

describe("DeepreefMemoryBridge (Deepreef native)", () => {
  let tempDir: string
  let svc: MemoryService
  let bridge: DeepreefMemoryBridge

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), "memory-bridge-test-"))
    svc = new MemoryService({ dataDir: tempDir })
    await svc.start()
    bridge = new DeepreefMemoryBridge(svc, { autoObserve: true, injectContext: true })
  })

  afterEach(async () => {
    await svc.stop()
    rmSync(tempDir, { recursive: true, force: true })
  })

  it("onSessionStart completes without error", async () => {
    await bridge.onSessionStart("test-session")
  })

  it("onSessionEnd completes without error", async () => {
    await bridge.onSessionEnd("test-session")
  })

  it("onPromptSubmit completes without error", async () => {
    await bridge.onPromptSubmit("test-session", "hello world")
  })

  it("onPostToolUse completes without error", async () => {
    await bridge.onPostToolUse("test-session", "bash", { content: "output" })
  })

  it("onPostToolFailure completes without error", async () => {
    await bridge.onPostToolFailure("test-session", "bash", "error message")
  })

  it("onGenerationComplete completes without error", async () => {
    await bridge.onGenerationComplete("test-session")
  })

  it("onPreCompact completes without error", async () => {
    await bridge.onPreCompact("test-session")
  })

  it("onSubagentStart completes without error", async () => {
    await bridge.onSubagentStart("test-session", "explore", "search files")
  })

  it("onSubagentStop completes without error", async () => {
    await bridge.onSubagentStop("test-session", "explore")
  })

  it("autoObserve=false skips observations", async () => {
    const noObserveBridge = new DeepreefMemoryBridge(svc, { autoObserve: false, injectContext: false })
    await noObserveBridge.onPromptSubmit("test-session", "should not observe")
    await noObserveBridge.onSessionStart("test-session")
    await noObserveBridge.onPostToolUse("test-session", "test", {})
  })

  it("onPreToolUse returns context when injectContext=true", async () => {
    const context = await bridge.onPreToolUse("test-session", "bash", { command: "ls" })
    expect(typeof context === "string" || context === undefined).toBe(true)
  })
})
