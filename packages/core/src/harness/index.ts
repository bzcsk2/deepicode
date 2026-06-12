/**
 * ADV-HAR-01: Harness 三档严格度模块
 *
 * 提供严格度解析、策略映射和项目配置读写。
 */

export {
  resolveHarnessStrictness,
  readProjectHarnessConfig,
  writeProjectHarnessConfig,
  inferDefaultStrictness,
} from "./strictness.js"

export type { ResolveStrictnessOptions, ResolvedStrictness } from "./strictness.js"

export {
  resolveEffectiveHarnessPolicy,
  getBasePolicy,
} from "./policy.js"

export type {
  HarnessStrictness,
  StrictnessSource,
  EffectiveHarnessPolicy,
  ProjectHarnessConfig,
} from "../model-profile/types.js"
