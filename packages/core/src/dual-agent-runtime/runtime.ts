import type { AgentRole } from "../agent-profile/types.js"
import type { ChatMessage } from "../types.js"
import type { LoopEvent, ChatClient } from "../interface.js"
import { ContextManager } from "../context/manager.js"
import type { AgentRuntimeState, AgentRuntimeStatus } from "./types.js"

export interface AgentRuntimeOptions {
  role: AgentRole
  client: ChatClient
  systemPrompt: string
  contextWindow: number
  maxContextRounds: number
}

export class AgentRuntime {
  private role: AgentRole
  private client: ChatClient
  private ctx: ContextManager
  private systemPrompt: string
  private status: AgentRuntimeStatus = "idle"
  private currentTask?: string
  private startTime: number = 0
  private abortController?: AbortController
  private messages: ChatMessage[] = []

  private stats = {
    promptTokens: 0,
    completionTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    apiCalls: 0,
    toolCalls: 0,
    totalCost: 0,
  }

  constructor(options: AgentRuntimeOptions) {
    this.role = options.role
    this.client = options.client
    this.systemPrompt = options.systemPrompt
    this.ctx = new ContextManager(options.maxContextRounds, options.contextWindow)
  }

  getRole(): AgentRole {
    return this.role
  }

  getStatus(): AgentRuntimeStatus {
    return this.status
  }

  getSystemPrompt(): string {
    return this.systemPrompt
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt
  }

  getMessages(): ChatMessage[] {
    return this.ctx.buildMessages()
  }

  getState(): AgentRuntimeState {
    return {
      role: this.role,
      status: this.status,
      currentTask: this.currentTask,
      messages: this.getMessages(),
      stats: { ...this.stats },
      elapsedMs: this.status === "running" ? Date.now() - this.startTime : 0,
    }
  }

  async *submit(input: string): AsyncGenerator<LoopEvent> {
    if (this.status === "running") {
      throw new Error(`Agent ${this.role} is already running`)
    }

    this.status = "running"
    this.startTime = Date.now()
    this.abortController = new AbortController()
    this.currentTask = input

    try {
      this.ctx.log.append({ role: "user", content: input })

      const messages = this.ctx.buildMessages()
      const stream = this.client.chatCompletionsStream(messages, {
        apiKey: "",
        baseUrl: "",
        model: "default",
        temperature: 0.3,
        maxTokens: 8192,
      })

      let finalContent = ""

      for await (const event of stream) {
        if (this.abortController.signal.aborted) {
          yield { role: "warning", content: "Agent interrupted" }
          break
        }

        if (event.type === "text_delta") {
          finalContent += event.delta
          yield { role: "assistant_delta", content: event.delta }
        } else if (event.type === "done") {
          this.ctx.log.append({ role: "assistant", content: finalContent })
          yield { role: "assistant_final", content: finalContent }
        }
      }

      this.status = "completed"
    } catch (error) {
      this.status = "failed"
      yield {
        role: "error",
        content: error instanceof Error ? error.message : String(error),
      }
    } finally {
      this.currentTask = undefined
      this.abortController = undefined
    }
  }

  interrupt(): void {
    if (this.status === "running" && this.abortController) {
      this.abortController.abort()
      this.status = "cancelled"
    }
  }

  reset(): void {
    this.status = "idle"
    this.currentTask = undefined
    this.messages = []
    this.stats = {
      promptTokens: 0,
      completionTokens: 0,
      cacheHitTokens: 0,
      cacheMissTokens: 0,
      apiCalls: 0,
      toolCalls: 0,
      totalCost: 0,
    }
  }
}
