// Optional peer dependencies — installed only when advanced features are enabled.
declare module "@anthropic-ai/sdk" {
  export default class Anthropic {
    constructor(opts: { apiKey: string; baseURL?: string })
    messages: {
      create(opts: {
        model: string
        max_tokens: number
        system?: string
        messages: Array<{ role: string; content: unknown }>
      }): Promise<{ content: Array<{ type: string; text?: string }> }>
    }
  }
}

declare module "@anthropic-ai/claude-agent-sdk"

declare module "@xenova/transformers" {
  export function pipeline(task: string, model: string, options?: Record<string, unknown>): Promise<unknown>
}
