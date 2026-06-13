import type { ChatMessage } from "../types.js"
import { AppendOnlyLog } from "./append-log.js"
import { ImmutablePrefix } from "./immutable.js"
import { VolatileScratch } from "./scratch.js"
import { getFoldDecision, estimateTokens } from "./token-estimator.js"
import type { FoldDecision } from "./token-estimator.js"
import { ContextSummary } from "./summary.js"
import type { ContextSummarizer } from "./summarizer.js"

export interface ContextBudget {
  prefixTokens: number
  summaryTokens: number
  logTokens: number
  scratchTokens: number
  totalTokens: number
  window: number
  ratio: number
}

export type ContextReductionMode = "trim" | "compress"
export type { ContextPolicyMode } from "./policy.js"

export interface ContextReductionResult {
  mode: ContextReductionMode
  beforeTokens: number
  afterTokens: number
  targetTokens: number
  removedMessages: number
  summaryTokens: number
}

export class ContextManager {
  readonly prefix: ImmutablePrefix
  readonly log: AppendOnlyLog
  readonly scratch: VolatileScratch
  private summary: ContextSummary
  private summarizer?: ContextSummarizer
  private maxRounds: number

  constructor(maxRounds = 20, private contextWindow = 128_000) {
    this.prefix = new ImmutablePrefix()
    this.log = new AppendOnlyLog()
    this.scratch = new VolatileScratch()
    this.summary = new ContextSummary()
    this.maxRounds = maxRounds
  }

  getContextWindow(): number { return this.contextWindow }

  getMaxRounds(): number { return this.maxRounds }

  updateContextWindow(window: number): void {
    this.contextWindow = window
  }

  estimateTokens(): number {
    return estimateTokens(this.buildMessages())
  }

  getBudget(): ContextBudget {
    const prefixTokens = estimateTokens([...this.prefix.messages])
    const summaryTokens = estimateTokens(this.summary.getMessages())
    const log = this.prepareLog()
    const logTokens = estimateTokens(log)
    const scratchTokens = estimateTokens([...this.scratch.messages])
    const totalTokens = prefixTokens + summaryTokens + logTokens + scratchTokens
    return { prefixTokens, summaryTokens, logTokens, scratchTokens, totalTokens, window: this.contextWindow, ratio: totalTokens / this.contextWindow }
  }

  getFoldDecision(): FoldDecision {
    const used = this.estimateTokens()
    return getFoldDecision(used, this.contextWindow)
  }

  shutdown(): void {
    // No-op: TokenizerPool removed in RM-30
  }

  private prepareLog(): ChatMessage[] {
    let log = [...this.log.messages]
    if (this.maxRounds > 0) {
      log = this.truncateByRounds(log)
    }
    log = this.truncateToBudget(log)
    return log
  }

  buildMessages(): ChatMessage[] {
    const prefixMsgs = this.prefix.messages
    const summaryMsgs = this.summary.getMessages()
    const scratchMsgs = this.scratch.messages

    const log = this.prepareLog()

    // CL-30: Check prefix alone exceeds window — configuration error
    const prefixTokens = estimateTokens([...prefixMsgs])
    if (prefixTokens > this.contextWindow) {
      throw new Error(`Context budget exceeded: prefix alone (${prefixTokens}t) exceeds window (${this.contextWindow}t)`)
    }

    const scratchTokens = estimateTokens([...scratchMsgs])
    if (scratchTokens > this.contextWindow) {
      throw new Error(`Context budget exceeded: scratch alone (${scratchTokens}t) exceeds window (${this.contextWindow}t)`)
    }

    // ADV-BUG-03: Final budget invariant check
    const summaryTokens = estimateTokens(summaryMsgs)
    const allMessages = [...prefixMsgs, ...summaryMsgs, ...log, ...scratchMsgs]
    const totalTokens = estimateTokens(allMessages)
    
    if (totalTokens > this.contextWindow) {
      // ADV-BUG-03: Validate message structure integrity
      this.validateMessageStructure(allMessages)
      
      // Log warning for diagnostics
      if (this.contextWindow > 0) {
        console.warn(
          `[ContextManager] Final budget exceeded: ${totalTokens}t > ${this.contextWindow}t. ` +
          `Attempting aggressive truncation.`
        )
      }
      
      // ADV-BUG-03: Aggressive truncation — remove oldest rounds until under budget
      const truncatedLog = this.aggressiveTruncate(log, prefixTokens, summaryTokens, scratchTokens)
      const truncatedMessages = [...prefixMsgs, ...summaryMsgs, ...truncatedLog, ...scratchMsgs]
      const finalTokens = estimateTokens(truncatedMessages)
      
      if (finalTokens > this.contextWindow) {
        // ADV-BUG-03: Return messages with warning instead of throwing
        // This allows the provider call to proceed with a degraded context
        console.warn(
          `[ContextManager] WARNING: Unable to fit within budget after truncation. ` +
          `Total: ${finalTokens}t, Window: ${this.contextWindow}t. ` +
          `Returning truncated context. Provider may reject or degrade.`
        )
      }
      
      return truncatedMessages
    }

    // ADV-BUG-03: Validate message structure even when under budget
    this.validateMessageStructure(allMessages)

    return allMessages
  }

  /**
   * ADV-BUG-03: Validate message structure integrity.
   * Ensures assistant tool_calls have corresponding tool results.
   */
  private validateMessageStructure(messages: ChatMessage[]): void {
    const toolCallIds = new Set<string>()
    const toolResultIds = new Set<string>()
    
    for (const msg of messages) {
      if (msg.role === "assistant" && msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          toolCallIds.add(tc.id)
        }
      }
      if (msg.role === "tool" && msg.tool_call_id) {
        toolResultIds.add(msg.tool_call_id)
      }
    }
    
    // Check for orphaned tool_calls without results
    for (const tcId of toolCallIds) {
      if (!toolResultIds.has(tcId)) {
        console.warn(
          `[ContextManager] Orphaned tool_call detected: ${tcId} has no corresponding tool result. ` +
          `This may cause provider errors.`
        )
      }
    }
  }

  /**
   * ADV-BUG-03: Aggressive truncation when over budget.
   * Removes oldest rounds while preserving structure.
   */
  private aggressiveTruncate(
    log: ChatMessage[],
    prefixTokens: number,
    summaryTokens: number,
    scratchTokens: number,
  ): ChatMessage[] {
    const availableTokens = this.contextWindow - prefixTokens - summaryTokens - scratchTokens
    if (availableTokens <= 0) return []
    
    let current = [...log]
    let estimated = estimateTokens(current)
    
    while (estimated > availableTokens && current.length > 0) {
      // Find and remove the oldest complete round (user + assistant + tools)
      const firstUserIdx = current.findIndex(m => m.role === "user")
      if (firstUserIdx < 0) {
        // No user messages — remove oldest tool round
        const firstToolIdx = current.findIndex(m => m.role === "tool")
        if (firstToolIdx < 0) break
        current = current.slice(firstToolIdx + 1)
      } else {
        // Remove from start to end of first user round
        let roundEnd = current.length
        for (let i = firstUserIdx + 1; i < current.length; i++) {
          if (current[i].role === "user") {
            roundEnd = i
            break
          }
        }
        current = current.slice(roundEnd)
      }
      estimated = estimateTokens(current)
    }
    
    return current
  }

  reduceToTarget(mode: ContextReductionMode, targetRatio: number): ContextReductionResult {
    const targetTokens = Math.max(1, Math.floor(this.contextWindow * targetRatio))
    const beforeTokens = estimateTokens(this.buildMessages())
    if (beforeTokens <= targetTokens) {
      return {
        mode,
        beforeTokens,
        afterTokens: beforeTokens,
        targetTokens,
        removedMessages: 0,
        summaryTokens: estimateTokens(this.summary.getMessages()),
      }
    }

    const originalLog = [...this.log.messages]
    const protectedStart = this.lastRoundStart(originalLog)
    const protectedTail = protectedStart >= 0 ? originalLog.slice(protectedStart) : []
    let current = protectedStart >= 0 ? originalLog.slice(0, protectedStart) : [...originalLog]
    const removed: ChatMessage[] = []

    const estimateWithTail = (candidate: ChatMessage[]): number =>
      estimateTokens([...this.prefix.messages, ...this.summary.getMessages(), ...candidate, ...protectedTail, ...this.scratch.messages])

    while (current.length > 0 && estimateWithTail(current) > targetTokens) {
      const end = this.firstRoundEnd(current)
      removed.push(...current.slice(0, end))
      current = current.slice(end)
    }

    if (mode === "compress" && removed.length > 0) {
      const summaryContent = this.createSummaryContent(removed)
      this.summary.replace(summaryContent)
      while (current.length > 0 && estimateWithTail(current) > targetTokens) {
        const end = this.firstRoundEnd(current)
        current = current.slice(end)
      }
    }

    this.log.replaceAll([...current, ...protectedTail])
    const afterTokens = estimateTokens(this.buildMessages())
    return {
      mode,
      beforeTokens,
      afterTokens,
      targetTokens,
      removedMessages: removed.length,
      summaryTokens: estimateTokens(this.summary.getMessages()),
    }
  }

  private firstRoundEnd(messages: ChatMessage[]): number {
    if (messages.length === 0) return 0
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === "user") return i
    }
    return messages.length
  }

  private lastRoundStart(messages: ChatMessage[]): number {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return i
    }
    return -1
  }

  private createSummaryContent(messages: ChatMessage[]): string {
    const existing = this.summary.getRawContent()
    const lines = messages.map((message) => {
      const raw = message.content ?? ""
      const content = raw.replace(/\s+/g, " ").trim()
      const clipped = content.length > 240 ? `${content.slice(0, 239)}...` : content
      return `${message.role}: ${clipped}`
    }).filter(line => !line.endsWith(": "))

    return [
      "Previous conversation summary:",
      existing,
      lines.join("\n"),
      "This summary was generated to reduce context usage. Newer messages override this summary when conflicts exist.",
    ].filter(Boolean).join("\n\n")
  }

  private truncateByRounds(log: ChatMessage[]): ChatMessage[] {
    const userIdx: number[] = []
    for (let i = 0; i < log.length; i++) {
      if (log[i].role === "user") userIdx.push(i)
    }
    if (userIdx.length <= this.maxRounds) return log

    let cutFrom = userIdx[userIdx.length - this.maxRounds]
    for (let i = cutFrom; i < log.length; i++) {
      if (log[i].role === "tool" && (i === 0 || log[i - 1].role !== "assistant")) {
        while (i < log.length && log[i].role !== "user") i++
        cutFrom = i
        break
      }
    }
    return log.slice(cutFrom)
  }

  private truncateToBudget(log: ChatMessage[]): ChatMessage[] {
    if (log.length === 0) return log

    const baselineTokens = estimateTokens([...this.prefix.messages, ...this.summary.getMessages(), ...this.scratch.messages])

    let current = [...log]
    let estimated = estimateTokens(current)

    while (estimated + baselineTokens > this.contextWindow && current.length > 0) {
      const firstUserIdx = current.findIndex(m => m.role === "user")
      if (firstUserIdx < 0) {
        // CL-30: No user messages in log — remove oldest tool round instead
        const firstToolIdx = current.findIndex(m => m.role === "tool")
        if (firstToolIdx < 0) break // nothing to remove
        const roundEnd = current.findIndex((m, i) => i > firstToolIdx && (m.role === "assistant" || m.role === "tool"))
        current = roundEnd < 0 ? current.slice(firstToolIdx + 1) : current.slice(roundEnd)
        estimated = estimateTokens(current)
        continue
      }

      let roundEnd = current.length
      for (let i = firstUserIdx + 1; i < current.length; i++) {
        if (current[i].role === "user") {
          roundEnd = i
          break
        }
        if (current[i].role === "tool" && (i + 1 >= current.length || current[i + 1].role === "user")) {
          roundEnd = i + 1
          break
        }
      }

      current = current.slice(roundEnd)
      estimated = estimateTokens(current)
    }

    return current
  }

  startTurn(): void {
    this.scratch.reset()
  }

  getSummary(): ContextSummary {
    return this.summary
  }

  setSummarizer(summarizer: ContextSummarizer): void {
    this.summarizer = summarizer
  }

  async runSummarize(targetTokens: number, signal?: AbortSignal): Promise<boolean> {
    if (!this.summarizer) return false

    const log = [...this.log.messages]
    if (log.length === 0) return false

    try {
      const result = await this.summarizer.summarize(
        {
          messages: log,
          currentSummary: this.summary.getRawContent(),
          targetTokens,
        },
        signal,
      )

      if (result.summary) {
        this.summary.replace(result.summary)
        return true
      }
      return false
    } catch {
      return false
    }
  }
}
