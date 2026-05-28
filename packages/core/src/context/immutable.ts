import type { ChatMessage } from "../types.js"

export class ImmutablePrefix {
  private prefix: ChatMessage[] = []
  private hash = 0n

  build(systemPrompt: string): void {
    this.prefix = [{ role: "system", content: systemPrompt }]
    this.hash = this.computeHash(this.prefix)
  }

  get messages(): readonly ChatMessage[] {
    return this.prefix
  }

  get cacheKey(): string {
    return this.hash.toString(36)
  }

  private computeHash(msgs: ChatMessage[]): bigint {
    let buf = ""
    for (const m of msgs) {
      buf += m.role + (m.content ?? "")
    }
    return BigInt(Bun.hash(buf))
  }
}
