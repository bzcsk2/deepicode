import type { ChatMessage } from "../types.js"
import type { DeepSeekClient, DeepSeekClientOptions, DeepSeekStreamEvent } from "../client.js"

export interface SummarizeInput {
  messages: ChatMessage[]
  currentSummary: string
  targetTokens: number
  workspacePath?: string
}

export interface SummarizeOutput {
  summary: string
  tokensUsed?: number
}

export interface ContextSummarizer {
  summarize(input: SummarizeInput, signal?: AbortSignal): Promise<SummarizeOutput>
}

export interface LLMSummarizerOptions {
  client: DeepSeekClient
  apiKey: string
  baseUrl: string
  model: string
  temperature?: number
  timeoutMs?: number
}

const SUMMARIZE_SYSTEM_PROMPT = `You are a conversation summarizer. Your task is to create a concise summary of the conversation history provided.

Rules:
1. Focus on key facts, decisions, and ongoing tasks
2. Preserve important context that may be needed later
3. Be concise but comprehensive
4. Use bullet points or short paragraphs
5. Do not include your own opinions or judgments
6. If there is an existing summary, integrate new information with it

Output only the summary text, no preamble or explanation.`

export class FakeSummarizer implements ContextSummarizer {
  private summaryText: string

  constructor(summaryText?: string) {
    this.summaryText = summaryText ?? "Fake summary of previous conversation."
  }

  async summarize(input: SummarizeInput, signal?: AbortSignal): Promise<SummarizeOutput> {
    if (signal?.aborted) {
      throw new Error("Summarizer aborted")
    }

    const existing = input.currentSummary
    const newContent = input.messages
      .map(m => {
        const content = m.content ?? ""
        const truncated = content.length > 100 ? content.slice(0, 97) + "..." : content
        return `${m.role}: ${truncated}`
      })
      .filter(line => !line.endsWith(": "))
      .join("\n")

    const summary = existing
      ? `${existing}\n\n${this.summaryText}\n${newContent}`
      : `${this.summaryText}\n${newContent}`

    return {
      summary,
      tokensUsed: 0,
    }
  }
}

export class MechanicalSummarizer implements ContextSummarizer {
  async summarize(input: SummarizeInput, signal?: AbortSignal): Promise<SummarizeOutput> {
    if (signal?.aborted) {
      throw new Error("Summarizer aborted")
    }

    const existing = input.currentSummary
    const lines = input.messages.map(m => {
      const content = m.content ?? ""
      const truncated = content.length > 240 ? content.slice(0, 239) + "..." : content
      return `${m.role}: ${truncated}`
    }).filter(line => !line.endsWith(": "))

    const summary = [
      "Previous conversation summary:",
      existing,
      lines.join("\n"),
      "This summary was generated to reduce context usage. Newer messages override this summary when conflicts exist.",
    ].filter(Boolean).join("\n\n")

    return {
      summary,
      tokensUsed: 0,
    }
  }
}

export class LLMSummarizer implements ContextSummarizer {
  private client: DeepSeekClient
  private apiKey: string
  private baseUrl: string
  private model: string
  private temperature: number
  private timeoutMs: number

  constructor(options: LLMSummarizerOptions) {
    this.client = options.client
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl
    this.model = options.model
    this.temperature = options.temperature ?? 0.3
    this.timeoutMs = options.timeoutMs ?? 30000
  }

  async summarize(input: SummarizeInput, signal?: AbortSignal): Promise<SummarizeOutput> {
    if (signal?.aborted) {
      throw new Error("Summarizer aborted")
    }

    const truncatedMessages = this.truncateMessages(input.messages, input.targetTokens)
    
    const messages: ChatMessage[] = [
      { role: "system", content: SUMMARIZE_SYSTEM_PROMPT },
    ]

    if (input.currentSummary) {
      messages.push({
        role: "system",
        content: `Existing summary:\n${input.currentSummary}`,
      })
    }

    messages.push({
      role: "system",
      content: `Conversation to summarize:\n${this.formatMessages(truncatedMessages)}`,
    })

    const maxTokens = Math.max(256, Math.floor(input.targetTokens * 0.5))

    const opts: DeepSeekClientOptions = {
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      model: this.model,
      temperature: this.temperature,
      maxTokens,
      signal,
    }

    let summary = ""
    let tokensUsed = 0

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Summarizer timeout")), this.timeoutMs)
    })

    const streamPromise = (async () => {
      for await (const event of this.client.chatCompletionsStream(messages, opts)) {
        if (event.type === "text_delta") {
          summary += event.delta
        } else if (event.type === "usage") {
          tokensUsed = event.usage.totalTokens
        } else if (event.type === "error") {
          throw new Error(event.message)
        } else if (event.type === "done") {
          break
        }
      }
    })()

    await Promise.race([streamPromise, timeoutPromise])

    const trimmedSummary = summary.trim()
    if (!trimmedSummary) {
      throw new Error("Empty summary")
    }

    return {
      summary: trimmedSummary,
      tokensUsed,
    }
  }

  private truncateMessages(messages: ChatMessage[], targetTokens: number): ChatMessage[] {
    const estimatedTokensPerMessage = 50
    const maxMessages = Math.max(1, Math.floor(targetTokens / estimatedTokensPerMessage))
    
    if (messages.length <= maxMessages) {
      return messages
    }

    return messages.slice(-maxMessages)
  }

  private formatMessages(messages: ChatMessage[]): string {
    return messages.map(m => {
      const content = m.content ?? ""
      const truncated = content.length > 500 ? content.slice(0, 497) + "..." : content
      return `${m.role}: ${truncated}`
    }).join("\n")
  }
}
