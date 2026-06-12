/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * Copied from gemini-cli/packages/cli/src/ui/themes/color-utils.ts
 * and adapted for Deepreef TUI.
 *
 * Re-exports theme utilities and adds validation helpers.
 */

import {
  resolveColor,
  interpolateColor,
  getThemeTypeFromBackgroundColor,
  INK_SUPPORTED_NAMES,
  INK_NAME_TO_HEX_MAP,
  getLuminance,
  CSS_NAME_TO_HEX_MAP,
} from './theme.js';

export {
  resolveColor,
  interpolateColor,
  getThemeTypeFromBackgroundColor,
  INK_SUPPORTED_NAMES,
  INK_NAME_TO_HEX_MAP,
  getLuminance,
  CSS_NAME_TO_HEX_MAP,
};

/**
 * Checks if a color string is valid (hex, Ink-supported color name, or CSS color name).
 */
export function isValidColor(color: string): boolean {
  const lowerColor = color.toLowerCase();

  if (lowerColor.startsWith('#')) {
    return /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(color);
  }

  if (INK_SUPPORTED_NAMES.has(lowerColor)) {
    return true;
  }

  if (CSS_NAME_TO_HEX_MAP[lowerColor]) {
    return true;
  }

  return false;
}

/**
 * Returns a "safe" background color for low-color terminals.
 */
export function getSafeLowColorBackground(terminalBg: string): string | undefined {
  const resolvedTerminalBg = resolveColor(terminalBg) || terminalBg;
  if (
    resolvedTerminalBg === 'black' ||
    resolvedTerminalBg === '#000000' ||
    resolvedTerminalBg === '#000'
  ) {
    return '#1c1c1c';
  }
  if (
    resolvedTerminalBg === 'white' ||
    resolvedTerminalBg === '#ffffff' ||
    resolvedTerminalBg === '#fff'
  ) {
    return '#eeeeee';
  }
  return undefined;
}

export const LIGHT_THEME_LUMINANCE_THRESHOLD = 140;
export const DARK_THEME_LUMINANCE_THRESHOLD = 110;

/**
 * Determines if the theme should be switched based on background luminance.
 * Uses hysteresis to prevent flickering.
 */
export function shouldSwitchTheme(
  currentThemeName: string | undefined,
  luminance: number,
  defaultThemeName: string,
  defaultLightThemeName: string,
): string | undefined {
  const isDefaultTheme =
    currentThemeName === defaultThemeName || currentThemeName === undefined;
  const isDefaultLightTheme = currentThemeName === defaultLightThemeName;

  if (luminance > LIGHT_THEME_LUMINANCE_THRESHOLD && isDefaultTheme) {
    return defaultLightThemeName;
  } else if (
    luminance < DARK_THEME_LUMINANCE_THRESHOLD &&
    isDefaultLightTheme
  ) {
    return defaultThemeName;
  }

  return undefined;
}

/**
 * Parses an X11 RGB string (e.g. from OSC 11) into a hex color string.
 */
export function parseColor(rHex: string, gHex: string, bHex: string): string {
  const parseComponent = (hex: string) => {
    const val = parseInt(hex, 16);
    if (hex.length === 1) return (val / 15) * 255;
    if (hex.length === 2) return val;
    if (hex.length === 3) return (val / 4095) * 255;
    if (hex.length === 4) return (val / 65535) * 255;
    return val;
  };

  const r = parseComponent(rHex);
  const g = parseComponent(gHex);
  const b = parseComponent(bHex);

  const toHex = (c: number) => Math.round(c).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
