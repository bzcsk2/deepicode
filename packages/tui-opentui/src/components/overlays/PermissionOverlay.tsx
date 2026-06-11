/**
 * Permission 权限请求 Overlay
 *
 * 功能（按方案）：
 * - 显示权限类型（文件操作、命令执行等）
 * - 显示请求详情（文件路径、命令等）
 * - once/always/reject 选项
 * - 支持键盘导航（Tab 切换，Enter 确认）
 *
 * 中文注释：
 * - 使用醒目边框提示危险操作
 * - 选项使用统一颜色便于识别
 */

import { DetailView } from "../common/DetailView.js";
import { colors } from "../../theme/colors.js";

export interface PermissionRequest {
  id: string;
  type: "file_write" | "file_delete" | "shell_exec" | "network";
  resource: string;
  description?: string;
}

export interface PermissionOverlayProps {
  request: PermissionRequest;
  onAllowOnce: () => void;
  onAllowAlways: () => void;
  onReject: () => void;
}

/** 权限类型显示名称 */
const permissionTypeNames: Record<PermissionRequest["type"], string> = {
  file_write: "文件写入",
  file_delete: "文件删除",
  shell_exec: "命令执行",
  network: "网络访问",
};

/** 权限类型颜色 */
const permissionTypeColors: Record<PermissionRequest["type"], string> = {
  file_write: colors.status.warning,
  file_delete: colors.status.error,
  shell_exec: colors.status.warning,
  network: colors.status.info,
};

export function PermissionOverlay({
  request,
  onAllowOnce,
  onAllowAlways,
  onReject,
}: PermissionOverlayProps) {
  const typeName = permissionTypeNames[request.type];
  const typeColor = permissionTypeColors[request.type];

  return (
    <DetailView
      title="权限请求"
      onClose={onReject}
      footer={
        <text color={colors.fg.muted}>
          Tab:切换选项 | Enter:确认 | Esc:拒绝
        </text>
      }
    >
      {/* 权限类型 */}
      <text color={typeColor}>
        类型: {typeName}
      </text>

      {/* 资源路径 */}
      <text color={colors.fg.primary}>
        目标: {request.resource}
      </text>

      {/* 描述 */}
      {request.description && (
        <text color={colors.fg.muted}>
          {request.description}
        </text>
      )}

      <text color={colors.border.normal}>---</text>

      {/* 选项 */}
      <text color={colors.status.success}>
        [o] 允许一次 (once)
      </text>
      <text color={colors.accent.primary}>
        [a] 始终允许 (always)
      </text>
      <text color={colors.status.error}>
        [r] 拒绝 (reject)
      </text>
    </DetailView>
  );
}
