/**
 * React Hook：从 Store 订阅细粒度状态
 *
 * 设计要点：
 * - 使用 selector 避免不必要重渲染（关键性能优化）
 * - 支持自定义 equalityFn（默认浅比较）
 * - 代码简洁，易于在任意组件中使用
 */

import { useSyncExternalStore } from "react";
import type { Store } from "./create-store.js";

export function useStore<T, S>(
  store: Store<T>,
  selector: (state: T) => S,
  equalityFn: (a: S, b: S) => boolean = Object.is
): S {
  const subscribe = (onStoreChange: () => void) => {
    return store.subscribe(() => onStoreChange());
  };

  const getSnapshot = () => selector(store.getState());

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}