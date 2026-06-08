import { describe, test, expect } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ECC_DIR = resolve(process.cwd(), "..", "ECC")

describe("Content Pack MCP (unit)", () => {
  test("ECC has .codex-plugin/plugin.json with mcpServers", () => {
    const pluginPath = resolve(ECC_DIR, ".codex-plugin", "plugin.json")
    const raw = readFileSync(pluginPath, "utf8")
    const data = JSON.parse(raw)
    // ECC plugin.json should have mcpServers
    expect(data.mcpServers).toBeDefined()
  })

  test("ECC mcpServers is a path pointing to .mcp.json", () => {
    const pluginPath = resolve(ECC_DIR, ".codex-plugin", "plugin.json")
    const raw = readFileSync(pluginPath, "utf8")
    const data = JSON.parse(raw)
    expect(typeof data.mcpServers).toBe("string")
    expect(data.mcpServers).toContain(".mcp.json")
  })

  test("ECC .mcp.json exists and has mcpServers", () => {
    const mcpPath = resolve(ECC_DIR, ".mcp.json")
    const raw = readFileSync(mcpPath, "utf8")
    const data = JSON.parse(raw)
    expect(data.mcpServers).toBeDefined()
  })
})
