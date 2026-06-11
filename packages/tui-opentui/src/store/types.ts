/**
 * Deepreef OpenTUI Store 类型定义
 *
 * 设计原则：
 * - 使用 Discriminated Union 描述所有事件，便于类型安全和 exhaustiveness check
 * - 每个快照使用稳定 ID（workerId / supervisorId 等）
 * - Store 状态必须可被纯事件重放重建（支持测试与 Session 恢复）
 */

import type { colors } from "../theme/colors.js";

/** Worker 状态（与方案 5.1 一致） */
export type WorkerStatus =
  | "queued" | "starting" | "running" | "waiting_permission" | "waiting_question"
  | "waiting_supervisor" | "verifying" | "paused" | "completed" | "failed" | "cancelled" | "idle";

/** Supervisor 状态 */
export type SupervisorStatus = "disabled" | "idle" | "queued" | "reviewing" | "cooldown" | "unavailable" | "error";

/** Loop Phase（与方案 5.3 一致） */
export type LoopPhase = "observe" | "plan" | "act" | "verify" | "reflect" | "retry" | "paused" | "done" | "failed";

/**
 * 多 Agent 编排事件（Core 应最终输出此结构化事件）
 * 当前阶段使用 fixture 重放，真实事件由 TuiEventAdapter 转换
 */
export type OrchestrationEvent =
  | { role: "orchestration"; kind: "worker_upsert"; worker: WorkerSnapshot }
  | { role: "orchestration"; kind: "worker_remove"; workerId: string }
  | { role: "orchestration"; kind: "supervisor_upsert"; supervisor: SupervisorSnapshot }
  | { role: "orchestration"; kind: "supervisor_advice"; advice: SupervisorAdviceSnapshot }
  | { role: "orchestration"; kind: "loop_transition"; transition: LoopTransition }
  | { role: "orchestration"; kind: "runtime_signal"; signal: RuntimeSignalSnapshot }
  | { role: "orchestration"; kind: "agent_tree_upsert"; node: AgentNodeSnapshot }
  | { role: "orchestration"; kind: "checkpoint"; checkpoint: CheckpointSnapshot };

/** Worker 快照 */
export interface WorkerSnapshot {
  id: string;
  modelTarget: string;
  status: WorkerStatus;
  currentTask?: string;
  elapsedMs: number;
  parentAgentId?: string;
}

/** Supervisor 快照 */
export interface SupervisorSnapshot {
  id: string;
  modelTarget: string;
  status: SupervisorStatus;
  reviewingWorkerId?: string;
  cooldownRemainingMs?: number;
}

/** Supervisor Advice 快照 */
export interface SupervisorAdviceSnapshot {
  supervisorId: string;
  workerId: string;
  advice: string;
  adopted: boolean;
}

/** Loop 状态转换 */
export interface LoopTransition {
  from: LoopPhase;
  to: LoopPhase;
  attempt: number;
  timestamp: number;
}

/** 运行时信号 */
export interface RuntimeSignalSnapshot {
  kind: "no-progress" | "repeated-error" | "verification-failed" | "checkpoint-saved";
  message?: string;
}

/** Agent 树节点 */
export interface AgentNodeSnapshot {
  id: string;
  kind: "main" | "worker" | "supervisor" | "subagent";
  label: string;
  status: string;
  parentId?: string;
}

/** Checkpoint 快照 */
export interface CheckpointSnapshot {
  runId: string;
  savedAt: number;
}

/** 统一 Store 状态（后续可拆分） */
export interface TuiState {
  workers: Record<string, WorkerSnapshot>;
  supervisors: Record<string, SupervisorSnapshot>;
  loop: {
    phase: LoopPhase;
    attempt: number;
    lastTransition?: LoopTransition;
  };
  agentTree: Record<string, AgentNodeSnapshot>;
}