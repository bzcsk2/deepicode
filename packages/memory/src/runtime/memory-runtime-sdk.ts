import type { ISdk, FunctionHandler, TriggerDefinition, TriggerRequest } from "./types.js"

export class MemoryRuntimeSdk implements ISdk {
  private functions = new Map<string, FunctionHandler>()
  private triggers: TriggerDefinition[] = []

  registerFunction(id: string, handler: FunctionHandler): void {
    this.functions.set(id, handler)
  }

  async trigger<A = unknown, B = unknown>(request: TriggerRequest): Promise<B> {
    const handler = this.functions.get(request.function_id)
    if (!handler) {
      throw new Error(`Function not found: ${request.function_id}`)
    }
    return handler(request.payload) as B
  }

  registerTrigger(trigger: TriggerDefinition): void {
    this.triggers.push(trigger)
  }

  getRegisteredFunctionIds(): string[] {
    return Array.from(this.functions.keys())
  }

  getTriggers(): TriggerDefinition[] {
    return [...this.triggers]
  }
}
