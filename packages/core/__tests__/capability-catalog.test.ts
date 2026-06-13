import { describe, it, expect } from "vitest"
import { CapabilityCatalog, RoleCapabilityView } from "../src/capability-catalog/catalog.js"
import { DEFAULT_AGENT_PROFILES } from "../src/agent-profile/types.js"
import type { AgentTool } from "../src/interface.js"

function createMockTool(name: string, description: string = ""): AgentTool {
  return {
    name,
    description,
    parameters: {},
    concurrency: "shared",
    approval: "read",
    execute: async () => ({ content: "", isError: false }),
  }
}

describe("CapabilityCatalog", () => {
  it("should register builtin tools", () => {
    const catalog = new CapabilityCatalog()
    const tool = createMockTool("read_file", "Read a file")
    catalog.registerBuiltinTool(tool)

    const snapshot = catalog.snapshot()
    expect(snapshot.tools).toHaveLength(1)
    expect(snapshot.tools[0].name).toBe("read_file")
    expect(snapshot.tools[0].source.type).toBe("builtin")
    expect(snapshot.tools[0].tier).toBe("read")
  })

  it("should register multiple builtin tools", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerBuiltinTool(createMockTool("read_file"))
    catalog.registerBuiltinTool(createMockTool("write_file"))
    catalog.registerBuiltinTool(createMockTool("bash"))

    const snapshot = catalog.snapshot()
    expect(snapshot.tools).toHaveLength(3)
  })

  it("should register plugin tools", () => {
    const catalog = new CapabilityCatalog()
    const tool = createMockTool("plugin_tool", "A plugin tool")
    catalog.registerPluginTool(tool, "my-plugin")

    const snapshot = catalog.snapshot()
    expect(snapshot.tools).toHaveLength(1)
    expect(snapshot.tools[0].source.type).toBe("plugin")
    expect(snapshot.tools[0].source.pluginName).toBe("my-plugin")
  })

  it("should register MCP tools", () => {
    const catalog = new CapabilityCatalog()
    const tool = createMockTool("mcp_tool", "An MCP tool")
    catalog.registerMcpTool(tool, "my-mcp-server")

    const snapshot = catalog.snapshot()
    expect(snapshot.tools).toHaveLength(1)
    expect(snapshot.tools[0].source.type).toBe("mcp")
    expect(snapshot.tools[0].source.mcpServerName).toBe("my-mcp-server")
  })

  it("should register MCP servers", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerMcpServer("server1", "My MCP server")

    const snapshot = catalog.snapshot()
    expect(snapshot.mcpServers).toHaveLength(1)
    expect(snapshot.mcpServers[0].name).toBe("server1")
  })

  it("should register skills", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerSkill("frontend-design", "Create frontend interfaces")

    const snapshot = catalog.snapshot()
    expect(snapshot.skills).toHaveLength(1)
    expect(snapshot.skills[0].name).toBe("frontend-design")
  })

  it("should register plugins", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerPlugin("my-plugin", "A plugin")

    const snapshot = catalog.snapshot()
    expect(snapshot.plugins).toHaveLength(1)
    expect(snapshot.plugins[0].name).toBe("my-plugin")
  })

  it("should get tool by name", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerBuiltinTool(createMockTool("read_file"))

    const tool = catalog.getTool("read_file")
    expect(tool).toBeDefined()
    expect(tool?.name).toBe("read_file")
  })

  it("should return undefined for non-existent tool", () => {
    const catalog = new CapabilityCatalog()
    const tool = catalog.getTool("non_existent")
    expect(tool).toBeUndefined()
  })

  it("should classify tool tiers correctly", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerBuiltinTool(createMockTool("read_file"))
    catalog.registerBuiltinTool(createMockTool("write_file"))
    catalog.registerBuiltinTool(createMockTool("bash"))
    catalog.registerBuiltinTool(createMockTool("list_dir"))
    catalog.registerBuiltinTool(createMockTool("grep"))
    catalog.registerBuiltinTool(createMockTool("shell_exec"))

    const snapshot = catalog.snapshot()
    const readTools = snapshot.tools.filter((t) => t.tier === "read")
    const writeTools = snapshot.tools.filter((t) => t.tier === "write")
    const execTools = snapshot.tools.filter((t) => t.tier === "exec")

    expect(readTools.map((t) => t.name)).toContain("read_file")
    expect(readTools.map((t) => t.name)).toContain("list_dir")
    expect(readTools.map((t) => t.name)).toContain("grep")
    expect(writeTools.map((t) => t.name)).toContain("write_file")
    expect(execTools.map((t) => t.name)).toContain("bash")
    expect(execTools.map((t) => t.name)).toContain("shell_exec")
  })
})

describe("RoleCapabilityView", () => {
  it("should create view for worker role", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerBuiltinTool(createMockTool("read_file"))
    catalog.registerBuiltinTool(createMockTool("write_file"))

    const view = catalog.createRoleView({
      role: "worker",
      profile: DEFAULT_AGENT_PROFILES.worker,
    })

    expect(view.role).toBe("worker")
    expect(view.tools).toHaveLength(2)
  })

  it("should create view for supervisor role with default config", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerBuiltinTool(createMockTool("read_file"))
    catalog.registerBuiltinTool(createMockTool("write_file"))
    catalog.registerBuiltinTool(createMockTool("bash"))

    const view = catalog.createRoleView({
      role: "supervisor",
      profile: DEFAULT_AGENT_PROFILES.supervisor,
    })

    expect(view.role).toBe("supervisor")
    expect(view.tools).toHaveLength(1)
    expect(view.tools[0].name).toBe("read_file")
  })

  it("should allow supervisor to use write tools when configured", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerBuiltinTool(createMockTool("read_file"))
    catalog.registerBuiltinTool(createMockTool("write_file"))
    catalog.registerBuiltinTool(createMockTool("bash"))

    const supervisorProfile = {
      ...DEFAULT_AGENT_PROFILES.supervisor,
      tools: { allow: ["read_file", "write_file", "bash"] },
    }

    const view = catalog.createRoleView({
      role: "supervisor",
      profile: supervisorProfile,
    })

    expect(view.tools).toHaveLength(3)
    expect(view.getToolNames()).toContain("write_file")
    expect(view.getToolNames()).toContain("bash")
  })

  it("should filter tools based on deny list", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerBuiltinTool(createMockTool("read_file"))
    catalog.registerBuiltinTool(createMockTool("write_file"))
    catalog.registerBuiltinTool(createMockTool("bash"))

    const workerProfile = {
      ...DEFAULT_AGENT_PROFILES.worker,
      tools: { deny: ["bash"] },
    }

    const view = catalog.createRoleView({
      role: "worker",
      profile: workerProfile,
    })

    expect(view.tools).toHaveLength(2)
    expect(view.getToolNames()).not.toContain("bash")
  })

  it("should filter tools based on allow list", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerBuiltinTool(createMockTool("read_file"))
    catalog.registerBuiltinTool(createMockTool("write_file"))
    catalog.registerBuiltinTool(createMockTool("bash"))

    const workerProfile = {
      ...DEFAULT_AGENT_PROFILES.worker,
      tools: { allow: ["read_file", "write_file"] },
    }

    const view = catalog.createRoleView({
      role: "worker",
      profile: workerProfile,
    })

    expect(view.tools).toHaveLength(2)
    expect(view.getToolNames()).toContain("read_file")
    expect(view.getToolNames()).toContain("write_file")
    expect(view.getToolNames()).not.toContain("bash")
  })

  it("should get tool by name", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerBuiltinTool(createMockTool("read_file"))

    const view = catalog.createRoleView({
      role: "worker",
      profile: DEFAULT_AGENT_PROFILES.worker,
    })

    const tool = view.getTool("read_file")
    expect(tool).toBeDefined()
    expect(tool?.name).toBe("read_file")
  })

  it("should check if tool exists", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerBuiltinTool(createMockTool("read_file"))

    const view = catalog.createRoleView({
      role: "worker",
      profile: DEFAULT_AGENT_PROFILES.worker,
    })

    expect(view.hasTool("read_file")).toBe(true)
    expect(view.hasTool("non_existent")).toBe(false)
  })

  it("should get tool names", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerBuiltinTool(createMockTool("read_file"))
    catalog.registerBuiltinTool(createMockTool("write_file"))

    const view = catalog.createRoleView({
      role: "worker",
      profile: DEFAULT_AGENT_PROFILES.worker,
    })

    expect(view.getToolNames()).toEqual(["read_file", "write_file"])
  })

  it("should not filter supervisor tools when no deny list", () => {
    const catalog = new CapabilityCatalog()
    catalog.registerBuiltinTool(createMockTool("read_file"))
    catalog.registerBuiltinTool(createMockTool("write_file"))
    catalog.registerBuiltinTool(createMockTool("bash"))

    const supervisorProfile = {
      ...DEFAULT_AGENT_PROFILES.supervisor,
      tools: {},
    }

    const view = catalog.createRoleView({
      role: "supervisor",
      profile: supervisorProfile,
    })

    expect(view.tools).toHaveLength(3)
    expect(view.getToolNames()).toContain("write_file")
    expect(view.getToolNames()).toContain("bash")
  })
})
