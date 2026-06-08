// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FunctionHandler = (payload: any) => Promise<any>

export interface TriggerDefinition {
  type: "durable:subscriber" | "state" | "http"
  function_id: string
  config?: Record<string, unknown>
}

export interface TriggerRequest {
  function_id: string
  payload: unknown
  timestamp?: string
  action?: { type: string }
}

export interface ApiRequest<T = unknown> {
  body?: T
  query?: Record<string, string>
  headers?: Record<string, string>
  method?: string
  path?: string
}

export interface ISdk {
  registerFunction(id: string, handler: FunctionHandler): void
  trigger<A = unknown, B = unknown>(request: TriggerRequest): Promise<B>
  registerTrigger(trigger: TriggerDefinition): void
}

export const TriggerAction = {
  Void: (): { type: string } => ({ type: "void" }),
}
