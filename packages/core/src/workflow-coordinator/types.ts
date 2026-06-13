import type { AgentRole } from "../agent-profile/types.js"

export type WorkflowPhase =
  | "idle"
  | "supervisor_analyse"
  | "worker_do"
  | "worker_report"
  | "supervisor_check"
  | "blocked"
  | "completed"
  | "failed"

export type WorkflowDecision =
  | "continue"
  | "revise"
  | "approve"
  | "blocked"
  | "ask_user"

export interface WorkflowConfig {
  maxRounds: number
  requireSupervisorPlan: boolean
  requireVerificationGate: boolean
}

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  maxRounds: 9,
  requireSupervisorPlan: true,
  requireVerificationGate: true,
}

export interface WorkflowLoopState {
  workflowId: string
  iteration: number
  maxRounds: number
  currentPhase: WorkflowPhase
  phaseHistory: WorkflowPhase[]
  ledgerVersion: number
  basedOnLedgerVersion?: number
  goal: string
  supervisorPlan?: string
  workerReport?: string
  lastDecision?: WorkflowDecision
  blockedReason?: string
  createdAt: number
  updatedAt: number
}

export interface WorkflowEvidence {
  workflowId: string
  iteration: number
  ledgerVersion: number
  workerId: string
  tools: WorkflowEvidenceToolEntry[]
  failures: WorkflowEvidenceFailureEntry[]
  verification?: WorkflowEvidenceVerification
  summary: string
  timestamp: number
}

export interface WorkflowEvidenceToolEntry {
  name: string
  args: Record<string, unknown>
  result: string
  isError: boolean
  durationMs: number
}

export interface WorkflowEvidenceFailureEntry {
  phase: WorkflowPhase
  error: string
  timestamp: number
}

export interface WorkflowEvidenceVerification {
  passed: boolean
  commands: string[]
  output: string
  timestamp: number
}

export interface WorkflowSupervisorAdvice {
  workflowId: string
  iteration: number
  ledgerVersion: number
  decision: WorkflowDecision
  feedback?: string
  revisedGoal?: string
  approvedBy?: string
  timestamp: number
  stale: boolean
}

export interface WorkflowCheckpoint {
  workflowId: string
  state: WorkflowLoopState
  evidence?: WorkflowEvidence
  advice?: WorkflowSupervisorAdvice
  savedAt: number
}

export interface StartWorkflowOptions {
  goal: string
  config?: Partial<WorkflowConfig>
}

export interface WorkflowEvent {
  type: "phase_change" | "iteration_change" | "blocked" | "completed" | "failed" | "ask_user"
  workflowId: string
  phase?: WorkflowPhase
  iteration?: number
  reason?: string
  timestamp: number
}
