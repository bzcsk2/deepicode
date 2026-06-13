/**
 * 阻止 salvage 截断后的有副作用工具执行，避免不完整 payload 产生意外副作用。
 */

import { isSalvagedTruncatedArguments, buildSalvageTruncatedError } from "./salvage.js"

/**
 * 工具副作用级别：
 * - none: 纯读取，无副作用
 * - workspace: 修改工作区文件（write/edit/delete）
 * - process: 执行命令或启动进程
 * - network: 发起网络请求
 * - external: 调用外部服务或 API
 */
export type ToolSideEffect = "none" | "workspace" | "process" | "network" | "external"

/**
 * ADV-BUG-01: 截断 salvage 后禁止执行的写入类工具（向后兼容导出）。
 * 新代码应使用 getToolSideEffect() 检查副作用级别。
 */
export const SALVAGED_TRUNCATED_WRITE_TOOLS = new Set([
  "write_file",
  "edit",
  "NotebookEdit",
])

/**
 * 工具副作用映射：定义每个工具的副作用级别。
 * 未列出的工具默认为 "none"（保守假设）。
 */
export const TOOL_SIDE_EFFECTS: Record<string, ToolSideEffect> = {
  // Workspace 工具
  "write_file": "workspace",
  "edit": "workspace",
  "NotebookEdit": "workspace",
  "delete_file": "workspace",
  "move_file": "workspace",
  "rename_file": "workspace",
  
  // Process 工具
  "run_command": "process",
  "shell": "process",
  
  // Network 工具
  "web_search": "network",
  "web_fetch": "network",
  "http_request": "network",
  
  // External 工具
  "mcp_tool": "external",
  "subagent": "external",
  
  // 只读工具（无副作用）
  "read_file": "none",
  "list_directory": "none",
  "search_files": "none",
  "grep": "none",
  "glob": "none",
}

/**
 * 获取工具的副作用级别。
 */
export function getToolSideEffect(toolName: string): ToolSideEffect {
  return TOOL_SIDE_EFFECTS[toolName] ?? "none"
}

/**
 * 判断是否应拒绝执行：有副作用工具 + 参数来自截断 salvage。
 * 只有 sideEffect: none 的工具才允许 salvage 截断参数。
 */
export function shouldBlockSalvagedTruncatedWrite(
  toolName: string,
  args: Record<string, unknown>,
): boolean {
  if (!isSalvagedTruncatedArguments(args)) {
    return false
  }
  // 有副作用的工具禁止 salvage 截断参数
  const sideEffect = getToolSideEffect(toolName)
  return sideEffect !== "none"
}

/**
 * 构建拒绝执行时的错误消息。
 */
export function buildSalvagedTruncatedWriteBlockMessage(
  toolName: string,
  args: Record<string, unknown>,
): string {
  const sideEffect = getToolSideEffect(toolName)
  const baseMessage = buildSalvageTruncatedError(toolName, args)
  return [
    baseMessage,
    "",
    `Tool "${toolName}" has sideEffect="${sideEffect}" and cannot execute with truncated arguments.`,
    "Please regenerate the complete arguments without truncation.",
  ].join("\n")
}
