import type { ChatMessage, ToolSpec } from "../types.js"
import { createHash } from "node:crypto"
import { cloneChatMessages } from "./message.js"

export class ImmutablePrefix {
  private prefix: ChatMessage[] = []
  private currentToolSpecs: ToolSpec[] = []
  private currentFewShots: ChatMessage[] = []
  private hash = ""

  build(systemPrompt: string, toolSpecs?: ToolSpec[], fewShots?: ChatMessage[]): void {
    this.prefix = [{ role: "system", content: systemPrompt }]
    this.currentToolSpecs = toolSpecs ? JSON.parse(JSON.stringify(toolSpecs)) : []
    this.currentFewShots = fewShots ? cloneChatMessages(fewShots) : []
    this.hash = this.computeFingerprint(this.prefix, this.currentToolSpecs, this.currentFewShots)
  }

  get messages(): readonly ChatMessage[] {
    return cloneChatMessages(this.prefix)
  }

  get cacheKey(): string {
    return this.hash
  }

  private computeFingerprint(msgs: readonly ChatMessage[], toolSpecs: ToolSpec[], fewShots: ChatMessage[]): string {
    const parts: string[] = []

    parts.push(JSON.stringify(
      msgs.map((m) => ({
        role: m.role,
        content: m.content,
        reasoning_content: m.reasoning_content ?? null,
        tool_calls: m.tool_calls ?? null,
        tool_call_id: m.tool_call_id ?? null,
        name: m.name ?? null,
        is_error: m.is_error ?? false,
      })),
    ))

    if (toolSpecs.length > 0) {
      parts.push(JSON.stringify(toolSpecs))
    }

    if (fewShots.length > 0) {
      parts.push(JSON.stringify(
        fewShots.map((m) => ({
          role: m.role,
          content: m.content,
          reasoning_content: m.reasoning_content ?? null,
          tool_calls: m.tool_calls ?? null,
          tool_call_id: m.tool_call_id ?? null,
          name: m.name ?? null,
          is_error: m.is_error ?? false,
        })),
      ))
    }

    return createHash("sha256").update(parts.join("|")).digest("hex")
  }
}
