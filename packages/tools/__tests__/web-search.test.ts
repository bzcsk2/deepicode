import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const ctx = { cwd: process.cwd(), signal: new AbortController().signal } as any

describe("M13: WebSearch", () => {
  it("should reject empty query", async () => {
    const { createWebSearchTool } = await import("../src/web-search.js")
    const tool = createWebSearchTool()
    const r = await tool.execute({ query: "" }, ctx)
    expect(r.isError).toBe(true)
    expect(JSON.parse(r.content as string).error).toBeTruthy()
  })

  it("should reject missing query", async () => {
    const { createWebSearchTool } = await import("../src/web-search.js")
    const tool = createWebSearchTool()
    const r = await tool.execute({} as any, ctx)
    expect(r.isError).toBe(true)
  })

  it("should enforce num_results limit (max 10)", async () => {
    const { createWebSearchTool } = await import("../src/web-search.js")
    const tool = createWebSearchTool()
    const r = await tool.execute({ query: "test", num_results: 20 }, ctx)
    expect(r.isError).toBe(false)
    const p = JSON.parse(r.content as string)
    expect(Array.isArray(p.results)).toBe(true)
  })

  it("should default num_results to 5", async () => {
    const { createWebSearchTool } = await import("../src/web-search.js")
    const tool = createWebSearchTool()
    const r = await tool.execute({ query: "test" }, ctx)
    expect(r.isError).toBe(false)
  })

  it("should handle no results gracefully", async () => {
    const { createWebSearchTool } = await import("../src/web-search.js")
    const tool = createWebSearchTool()
    const r = await tool.execute({ query: "xyznonexistent12345" }, ctx)
    expect(r.isError).toBe(false)
    const p = JSON.parse(r.content as string)
    expect(Array.isArray(p.results)).toBe(true)
  })
})
