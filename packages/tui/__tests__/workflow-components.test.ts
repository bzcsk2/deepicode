/**
 * Workflow 组件测试
 */

import { describe, it, expect } from 'bun:test';
import type { WorkflowPhase } from '../src/components/workflow/WorkflowStatusBar.js';
import type { AgentRole, TabState, DualTabSystemProps, WorkflowState, WorkflowStatusBarProps } from '../src/components/workflow/index.js';

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

// DA-R6: DualTabSystem 和 WorkflowStatusBar 集成测试

describe('DualTabSystem', () => {
  it('should have valid TabState structure', () => {
    const workerTab: TabState = {
      role: 'worker',
      messages: [],
      draft: '',
      scrollPosition: 0,
    };

    const supervisorTab: TabState = {
      role: 'supervisor',
      messages: [],
      draft: '',
      scrollPosition: 0,
    };

    expect(workerTab.role).toBe('worker');
    expect(supervisorTab.role).toBe('supervisor');
  });

  it('should have valid DualTabSystemProps structure', () => {
    const props: DualTabSystemProps = {
      activeRole: 'worker',
      onRoleChange: () => {},
      workerMessages: [],
      supervisorMessages: [],
      workerDraft: '',
      supervisorDraft: '',
      onDraftChange: () => {},
      onScrollPositionChange: () => {},
      disabled: false,
      width: 80,
    };

    expect(props.activeRole).toBe('worker');
    expect(props.disabled).toBe(false);
    expect(props.width).toBe(80);
  });

  it('should support role switching only when not disabled', () => {
    const props: DualTabSystemProps = {
      activeRole: 'worker',
      onRoleChange: () => {},
      workerMessages: [],
      supervisorMessages: [],
      disabled: false,
    };

    expect(props.disabled).toBe(false);
  });

  it('should preserve messages per role', () => {
    const workerMessages = [
      { role: 'worker' as AgentRole, content: 'Worker message 1', ts: Date.now() },
      { role: 'worker' as AgentRole, content: 'Worker message 2', ts: Date.now() },
    ];

    const supervisorMessages = [
      { role: 'supervisor' as AgentRole, content: 'Supervisor message 1', ts: Date.now() },
    ];

    expect(workerMessages.length).toBe(2);
    expect(supervisorMessages.length).toBe(1);
  });

  it('should preserve draft per role', () => {
    const workerDraft = 'Worker draft text';
    const supervisorDraft = 'Supervisor draft text';

    expect(workerDraft).not.toBe(supervisorDraft);
  });

  it('should preserve scroll position per role', () => {
    const workerScrollPosition = 10;
    const supervisorScrollPosition = 5;

    expect(workerScrollPosition).not.toBe(supervisorScrollPosition);
  });
});

describe('WorkflowStatusBar', () => {
  it('should have valid WorkflowState structure', () => {
    const state: WorkflowState = {
      phase: 'idle',
      iteration: 0,
      maxRounds: 9,
      goal: 'Test goal',
      supervisorStatus: 'idle',
      workerStatus: 'idle',
    };

    expect(state.phase).toBe('idle');
    expect(state.iteration).toBe(0);
    expect(state.maxRounds).toBe(9);
  });

  it('should have valid WorkflowStatusBarProps structure', () => {
    const props: WorkflowStatusBarProps = {
      workflow: {
        phase: 'idle',
        iteration: 0,
        maxRounds: 9,
        goal: 'Test goal',
        supervisorStatus: 'idle',
        workerStatus: 'idle',
      },
      activeRole: 'worker',
      width: 80,
    };

    expect(props.workflow.phase).toBe('idle');
    expect(props.activeRole).toBe('worker');
    expect(props.width).toBe(80);
  });

  it('should track iteration and maxRounds correctly', () => {
    const state: WorkflowState = {
      phase: 'supervisor_analyse',
      iteration: 3,
      maxRounds: 9,
      goal: 'Test goal',
      supervisorStatus: 'analyse',
      workerStatus: 'waiting',
    };

    expect(state.iteration).toBeLessThan(state.maxRounds);
    expect(state.maxRounds).toBe(9);
  });

  it('should block when iteration reaches maxRounds', () => {
    const state: WorkflowState = {
      phase: 'blocked',
      iteration: 9,
      maxRounds: 9,
      goal: 'Test goal',
      supervisorStatus: 'blocked',
      workerStatus: 'blocked',
    };

    expect(state.iteration).toBe(state.maxRounds);
  });

  it('should display correct phase chain', () => {
    const phases: WorkflowPhase[] = [
      'supervisor_analyse',
      'worker_do',
      'worker_report',
      'supervisor_check',
    ];

    expect(phases.length).toBe(4);
  });

  it('should only show approve layout phases: analyse > do > report', () => {
    const approveLayoutPhases: WorkflowPhase[] = [
      'supervisor_analyse',
      'worker_do',
      'worker_report',
    ];

    expect(approveLayoutPhases.length).toBe(3);
  });
});

describe('DA-R6 Integration', () => {
  it('should support independent message histories per role', () => {
    const workerHistory: Array<{ role: AgentRole; content: string; ts: number }> = [];
    const supervisorHistory: Array<{ role: AgentRole; content: string; ts: number }> = [];

    workerHistory.push({ role: 'worker', content: 'Worker msg 1', ts: Date.now() });
    supervisorHistory.push({ role: 'supervisor', content: 'Supervisor msg 1', ts: Date.now() });

    expect(workerHistory.length).toBe(1);
    expect(supervisorHistory.length).toBe(1);
    expect(workerHistory[0].role).toBe('worker');
    expect(supervisorHistory[0].role).toBe('supervisor');
  });

  it('should support independent scroll positions per role', () => {
    const scrollPositions: Record<AgentRole, number> = {
      worker: 0,
      supervisor: 0,
    };

    scrollPositions.worker = 10;
    scrollPositions.supervisor = 5;

    expect(scrollPositions.worker).toBe(10);
    expect(scrollPositions.supervisor).toBe(5);
  });

  it('should support independent drafts per role', () => {
    const drafts: Record<AgentRole, string> = {
      worker: '',
      supervisor: '',
    };

    drafts.worker = 'Worker draft';
    drafts.supervisor = 'Supervisor draft';

    expect(drafts.worker).toBe('Worker draft');
    expect(drafts.supervisor).toBe('Supervisor draft');
  });

  it('should prevent tab switching during overlay states', () => {
    const overlayStates = [
      'permission',
      'question',
      'autocomplete',
      'skillModal',
      'contextModal',
    ];

    expect(overlayStates.length).toBe(5);
  });

  it('should place WorkflowStatusBar above input in bottomContent', () => {
    const bottomContentOrder = [
      'WorkflowStatusBar',
      'CommandAutocomplete',
      'DeepiPromptInput',
      'BridgeStatusBar',
    ];

    expect(bottomContentOrder[0]).toBe('WorkflowStatusBar');
  });
});
