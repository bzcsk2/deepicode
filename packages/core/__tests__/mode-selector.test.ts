import { describe, it, expect } from "vitest"
import { createModeSelectorState, evaluateModeSwitch, resetEmergency } from "../src/mode-selector.js"
import type { SwitchSignal } from "../src/mode-selector.js"

describe("AS2: Pure rule evaluator", () => {
  const now = 1_000_000

  it("no rule matched → keep", () => {
    const state = createModeSelectorState("off")
    const signal: SwitchSignal = { currentMode: "off", toolCallCount: 2, textLength: 1000, loopCount: 3, retryCount: 1, hasError: false }
    const d = evaluateModeSwitch(state, signal, now)
    expect(d.action).toBe("keep")
  })

  it("simple query → switch to high", () => {
    const state = createModeSelectorState("off")
    const signal: SwitchSignal = { currentMode: "off", toolCallCount: 0, textLength: 100, loopCount: 1, retryCount: 0, hasError: false }
    const d = evaluateModeSwitch(state, signal, now)
    expect(d.action).toBe("switch")
    expect(d.target).toBe("high")
  })

  it("complex tool chain → switch to off", () => {
    const state = createModeSelectorState("high")
    const signal: SwitchSignal = { currentMode: "high", toolCallCount: 4, textLength: 2000, loopCount: 6, retryCount: 0, hasError: false }
    const d = evaluateModeSwitch(state, signal, now)
    expect(d.action).toBe("switch")
    expect(d.target).toBe("off")
  })

  it("retry backoff → switch to off", () => {
    const state = createModeSelectorState("high")
    const signal: SwitchSignal = { currentMode: "high", toolCallCount: 0, textLength: 100, loopCount: 1, retryCount: 2, hasError: false }
    const d = evaluateModeSwitch(state, signal, now)
    expect(d.action).toBe("switch")
    expect(d.target).toBe("off")
  })

  it("emergency error → switch to off, sets emergency mode", () => {
    const state = createModeSelectorState("high")
    const signal: SwitchSignal = { currentMode: "high", toolCallCount: 0, textLength: 100, loopCount: 1, retryCount: 0, hasError: true }
    const d = evaluateModeSwitch(state, signal, now)
    expect(d.action).toBe("switch")
    expect(d.target).toBe("off")
    expect(state.emergencyMode).toBe(true)
    expect(state.emergencyPreviousMode).toBe("high")
  })

  it("cooldown suppresses switch", () => {
    const state = createModeSelectorState("off")
    state.lastSwitchTime = now - 50_000
    const signal: SwitchSignal = { currentMode: "off", toolCallCount: 0, textLength: 100, loopCount: 1, retryCount: 0, hasError: false }
    const d = evaluateModeSwitch(state, signal, now)
    expect(d.action).toBe("keep")
  })

  it("cooldown expired → switch allowed", () => {
    const state = createModeSelectorState("off")
    state.lastSwitchTime = now - 130_000
    const signal: SwitchSignal = { currentMode: "off", toolCallCount: 0, textLength: 100, loopCount: 1, retryCount: 0, hasError: false }
    const d = evaluateModeSwitch(state, signal, now)
    expect(d.action).toBe("switch")
  })

  it("emergency mode → keep regardless of signal", () => {
    const state = createModeSelectorState("off")
    state.emergencyMode = true
    state.emergencyPreviousMode = "high"
    const signal: SwitchSignal = { currentMode: "off", toolCallCount: 0, textLength: 100, loopCount: 1, retryCount: 0, hasError: false }
    const d = evaluateModeSwitch(state, signal, now)
    expect(d.action).toBe("keep")
  })

  it("resetEmergency clears emergency mode", () => {
    const state = createModeSelectorState("off")
    state.emergencyMode = true
    state.emergencyPreviousMode = "high"
    resetEmergency(state, now)
    expect(state.emergencyMode).toBe(false)
    expect(state.emergencyPreviousMode).toBeNull()
  })

  it("error frequency ≥3 in 10min → force off", () => {
    const state = createModeSelectorState("high")
    state.errorHistory = [now - 100_000, now - 50_000, now - 10_000]
    const signal: SwitchSignal = { currentMode: "high", toolCallCount: 0, textLength: 100, loopCount: 1, retryCount: 0, hasError: false }
    const d = evaluateModeSwitch(state, signal, now)
    expect(d.action).toBe("switch")
    expect(d.target).toBe("off")
  })

  it("error frequency old errors ignored", () => {
    const state = createModeSelectorState("high")
    state.errorHistory = [now - 700_000, now - 650_000, now - 610_000]
    const signal: SwitchSignal = { currentMode: "high", toolCallCount: 0, textLength: 100, loopCount: 1, retryCount: 0, hasError: false }
    const d = evaluateModeSwitch(state, signal, now)
    expect(d.action).toBe("keep")
  })

  it("retry backoff only applies when current mode is not off", () => {
    const state = createModeSelectorState("off")
    const signal: SwitchSignal = { currentMode: "off", toolCallCount: 0, textLength: 100, loopCount: 1, retryCount: 3, hasError: false }
    const d = evaluateModeSwitch(state, signal, now)
    expect(d.action).toBe("keep")
  })

  it("complex tool chain only applies when current mode is not off", () => {
    const state = createModeSelectorState("off")
    const signal: SwitchSignal = { currentMode: "off", toolCallCount: 10, textLength: 5000, loopCount: 10, retryCount: 0, hasError: false }
    const d = evaluateModeSwitch(state, signal, now)
    expect(d.action).toBe("keep")
  })
})
