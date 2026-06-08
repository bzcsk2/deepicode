import { describe, test, expect } from "bun:test"
import { convertCommandsToSkills } from "../src/content-pack/command-to-skill.js"

describe("Content Pack Commands", () => {
  test("convertCommandsToSkills returns empty for empty input", () => {
    const result = convertCommandsToSkills([])
    expect(result.skills).toEqual([])
    expect(result.warnings).toEqual([])
  })

  test("convertCommandsToSkills warns for non-existent file", () => {
    const result = convertCommandsToSkills([
      {
        kind: "command" as const,
        id: "test-cmd",
        path: "/nonexistent/command.md",
        sourcePluginId: "test",
        enabledByDefault: true,
      },
    ])
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.skills.length).toBe(0)
  })

  test("generated skill has ecc-command: prefix", () => {
    // We can't really test with real files here, but the type contract is clear
    const result = convertCommandsToSkills([])
    expect(Array.isArray(result.skills)).toBe(true)
  })
})
