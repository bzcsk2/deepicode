/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * Adapted from gemini-cli/packages/cli/src/ui/components/SubagentGroupDisplay.tsx
 * for Deepreef TUI.
 *
 * Changes from Gemini:
 * - Renamed "subagent" → "worker" throughout
 * - Uses Deepreef WorkerStatus enum (queued, starting, running, etc.)
 * - Uses themeManager.getColors() for status colors
 * - Delegates to AgentProgressDisplay for expanded view
 */

import React from 'react';
import { Box, Text, type HexColor } from '@deepreef/ink';
import { getSemanticColors } from '../../theme/semantic-colors.js';
import { AgentProgressDisplay } from './AgentProgressDisplay.js';

export type WorkerStatus =
  | 'queued' | 'starting' | 'running' | 'waiting_permission'
  | 'waiting_question' | 'waiting_supervisor' | 'verifying'
  | 'paused' | 'completed' | 'failed' | 'cancelled' | 'idle';

export interface WorkerDisplayData {
  id: string;
  modelName: string;
  status: WorkerStatus;
  currentTask?: string;
  lastActivity?: string;
  duration?: string;
  progress?: AgentProgressData;
}

export interface AgentProgressData {
  activities: AgentActivityItem[];
  result?: string;
  terminateReason?: string;
}

export interface AgentActivityItem {
  type: 'thought' | 'tool_call' | 'tool_result' | 'state_change';
  content: string;
  toolName?: string;
  status?: 'running' | 'completed' | 'error' | 'cancelled';
  ts?: number;
}

interface AgentGroupDisplayProps {
  workers: WorkerDisplayData[];
  terminalWidth: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

function getStatusIcon(status: WorkerStatus): string {
  switch (status) {
    case 'running': return '!';
    case 'completed': return '\u2713';
    case 'failed':
    case 'cancelled': return '\u2717';
    case 'idle':
    case 'queued': return '\u25CB';
    case 'waiting_permission':
    case 'waiting_question':
    case 'waiting_supervisor': return '\u23F3';
    case 'starting':
    case 'verifying':
    case 'paused': return '\u25C6';
    default: return '\u25CB';
  }
}

function getStatusColor(status: WorkerStatus): HexColor {
  const theme = getSemanticColors();
  switch (status) {
    case 'running': return theme.status.running as HexColor;
    case 'completed': return theme.status.success as HexColor;
    case 'failed':
    case 'cancelled': return theme.status.error as HexColor;
    case 'waiting_permission':
    case 'waiting_question':
    case 'waiting_supervisor': return theme.status.warning as HexColor;
    case 'idle':
    case 'queued':
    case 'starting':
    case 'verifying':
    case 'paused': return theme.text.secondary as HexColor;
    default: return theme.text.secondary as HexColor;
  }
}

function getStatusLabel(status: WorkerStatus): string {
  switch (status) {
    case 'queued': return 'Queued';
    case 'starting': return 'Starting';
    case 'running': return 'Running';
    case 'waiting_permission': return 'Needs Permission';
    case 'waiting_question': return 'Awaiting Answer';
    case 'waiting_supervisor': return 'Supervisor Review';
    case 'verifying': return 'Verifying';
    case 'paused': return 'Paused';
    case 'completed': return 'Completed';
    case 'failed': return 'Failed';
    case 'cancelled': return 'Cancelled';
    case 'idle': return 'Idle';
    default: return status;
  }
}

function computeGroupHeader(workers: WorkerDisplayData[]): string {
  const running = workers.filter(w => w.status === 'running' || w.status === 'starting').length;
  const completed = workers.filter(w => w.status === 'completed').length;
  const failed = workers.filter(w => w.status === 'failed' || w.status === 'cancelled').length;

  const parts: string[] = [];
  if (running > 0) parts.push(`${running} Running`);
  if (completed > 0) parts.push(`${completed} Completed`);
  if (failed > 0) parts.push(`${failed} Failed`);

  if (parts.length === 0) {
    if (workers.length === 0) return 'No Workers';
    return `${workers.length} Worker${workers.length > 1 ? 's' : ''} Idle`;
  }
  return parts.join(', ') + (running > 0 ? '...' : '');
}

export const AgentGroupDisplay: React.FC<AgentGroupDisplayProps> = ({
  workers,
  terminalWidth,
  isExpanded = false,
  onToggleExpand,
}) => {
  const theme = getSemanticColors();
  const header = computeGroupHeader(workers);

  return (
    <Box flexDirection="column" width={terminalWidth}>
      {/* Group header */}
      <Box flexDirection="row" paddingX={1}>
        <Text bold color={theme.text.primary as HexColor}>
          {header}
        </Text>
        {onToggleExpand && workers.length > 0 && (
          <Text color={theme.text.secondary as HexColor}>
            {` ${isExpanded ? '\u25BC' : '\u25B6'}`}
          </Text>
        )}
      </Box>

      {/* Worker list */}
      {workers.length > 0 && (
        <Box flexDirection="column" paddingLeft={1}>
          {!isExpanded ? (
            // Collapsed: compact single-line per worker
            workers.map(w => {
              const icon = getStatusIcon(w.status);
              const color = getStatusColor(w.status);
              return (
                <Box key={w.id} flexDirection="row">
                  <Text color={color}>{icon}</Text>
                  <Text color={theme.text.primary as HexColor}> {w.modelName}</Text>
                  <Text color={theme.text.secondary as HexColor}> {getStatusLabel(w.status)}</Text>
                  {w.duration && (
                    <Text color={theme.text.secondary as HexColor}> {w.duration}</Text>
                  )}
                </Box>
              );
            })
          ) : (
            // Expanded: detailed progress per worker
            workers.map(w => (
              <AgentProgressDisplay
                key={w.id}
                worker={w}
                terminalWidth={terminalWidth - 2}
              />
            ))
          )}
        </Box>
      )}
    </Box>
  );
};
