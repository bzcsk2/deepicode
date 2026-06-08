import { describe, test, expect } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ECC_DIR = resolve(process.cwd(), "..", "ECC")

describe("Content Pack Hooks (unit)", () => {
  test("ECC hooks/hooks.json exists and is valid JSON", () => {
    const hooksPath = resolve(ECC_DIR, "hooks", "hooks.json")
    const raw = readFileSync(hooksPath, "utf8")
    const data = JSON.parse(raw)
    expect(typeof data).toBe("object")
    expect(data).not.toBeNull()
  })

  test("ECC hooks manifest has expected phases", () => {
    const hooksPath = resolve(ECC_DIR, "hooks", "hooks.json")
    const raw = readFileSync(hooksPath, "utf8")
    const data = JSON.parse(raw)
    // Should have at least one phase
    const phases = Object.keys(data)
    expect(phases.length).toBeGreaterThan(0)
  })

  test("ECC hooks each phase has hook entries", () => {
    const hooksPath = resolve(ECC_DIR, "hooks", "hooks.json")
    const raw = readFileSync(hooksPath, "utf8")
    const data = JSON.parse(raw)
    for (const [phase, entries] of Object.entries(data)) {
      if (Array.isArray(entries)) {
        for (const entry of entries as any[]) {
          if (entry && typeof entry === "object") {
            expect(entry.matcher || entry.type).toBeDefined()
          }
        }
      }
    }
  })
})
