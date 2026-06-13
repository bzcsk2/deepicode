import type { AgentTool } from "../interface.js"
import type { AgentRoleProfile, AgentRole } from "../agent-profile/types.js"

export interface CapabilitySource {
  type: "builtin" | "plugin" | "mcp" | "skill"
  name: string
  pluginName?: string
  mcpServerName?: string
}

export interface Capability {
  kind: "tool" | "plugin" | "mcp-server" | "mcp-resource" | "skill"
  name: string
  description?: string
  source: CapabilitySource
  tier: "read" | "write" | "exec"
  tool?: AgentTool
}

export interface CapabilityCatalogSnapshot {
  tools: Capability[]
  plugins: Capability[]
  mcpServers: Capability[]
  mcpResources: Capability[]
  skills: Capability[]
}

export interface RoleCapabilityViewOptions {
  role: AgentRole
  profile: AgentRoleProfile
}

export const WRITE_TOOL_PATTERNS = [
  "write_file",
  "edit",
  "bash",
  "WriteFile",
  "EditFile",
  "Bash",
  "shell",
  "notebook_edit",
  "NotebookEdit",
  "worktree",
  "Worktree",
  "cron",
  "Cron",
  "workflow",
  "Workflow",
  "agent_tool",
  "AgentTool",
  "send_message",
  "SendMessage",
]

export const DANGEROUS_SHELL_PATTERNS = [
  "rm -rf",
  "rm -r /",
  "dd if=",
  "mkfs",
  "> /dev/",
  "chmod 777",
  "curl | sh",
  "wget | sh",
  "eval ",
  "exec ",
]
