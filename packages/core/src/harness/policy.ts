/**
 * ADV-HAR-01: 严格度 → EffectiveHarnessPolicy 映射
 *
 * 三档严格度的完整策略矩阵，运行时只消费一份不可变 EffectiveHarnessPolicy。
 */

import type {
  HarnessStrictness,
  StrictnessSource,
  EffectiveHarnessPolicy,
} from "../model-profile/types.js"

/**
 * strict 档位策略
 * 面向小模型、本地模型、工具调用不稳定模型
 */
const STRICT_POLICY: EffectiveHarnessPolicy = {
  strictness: "strict",
  source: "default",

  toolset: "minimal",
  maxParallelTools: 2,
  maxTurns: 30,

  readBeforeWrite: "block",
  textToolSalvage: "always",
  branchBudget: "enforce",
  checkpoint: "frequent",
  verification: "block",
  earlyStop: "aggressive",
  toolRouting: "two-stage",
  executionMode: "forced",
  shellPolicy: "dual-track-conservative",
  supervisorPolicy: "on-failure",
}

/**
 * normal 档位策略
 * 默认；已适配便宜模型和中型模型
 */
const NORMAL_POLICY: EffectiveHarnessPolicy = {
  strictness: "normal",
  source: "default",

  toolset: "coding",
  maxParallelTools: 3,
  maxTurns: 50,

  readBeforeWrite: "warn",
  textToolSalvage: "on-native-failure",
  branchBudget: "recover",
  checkpoint: "safe-point",
  verification: "require-or-waive",
  earlyStop: "standard",
  toolRouting: "auto",
  executionMode: "adaptive",
  shellPolicy: "dual-track",
  supervisorPolicy: "critical-only",
}

/**
 * loose 档位策略
 * 用户明确选择的高自主模式
 */
const LOOSE_POLICY: EffectiveHarnessPolicy = {
  strictness: "loose",
  source: "default",

  toolset: "full",
  maxParallelTools: 5,
  maxTurns: 80,

  readBeforeWrite: "off",
  textToolSalvage: "off",
  branchBudget: "observe",
  checkpoint: "minimal",
  verification: "warn",
  earlyStop: "critical-only",
  toolRouting: "direct",
  executionMode: "free",
  shellPolicy: "dual-track",
  supervisorPolicy: "off",
}

const POLICY_MAP: Record<HarnessStrictness, EffectiveHarnessPolicy> = {
  strict: STRICT_POLICY,
  normal: NORMAL_POLICY,
  loose: LOOSE_POLICY,
}

/**
 * 根据严格度获取基础策略模板
 */
export function getBasePolicy(strictness: HarnessStrictness): EffectiveHarnessPolicy {
  return { ...POLICY_MAP[strictness] }
}

/**
 * 构建最终不可变策略
 *
 * @param strictness - 解析后的严格度
 * @param source - 配置来源
 * @returns 不可变的 EffectiveHarnessPolicy
 */
export function resolveEffectiveHarnessPolicy(
  strictness: HarnessStrictness,
  source: StrictnessSource = "default",
): EffectiveHarnessPolicy {
  const base = getBasePolicy(strictness)
  return { ...base, source }
}
