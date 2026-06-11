/**
 * Fixture 重放工具
 *
 * 用于 TUI-OT-20 验收：
 * - 同一事件序列可重放得到相同快照
 * - 便于在没有真实 Core 事件时开发 UI
 */

import type { OrchestrationEvent } from "./types.js";
import { dispatchOrchestrationEvent, resetTuiState } from "./tui-store.js";

export function replayEvents(events: OrchestrationEvent[]): void {
  resetTuiState();
  for (const e of events) {
    dispatchOrchestrationEvent(e);
  }
}

/** 示例 fixture：两个 Worker，一个 Supervisor，一个 Loop 转换 */
export const sampleOrchestrationFixture: OrchestrationEvent[] = [
  {
    role: "orchestration",
    kind: "worker_upsert",
    worker: { id: "w1", modelTarget: "qwen-1.5b", status: "running", currentTask: "edit parser.ts", elapsedMs: 42000 },
  },
  {
    role: "orchestration",
    kind: "worker_upsert",
    worker: { id: "w2", modelTarget: "mimo-small", status: "idle", elapsedMs: 0 },
  },
  {
    role: "orchestration",
    kind: "supervisor_upsert",
    supervisor: { id: "s1", modelTarget: "deepseek-v4-flash", status: "reviewing", reviewingWorkerId: "w1" },
  },
  {
    role: "orchestration",
    kind: "loop_transition",
    transition: { from: "observe", to: "act", attempt: 1, timestamp: Date.now() },
  },
];