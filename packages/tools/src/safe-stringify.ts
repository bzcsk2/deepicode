const MAX_SAFE_LENGTH = 200_000
const REPLACEMENT_CHAR_THRESHOLD = 0.05

export function safeStringify(obj: unknown, maxLen = MAX_SAFE_LENGTH): string {
  try {
    const raw = JSON.stringify(obj)
    if (raw.length <= maxLen) return raw
    // Truncate while keeping valid JSON: wrap in an object with truncated marker
    const wrapper = JSON.stringify({ _truncated: raw.length - maxLen, error: "output too large" })
    if (wrapper.length <= maxLen) return wrapper
    return `{"_truncated":${raw.length - maxLen},"error":"output too large"}`
  } catch {
    const fallback = String(obj)
    if (fallback.length <= maxLen) return fallback
    // Truncation needed: keep it as valid JSON error
    const truncated = JSON.stringify({ _truncated: fallback.length - maxLen, error: "output too large" })
    return truncated.length <= maxLen ? truncated : `{"error":"output too large"}`
  }
}

export function hasBinaryEncoding(s: string): boolean {
  if (!s) return false
  let count = 0
  for (const ch of s) {
    if (ch === "\uFFFD") count++
  }
  return count / s.length > REPLACEMENT_CHAR_THRESHOLD
}
