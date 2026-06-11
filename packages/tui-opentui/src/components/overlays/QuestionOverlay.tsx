/**
 * Question 用户询问 Overlay
 *
 * 功能（按方案）：
 * - 显示问题内容（来自 Core/Worker）
 * - 显示选项列表（如果有）
 * - 支持自由输入或选择
 * - 支持从 Subagent 冒泡到主 TUI
 *
 * 中文注释：
 * - 问题使用 info 颜色强调
 * - 选项使用高亮背景区分选中态
 */

import { DetailView } from "../common/DetailView.js";
import { colors } from "../../theme/colors.js";

export interface QuestionRequest {
  id: string;
  question: string;
  options?: string[];
  allowFreeInput?: boolean;
  source?: string; // "main" | "worker-xxx" | "subagent-xxx"
}

export interface QuestionOverlayProps {
  request: QuestionRequest;
  onAnswer: (answer: string) => void;
  onCancel: () => void;
}

export function QuestionOverlay({
  request,
  onAnswer,
  onCancel,
}: QuestionOverlayProps) {
  return (
    <DetailView
      title={request.source ? `来自 ${request.source} 的询问` : "询问"}
      onClose={onCancel}
      footer={
        <text color={colors.fg.muted}>
          {request.options ? "1-9:选择选项 | Enter:确认" : "输入回答 | Enter:提交 | Esc:取消"}
        </text>
      }
    >
      {/* 问题内容 */}
      <text color={colors.status.info}>
        {request.question}
      </text>

      {/* 选项列表 */}
      {request.options && request.options.length > 0 && (
        <>
          <text color={colors.border.normal}>---</text>
          {request.options.map((opt, idx) => (
            <text key={idx} color={colors.fg.primary}>
              {idx + 1}. {opt}
            </text>
          ))}
        </>
      )}

      {/* 输入提示 */}
      {request.allowFreeInput && (
        <>
          <text color={colors.border.normal}>---</text>
          <text color={colors.fg.muted}>
            输入你的回答...
          </text>
        </>
      )}
    </DetailView>
  );
}
