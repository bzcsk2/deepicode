/**
 * Chat 页面
 *
 * 功能（按方案 TUI-OT-50）：
 * - Transcript 消息列表（用户/助手消息、reasoning、工具调用）
 * - PromptInput 输入框
 * - 斜杠命令支持
 * - 队列和中断状态显示
 *
 * 中文注释：
 * - 消息气泡使用不同背景色区分用户/助手
 * - 输入框固定在底部
 * - 使用简洁布局，避免嵌套 text 组件
 */

import { colors } from "../../theme/colors.js";
import type { TuiState } from "../../store/types.js";

export interface ChatPageProps {
  tuiState: TuiState;
  onSubmit: (text: string) => void;
  onInterrupt: () => void;
}

/** 模拟消息类型 */
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

/** 模拟消息数据（后续接入真实 transcript store） */
const mockMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "帮我修改 parser.ts 文件",
    timestamp: Date.now() - 60000,
  },
  {
    id: "2",
    role: "assistant",
    content: "我来帮你修改 parser.ts。首先让我查看文件内容...",
    timestamp: Date.now() - 55000,
  },
  {
    id: "3",
    role: "assistant",
    content: "[工具调用: read_file] 正在读取 parser.ts",
    timestamp: Date.now() - 50000,
  },
];

export function ChatPage({ tuiState, onSubmit, onInterrupt }: ChatPageProps) {
  // 获取当前输入（简化版本，实际应使用状态管理）
  const inputText = "";
  const isLoading = false;

  return (
    <box style={{ flexDirection: "column", height: "100%" }}>
      {/* Transcript 消息列表 */}
      <box style={{ flex: 1, flexDirection: "column", padding: 1 }}>
        {mockMessages.map((msg) => (
          <box
            key={msg.id}
            style={{
              marginBottom: 1,
              padding: 1,
              backgroundColor:
                msg.role === "user" ? colors.bg.tertiary : colors.bg.secondary,
              borderStyle: msg.role === "user" ? "single" : "none",
              borderColor: colors.border.normal,
            }}
          >
            <text color={msg.role === "user" ? colors.accent.primary : colors.fg.primary}>
              {msg.role === "user" ? "你: " : "Deepreef: "}
              {msg.content}
            </text>
          </box>
        ))}

        {/* 加载状态 */}
        {isLoading && (
          <text color={colors.status.info}>
            思考中...
          </text>
        )}
      </box>

      {/* 输入区域 */}
      <box
        style={{
          padding: 1,
          borderTop: true,
          borderColor: colors.border.normal,
          backgroundColor: colors.bg.secondary,
        }}
      >
        {/* 输入框提示 */}
        <text color={colors.fg.muted}>
          {inputText ? inputText : "输入消息 (Enter 发送, Ctrl+C 中断)..."}
        </text>

        {/* 斜杠命令提示 */}
        <text color={colors.fg.dim}>
          /help 查看命令 | /exit 退出
        </text>
      </box>
    </box>
  );
}
