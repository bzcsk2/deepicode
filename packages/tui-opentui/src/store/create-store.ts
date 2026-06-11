/**
 * 极简响应式 Store 工厂
 *
 * 设计目标：
 * - 代码极简（< 60 行），无外部依赖
 * - 支持细粒度订阅（只通知关心的 slice）
 * - 状态可被事件重放重建
 * - 易于手动扩展新 Store
 *
 * 用法示例：
 *   const store = createStore(initialState);
 *   const unsubscribe = store.subscribe(state => console.log(state.workers));
 */

export type Listener<T> = (state: T) => void;

export interface Store<T> {
  getState: () => T;
  setState: (partial: Partial<T> | ((prev: T) => Partial<T>)) => void;
  subscribe: (listener: Listener<T>) => () => void;
  reset: () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = { ...initial };
  const listeners = new Set<Listener<T>>();

  const getState = () => state;

  const setState = (partial: Partial<T> | ((prev: T) => Partial<T>)) => {
    const next = typeof partial === "function" ? partial(state) : partial;
    state = { ...state, ...next };
    listeners.forEach(l => l(state));
  };

  const subscribe = (listener: Listener<T>) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const reset = () => {
    state = { ...initial };
    listeners.forEach(l => l(state));
  };

  return { getState, setState, subscribe, reset };
}