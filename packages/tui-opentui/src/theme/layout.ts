/**
 * Deepreef OpenTUI 布局 Token
 *
 * 设计原则：
 * - 所有尺寸使用数字或带单位的字符串
 * - 提供响应式断点（宽屏/中屏/窄屏）
 * - 中文注释说明用途和调整注意事项
 *
 * 调整指南：
 * - 修改 panelGap 后，需检查三栏 Dashboard 的间距是否仍协调
 * - 响应式断点需与 OrchestrationDashboard 的宽度判断逻辑同步
 */

export const layout = {
  /** 面板间距（Dashboard 三栏之间） */
  panelGap: 1,

  /** 边框宽度 */
  borderWidth: 1,

  /** 响应式断点（终端列数） */
  breakpoints: {
    /** 宽屏（>=140 列）—— 三栏 Dashboard + Agent Tree + 详情双栏 */
    wide: 140,
    /** 中屏（100-139 列）—— 三栏 Dashboard，主工作区单栏 */
    medium: 100,
    /** 窄屏（80-99 列）—— Dashboard 每栏只显示摘要 */
    narrow: 80,
  },

  /** 面板内边距 */
  padding: {
    /** 面板标题栏内边距 */
    header: 1,
    /** 面板内容区内边距 */
    content: 1,
  },

  /** 行高（列表项） */
  rowHeight: 1,

  /** 最大列表项显示数量（防止长列表撑满屏幕） */
  maxVisibleRows: 12,
} as const;

export type ThemeLayout = typeof layout;