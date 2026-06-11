/**
 * Orchestration 事件演示
 *
 * 功能：
 * - 手动触发 orchestration 事件更新 TUI
 * - 演示 Worker/Supervisor/Loop 状态变化
 * - 用于 TUI-OT-60 测试和验证
 *
 * 中文注释：
 * - 这些函数用于开发和演示
 * - 真实运行时 Core 会自动 yield orchestration 事件
 */

import type {
  WorkerSnapshot,
  SupervisorSnapshot,
  LoopTransition,
} from "@deepreef/core";
import { dispatchOrchestrationEvent } from "../store/tui-store.js";
import type { OrchestrationEvent } from "../store/types.js";

/** 演示：添加一个 Worker */
export function demoAddWorker(workerId: string, modelTarget: string): void {
  const worker: WorkerSnapshot = {
    id: workerId,
    modelTarget,
    status: "running",
    currentTask: "处理用户请求",
    elapsedMs: 0,
  };

  const event: OrchestrationEvent = {
    role: "orchestration",
    kind: "worker_upsert",
    worker,
  };

  dispatchOrchestrationEvent(event);
  console.error(`[Demo] 添加 Worker: ${workerId}`);
}

/** 演示：更新 Worker 状态 */
export function demoUpdateWorkerStatus(
  workerId: string,
  status: WorkerSnapshot["status"],
  elapsedMs: number
): void {
  const worker: WorkerSnapshot = {
    id: workerId,
    modelTarget: "qwen-1.5b", // 简化，实际应从 store 读取
    status,
    elapsedMs,
  };

  const event: OrchestrationEvent = {
    role: "orchestration",
    kind: "worker_upsert",
    worker,
  };

  dispatchOrchestrationEvent(event);
  console.error(`[Demo] 更新 Worker ${workerId} 状态: ${status}`);
}

/** 演示：添加 Supervisor */
export function demoAddSupervisor(
  supervisorId: string,
  modelTarget: string
): void {
  const supervisor: SupervisorSnapshot = {
    id: supervisorId,
    modelTarget,
    status: "reviewing",
    reviewingWorkerId: "worker-1",
  };

  const event: OrchestrationEvent = {
    role: "orchestration",
    kind: "supervisor_upsert",
    supervisor,
  };

  dispatchOrchestrationEvent(event);
  console.error(`[Demo] 添加 Supervisor: ${supervisorId}`);
}

/** 演示：Loop 阶段转换 */
export function demoLoopTransition(
  from: string,
  to: string,
  attempt: number
): void {
  const transition: LoopTransition = {
    from: from as LoopTransition["from"],
    to: to as LoopTransition["to"],
    attempt,
    timestamp: Date.now(),
  };

  const event: OrchestrationEvent = {
    role: "orchestration",
    kind: "loop_transition",
    transition,
  };

  dispatchOrchestrationEvent(event);
  console.error(`[Demo] Loop 转换: ${from} -> ${to}`);
}

/** 演示序列：模拟完整的多 Agent 工作流 */
export async function runDemoSequence(): Promise<void> {
  console.error("[Demo] 开始多 Agent 编排演示序列...");

  // 1. 添加 Worker
  demoAddWorker("worker-demo-1", "qwen-1.5b");
  await sleep(1000);

  // 2. Loop 进入 plan 阶段
  demoLoopTransition("observe", "plan", 1);
  await sleep(500);

  // 3. Loop 进入 act 阶段
  demoLoopTransition("plan", "act", 1);
  await sleep(1000);

  // 4. Worker 完成，添加 Supervisor 审查
  demoUpdateWorkerStatus("worker-demo-1", "completed", 5000);
  demoAddSupervisor("supervisor-demo", "deepseek-v4-flash");
  await sleep(1000);

  // 5. Supervisor 完成，Loop 进入 verify
  demoLoopTransition("act", "verify", 1);
  await sleep(500);

  // 6. 验证通过，Loop 完成
  demoLoopTransition("verify", "done", 1);

  console.error("[Demo] 演示序列完成");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
