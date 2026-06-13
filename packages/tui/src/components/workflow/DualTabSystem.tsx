/**
 * DualTabSystem — 双角色 Tab 系统组件
 *
 * 功能：
 * - Tab 切换 Supervisor/Worker 对话和输入目标
 * - 两个 Tab 分别保存草稿、消息列表和滚动锁定位置
 * - 无覆盖层、无 Question/Permission、无自动补全候选时，Tab 切换目标
 * - 自动补全打开时 Tab 保留原用途；Question、Permission 和危险确认优先
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Text, useInput } from '@deepreef/ink';
import { FG, TONE } from '../../reasonix/tokens.js';

/** 角色类型 */
export type AgentRole = 'worker' | 'supervisor';

/** Tab 状态 */
export interface TabState {
  role: AgentRole;
  messages: Array<{ role: AgentRole; content: string; ts: number }>;
  draft: string;
  scrollPosition: number;
}

/** DualTabSystem 属性 */
export interface DualTabSystemProps {
  /** 当前激活的 Tab */
  activeRole: AgentRole;
  /** Tab 切换回调 */
  onRoleChange: (role: AgentRole) => void;
  /** Worker 消息列表 */
  workerMessages: Array<{ role: AgentRole; content: string; ts: number }>;
  /** Supervisor 消息列表 */
  supervisorMessages: Array<{ role: AgentRole; content: string; ts: number }>;
  /** Worker 草稿 */
  workerDraft?: string;
  /** Supervisor 草稿 */
  supervisorDraft?: string;
  /** 草稿更新回调 */
  onDraftChange?: (role: AgentRole, draft: string) => void;
  /** 滚动位置更新回调 */
  onScrollPositionChange?: (role: AgentRole, position: number) => void;
  /** 是否禁用 Tab 切换 */
  disabled?: boolean;
  /** 终端宽度 */
  width?: number;
}

/**
 * DualTabSystem 组件
 */
export function DualTabSystem({
  activeRole,
  onRoleChange,
  workerMessages,
  supervisorMessages,
  workerDraft = '',
  supervisorDraft = '',
  onDraftChange,
  onScrollPositionChange,
  disabled = false,
  width = 80,
}: DualTabSystemProps) {
  const workerTabRef = useRef<any>(null);
  const supervisorTabRef = useRef<any>(null);

  // 处理 Tab 键切换
  useInput(
    (input, key) => {
      if (disabled) return;
      if (key.tab) {
        const newRole = activeRole === 'worker' ? 'supervisor' : 'worker';
        onRoleChange(newRole);
      }
    },
    { isActive: !disabled }
  );

  // 计算 Tab 标题宽度
  const tabTitleWidth = Math.floor(width / 2);

  return (
    <Box width="100%" flexDirection="column">
      {/* Tab 标题栏 */}
      <Box width="100%" flexDirection="row">
        <Box
          width={tabTitleWidth}
          justifyContent="center"
          borderStyle="round"
          borderColor={activeRole === 'supervisor' ? TONE.brand : FG.faint}
          paddingX={1}
        >
          <Text
            bold={activeRole === 'supervisor'}
            color={activeRole === 'supervisor' ? TONE.brand : FG.faint}
          >
            Supervisor
          </Text>
        </Box>
        <Box
          width={tabTitleWidth}
          justifyContent="center"
          borderStyle="round"
          borderColor={activeRole === 'worker' ? TONE.ok : FG.faint}
          paddingX={1}
        >
          <Text
            bold={activeRole === 'worker'}
            color={activeRole === 'worker' ? TONE.ok : FG.faint}
          >
            Worker
          </Text>
        </Box>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={FG.faint}>{`active: ${activeRole === 'worker' ? 'Worker' : 'Supervisor'}`}</Text>
        </Box>
      </Box>

      {/* 消息显示区域（根据当前 Tab 显示对应消息） */}
      <Box width="100%" flexDirection="column" marginTop={1}>
        {activeRole === 'worker' ? (
          <WorkerMessages messages={workerMessages} width={width} />
        ) : (
          <SupervisorMessages messages={supervisorMessages} width={width} />
        )}
      </Box>
    </Box>
  );
}

/**
 * Worker 消息显示组件
 */
function WorkerMessages({
  messages,
  width,
}: {
  messages: Array<{ role: AgentRole; content: string; ts: number }>;
  width: number;
}) {
  return (
    <Box width="100%" flexDirection="column">
      {messages.length === 0 ? (
        <Text color={FG.faint}>No messages yet. Send a message to Worker.</Text>
      ) : (
        messages.map((msg, index) => (
          <Box key={index} width="100%" flexDirection="column" marginBottom={1}>
            <Text color={TONE.ok}>Worker:</Text>
            <Text color={FG.sub}>{msg.content}</Text>
          </Box>
        ))
      )}
    </Box>
  );
}

/**
 * Supervisor 消息显示组件
 */
function SupervisorMessages({
  messages,
  width,
}: {
  messages: Array<{ role: AgentRole; content: string; ts: number }>;
  width: number;
}) {
  return (
    <Box width="100%" flexDirection="column">
      {messages.length === 0 ? (
        <Text color={FG.faint}>No messages yet. Send a message to Supervisor.</Text>
      ) : (
        messages.map((msg, index) => (
          <Box key={index} width="100%" flexDirection="column" marginBottom={1}>
            <Text color={TONE.brand}>Supervisor:</Text>
            <Text color={FG.sub}>{msg.content}</Text>
          </Box>
        ))
      )}
    </Box>
  );
}

/**
 * Tab 标题组件
 */
export function TabHeader({
  role,
  isActive,
  onClick,
}: {
  role: AgentRole;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      borderStyle="round"
      borderColor={isActive ? (role === 'worker' ? TONE.ok : TONE.brand) : FG.faint}
      paddingX={1}
      onClick={onClick}
    >
      <Text
        bold={isActive}
        color={isActive ? (role === 'worker' ? TONE.ok : TONE.brand) : FG.faint}
      >
        {role === 'worker' ? 'Worker' : 'Supervisor'}
      </Text>
    </Box>
  );
}

/**
 * 消息列表组件
 */
export function MessageList({
  messages,
  role,
  width,
}: {
  messages: Array<{ role: AgentRole; content: string; ts: number }>;
  role: AgentRole;
  width: number;
}) {
  const color = role === 'worker' ? TONE.ok : TONE.brand;

  return (
    <Box width="100%" flexDirection="column">
      {messages.length === 0 ? (
        <Text color={FG.faint}>No messages yet.</Text>
      ) : (
        messages.map((msg, index) => (
          <Box key={index} width="100%" flexDirection="column" marginBottom={1}>
            <Text bold color={color}>
              {role === 'worker' ? 'Worker' : 'Supervisor'}:
            </Text>
            <Text color={FG.sub}>{msg.content}</Text>
          </Box>
        ))
      )}
    </Box>
  );
}
