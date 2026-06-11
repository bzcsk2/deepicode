/**
 * TuiStore：统一事件入口与状态管理
 *
 * 职责：
 * - 接收 OrchestrationEvent
 * - 更新对应领域状态
 * - 支持 fixture 重放（便于测试）
 * - 提供细粒度 selector 给 UI 组件
 *
 * 设计原则：
 * - 组件永远不直接持有 Engine
 * - 同一事件序列必须产生确定性快照
 * - live delta 与 hydration 不互相覆盖
 */

import { createStore, type Store } from "./create-store.js";
import type { TuiState, OrchestrationEvent, WorkerSnapshot, SupervisorSnapshot } from "./types.js";

const initialState: TuiState = {
  workers: {},
  supervisors: {},
  loop: { phase: "observe", attempt: 1 },
  agentTree: {},
};

export const tuiStore: Store<TuiState> = createStore(initialState);

/** 派发结构化事件（Core 最终会调用此函数） */
export function dispatchOrchestrationEvent(event: OrchestrationEvent): void {
  const { kind } = event;

  switch (kind) {
    case "worker_upsert": {
      const { worker } = event;
      tuiStore.setState(s => ({
        workers: { ...s.workers, [worker.id]: worker },
      }));
      break;
    }
    case "worker_remove": {
      const { workerId } = event;
      tuiStore.setState(s => {
        const next = { ...s.workers };
        delete next[workerId];
        return { workers: next };
      });
      break;
    }
    case "supervisor_upsert": {
      const { supervisor } = event;
      tuiStore.setState(s => ({
        supervisors: { ...s.supervisors, [supervisor.id]: supervisor },
      }));
      break;
    }
    case "loop_transition": {
      const { transition } = event;
      tuiStore.setState(s => ({
        loop: {
          phase: transition.to,
          attempt: transition.attempt,
          lastTransition: transition,
        },
      }));
      break;
    }
    // 其他事件类型后续扩展
    default:
      // 暂不处理，保持简洁
      break;
  }
}

/** 重置整个状态（用于新会话或测试） */
export function resetTuiState(): void {
  tuiStore.reset();
}

/** 便捷 selector（组件使用时推荐） */
export const selectors = {
  workers: (state: TuiState) => Object.values(state.workers),
  workerById: (id: string) => (state: TuiState) => state.workers[id],
  supervisors: (state: TuiState) => Object.values(state.supervisors),
  loop: (state: TuiState) => state.loop,
};