import type { MemoryProvider } from '../types.js'
import type Anthropic from '@anthropic-ai/sdk'

export class AnthropicProvider implements MemoryProvider {
  name = 'anthropic'
  private client: Anthropic | null = null
  private model: string
  private maxTokens: number
  private apiKey: string
  private baseURL?: string

  constructor(apiKey: string, model: string, maxTokens: number, baseURL?: string) {
    this.apiKey = apiKey
    this.model = model
    this.maxTokens = maxTokens
    this.baseURL = baseURL
  }

  private async getClient(): Promise<Anthropic> {
    if (!this.client) {
      const mod = await import('@anthropic-ai/sdk')
      this.client = new mod.default({ apiKey: this.apiKey, ...(this.baseURL ? { baseURL: this.baseURL } : {}) })
    }
    return this.client
  }

  async compress(systemPrompt: string, userPrompt: string): Promise<string> {
    return this.call(systemPrompt, userPrompt)
  }

  async summarize(systemPrompt: string, userPrompt: string): Promise<string> {
    return this.call(systemPrompt, userPrompt)
  }

  async describeImage(imageData: string, mimeType: string, prompt: string): Promise<string> {
    const client = await this.getClient()
    const response = await client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp', data: imageData },
          },
          { type: 'text', text: prompt },
        ],
      }],
    })

    const textBlock = response.content.find((b: { type: string; text?: string }) => b.type === 'text')
    return textBlock?.text ?? ''
  }

  private async call(systemPrompt: string, userPrompt: string): Promise<string> {
    const client = await this.getClient()
    const response = await client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = response.content.find((b: { type: string; text?: string }) => b.type === 'text')
    return textBlock?.text ?? ''
  }
}
