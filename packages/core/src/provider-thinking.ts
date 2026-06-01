export type ThinkingMode = "off" | "low" | "medium" | "high" | "max"

export interface ThinkingModeMapping {
  thinking?: { type: "enabled" | "disabled" }
  reasoningEffort?: "low" | "medium" | "high" | "max"
}

export interface ProviderThinkingCapabilities {
  supportedModes: ThinkingMode[]
  mapMode(mode: ThinkingMode): ThinkingModeMapping | null
}

export function createDeepSeekCapabilities(): ProviderThinkingCapabilities {
  return {
    supportedModes: ["off", "low", "medium", "high", "max"],
    mapMode(mode) {
      if (mode === "off") return { thinking: { type: "disabled" } }
      return {
        thinking: { type: "enabled" },
        reasoningEffort: mode,
      }
    },
  }
}
