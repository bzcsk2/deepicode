import type { AgentConfig, LoopEvent } from "./interface.js"
import type { ReasonixEngine } from "./engine.js"

export type EventCallback = (event: LoopEvent) => void

export class QueryEngine {
  private engine: ReasonixEngine
  private listeners: Set<EventCallback> = new Set()

  constructor(engine: ReasonixEngine) {
    this.engine = engine
  }

  onEvent(cb: EventCallback): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  async *stream(input: string, agentConfig?: AgentConfig): AsyncGenerator<LoopEvent> {
    for await (const event of this.engine.submit(input, agentConfig)) {
      for (const cb of this.listeners) {
        try { cb(event) } catch {}
      }
      yield event
    }
  }

  async query(input: string, agentConfig?: AgentConfig): Promise<string> {
    let result = ""
    let hasToolCalls = false
    for await (const event of this.engine.submit(input, agentConfig)) {
      if (event.role === "assistant_delta" && event.content) {
        result += event.content
      }
      if (event.role === "tool_call_delta") {
        hasToolCalls = true
      }
    }
    // Distinguish empty reply from tool-call-only response
    if (!result && hasToolCalls) return "[tool calls only — use stream() to access tool call details]"
    return result
  }

  interrupt(): void {
    this.engine.interrupt()
  }
}
