import type { AgentRole } from "../agent-profile/types.js"
import type { ChatMessage } from "../types.js"
import type { WorkflowLoopState, WorkflowCheckpoint } from "../workflow-coordinator/types.js"

export interface DualSessionConfig {
  sessionId: string
  workerSessionId: string
  supervisorSessionId: string
  createdAt: number
  updatedAt: number
}

export interface RoleSessionState {
  role: AgentRole
  agentSessionId: string
  messages: ChatMessage[]
  systemPrompt: string
  thinkingMode: "off" | "open" | "high"
  modelTarget: string
  stats: {
    promptTokens: number
    completionTokens: number
    cacheHitTokens: number
    cacheMissTokens: number
    apiCalls: number
    toolCalls: number
    totalCost: number
  }
}

export interface DualSessionSnapshot {
  config: DualSessionConfig
  worker: RoleSessionState
  supervisor: RoleSessionState
  workflow?: WorkflowCheckpoint
  adviceHistory: AdviceHistoryEntry[]
}

export interface AdviceHistoryEntry {
  workflowId: string
  iteration: number
  decision: string
  adopted: boolean
  timestamp: number
}

export interface SessionCheckpoint {
  dualSessionId: string
  snapshot: DualSessionSnapshot
  savedAt: number
  version: number
}

export const SESSION_VERSION = 1 as const

export interface DualSessionOptions {
  sessionId?: string
  workerSessionId?: string
  supervisorSessionId?: string
}
