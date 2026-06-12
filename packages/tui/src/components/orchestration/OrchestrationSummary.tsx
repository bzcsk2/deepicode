/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * Adapted from gemini-cli for Deepreef TUI.
 *
 * Three-column orchestration summary bar:
 *   Local Workers | Supervisor | Loop State
 */

import React from 'react';
import { Box, Text, type HexColor } from '@deepreef/ink';
import { getSemanticColors } from '../../theme/semantic-colors.js';
import type { WorkerDisplayData, WorkerStatus } from '../agents/AgentGroupDisplay.js';

export interface SupervisorDisplayData {
  id: string;
  modelName: string;
  status: 'reviewing' | 'idle' | 'cooldown' | 'unavailable';
  reviewingWorkerId?: string;
  lastAdvice?: string;
}

export type LoopPhase =
  | 'observe' | 'plan' | 'act' | 'verify' | 'reflect'
  | 'retry' | 'paused' | 'done' | 'failed';

interface OrchestrationSummaryProps {
  workers: WorkerDisplayData[];
  supervisors: SupervisorDisplayData[];
  loopPhase: LoopPhase;
  loopAttempt?: number;
  terminalWidth: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function workerStatusIcon(status: WorkerStatus): string {
  switch (status) {
    case 'running': return '!';
    case 'completed': return '\u2713';
    case 'failed': return '\u2717';
    case 'cancelled': return '\u2717';
    case 'waiting_permission':
    case 'waiting_question':
    case 'waiting_supervisor': return '\u23F3';
    case 'starting':
    case 'verifying':
    case 'paused': return '\u25C6';
    default: return '\u25CB';
  }
}

function workerStatusColor(status: WorkerStatus, theme: ReturnType<typeof getSemanticColors>): HexColor {
  switch (status) {
    case 'running': return theme.status.running as HexColor;
    case 'completed': return theme.status.success as HexColor;
    case 'failed':
    case 'cancelled': return theme.status.error as HexColor;
    case 'waiting_permission':
    case 'waiting_question':
    case 'waiting_supervisor': return theme.status.warning as HexColor;
    default: return theme.text.secondary as HexColor;
  }
}

function supervisorStatusIcon(status: SupervisorDisplayData['status']): string {
  switch (status) {
    case 'reviewing': return '\u25C6';
    case 'idle': return '\u25CB';
    case 'cooldown': return '\u23F3';
    case 'unavailable': return '\u2014';
    default: return '\u25CB';
  }
}

function supervisorStatusColor(status: SupervisorDisplayData['status'], theme: ReturnType<typeof getSemanticColors>): HexColor {
  switch (status) {
    case 'reviewing': return theme.status.running as HexColor;
    case 'idle': return theme.text.secondary as HexColor;
    case 'cooldown': return theme.status.warning as HexColor;
    case 'unavailable': return theme.ui.comment as HexColor;
    default: return theme.text.secondary as HexColor;
  }
}

function loopPhaseLabel(phase: LoopPhase): string {
  switch (phase) {
    case 'observe': return 'Observe';
    case 'plan': return 'Plan';
    case 'act': return 'Act';
    case 'verify': return 'Verify';
    case 'reflect': return 'Reflect';
    case 'retry': return 'Retry';
    case 'paused': return 'Paused';
    case 'done': return 'Done';
    case 'failed': return 'Failed';
    default: return phase;
  }
}

function loopPhaseIcon(phase: LoopPhase): string {
  switch (phase) {
    case 'observe': return '\uD83D\uDC41';
    case 'plan': return '\uD83D\uDCCB';
    case 'act': return '\u26A1';
    case 'verify': return '\u2713';
    case 'reflect': return '\uD83D\uDCAD';
    case 'retry': return '\u21BB';
    case 'paused': return '\u23F8';
    case 'done': return '\u2714';
    case 'failed': return '\u2716';
    default: return '\u25CB';
  }
}

function loopPhaseColor(phase: LoopPhase, theme: ReturnType<typeof getSemanticColors>): HexColor {
  switch (phase) {
    case 'done': return theme.status.success as HexColor;
    case 'failed': return theme.status.error as HexColor;
    case 'paused': return theme.status.warning as HexColor;
    case 'act':
    case 'verify': return theme.status.running as HexColor;
    default: return theme.text.primary as HexColor;
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '\u2026';
}

export const OrchestrationSummary: React.FC<OrchestrationSummaryProps> = ({
  workers,
  supervisors,
  loopPhase,
  loopAttempt,
  terminalWidth,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const theme = getSemanticColors();
  const colWidth = Math.floor(terminalWidth / 3);
  const rowWidth = colWidth - 2;

  return (
    <Box
      flexDirection="row"
      width={terminalWidth}
      borderStyle="single"
      borderTop
      borderLeft
      borderRight
      borderBottom
      borderColor={theme.border.default as HexColor}
    >
      {/* Column 1: Local Workers */}
      <Box flexDirection="column" width={colWidth} paddingX={1} borderStyle="single" borderRight borderColor={theme.border.default as HexColor}>
        <Text bold color={theme.text.primary as HexColor}>
          Local Workers
        </Text>
        {workers.length === 0 ? (
          <Text color={theme.text.secondary as HexColor}>No active workers</Text>
        ) : isCollapsed ? (
          <Text color={theme.text.secondary as HexColor}>
            {workers.length} worker{workers.length > 1 ? 's' : ''}
          </Text>
        ) : (
          workers.slice(0, 4).map(w => {
            const icon = workerStatusIcon(w.status);
            const color = workerStatusColor(w.status, theme);
            return (
              <Box key={w.id} flexDirection="row">
                <Text color={color}>{icon}</Text>
                <Text color={theme.text.primary as HexColor}> {truncate(w.modelName, rowWidth - 4)}</Text>
              </Box>
            );
          })
        )}
      </Box>

      {/* Column 2: Supervisor */}
      <Box flexDirection="column" width={colWidth} paddingX={1} borderStyle="single" borderRight borderColor={theme.border.default as HexColor}>
        <Text bold color={theme.text.primary as HexColor}>Supervisor</Text>
        {supervisors.length === 0 ? (
          <Text color={theme.text.secondary as HexColor}>No supervisor</Text>
        ) : (
          supervisors.slice(0, 2).map(s => {
            const icon = supervisorStatusIcon(s.status);
            const color = supervisorStatusColor(s.status, theme);
            return (
              <Box key={s.id} flexDirection="row">
                <Text color={color}>{icon}</Text>
                <Text color={theme.text.primary as HexColor}> {truncate(s.modelName, rowWidth - 4)}</Text>
              </Box>
            );
          })
        )}
      </Box>

      {/* Column 3: Loop State */}
      <Box flexDirection="column" width={colWidth} paddingX={1}>
        <Text bold color={theme.text.primary as HexColor}>Loop State</Text>
        <Box flexDirection="row">
          <Text color={loopPhaseColor(loopPhase, theme)}>
            {loopPhaseIcon(loopPhase)} {loopPhaseLabel(loopPhase)}
          </Text>
          {loopAttempt !== undefined && (
            <Text color={theme.text.secondary as HexColor}> #{loopAttempt}</Text>
          )}
        </Box>
      </Box>
    </Box>
  );
};
