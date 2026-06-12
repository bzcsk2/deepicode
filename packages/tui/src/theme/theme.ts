/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * Copied from gemini-cli/packages/cli/src/ui/themes/theme.ts
 * and adapted for Deepreef TUI.
 *
 * Changes from Gemini:
 * - Removed import of CustomTheme from @google/gemini-cli-core (not available in Deepreef)
 * - Defined DeepreefCustomTheme interface locally
 * - Removed DEFAULT_BACKGROUND_OPACITY import (now in constants.ts)
 */

import type { CSSProperties } from 'react';

import type { SemanticColors } from './semantic-tokens.js';
import {
  DEFAULT_INPUT_BACKGROUND_OPACITY,
  DEFAULT_SELECTION_OPACITY,
  DEFAULT_BORDER_OPACITY,
} from './constants.js';
import tinygradient from 'tinygradient';
import tinycolor from 'tinycolor2';

// Define the set of Ink's named colors for quick lookup
export const INK_SUPPORTED_NAMES = new Set([
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'cyan',
  'magenta',
  'white',
  'gray',
  'grey',
  'blackbright',
  'redbright',
  'greenbright',
  'yellowbright',
  'bluebright',
  'cyanbright',
  'magentabright',
  'whitebright',
]);

// Use tinycolor's built-in names map for CSS colors, excluding ones Ink supports
export const CSS_NAME_TO_HEX_MAP = Object.fromEntries(
  Object.entries(tinycolor.names)
    .filter(([name]) => !INK_SUPPORTED_NAMES.has(name))
    .map(([name, hex]) => [name, `#${hex}`]),
);

// Mapping for ANSI bright colors that are not in tinycolor's standard CSS names
export const INK_NAME_TO_HEX_MAP: Readonly<Record<string, string>> = {
  blackbright: '#555555',
  redbright: '#ff5555',
  greenbright: '#55ff55',
  yellowbright: '#ffff55',
  bluebright: '#5555ff',
  magentabright: '#ff55ff',
  cyanbright: '#55ffff',
  whitebright: '#ffffff',
};

/**
 * Calculates the relative luminance of a color.
 */
export function getLuminance(color: string): number {
  const resolved = color.toLowerCase();
  const hex = INK_NAME_TO_HEX_MAP[resolved] || resolved;
  const colorObj = tinycolor(hex);
  if (!colorObj.isValid()) {
    return 0;
  }
  return colorObj.getLuminance() * 255;
}

/**
 * Resolves a CSS color value (name or hex) into an Ink-compatible color string.
 */
export function resolveColor(colorValue: string): string | undefined {
  const lowerColor = colorValue.toLowerCase();

  if (lowerColor.startsWith('#')) {
    if (/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(colorValue)) {
      return lowerColor;
    } else {
      return undefined;
    }
  }

  if (/^[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(colorValue)) {
    return `#${lowerColor}`;
  }

  if (INK_SUPPORTED_NAMES.has(lowerColor)) {
    return lowerColor;
  }

  const colorObj = tinycolor(lowerColor);
  if (colorObj.isValid()) {
    return colorObj.toHexString();
  }

  return undefined;
}

export function interpolateColor(
  color1: string,
  color2: string,
  factor: number,
) {
  if (factor <= 0 && color1) {
    return color1;
  }
  if (factor >= 1 && color2) {
    return color2;
  }
  if (!color1 || !color2) {
    return '';
  }
  try {
    const gradient = tinygradient(color1, color2);
    const color = gradient.rgbAt(factor);
    return color.toHexString();
  } catch {
    return color1;
  }
}

export function getThemeTypeFromBackgroundColor(
  backgroundColor: string | undefined,
): 'light' | 'dark' | undefined {
  if (!backgroundColor) {
    return undefined;
  }

  const resolvedColor = resolveColor(backgroundColor);
  if (!resolvedColor) {
    return undefined;
  }

  const luminance = getLuminance(resolvedColor);
  return luminance > 128 ? 'light' : 'dark';
}

/**
 * Deepreef custom theme interface (replaces Gemini's CustomTheme from @google/gemini-cli-core).
 */
export interface DeepreefCustomTheme {
  name: string;
  type?: string;
  Background?: string;
  Foreground?: string;
  LightBlue?: string;
  AccentBlue?: string;
  AccentPurple?: string;
  AccentCyan?: string;
  AccentGreen?: string;
  AccentYellow?: string;
  AccentRed?: string;
  DiffAdded?: string;
  DiffRemoved?: string;
  Comment?: string;
  Gray?: string;
  DarkGray?: string;
  GradientColors?: string[];
  text?: { primary?: string; secondary?: string; link?: string; accent?: string; response?: string };
  background?: { primary?: string; diff?: { added?: string; removed?: string } };
  status?: { error?: string; success?: string; warning?: string };
  ui?: { comment?: string; symbol?: string; active?: string; focus?: string; gradient?: string[] };
}

export type ThemeType = 'light' | 'dark' | 'ansi' | 'custom';

export interface ColorsTheme {
  type: ThemeType;
  Background: string;
  Foreground: string;
  LightBlue: string;
  AccentBlue: string;
  AccentPurple: string;
  AccentCyan: string;
  AccentGreen: string;
  AccentYellow: string;
  AccentRed: string;
  DiffAdded: string;
  DiffRemoved: string;
  Comment: string;
  Gray: string;
  DarkGray: string;
  InputBackground?: string;
  MessageBackground?: string;
  FocusBackground?: string;
  FocusColor?: string;
  GradientColors?: string[];
}

export const lightTheme: ColorsTheme = {
  type: 'light',
  Background: '#FFFFFF',
  Foreground: '#000000',
  LightBlue: '#005FAF',
  AccentBlue: '#005FAF',
  AccentPurple: '#5F00FF',
  AccentCyan: '#005F87',
  AccentGreen: '#005F00',
  AccentYellow: '#875F00',
  AccentRed: '#AF0000',
  DiffAdded: '#D7FFD7',
  DiffRemoved: '#FFD7D7',
  Comment: '#008700',
  Gray: '#5F5F5F',
  DarkGray: '#5F5F5F',
  InputBackground: '#E4E4E4',
  MessageBackground: '#FAFAFA',
  FocusBackground: '#D7FFD7',
  GradientColors: ['#4796E4', '#847ACE', '#C3677F'],
};

export const darkTheme: ColorsTheme = {
  type: 'dark',
  Background: '#000000',
  Foreground: '#FFFFFF',
  LightBlue: '#AFD7D7',
  AccentBlue: '#87AFFF',
  AccentPurple: '#D7AFFF',
  AccentCyan: '#87D7D7',
  AccentGreen: '#D7FFD7',
  AccentYellow: '#FFFFAF',
  AccentRed: '#FF87AF',
  DiffAdded: '#005F00',
  DiffRemoved: '#5F0000',
  Comment: '#AFAFAF',
  Gray: '#AFAFAF',
  DarkGray: '#878787',
  InputBackground: '#5F5F5F',
  MessageBackground: '#5F5F5F',
  FocusBackground: '#005F00',
  GradientColors: ['#4796E4', '#847ACE', '#C3677F'],
};

export const ansiTheme: ColorsTheme = {
  type: 'ansi',
  Background: 'black',
  Foreground: '',
  LightBlue: 'blue',
  AccentBlue: 'blue',
  AccentPurple: 'magenta',
  AccentCyan: 'cyan',
  AccentGreen: 'green',
  AccentYellow: 'yellow',
  AccentRed: 'red',
  DiffAdded: 'green',
  DiffRemoved: 'red',
  Comment: 'gray',
  Gray: 'gray',
  DarkGray: 'gray',
  InputBackground: 'black',
  MessageBackground: 'black',
  FocusBackground: 'black',
};

export class Theme {
  readonly defaultColor: string;
  protected readonly _colorMap: Readonly<Record<string, string>>;
  readonly semanticColors: SemanticColors;

  constructor(
    readonly name: string,
    readonly type: ThemeType,
    rawMappings: Record<string, CSSProperties>,
    readonly colors: ColorsTheme,
    semanticColors?: SemanticColors,
  ) {
    this.semanticColors = semanticColors ?? {
      text: {
        primary: this.colors.Foreground,
        secondary: this.colors.Gray,
        link: this.colors.AccentBlue,
        accent: this.colors.AccentPurple,
        response: this.colors.Foreground,
      },
      background: {
        primary: this.colors.Background,
        message:
          this.colors.MessageBackground ??
          interpolateColor(this.colors.Background, this.colors.Gray, DEFAULT_INPUT_BACKGROUND_OPACITY),
        input:
          this.colors.InputBackground ??
          interpolateColor(this.colors.Background, this.colors.Gray, DEFAULT_INPUT_BACKGROUND_OPACITY),
        focus:
          this.colors.FocusBackground ??
          interpolateColor(this.colors.Background, this.colors.FocusColor ?? this.colors.AccentGreen, DEFAULT_SELECTION_OPACITY),
        diff: {
          added: this.colors.DiffAdded,
          removed: this.colors.DiffRemoved,
        },
      },
      border: {
        default: this.colors.DarkGray,
      },
      ui: {
        comment: this.colors.Gray,
        symbol: this.colors.AccentCyan,
        active: this.colors.AccentBlue,
        dark: this.colors.DarkGray,
        focus: this.colors.FocusColor ?? this.colors.AccentGreen,
        gradient: this.colors.GradientColors,
      },
      status: {
        error: this.colors.AccentRed,
        success: this.colors.AccentGreen,
        warning: this.colors.AccentYellow,
        running: this.colors.AccentBlue,
        idle: this.colors.Gray,
      },
    };
    this._colorMap = Object.freeze(this._buildColorMap(rawMappings));

    const rawDefaultColor = rawMappings['hljs']?.color;
    this.defaultColor =
      (rawDefaultColor ? Theme._resolveColor(rawDefaultColor) : undefined) ?? '';
  }

  getInkColor(hljsClass: string): string | undefined {
    return this._colorMap[hljsClass];
  }

  private static _resolveColor(colorValue: string): string | undefined {
    return resolveColor(colorValue);
  }

  protected _buildColorMap(hljsTheme: Record<string, CSSProperties>): Record<string, string> {
    const inkTheme: Record<string, string> = {};
    for (const key in hljsTheme) {
      if (!key.startsWith('hljs-') && key !== 'hljs') {
        continue;
      }
      const style = hljsTheme[key];
      if (style?.color) {
        const resolvedColor = Theme._resolveColor(style.color);
        if (resolvedColor !== undefined) {
          inkTheme[key] = resolvedColor;
        }
      }
    }
    return inkTheme;
  }
}

export function createCustomTheme(customTheme: DeepreefCustomTheme): Theme {
  const colors: ColorsTheme = {
    type: 'custom',
    Background: customTheme.background?.primary ?? customTheme.Background ?? '',
    Foreground: customTheme.text?.primary ?? customTheme.Foreground ?? '',
    LightBlue: customTheme.text?.link ?? customTheme.LightBlue ?? '',
    AccentBlue: customTheme.text?.link ?? customTheme.AccentBlue ?? '',
    AccentPurple: customTheme.text?.accent ?? customTheme.AccentPurple ?? '',
    AccentCyan: customTheme.text?.link ?? customTheme.AccentCyan ?? '',
    AccentGreen: customTheme.status?.success ?? customTheme.AccentGreen ?? '',
    AccentYellow: customTheme.status?.warning ?? customTheme.AccentYellow ?? '',
    AccentRed: customTheme.status?.error ?? customTheme.AccentRed ?? '',
    DiffAdded: customTheme.background?.diff?.added ?? customTheme.DiffAdded ?? '',
    DiffRemoved: customTheme.background?.diff?.removed ?? customTheme.DiffRemoved ?? '',
    Comment: customTheme.ui?.comment ?? customTheme.Comment ?? '',
    Gray: customTheme.text?.secondary ?? customTheme.Gray ?? '',
    DarkGray:
      customTheme.DarkGray ??
      interpolateColor(
        customTheme.background?.primary ?? customTheme.Background ?? '',
        customTheme.text?.secondary ?? customTheme.Gray ?? '',
        DEFAULT_BORDER_OPACITY,
      ),
    InputBackground: interpolateColor(
      customTheme.background?.primary ?? customTheme.Background ?? '',
      customTheme.text?.secondary ?? customTheme.Gray ?? '',
      DEFAULT_INPUT_BACKGROUND_OPACITY,
    ),
    MessageBackground: interpolateColor(
      customTheme.background?.primary ?? customTheme.Background ?? '',
      customTheme.text?.secondary ?? customTheme.Gray ?? '',
      DEFAULT_INPUT_BACKGROUND_OPACITY,
    ),
    FocusBackground: interpolateColor(
      customTheme.background?.primary ?? customTheme.Background ?? '',
      customTheme.status?.success ?? customTheme.AccentGreen ?? '#3CA84B',
      DEFAULT_SELECTION_OPACITY,
    ),
    FocusColor: customTheme.ui?.focus ?? customTheme.AccentGreen,
    GradientColors: customTheme.ui?.gradient ?? customTheme.GradientColors,
  };

  const rawMappings: Record<string, CSSProperties> = {
    hljs: { display: 'block', overflowX: 'auto', padding: '0.5em', background: colors.Background, color: colors.Foreground },
    'hljs-keyword': { color: colors.AccentBlue },
    'hljs-literal': { color: colors.AccentBlue },
    'hljs-symbol': { color: colors.AccentBlue },
    'hljs-name': { color: colors.AccentBlue },
    'hljs-link': { color: colors.AccentBlue, textDecoration: 'underline' },
    'hljs-built_in': { color: colors.AccentCyan },
    'hljs-type': { color: colors.AccentCyan },
    'hljs-number': { color: colors.AccentGreen },
    'hljs-class': { color: colors.AccentGreen },
    'hljs-string': { color: colors.AccentYellow },
    'hljs-meta-string': { color: colors.AccentYellow },
    'hljs-regexp': { color: colors.AccentRed },
    'hljs-template-tag': { color: colors.AccentRed },
    'hljs-subst': { color: colors.Foreground },
    'hljs-function': { color: colors.Foreground },
    'hljs-title': { color: colors.Foreground },
    'hljs-params': { color: colors.Foreground },
    'hljs-formula': { color: colors.Foreground },
    'hljs-comment': { color: colors.Comment, fontStyle: 'italic' },
    'hljs-quote': { color: colors.Comment, fontStyle: 'italic' },
    'hljs-doctag': { color: colors.Comment },
    'hljs-meta': { color: colors.Gray },
    'hljs-meta-keyword': { color: colors.Gray },
    'hljs-tag': { color: colors.Gray },
    'hljs-variable': { color: colors.AccentPurple },
    'hljs-template-variable': { color: colors.AccentPurple },
    'hljs-attr': { color: colors.LightBlue },
    'hljs-attribute': { color: colors.LightBlue },
    'hljs-builtin-name': { color: colors.LightBlue },
    'hljs-section': { color: colors.AccentYellow },
    'hljs-emphasis': { fontStyle: 'italic' },
    'hljs-strong': { fontWeight: 'bold' },
    'hljs-bullet': { color: colors.AccentYellow },
    'hljs-selector-tag': { color: colors.AccentYellow },
    'hljs-selector-id': { color: colors.AccentYellow },
    'hljs-selector-class': { color: colors.AccentYellow },
    'hljs-selector-attr': { color: colors.AccentYellow },
    'hljs-selector-pseudo': { color: colors.AccentYellow },
    'hljs-addition': { backgroundColor: colors.AccentGreen, display: 'inline-block', width: '100%' },
    'hljs-deletion': { backgroundColor: colors.AccentRed, display: 'inline-block', width: '100%' },
  };

  const semanticColors: SemanticColors = {
    text: {
      primary: customTheme.text?.primary ?? colors.Foreground,
      secondary: customTheme.text?.secondary ?? colors.Gray,
      link: customTheme.text?.link ?? colors.AccentBlue,
      accent: customTheme.text?.accent ?? colors.AccentPurple,
      response: customTheme.text?.response ?? customTheme.text?.primary ?? colors.Foreground,
    },
    background: {
      primary: customTheme.background?.primary ?? colors.Background,
      message: colors.MessageBackground!,
      input: colors.InputBackground!,
      focus: colors.FocusBackground!,
      diff: {
        added: customTheme.background?.diff?.added ?? colors.DiffAdded,
        removed: customTheme.background?.diff?.removed ?? colors.DiffRemoved,
      },
    },
    border: { default: colors.DarkGray },
    ui: {
      comment: customTheme.ui?.comment ?? colors.Comment,
      symbol: customTheme.ui?.symbol ?? colors.Gray,
      active: customTheme.ui?.active ?? colors.AccentBlue,
      dark: colors.DarkGray,
      focus: colors.FocusColor ?? colors.AccentGreen,
      gradient: customTheme.ui?.gradient ?? colors.GradientColors,
    },
    status: {
      error: customTheme.status?.error ?? colors.AccentRed,
      success: customTheme.status?.success ?? colors.AccentGreen,
      warning: customTheme.status?.warning ?? colors.AccentYellow,
      running: colors.AccentBlue,
      idle: colors.Gray,
    },
  };

  return new Theme(customTheme.name, 'custom', rawMappings, colors, semanticColors);
}

export function validateCustomTheme(customTheme: Partial<DeepreefCustomTheme>): {
  isValid: boolean;
  error?: string;
  warning?: string;
} {
  if (customTheme.name && !isValidThemeName(customTheme.name)) {
    return { isValid: false, error: `Invalid theme name: ${customTheme.name}` };
  }
  return { isValid: true };
}

function isValidThemeName(name: string): boolean {
  return name.trim().length > 0 && name.trim().length <= 50;
}

export function pickDefaultThemeName(
  terminalBackground: string | undefined,
  availableThemes: readonly Theme[],
  defaultDarkThemeName: string,
  defaultLightThemeName: string,
): string {
  if (terminalBackground) {
    const lowerTerminalBackground = terminalBackground.toLowerCase();
    for (const theme of availableThemes) {
      if (!theme.colors.Background) continue;
      const themeBg = resolveColor(theme.colors.Background)?.toLowerCase();
      if (themeBg === lowerTerminalBackground) {
        return theme.name;
      }
    }
  }

  const themeType = getThemeTypeFromBackgroundColor(terminalBackground);
  if (themeType === 'light') {
    return defaultLightThemeName;
  }
  return defaultDarkThemeName;
}
