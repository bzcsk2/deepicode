/**
 * Deepreef TUI Theme System
 *
 * Copied from gemini-cli/packages/cli/src/ui/themes/ and adapted for Deepreef.
 * Apache-2.0 license for all Gemini-originated code.
 */

export { Theme, type ColorsTheme, type ThemeType, type DeepreefCustomTheme, darkTheme, lightTheme, ansiTheme, createCustomTheme, validateCustomTheme, pickDefaultThemeName, resolveColor, interpolateColor, getLuminance, getThemeTypeFromBackgroundColor, INK_SUPPORTED_NAMES, CSS_NAME_TO_HEX_MAP, INK_NAME_TO_HEX_MAP } from './theme.js';
export type { SemanticColors } from './semantic-tokens.js';
export { themeManager, DEFAULT_THEME, type ThemeDisplay } from './theme-manager.js';
export { getSemanticColors } from './semantic-colors.js';
export { isValidColor, getSafeLowColorBackground, shouldSwitchTheme, parseColor, LIGHT_THEME_LUMINANCE_THRESHOLD, DARK_THEME_LUMINANCE_THRESHOLD } from './color-utils.js';
