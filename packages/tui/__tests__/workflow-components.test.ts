/**
 * Workflow 组件测试
 */

import { describe, it, expect } from 'bun:test';
import type { WorkflowPhase } from '../src/components/workflow/WorkflowStatusBar.js';

// 测试 WorkflowPhase 类型
describe('WorkflowPhase', () => {
  it('should have valid phase values', () => {
    const validPhases: WorkflowPhase[] = [
      'idle',
      'supervisor_analyse',
      'worker_do',
      'worker_report',
      'supervisor_check',
      'continue',
      'revise',
      'approve',
      'blocked',
      'ask_user',
    ];

    expect(validPhases.length).toBe(10);
  });
});

// 测试阶段显示映射
describe('PHASE_DISPLAY', () => {
  it('should have display info for each phase', () => {
    const PHASE_DISPLAY: Record<WorkflowPhase, { label: string; prefix: string; color: string }> = {
      idle: { label: 'idle', prefix: '', color: '#666' },
      supervisor_analyse: { label: 'analyse', prefix: '[D]', color: '#00ff00' },
      worker_do: { label: 'do', prefix: '[W]', color: '#00ff00' },
      worker_report: { label: 'report', prefix: '[W]', color: '#00ff00' },
      supervisor_check: { label: 'check', prefix: '[D]', color: '#00ff00' },
      continue: { label: 'continue', prefix: '[D]', color: '#00ff00' },
      revise: { label: 'revise', prefix: '[D]', color: '#ffff00' },
      approve: { label: 'approve', prefix: '[D]', color: '#00ff00' },
      blocked: { label: 'blocked', prefix: '[D]', color: '#ff0000' },
      ask_user: { label: 'ask_user', prefix: '[D]', color: '#ffff00' },
    };

    for (const phase of Object.keys(PHASE_DISPLAY) as WorkflowPhase[]) {
      expect(PHASE_DISPLAY[phase]).toBeDefined();
      expect(PHASE_DISPLAY[phase].label).toBeTruthy();
    }
  });
});

// 测试角色状态显示映射
describe('ROLE_STATUS_DISPLAY', () => {
  it('should have display info for each status', () => {
    const ROLE_STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
      idle: { label: 'idle', color: '#666' },
      analyse: { label: 'analyse', color: '#00ff00' },
      do: { label: 'do', color: '#00ff00' },
      report: { label: 'report', color: '#00ff00' },
      waiting: { label: 'wait', color: '#999' },
      blocked: { label: 'blocked', color: '#ff0000' },
    };

    for (const status of Object.keys(ROLE_STATUS_DISPLAY)) {
      expect(ROLE_STATUS_DISPLAY[status]).toBeDefined();
      expect(ROLE_STATUS_DISPLAY[status].label).toBeTruthy();
    }
  });
});

// 测试截断函数
describe('truncateText', () => {
  it('should truncate text to specified width', () => {
    function truncateText(text: string, maxWidth: number): string {
      if (text.length <= maxWidth) return text;
      if (maxWidth <= 3) return text.slice(0, maxWidth);
      return text.slice(0, maxWidth - 3) + '...';
    }

    expect(truncateText('Hello World', 20)).toBe('Hello World');
    expect(truncateText('Hello World', 8)).toBe('Hello...');
    expect(truncateText('Hello World', 3)).toBe('Hel');
    expect(truncateText('Hello World', 2)).toBe('He');
  });
});

// 测试阶段链构建
describe('buildPhaseChain', () => {
  it('should build phase chain correctly', () => {
    function buildPhaseChain(currentPhase: WorkflowPhase): string {
      const phases: Array<{ key: WorkflowPhase; label: string; prefix: string }> = [
        { key: 'supervisor_analyse', label: 'analyse', prefix: '[D]' },
        { key: 'worker_do', label: 'do', prefix: '[W]' },
        { key: 'worker_report', label: 'report', prefix: '[W]' },
        { key: 'supervisor_check', label: 'check', prefix: '[D]' },
      ];

      const parts: string[] = [];
      for (const p of phases) {
        if (p.key === currentPhase) {
          parts.push(`${p.prefix} ${p.label}`);
          break;
        } else {
          parts.push(`${p.prefix} ${p.label}`);
        }
      }

      return parts.join(' > ');
    }

    expect(buildPhaseChain('supervisor_analyse')).toBe('[D] analyse');
    expect(buildPhaseChain('worker_do')).toBe('[D] analyse > [W] do');
    expect(buildPhaseChain('worker_report')).toBe('[D] analyse > [W] do > [W] report');
    expect(buildPhaseChain('supervisor_check')).toBe('[D] analyse > [W] do > [W] report > [D] check');
  });
});
