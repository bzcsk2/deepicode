export interface FuzzyEditResult {
  edited: string
  replacedCount: number
  method: string
}

export function fuzzyReplaceOnce(haystack: string, needle: string, replacement: string): FuzzyEditResult | null {
  // Pass 1: exact match
  let idx = haystack.indexOf(needle)
  if (idx >= 0) {
    return { edited: haystack.slice(0, idx) + replacement + haystack.slice(idx + needle.length), replacedCount: 1, method: "exact" }
  }

  // Pass 2: trimmed variants (trim entire needle, or trim right sides of lines)
  const trimmedNeedle = needle.trim()
  if (trimmedNeedle) {
    let j = haystack.indexOf(trimmedNeedle)
    if (j >= 0) {
      return { edited: haystack.slice(0, j) + replacement + haystack.slice(j + trimmedNeedle.length), replacedCount: 1, method: "trimmed_full" }
    }
  }

  const rightTrimmed = trimRightLines(needle)
  if (rightTrimmed && rightTrimmed !== needle) {
    let j = haystack.indexOf(rightTrimmed)
    if (j >= 0) {
      return { edited: haystack.slice(0, j) + replacement + haystack.slice(j + rightTrimmed.length), replacedCount: 1, method: "trimmed_lines" }
    }
  }

  // Pass 3: Flexible whitespace match using regex
  // This handles normalizeWhitespace and normalizeIndent properly by locating the exact bounds in original haystack
  try {
    const escaped = escapeRegExp(needle.trim())
    // Replace any sequence of whitespace in the escaped string with \s+ 
    // Note: escapeRegExp will escape spaces as '\ ' if we are not careful, but our escapeRegExp doesn't escape spaces.
    const flexSpaceRegexStr = escaped.replace(/\s+/g, '\\s+')
    
    // Only proceed if it actually creates a meaningful pattern
    if (flexSpaceRegexStr && flexSpaceRegexStr.length > 0) {
      const flexRegex = new RegExp(flexSpaceRegexStr)
      const match = haystack.match(flexRegex)
      if (match && match.index !== undefined) {
        return {
          edited: haystack.slice(0, match.index) + replacement + haystack.slice(match.index + match[0].length),
          replacedCount: 1,
          method: "flexible_whitespace"
        }
      }
    }
  } catch (e) {
    // Ignore regex compilation errors
  }

  return null
}

function escapeRegExp(string: string): string {
  // Escapes regex special characters. Doesn't escape spaces.
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function trimRightLines(s: string): string {
  return s
    .split("\n")
    .map((l) => l.replace(/\s+$/u, ""))
    .join("\n")
}
