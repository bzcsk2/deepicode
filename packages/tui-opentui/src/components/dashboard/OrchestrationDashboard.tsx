/**
 * OrchestrationDashboard
 *
 * 三栏总览：Local Workers / Supervisor / Loop State
 * 这是 OpenTUI 的核心可视化入口，需保持简洁稳定。
 *
 * 样式说明：
 * - 使用 theme/colors 中的 bg.secondary 作为面板背景
 * - 边框使用 border.normal，聚焦时切换为 border.focus
 * - 后续手动调整列宽时，需同步修改 layout.breakpoints
 */

import React from "react";
import { colors } from "../../theme/colors.js";
import { layout } from "../../theme/layout.js";

export interface OrchestrationDashboardProps {
  /** 当前终端宽度（列数） */
  terminalWidth: number;
}

export const OrchestrationDashboard: React.FC<OrchestrationDashboardProps> = ({ terminalWidth }) => {
  const isWide = terminalWidth >= layout.breakpoints.wide;

  return (
    <box style={{ flexDirection: "row", gap: layout.panelGap }}>
      {/* Local Workers 面板 */}
      <box
        style={{
          flex: 1,
          borderStyle: "single",
          borderColor: colors.border.normal,
          backgroundColor: colors.bg.secondary,
          padding: layout.padding.content,
        }}
      >
        <text bold color={colors.fg.primary}>Local Workers</text>
        {/* TODO: 接入 WorkerStore 后渲染真实行 */}
        <text color={colors.fg.muted}>（待实现）</text>
      </box>

      {/* Supervisor 面板 */}
      <box
        style={{
          flex: 1,
          borderStyle: "single",
          borderColor: colors.border.normal,
          backgroundColor: colors.bg.secondary,
          padding: layout.padding.content,
        }}
      >
        <text bold color={colors.fg.primary}>Supervisor</text>
        <text color={colors.fg.muted}>（待实现）</text>
      </box>

      {/* Loop State 面板 */}
      <box
        style={{
          flex: 1,
          borderStyle: "single",
          borderColor: colors.border.normal,
          backgroundColor: colors.bg.secondary,
          padding: layout.padding.content,
        }}
      >
        <text bold color={colors.fg.primary}>Loop State</text>
        <text color={colors.fg.muted}>（待实现）</text>
      </box>
    </box>
  );
};