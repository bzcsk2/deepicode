/**
 * Deepreef OpenTUI 统一快捷键注册表
 *
 * 设计原则：
 * - 所有快捷键集中定义，避免硬编码
 * - 支持作用域（global / page / overlay）
 * - 中文注释说明每个快捷键的用途和冲突处理
 *
 * 调整指南：
 * - 新增页面时，需在此注册对应 scope 的快捷键
 * - 冲突检测：同一 scope 内同一 key 只能映射一个 action
 */

export type KeyScope = "global" | "chat" | "orchestration" | "overlay";

export interface KeyBinding {
  /** 按键组合（例如 "ctrl+c", "1", "enter"） */
  key: string;
  /** 动作标识符 */
  action: string;
  /** 作用域 */
  scope: KeyScope;
  /** 中文描述（用于帮助 Overlay 显示） */
  description: string;
}

const bindings: KeyBinding[] = [
  // 全局快捷键
  { key: "ctrl+c", action: "interrupt", scope: "global", description: "中断当前任务 / 退出" },
  { key: "ctrl+l", action: "clear", scope: "global", description: "清屏" },
  { key: "escape", action: "close-overlay", scope: "overlay", description: "关闭当前 Overlay" },

  // 页面切换
  { key: "1", action: "goto:chat", scope: "global", description: "切换到 Chat 页面" },
  { key: "2", action: "goto:orchestration", scope: "global", description: "切换到 Orchestration 总览" },
  { key: "3", action: "goto:workers", scope: "global", description: "切换到 Workers 页面" },
  { key: "4", action: "goto:supervisor", scope: "global", description: "切换到 Supervisor 页面" },
  { key: "5", action: "goto:loop", scope: "global", description: "切换到 Loop 页面" },
  { key: "6", action: "goto:system", scope: "global", description: "切换到 System 页面" },

  // Orchestration Dashboard 操作
  { key: "tab", action: "focus:next-panel", scope: "orchestration", description: "切换到下一个面板" },
  { key: "shift+tab", action: "focus:prev-panel", scope: "orchestration", description: "切换到上一个面板" },
  { key: "enter", action: "open-detail", scope: "orchestration", description: "进入选中项详情" },
];

export function getBindings(scope?: KeyScope): KeyBinding[] {
  if (!scope) return bindings;
  return bindings.filter(b => b.scope === scope || b.scope === "global");
}

export function getActionForKey(key: string, scope: KeyScope): string | undefined {
  const scoped = bindings.filter(b => b.scope === scope || b.scope === "global");
  return scoped.find(b => b.key === key.toLowerCase())?.action;
}