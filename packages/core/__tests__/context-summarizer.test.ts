import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  FakeSummarizer,
  MechanicalSummarizer,
  LLMSummarizer,
} from "../src/context/summarizer.js"
import type { ChatMessage } from "../src/types.js"
import type { DeepSeekClient, DeepSeekStreamEvent } from "../src/client.js"

function createMockClient(events: DeepSeekStreamEvent[]): DeepSeekClient {
  return {
    chatCompletionsStream: async function* () {
      for (const event of events) {
        yield event
      }
    },
  } as unknown as DeepSeekClient
}

function createMockClientWithError(error: string): DeepSeekClient {
  return {
    chatCompletionsStream: async function* () {
      yield { type: "error", message: error }
    },
  } as unknown as DeepSeekClient
}

function createMockClientWithEmpty(): DeepSeekClient {
  return {
    chatCompletionsStream: async function* () {
      yield { type: "done", finishReason: "stop" }
    },
  } as unknown as DeepSeekClient
}

function createMockClientWithTimeout(): DeepSeekClient {
  return {
    chatCompletionsStream: async function* () {
      await new Promise(() => {}) // Never resolves
      yield { type: "done", finishReason: "stop" }
    },
  } as unknown as DeepSeekClient
}

describe("LLMSummarizer", () => {
  let summarizer: LLMSummarizer

  const defaultOptions = {
    apiKey: "test-key",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
  }

  const sampleMessages: ChatMessage[] = [
    { role: "user", content: "Hello, how are you?" },
    { role: "assistant", content: "I'm doing well, thank you!" },
    { role: "user", content: "Can you help me with a task?" },
    { role: "assistant", content: "Of course! What do you need?" },
  ]

  it("should create summary from messages", async () => {
    const mockClient = createMockClient([
      { type: "text_delta", delta: "Summary of conversation" },
      { type: "usage", usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } },
      { type: "done", finishReason: "stop" },
    ])
    summarizer = new LLMSummarizer({ ...defaultOptions, client: mockClient })

    const result = await summarizer.summarize({
      messages: sampleMessages,
      currentSummary: "",
      targetTokens: 1000,
    })

    expect(result.summary).toBe("Summary of conversation")
    expect(result.tokensUsed).toBe(150)
  })

  it("should include existing summary in context", async () => {
    let capturedMessages: ChatMessage[] = []
    const mockClient = {
      chatCompletionsStream: async function* (messages: ChatMessage[]) {
        capturedMessages = messages
        yield { type: "text_delta", delta: "Updated summary" }
        yield { type: "done", finishReason: "stop" }
      },
    } as unknown as DeepSeekClient
    summarizer = new LLMSummarizer({ ...defaultOptions, client: mockClient })

    await summarizer.summarize({
      messages: sampleMessages,
      currentSummary: "Previous summary content",
      targetTokens: 1000,
    })

    const summaryMessage = capturedMessages.find(m => 
      m.content?.includes("Previous summary content")
    )
    expect(summaryMessage).toBeDefined()
  })

  it("should truncate long messages", async () => {
    const longMessages: ChatMessage[] = Array(100).fill(null).map((_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i}: ${"x".repeat(1000)}`,
    }))

    const mockClient = createMockClient([
      { type: "text_delta", delta: "Summary" },
      { type: "done", finishReason: "stop" },
    ])
    summarizer = new LLMSummarizer({ ...defaultOptions, client: mockClient })

    const result = await summarizer.summarize({
      messages: longMessages,
      currentSummary: "",
      targetTokens: 500,
    })

    expect(result.summary).toBe("Summary")
  })

  it("should handle HTTP error", async () => {
    const mockClient = createMockClientWithError("API rate limit exceeded")
    summarizer = new LLMSummarizer({ ...defaultOptions, client: mockClient })

    await expect(
      summarizer.summarize({
        messages: sampleMessages,
        currentSummary: "",
        targetTokens: 1000,
      }),
    ).rejects.toThrow("API rate limit exceeded")
  })

  it("should handle empty summary", async () => {
    const mockClient = createMockClientWithEmpty()
    summarizer = new LLMSummarizer({ ...defaultOptions, client: mockClient })

    await expect(
      summarizer.summarize({
        messages: sampleMessages,
        currentSummary: "",
        targetTokens: 1000,
      }),
    ).rejects.toThrow("Empty summary")
  })

  it("should handle timeout", async () => {
    const mockClient = createMockClientWithTimeout()
    summarizer = new LLMSummarizer({ 
      ...defaultOptions, 
      client: mockClient,
      timeoutMs: 100,
    })

    await expect(
      summarizer.summarize({
        messages: sampleMessages,
        currentSummary: "",
        targetTokens: 1000,
      }),
    ).rejects.toThrow("Summarizer timeout")
  })

  it("should handle abort signal", async () => {
    const mockClient = createMockClientWithTimeout()
    summarizer = new LLMSummarizer({ ...defaultOptions, client: mockClient })

    const controller = new AbortController()
    controller.abort()

    await expect(
      summarizer.summarize(
        {
          messages: sampleMessages,
          currentSummary: "",
          targetTokens: 1000,
        },
        controller.signal,
      ),
    ).rejects.toThrow("Summarizer aborted")
  })

  it("should respect maxTokens based on targetTokens", async () => {
    let capturedMaxTokens: number | undefined
    const mockClient = {
      chatCompletionsStream: async function* (messages: ChatMessage[], opts: any) {
        capturedMaxTokens = opts.maxTokens
        yield { type: "text_delta", delta: "Summary" }
        yield { type: "done", finishReason: "stop" }
      },
    } as unknown as DeepSeekClient
    summarizer = new LLMSummarizer({ ...defaultOptions, client: mockClient })

    await summarizer.summarize({
      messages: sampleMessages,
      currentSummary: "",
      targetTokens: 1000,
    })

    expect(capturedMaxTokens).toBe(500) // 50% of 1000
  })

  it("should have minimum maxTokens of 256", async () => {
    let capturedMaxTokens: number | undefined
    const mockClient = {
      chatCompletionsStream: async function* (messages: ChatMessage[], opts: any) {
        capturedMaxTokens = opts.maxTokens
        yield { type: "text_delta", delta: "Summary" }
        yield { type: "done", finishReason: "stop" }
      },
    } as unknown as DeepSeekClient
    summarizer = new LLMSummarizer({ ...defaultOptions, client: mockClient })

    await summarizer.summarize({
      messages: sampleMessages,
      currentSummary: "",
      targetTokens: 100,
    })

    expect(capturedMaxTokens).toBe(256) // Minimum
  })

  it("should use low temperature", async () => {
    let capturedTemperature: number | undefined
    const mockClient = {
      chatCompletionsStream: async function* (messages: ChatMessage[], opts: any) {
        capturedTemperature = opts.temperature
        yield { type: "text_delta", delta: "Summary" }
        yield { type: "done", finishReason: "stop" }
      },
    } as unknown as DeepSeekClient
    summarizer = new LLMSummarizer({ ...defaultOptions, client: mockClient })

    await summarizer.summarize({
      messages: sampleMessages,
      currentSummary: "",
      targetTokens: 1000,
    })

    expect(capturedTemperature).toBe(0.3)
  })

  it("should not include tools in request", async () => {
    let capturedOpts: any
    const mockClient = {
      chatCompletionsStream: async function* (messages: ChatMessage[], opts: any) {
        capturedOpts = opts
        yield { type: "text_delta", delta: "Summary" }
        yield { type: "done", finishReason: "stop" }
      },
    } as unknown as DeepSeekClient
    summarizer = new LLMSummarizer({ ...defaultOptions, client: mockClient })

    await summarizer.summarize({
      messages: sampleMessages,
      currentSummary: "",
      targetTokens: 1000,
    })

    expect(capturedOpts.tools).toBeUndefined()
  })
})
