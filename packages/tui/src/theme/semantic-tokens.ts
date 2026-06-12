/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * Copied from gemini-cli/packages/cli/src/ui/themes/semantic-tokens.ts
 * and adapted for Deepreef TUI.
 *
 * Deepreef 增加 status.running 和 status.idle 语义色，用于 Worker/Supervisor/Loop 状态展示。
 */

export interface SemanticColors {
  text: {
    primary: string;
    secondary: string;
    link: string;
    accent: string;
    response: string;
  };
  background: {
    primary: string;
    message: string;
    input: string;
    focus: string;
    diff: {
      added: string;
      removed: string;
    };
  };
  border: {
    default: string;
  };
  ui: {
    comment: string;
    symbol: string;
    active: string;
    dark: string;
    focus: string;
    gradient: string[] | undefined;
  };
  status: {
    error: string;
    success: string;
    warning: string;
    running: string;
    idle: string;
  };
}
