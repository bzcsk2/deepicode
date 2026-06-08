import { readFileSync } from "node:fs"
import type { ContentAsset } from "./types.js"

const MAX_RULES_LENGTH = 16_000

export interface RuleResult {
  systemPrompt: string
  count: number
  skippedCount: number
  warnings: string[]
}

/**
 * Compile rule files into a system prompt string.
 * Rules are sorted by path for stable ordering.
 * Each rule includes source attribution.
 * Character budget is enforced with truncation diagnostics.
 */
export function compileRules(rules: ContentAsset[]): RuleResult {
  const warnings: string[] = []
  let systemPrompt = ""
  let count = 0
  let skippedCount = 0

  // Sort by path for stable ordering
  const sorted = [...rules].sort((a, b) => a.path.localeCompare(b.path))

  for (const rule of sorted) {
    try {
      const content = readFileSync(rule.path, "utf8")
      const trimmed = content.trim()

      // Extract frontmatter body if present
      const body = trimmed.startsWith("---")
        ? trimmed.replace(/^---\n[\s\S]*?\n---\n?/, "")
        : trimmed

      if (!body) {
        skippedCount++
        continue
      }

      // Include source attribution
      const sourceLabel = rule.moduleId
        ? `**Source:** ${rule.sourcePluginId}/${rule.moduleId}  \n`
        : `**Source:** ${rule.sourcePluginId}  \n`
      const entry = `## ${rule.id}\n\n${sourceLabel}${body}\n`

      // Check if adding this would exceed the limit
      if (systemPrompt.length + entry.length > MAX_RULES_LENGTH) {
        if (systemPrompt.length === 0) {
          // First rule is too big, truncate it
          const available = MAX_RULES_LENGTH - `## ${rule.id}\n\n${sourceLabel}`.length - "\n".length
          systemPrompt = `## ${rule.id}\n\n${sourceLabel}${body.slice(0, available)}\n`
          warnings.push(`Rule "${rule.id}" truncated to fit ${MAX_RULES_LENGTH} limit`)
        } else {
          warnings.push(`Rule "${rule.id}" skipped: exceeds remaining budget (${MAX_RULES_LENGTH - systemPrompt.length} chars)`)
        }
        skippedCount++
        continue
      }

      systemPrompt += entry
      count++
    } catch (e) {
      warnings.push(`Failed to read rule "${rule.id}" at ${rule.path}: ${e instanceof Error ? e.message : String(e)}`)
      skippedCount++
    }
  }

  if (count > 0 || skippedCount > 0) {
    const header = `## Rules [${count} loaded, ${skippedCount} skipped]\n\n`
    systemPrompt = header + systemPrompt
  }

  return { systemPrompt, count, skippedCount, warnings }
}
