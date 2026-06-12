/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * Copied from gemini-cli/packages/cli/src/ui/themes/theme-manager.ts
 * and adapted for Deepreef TUI.
 *
 * Changes from Gemini:
 * - Removed @google/gemini-cli-core dependency (debugLogger, homedir)
 * - Uses node:fs and os.homedir() directly
 * - Simplified extension/file theme loading (no extension system in Deepreef)
 */

import { AyuDark } from './builtin/dark/ayu-dark.js';
import { AyuLight } from './builtin/light/ayu-light.js';
import { AtomOneDark } from './builtin/dark/atom-one-dark.js';
import { Dracula } from './builtin/dark/dracula-dark.js';
import { GitHubDark } from './builtin/dark/github-dark.js';
import { GitHubLight } from './builtin/light/github-light.js';
import { GitHubDarkColorblind } from './builtin/dark/github-dark-colorblind.js';
import { GitHubLightColorblind } from './builtin/light/github-light-colorblind.js';
import { DefaultLight } from './builtin/light/default-light.js';
import { DefaultDark } from './builtin/dark/default-dark.js';
import { SolarizedDark } from './builtin/dark/solarized-dark.js';
import { SolarizedLight } from './builtin/light/solarized-light.js';
import { TokyoNight } from './builtin/dark/tokyonight-dark.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Theme, ThemeType, ColorsTheme, DeepreefCustomTheme } from './theme.js';
import {
  createCustomTheme,
  validateCustomTheme,
  interpolateColor,
  getThemeTypeFromBackgroundColor,
  resolveColor,
} from './theme.js';
import type { SemanticColors } from './semantic-tokens.js';
import {
  DEFAULT_INPUT_BACKGROUND_OPACITY,
  DEFAULT_SELECTION_OPACITY,
  DEFAULT_BORDER_OPACITY,
} from './constants.js';
import { ANSI } from './builtin/dark/ansi-dark.js';
import { ANSILight } from './builtin/light/ansi-light.js';
import { NoColorTheme } from './builtin/no-color.js';
import process from 'node:process';

export interface ThemeDisplay {
  name: string;
  type: ThemeType;
  isCustom?: boolean;
}

export const DEFAULT_THEME: Theme = DefaultDark;

class ThemeManager {
  private readonly availableThemes: Theme[];
  private activeTheme: Theme;
  private settingsThemes: Map<string, Theme> = new Map();
  private fileThemes: Map<string, Theme> = new Map();
  private terminalBackground: string | undefined;

  private cachedColors: ColorsTheme | undefined;
  private cachedSemanticColors: SemanticColors | undefined;
  private lastCacheKey: string | undefined;

  private fs: typeof fs;
  private homedir: () => string;

  constructor(dependencies?: { fs?: typeof fs; homedir?: () => string }) {
    this.fs = dependencies?.fs ?? fs;
    this.homedir = dependencies?.homedir ?? os.homedir;

    this.availableThemes = [
      AyuDark,
      AyuLight,
      AtomOneDark,
      Dracula,
      DefaultLight,
      DefaultDark,
      GitHubDark,
      GitHubLight,
      GitHubDarkColorblind,
      GitHubLightColorblind,
      SolarizedDark,
      SolarizedLight,
      TokyoNight,
      ANSI,
      ANSILight,
    ];
    this.activeTheme = DEFAULT_THEME;
  }

  setTerminalBackground(color: string | undefined): void {
    if (this.terminalBackground !== color) {
      this.terminalBackground = color;
      this.clearCache();
    }
  }

  getTerminalBackground(): string | undefined {
    return this.terminalBackground;
  }

  private clearCache(): void {
    this.cachedColors = undefined;
    this.cachedSemanticColors = undefined;
    this.lastCacheKey = undefined;
  }

  isDefaultTheme(themeName: string | undefined): boolean {
    return (
      themeName === undefined ||
      themeName === DEFAULT_THEME.name ||
      themeName === DefaultLight.name
    );
  }

  loadCustomThemes(customThemesSettings?: Record<string, DeepreefCustomTheme>): void {
    this.settingsThemes.clear();
    if (!customThemesSettings) {
      return;
    }

    for (const [name, customThemeConfig] of Object.entries(customThemesSettings)) {
      const validation = validateCustomTheme(customThemeConfig);
      if (validation.isValid) {
        const themeWithDefaults: DeepreefCustomTheme = {
          ...DEFAULT_THEME.colors,
          ...customThemeConfig,
          name: customThemeConfig.name || name,
          type: 'custom',
        };

        try {
          const theme = createCustomTheme(themeWithDefaults);
          this.settingsThemes.set(name, theme);
        } catch (error) {
          console.warn(`Failed to load custom theme "${name}":`, error);
        }
      } else {
        console.warn(`Invalid custom theme "${name}": ${validation.error}`);
      }
    }
    if (
      this.activeTheme &&
      this.activeTheme.type === 'custom' &&
      this.settingsThemes.has(this.activeTheme.name)
    ) {
      this.activeTheme = this.settingsThemes.get(this.activeTheme.name)!;
    }
  }

  setActiveTheme(themeName: string | undefined): boolean {
    const theme = this.findThemeByName(themeName);
    if (!theme) {
      return false;
    }
    if (this.activeTheme !== theme) {
      this.activeTheme = theme;
      this.clearCache();
    }
    return true;
  }

  getActiveTheme(): Theme {
    if (process.env['NO_COLOR']) {
      return NoColorTheme;
    }

    if (this.activeTheme) {
      const isBuiltIn = this.availableThemes.some(
        (t) => t.name === this.activeTheme.name,
      );
      const isCustom = [...this.settingsThemes.values()].includes(this.activeTheme) ||
        [...this.fileThemes.values()].includes(this.activeTheme);

      if (isBuiltIn || isCustom) {
        return this.activeTheme;
      }

      const reloadedTheme = this.findThemeByName(this.activeTheme.name);
      if (reloadedTheme) {
        this.activeTheme = reloadedTheme;
        return this.activeTheme;
      }
    }

    this.activeTheme = DEFAULT_THEME;
    return this.activeTheme;
  }

  getColors(): ColorsTheme {
    const activeTheme = this.getActiveTheme();
    const cacheKey = `${activeTheme.name}:${this.terminalBackground}`;
    if (this.cachedColors && this.lastCacheKey === cacheKey) {
      return this.cachedColors;
    }

    const colors = activeTheme.colors;
    if (
      this.terminalBackground &&
      this.isThemeCompatible(activeTheme, this.terminalBackground)
    ) {
      this.cachedColors = {
        ...colors,
        Background: this.terminalBackground,
        DarkGray: interpolateColor(
          this.terminalBackground,
          colors.Gray,
          DEFAULT_BORDER_OPACITY,
        ),
        InputBackground: interpolateColor(
          this.terminalBackground,
          colors.Gray,
          DEFAULT_INPUT_BACKGROUND_OPACITY,
        ),
        MessageBackground: interpolateColor(
          this.terminalBackground,
          colors.Gray,
          DEFAULT_INPUT_BACKGROUND_OPACITY,
        ),
        FocusBackground: interpolateColor(
          this.terminalBackground,
          activeTheme.colors.FocusColor ?? activeTheme.colors.AccentGreen,
          DEFAULT_SELECTION_OPACITY,
        ),
      };
    } else {
      this.cachedColors = colors;
    }

    this.lastCacheKey = cacheKey;
    return this.cachedColors;
  }

  getSemanticColors(): SemanticColors {
    const activeTheme = this.getActiveTheme();
    const cacheKey = `${activeTheme.name}:${this.terminalBackground}`;
    if (this.cachedSemanticColors && this.lastCacheKey === cacheKey) {
      return this.cachedSemanticColors;
    }

    const semanticColors = activeTheme.semanticColors;
    if (
      this.terminalBackground &&
      this.isThemeCompatible(activeTheme, this.terminalBackground)
    ) {
      const colors = this.getColors();
      this.cachedSemanticColors = {
        ...semanticColors,
        background: {
          ...semanticColors.background,
          primary: this.terminalBackground,
          message: colors.MessageBackground!,
          input: colors.InputBackground!,
          focus: colors.FocusBackground!,
        },
        border: {
          ...semanticColors.border,
          default: colors.DarkGray,
        },
        ui: {
          ...semanticColors.ui,
          dark: colors.DarkGray,
          focus: colors.FocusColor ?? colors.AccentGreen,
        },
      };
    } else {
      this.cachedSemanticColors = semanticColors;
    }

    this.lastCacheKey = cacheKey;
    return this.cachedSemanticColors;
  }

  isThemeCompatible(
    activeTheme: Theme,
    terminalBackground: string | undefined,
  ): boolean {
    if (activeTheme.type === 'ansi') {
      return true;
    }

    const backgroundType = getThemeTypeFromBackgroundColor(terminalBackground);
    if (!backgroundType) {
      return true;
    }

    const themeType =
      activeTheme.type === 'custom'
        ? getThemeTypeFromBackgroundColor(
            resolveColor(activeTheme.colors.Background) ||
              activeTheme.colors.Background,
          )
        : activeTheme.type;

    return themeType === backgroundType;
  }

  getAvailableThemes(): ThemeDisplay[] {
    const builtInThemes = this.availableThemes.map((theme) => ({
      name: theme.name,
      type: theme.type,
      isCustom: false,
    }));

    const customThemes = Array.from(this.settingsThemes.values()).map((theme) => ({
      name: theme.name,
      type: theme.type,
      isCustom: true,
    }));

    const allThemes = [...builtInThemes, ...customThemes];

    return allThemes.sort((a, b) => {
      const typeOrder = (type: ThemeType): number => {
        switch (type) {
          case 'dark': return 1;
          case 'light': return 2;
          case 'ansi': return 3;
          case 'custom': return 4;
          default: return 5;
        }
      };

      const typeComparison = typeOrder(a.type) - typeOrder(b.type);
      if (typeComparison !== 0) {
        return typeComparison;
      }
      return a.name.localeCompare(b.name);
    });
  }

  getTheme(themeName: string): Theme | undefined {
    return this.findThemeByName(themeName);
  }

  getAllThemes(): Theme[] {
    return [...this.availableThemes, ...Array.from(this.settingsThemes.values())];
  }

  findThemeByName(themeName: string | undefined): Theme | undefined {
    if (!themeName) {
      return DEFAULT_THEME;
    }

    const builtInTheme = this.availableThemes.find(
      (theme) => theme.name === themeName,
    );
    if (builtInTheme) {
      return builtInTheme;
    }

    if (themeName.endsWith('.json') || path.isAbsolute(themeName)) {
      return this.loadThemeFromFile(themeName);
    }

    if (this.settingsThemes.has(themeName)) {
      return this.settingsThemes.get(themeName);
    }

    if (this.fileThemes.has(themeName)) {
      return this.fileThemes.get(themeName);
    }

    return undefined;
  }

  private loadThemeFromFile(themePath: string): Theme | undefined {
    try {
      const canonicalPath = this.fs.realpathSync(path.resolve(themePath));

      if (this.fileThemes.has(canonicalPath)) {
        return this.fileThemes.get(canonicalPath);
      }

      const themeContent = this.fs.readFileSync(canonicalPath, 'utf-8');
      const customThemeConfig = JSON.parse(themeContent) as DeepreefCustomTheme;

      const validation = validateCustomTheme(customThemeConfig);
      if (!validation.isValid) {
        console.warn(`Invalid custom theme from file "${themePath}": ${validation.error}`);
        return undefined;
      }

      const themeWithDefaults: DeepreefCustomTheme = {
        ...DEFAULT_THEME.colors,
        ...customThemeConfig,
        name: customThemeConfig.name || canonicalPath,
        type: 'custom',
      };

      const theme = createCustomTheme(themeWithDefaults);
      this.fileThemes.set(canonicalPath, theme);
      return theme;
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        console.warn(`Could not load theme from file "${themePath}":`, error);
      }
      return undefined;
    }
  }

  resetForTesting(dependencies?: { fs?: typeof fs; homedir?: () => string }): void {
    if (dependencies) {
      if (dependencies.fs) this.fs = dependencies.fs;
      if (dependencies.homedir) this.homedir = dependencies.homedir;
    }
    this.settingsThemes.clear();
    this.fileThemes.clear();
    this.activeTheme = DEFAULT_THEME;
    this.terminalBackground = undefined;
    this.clearCache();
  }
}

export const themeManager = new ThemeManager();
