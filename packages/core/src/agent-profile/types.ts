export type AgentRole = "worker" | "supervisor"

export type HarnessStrictness = "strict" | "normal" | "loose"

export type ThinkingMode = "off" | "open" | "high"

export interface AgentRoleProfile {
  role: AgentRole
  modelTarget: string
  harness: HarnessStrictness
  thinking: ThinkingMode
  contextWindow?: number
  maxTokens?: number
  temperature?: number
  tools: {
    allow?: string[]
    deny?: string[]
  }
  plugins: string[]
  mcpServers: string[]
  skills: string[]
}

export interface AgentProfilesConfig {
  version: number
  worker: AgentRoleProfile
  supervisor: AgentRoleProfile
}

export const DEFAULT_AGENT_PROFILES: AgentProfilesConfig = {
  version: 1,
  worker: {
    role: "worker",
    modelTarget: "zen/mimo-v2.5-free",
    harness: "normal",
    thinking: "high",
    tools: {},
    plugins: [],
    mcpServers: [],
    skills: [],
  },
  supervisor: {
    role: "supervisor",
    modelTarget: "zen/mimo-v2.5-free",
    harness: "normal",
    thinking: "off",
    tools: {
      deny: ["write_file", "edit", "bash", "WriteFile", "EditFile"],
    },
    plugins: [],
    mcpServers: [],
    skills: [],
  },
}
