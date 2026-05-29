export function isFullscreenEnvEnabled(): boolean {
  if (process.env.CLAUDE_CODE_NO_FLICKER === '0') return false;
  if (process.env.CLAUDE_CODE_NO_FLICKER === '1') return true;
  return false;
}

export function isMouseTrackingEnabled(): boolean {
  return !process.env.CLAUDE_CODE_DISABLE_MOUSE;
}

export function isFullscreenActive(): boolean {
  return isFullscreenEnvEnabled();
}
