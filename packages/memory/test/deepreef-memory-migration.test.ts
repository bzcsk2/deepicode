import { describe, it, expect } from "bun:test"
import { createMemoryMigrateTool } from "../src/migrate.js"

describe("Memory migration (Deepreef native)", () => {
  it("migrate tool has correct shape", () => {
    const tool = createMemoryMigrateTool()
    expect(tool.name).toBe("memory_migrate")
    expect(tool.description).toContain("Migrate")
    expect(tool.concurrency).toBe("exclusive")
    expect(tool.approval).toBe("write")
  })

  it("migrate tool has correct parameters schema", () => {
    const tool = createMemoryMigrateTool()
    expect(tool.parameters).toBeDefined()
    expect(tool.parameters.type).toBe("object")
  })

  it("migrate tool execute returns result", async () => {
    const tool = createMemoryMigrateTool()
    const result = await (tool as any).execute()
    expect(result).toBeDefined()
    expect(typeof result.content).toBe("string")
    expect(typeof result.isError).toBe("boolean")
  })
})
