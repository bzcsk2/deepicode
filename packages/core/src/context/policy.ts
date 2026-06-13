import type { ContextReductionMode } from "./manager.js"

export type ContextPolicyMode = ContextReductionMode | "compact"

export interface ContextPolicy {
  mode: ContextPolicyMode
  triggerRatio: number
  targetRatio: number
}

export const DEFAULT_CONTEXT_POLICY: ContextPolicy = {
  mode: "trim",
  triggerRatio: 0.70,
  targetRatio: 0.30,
}

/**
 * ADV-BUG-08: Validation result with detailed error information.
 */
export interface ContextPolicyValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate a partial context policy.
 * Returns detailed validation results for diagnostics.
 */
export function validateContextPolicyDetailed(policy: Partial<ContextPolicy>): ContextPolicyValidationResult {
  const errors: string[] = []

  if (policy.mode !== undefined && policy.mode !== "trim" && policy.mode !== "compress" && policy.mode !== "compact") {
    errors.push(`Invalid mode: "${policy.mode}". Must be "trim", "compress", or "compact".`)
  }

  if (policy.triggerRatio !== undefined) {
    if (typeof policy.triggerRatio !== "number" || policy.triggerRatio < 0.1 || policy.triggerRatio > 0.95) {
      errors.push(`Invalid triggerRatio: ${policy.triggerRatio}. Must be between 0.1 and 0.95.`)
    }
  }

  if (policy.targetRatio !== undefined) {
    if (typeof policy.targetRatio !== "number" || policy.targetRatio < 0.05 || policy.targetRatio > 0.95) {
      errors.push(`Invalid targetRatio: ${policy.targetRatio}. Must be between 0.05 and 0.95.`)
    }
  }

  if (policy.triggerRatio !== undefined && policy.targetRatio !== undefined) {
    if (policy.targetRatio >= policy.triggerRatio) {
      errors.push(`targetRatio (${policy.targetRatio}) must be less than triggerRatio (${policy.triggerRatio}).`)
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate a partial context policy (boolean interface for backward compatibility).
 */
export function validateContextPolicy(policy: Partial<ContextPolicy>): boolean {
  return validateContextPolicyDetailed(policy).valid
}

/**
 * ADV-BUG-08: Merge context policy with auto-correction and warning logging.
 * If thresholds are automatically adjusted, logs a warning with the final configuration.
 */
export function mergeContextPolicy(
  base: ContextPolicy,
  override: Partial<ContextPolicy>,
  logger?: { isEnabled: (level: string) => boolean; warn: (msg: string, data?: Record<string, unknown>) => void }
): ContextPolicy {
  const validation = validateContextPolicyDetailed(override)
  
  if (!validation.valid) {
    // ADV-BUG-08: Invalid complete configuration is rejected
    if (logger?.isEnabled("warn")) {
      logger.warn("context.policy.invalid_override", { errors: validation.errors })
    }
    return { ...base }
  }

  const merged = { ...base, ...override }
  let autoAdjusted = false

  // ADV-BUG-08: Auto-correct if targetRatio >= triggerRatio
  if (merged.targetRatio >= merged.triggerRatio) {
    merged.targetRatio = Math.max(0.05, merged.triggerRatio - 0.05)
    autoAdjusted = true
  }

  // ADV-BUG-08: Log warning if auto-adjustment occurred
  if (autoAdjusted && logger?.isEnabled("warn")) {
    logger.warn("context.policy.auto_adjusted", {
      originalTriggerRatio: override.triggerRatio,
      originalTargetRatio: override.targetRatio,
      finalTriggerRatio: merged.triggerRatio,
      finalTargetRatio: merged.targetRatio,
      message: `Context policy thresholds were automatically adjusted: targetRatio must be less than triggerRatio.`,
    })
  }

  return merged
}
