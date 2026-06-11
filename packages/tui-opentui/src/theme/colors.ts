/**
 * Deepreef OpenTUI 主题颜色 Token
 *
 * 设计原则：
 * - 所有颜色使用 6 位 hex（例如 "#1a1b26"）
 * - 语义化命名，便于后续手动调整
 * - 每个 token 都带中文注释，说明用途和调整注意事项
 *
 * 调整指南：
 * - 修改主色后，需同步检查 StatusBadge、Worker 行、Supervisor 行中的使用
 * - 状态色（success/warning/error）需与 Loop phase 映射保持一致
 */

export const colors = {
  /** 背景色层级 */
  bg: {
    /** 主背景色（最底层）—— 用于整个 TUI 容器 */
    primary: "#1a1b26",
    /** 次级背景色—— 用于 Dashboard 三栏面板、详情卡片 */
    secondary: "#24283b",
    /** 第三级背景色—— 用于选中行高亮、输入框聚焦态 */
    tertiary: "#414868",
    /** 高亮背景色—— 用于 hover 或临时强调 */
    highlight: "#565f89",
  },

  /** 前景色层级 */
  fg: {
    /** 主文本色—— 用于标题、关键信息 */
    primary: "#c0caf5",
    /** 次级文本色—— 用于描述、时间戳 */
    secondary: "#a9b1d6",
    /** 静音文本色—— 用于次要提示、不活跃项 */
    muted: "#787c99",
    /** 暗淡文本色—— 用于禁用态、占位符 */
    dim: "#565f89",
  },

  /** 状态色（全局一致） */
  status: {
    /** 成功/完成状态—— Worker completed、验证通过 */
    success: "#9ece6a",
    /** 警告/阻塞状态—— waiting_permission、cooldown */
    warning: "#e0af68",
    /** 错误/失败状态—— failed、unavailable */
    error: "#f7768e",
    /** 信息/进行中状态—— running、reviewing */
    info: "#7aa2f7",
  },

  /** 任务/Worker 状态色（与 status 语义对齐） */
  task: {
    done: "#9ece6a",
    active: "#7aa2f7",
    actionable: "#bb9af7",
    pending: "#e0af68",
    blocked: "#f7768e",
    error: "#f7768e",
    closed: "#787c99",
    completedLocally: "#9ece6a",
  },

  /** 强调色 */
  accent: {
    primary: "#7aa2f7",
    secondary: "#bb9af7",
    tertiary: "#7dcfff",
  },

  /** 边框色 */
  border: {
    /** 普通边框—— 用于面板分割线 */
    normal: "#414868",
    /** 聚焦边框—— 用于当前焦点面板 */
    focus: "#7aa2f7",
    /** 警告边框—— 用于权限/Question 阻塞提示 */
    warning: "#e0af68",
  },
} as const;

export type ThemeColors = typeof colors;