import { describe, it, expect } from "vitest"
import { STRATEGY_TIERS, TIER_ORDER, DEFAULT_TIER, getTier } from "../src/strategy/tiers.js"

describe("Strategy Tier Configuration", () => {
  it("has all four tiers", () => {
    expect(Object.keys(STRATEGY_TIERS)).toHaveLength(4)
    expect(STRATEGY_TIERS.minimal).toBeDefined()
    expect(STRATEGY_TIERS.normal).toBeDefined()
    expect(STRATEGY_TIERS.deep).toBeDefined()
    expect(STRATEGY_TIERS.exhaustive).toBeDefined()
  })

  it("tiers are ordered from least to most intensive", () => {
    expect(TIER_ORDER).toEqual(["minimal", "normal", "deep", "exhaustive"])
  })

  it("default tier is normal", () => {
    expect(DEFAULT_TIER).toBe("normal")
  })

  it("budget increases across tiers", () => {
    const budgets = TIER_ORDER.map(id => STRATEGY_TIERS[id].budgetCNY)
    for (let i = 1; i < budgets.length; i++) {
      expect(budgets[i]).toBeGreaterThan(budgets[i - 1])
    }
  })

  it("maxChainLength increases across tiers", () => {
    const lengths = TIER_ORDER.map(id => STRATEGY_TIERS[id].maxChainLength)
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThan(lengths[i - 1])
    }
  })

  it("minimal tier disables reasoning", () => {
    expect(STRATEGY_TIERS.minimal.enableReasoning).toBe(false)
  })

  it("normal and above enable reasoning", () => {
    expect(STRATEGY_TIERS.normal.enableReasoning).toBe(true)
    expect(STRATEGY_TIERS.deep.enableReasoning).toBe(true)
    expect(STRATEGY_TIERS.exhaustive.enableReasoning).toBe(true)
  })

  it("getTier returns valid tier for known id", () => {
    expect(getTier("minimal").id).toBe("minimal")
    expect(getTier("deep").id).toBe("deep")
  })

  it("getTier returns default tier for unknown id", () => {
    expect(getTier("unknown")).toEqual(STRATEGY_TIERS[DEFAULT_TIER])
    expect(getTier("")).toEqual(STRATEGY_TIERS[DEFAULT_TIER])
  })

  it("every tier has required fields", () => {
    for (const tier of Object.values(STRATEGY_TIERS)) {
      expect(typeof tier.id).toBe("string")
      expect(typeof tier.label).toBe("string")
      expect(typeof tier.budgetCNY).toBe("number")
      expect(typeof tier.contextThreshold).toBe("number")
      expect(typeof tier.recommendedModel).toBe("string")
      expect(typeof tier.maxChainLength).toBe("number")
      expect(typeof tier.enableReasoning).toBe("boolean")
      expect(tier.budgetCNY).toBeGreaterThan(0)
      expect(tier.contextThreshold).toBeGreaterThan(0)
      expect(tier.contextThreshold).toBeLessThanOrEqual(1)
      expect(tier.maxChainLength).toBeGreaterThan(0)
    }
  })
})
