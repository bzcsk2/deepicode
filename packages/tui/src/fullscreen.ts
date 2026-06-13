/**
 * TTY 下默认启用 Alternate Screen，减少 main-buffer full reset 导致的闪屏。
 * `DEEPCODE_NO_FLICKER=0` 显式关闭；`=1` 强制开启（非 TTY 亦生效）。
 */
export function isFullscreenEnvEnabled(): boolean {
  if (process.env.DEEPCODE_NO_FLICKER === '0') return false;
  if (process.env.DEEPCODE_NO_FLICKER === '1') return true;
  return Boolean(process.stdin.isTTY);
}

/**
 * 是否启用鼠标跟踪（wheel / click / drag）。
 * Alternate Screen 没有终端原生 scrollback，因此默认必须开启，
 * 让消息区 ScrollBox 能收到滚轮事件。可用 =0 显式关闭。
 */
export function isMouseTrackingEnabled(): boolean {
  return process.env.DEEPCODE_ENABLE_MOUSE !== '0';
}

export function isFullscreenActive(): boolean {
  return isFullscreenEnvEnabled();
}
