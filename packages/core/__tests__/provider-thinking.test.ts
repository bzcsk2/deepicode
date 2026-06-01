import { describe, it, expect } from "vitest"
import { createDeepSeekCapabilities } from "../src/provider-thinking.js"
import type { ThinkingMode } from "../src/provider-thinking.js"

describe("AS1: Provider thinking capabilities", () => {
  const caps = createDeepSeekCapabilities()

  it("declares all five thinking modes", () => {
    expect(caps.supportedModes).toEqual(["off", "low", "medium", "high", "max"])
  })

  it("mapMode('off') disables thinking", () => {
    const result = caps.mapMode("off")
    expect(result).toEqual({ thinking: { type: "disabled" } })
  })

  it("mapMode('high') enables thinking with high effort", () => {
    const result = caps.mapMode("high")
    expect(result).toEqual({ thinking: { type: "enabled" }, reasoningEffort: "high" })
  })

  it("mapMode('max') enables thinking with max effort", () => {
    const result = caps.mapMode("max")
    expect(result).toEqual({ thinking: { type: "enabled" }, reasoningEffort: "max" })
  })

  it("mapMode('low') enables thinking with low effort", () => {
    const result = caps.mapMode("low")
    expect(result).toEqual({ thinking: { type: "enabled" }, reasoningEffort: "low" })
  })

  it("mapMode('medium') enables thinking with medium effort", () => {
    const result = caps.mapMode("medium")
    expect(result).toEqual({ thinking: { type: "enabled" }, reasoningEffort: "medium" })
  })

  it("all supported modes return non-null mappings", () => {
    for (const mode of caps.supportedModes) {
      const result = caps.mapMode(mode)
      expect(result).not.toBeNull()
    }
  })
})
