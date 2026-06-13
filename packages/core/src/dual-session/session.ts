import { randomUUID } from "node:crypto"
import type { AgentRole } from "../agent-profile/types.js"
import type { ChatMessage } from "../types.js"
import type { WorkflowLoopState, WorkflowCheckpoint } from "../workflow-coordinator/types.js"
import type {
  DualSessionConfig,
  RoleSessionState,
  DualSessionSnapshot,
  AdviceHistoryEntry,
  SessionCheckpoint,
  DualSessionOptions,
} from "./types.js"
import { SESSION_VERSION } from "./types.js"

export interface DualSessionOptionsExtended extends DualSessionOptions {
  workerSystemPrompt?: string
  supervisorSystemPrompt?: string
  workerModelTarget?: string
  supervisorModelTarget?: string
}

export class DualSession {
  private config: DualSessionConfig
  private worker: RoleSessionState
  private supervisor: RoleSessionState
  private workflow?: WorkflowCheckpoint
  private adviceHistory: AdviceHistoryEntry[] = []

  constructor(options: DualSessionOptionsExtended = {}) {
    const sessionId = options.sessionId ?? randomUUID()
    const workerSessionId = options.workerSessionId ?? randomUUID()
    const supervisorSessionId = options.supervisorSessionId ?? randomUUID()

    this.config = {
      sessionId,
      workerSessionId,
      supervisorSessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    this.worker = {
      role: "worker",
      agentSessionId: workerSessionId,
      messages: [],
      systemPrompt: options.workerSystemPrompt ?? "",
      thinkingMode: "high",
      modelTarget: options.workerModelTarget ?? "zen/mimo-v2.5-free",
      stats: {
        promptTokens: 0,
        completionTokens: 0,
        cacheHitTokens: 0,
        cacheMissTokens: 0,
        apiCalls: 0,
        toolCalls: 0,
        totalCost: 0,
      },
    }

    this.supervisor = {
      role: "supervisor",
      agentSessionId: supervisorSessionId,
      messages: [],
      systemPrompt: options.supervisorSystemPrompt ?? "",
      thinkingMode: "off",
      modelTarget: options.supervisorModelTarget ?? "zen/mimo-v2.5-free",
      stats: {
        promptTokens: 0,
        completionTokens: 0,
        cacheHitTokens: 0,
        cacheMissTokens: 0,
        apiCalls: 0,
        toolCalls: 0,
        totalCost: 0,
      },
    }
  }

  getConfig(): DualSessionConfig {
    return { ...this.config }
  }

  getSessionId(): string {
    return this.config.sessionId
  }

  getWorkerSessionId(): string {
    return this.config.workerSessionId
  }

  getSupervisorSessionId(): string {
    return this.config.supervisorSessionId
  }

  getRoleState(role: AgentRole): RoleSessionState {
    return role === "worker" ? { ...this.worker } : { ...this.supervisor }
  }

  addMessage(role: AgentRole, message: ChatMessage): void {
    const session = role === "worker" ? this.worker : this.supervisor
    session.messages.push(message)
    this.config.updatedAt = Date.now()
  }

  getMessages(role: AgentRole): ChatMessage[] {
    const session = role === "worker" ? this.worker : this.supervisor
    return [...session.messages]
  }

  setSystemPrompt(role: AgentRole, prompt: string): void {
    const session = role === "worker" ? this.worker : this.supervisor
    session.systemPrompt = prompt
    this.config.updatedAt = Date.now()
  }

  setThinkingMode(role: AgentRole, mode: "off" | "open" | "high"): void {
    const session = role === "worker" ? this.worker : this.supervisor
    session.thinkingMode = mode
    this.config.updatedAt = Date.now()
  }

  setModelTarget(role: AgentRole, target: string): void {
    const session = role === "worker" ? this.worker : this.supervisor
    session.modelTarget = target
    this.config.updatedAt = Date.now()
  }

  updateStats(role: AgentRole, stats: Partial<RoleSessionState["stats"]>): void {
    const session = role === "worker" ? this.worker : this.supervisor
    session.stats = { ...session.stats, ...stats }
    this.config.updatedAt = Date.now()
  }

  setWorkflowCheckpoint(checkpoint: WorkflowCheckpoint): void {
    this.workflow = checkpoint
    this.config.updatedAt = Date.now()
  }

  getWorkflowCheckpoint(): WorkflowCheckpoint | undefined {
    return this.workflow ? { ...this.workflow } : undefined
  }

  addAdviceHistory(entry: AdviceHistoryEntry): void {
    this.adviceHistory.push(entry)
    this.config.updatedAt = Date.now()
  }

  getAdviceHistory(): AdviceHistoryEntry[] {
    return [...this.adviceHistory]
  }

  isAdviceAdopted(workflowId: string, iteration: number): boolean {
    return this.adviceHistory.some(
      (entry) => entry.workflowId === workflowId && entry.iteration === iteration && entry.adopted
    )
  }

  toSnapshot(): DualSessionSnapshot {
    return {
      config: { ...this.config },
      worker: { ...this.worker },
      supervisor: { ...this.supervisor },
      workflow: this.workflow ? { ...this.workflow } : undefined,
      adviceHistory: [...this.adviceHistory],
    }
  }

  static fromSnapshot(snapshot: DualSessionSnapshot): DualSession {
    const session = new DualSession({
      sessionId: snapshot.config.sessionId,
      workerSessionId: snapshot.config.workerSessionId,
      supervisorSessionId: snapshot.config.supervisorSessionId,
    })

    session.worker = { ...snapshot.worker }
    session.supervisor = { ...snapshot.supervisor }
    session.workflow = snapshot.workflow ? { ...snapshot.workflow } : undefined
    session.adviceHistory = [...snapshot.adviceHistory]
    session.config = { ...snapshot.config }

    return session
  }

  toCheckpoint(): SessionCheckpoint {
    return {
      dualSessionId: this.config.sessionId,
      snapshot: this.toSnapshot(),
      savedAt: Date.now(),
      version: SESSION_VERSION,
    }
  }

  static fromCheckpoint(checkpoint: SessionCheckpoint): DualSession {
    return DualSession.fromSnapshot(checkpoint.snapshot)
  }
}
