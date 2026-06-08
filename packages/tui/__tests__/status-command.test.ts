import { describe, it, expect } from "vitest"
import { parseSlashCommand, buildHelpText } from "../src/commands.js"
import { formatStatus, formatStatusCodex, formatStatusAscii, formatStatusCompact } from "../src/status/format.js"
import type { EngineStatusSnapshot } from "@deepreef/core"

describe("Slash Command /status", () => {
  it("parseSlashCommand recognizes /status", () => {
    const result = parseSlashCommand("/status")
    expect(result).toEqual({ name: "status" })
  })

  it("parseSlashCommand recognizes /status with whitespace", () => {
    const result = parseSlashCommand("  /status  ")
    expect(result).toEqual({ name: "status" })
  })

  it("buildHelpText includes /status", () => {
    const helpText = buildHelpText("build", {
      cmdExit: "Exit the program",
      cmdHelp: "Show this help",
      cmdModel: "Switch model",
      cmdSessions: "List sessions",
      cmdAgent: "Switch agent",
      cmdSkill: "List skills",
      cmdLang: "Switch language",
      cmdStatus: "Show status",
    })
    expect(helpText).toContain("/status")
    expect(helpText).toContain("Show status")
  })
})

describe("Status Format", () => {
  const mockSnapshot: EngineStatusSnapshot = {
    sessionId: "test-session-12345678901234567890",
    context: {
      prefixTokens: 1000,
      logTokens: 2000,
      scratchTokens: 500,
      totalTokens: 3500,
      window: 128000,
      ratio: 0.027,
    },
    stats: {
      promptTokens: 1000,
      completionTokens: 500,
      cacheHitTokens: 800,
      cacheMissTokens: 200,
      apiCalls: 5,
      toolCalls: 3,
      totalCost: 0.0123,
    },
    currentAgent: "build",
    isSubmitting: false,
    timestamp: "2026-06-03T12:00:00.000Z",
  }

  it("formatStatusCodex returns Codex style box", () => {
    const result = formatStatusCodex(mockSnapshot)
    expect(result).toContain("┌")
    expect(result).toContain("┐")
    expect(result).toContain("└")
    expect(result).toContain("┘")
    expect(result).toContain("STATUS")
    expect(result).toContain("Session:")
    expect(result).toContain("Agent:")
    expect(result).toContain("CONTEXT")
    expect(result).toContain("Window:")
    expect(result).toContain("STATS")
    expect(result).toContain("API Calls:")
    expect(result).toContain("Tool Calls:")
    expect(result).toContain("Cost:")
  })

  it("formatStatusAscii returns ASCII box", () => {
    const result = formatStatusAscii(mockSnapshot)
    expect(result).toContain("+")
    expect(result).toContain("-")
    expect(result).toContain("|")
    expect(result).not.toContain("┌")
    expect(result).not.toContain("┐")
    expect(result).not.toContain("└")
    expect(result).not.toContain("┘")
  })

  it("formatStatusCompact returns compact string", () => {
    const result = formatStatusCompact(mockSnapshot)
    expect(result).toContain("Session: test-ses")
    expect(result).toContain("Agent: build")
    expect(result).toContain("Tokens: 3.5K")
    expect(result).toContain("Cost: $0.012")
  })

  it("formatStatus shows submitting state", () => {
    const submittingSnapshot = { ...mockSnapshot, isSubmitting: true }
    const result = formatStatusCodex(submittingSnapshot)
    expect(result).toContain("Yes")
  })

  it("formatStatus with custom width", () => {
    const result = formatStatusCodex(mockSnapshot, { width: 60 })
    expect(result).toContain("STATUS")
    const lines = result.split("\n")
    expect(lines[0].length).toBe(60)
  })

  it("formatStatus formats tokens correctly", () => {
    const result = formatStatusCodex(mockSnapshot)
    expect(result).toContain("3.5K")
    expect(result).toContain("128.0K")
  })

  it("formatStatus formats cost correctly", () => {
    const result = formatStatusCodex(mockSnapshot)
    expect(result).toContain("$0.012")
  })

  it("formatStatus calculates cache rate correctly", () => {
    const result = formatStatusCodex(mockSnapshot)
    expect(result).toContain("80.0% hit rate")
  })

  it("snapshot fixture generates stable output", () => {
    const result1 = formatStatusCodex(mockSnapshot)
    const result2 = formatStatusCodex(mockSnapshot)
    expect(result1).toBe(result2)
  })

  it("width 80 contains all core fields", () => {
    const result = formatStatusCodex(mockSnapshot, { width: 80 })
    expect(result).toContain("STATUS")
    expect(result).toContain("Session:")
    expect(result).toContain("Agent:")
    expect(result).toContain("Submitting:")
    expect(result).toContain("CONTEXT")
    expect(result).toContain("Window:")
    expect(result).toContain("Cache:")
    expect(result).toContain("STATS")
    expect(result).toContain("API Calls:")
    expect(result).toContain("Tool Calls:")
    expect(result).toContain("Cost:")
  })

  it("narrow width truncates long path", () => {
    const result = formatStatusCodex(mockSnapshot, { width: 40 })
    expect(result).toContain("...")
  })

  it("ASCII fallback no Unicode box drawing", () => {
    const result = formatStatusAscii(mockSnapshot)
    expect(result).not.toMatch(/[┌┐└┘├┤┬┴┼─│]/)
  })

  it("context window uses left% (used / total) format", () => {
    const result = formatStatusCodex(mockSnapshot)
    expect(result).toMatch(/Window:\s+\d+\.\d+% left \(\d+\.?\d*K? \/ \d+\.?\d*K?\)/)
  })
})
