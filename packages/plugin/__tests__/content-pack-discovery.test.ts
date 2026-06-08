import { describe, test, expect } from "bun:test"
import { findManifest, isDirectory } from "../src/content-pack/discovery.js"
import { resolve } from "node:path"

const ECC_DIR = resolve(process.cwd(), "..", "ECC")

describe("Content Pack Discovery", () => {
  test("findManifest discovers .codex-plugin/plugin.json for ECC", () => {
    const { manifestPath, sourceKind } = findManifest(ECC_DIR)
    expect(manifestPath).toBeDefined()
    expect(sourceKind).toBe("codex")
    expect(manifestPath).toContain(".codex-plugin")
  })

  test("isDirectory returns true for ECC dir", () => {
    expect(isDirectory(ECC_DIR)).toBe(true)
  })

  test("isDirectory returns false for non-directory", () => {
    expect(isDirectory("/nonexistent/path/12345")).toBe(false)
  })

  test("findManifest returns empty for non-existent path", () => {
    const { manifestPath, sourceKind } = findManifest("/nonexistent/path")
    expect(manifestPath).toBeUndefined()
    expect(sourceKind).toBeUndefined()
  })
})
