/**
 * Deepreef OpenTUI 动作注册表
 *
 * 设计原则：
 * - 鼠标与键盘操作最终都映射到同一 action
 * - 业务组件不直接处理原始事件，而是监听 action
 * - 便于后续添加确认对话框、权限检查等中间层
 *
 * 调整指南：
 * - 新增危险操作（cancel worker、yolo）必须先经过 ConfirmationDialog
 * - 所有 action 必须有对应的 keyboard binding（见 keymap/registry.ts）
 */

export type Action =
  | { type: "interrupt" }
  | { type: "goto"; page: string }
  | { type: "focus-panel"; panelId: string }
  | { type: "open-detail"; target: { kind: string; id: string } }
  | { type: "close-overlay" }
  | { type: "worker-pause"; workerId: string }
  | { type: "worker-resume"; workerId: string }
  | { type: "worker-cancel"; workerId: string }
  | { type: "supervisor-request"; workerId: string };

export type ActionHandler = (action: Action) => void | Promise<void>;

const handlers = new Map<string, ActionHandler>();

export function registerActionHandler(type: string, handler: ActionHandler): void {
  handlers.set(type, handler);
}

export function dispatchAction(action: Action): void {
  const handler = handlers.get(action.type);
  if (handler) {
    void handler(action);
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[ActionRegistry] 未注册的 action: ${action.type}`);
  }
}