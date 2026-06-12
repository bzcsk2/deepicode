/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * Copied from gemini-cli/packages/cli/src/ui/themes/semantic-colors.ts
 * and adapted for Deepreef TUI.
 *
 * Provides a getter facade that delegates to the active ThemeManager.
 */

import type { SemanticColors } from './semantic-tokens.js';
import { themeManager } from './theme-manager.js';

/**
 * Returns semantic colors for the currently active theme.
 * Delegates to ThemeManager.getSemanticColors() which respects terminal background.
 */
export function getSemanticColors(): SemanticColors {
  return themeManager.getSemanticColors();
}
