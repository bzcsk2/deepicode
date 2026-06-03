import type { PluginLoaded } from "./loader.js"
import type { ToolSpec } from "@deepicode/core"

export interface PluginTool {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<unknown>
}

export type PluginToolError =
  | { type: "invalid_schema"; pluginId: string; toolName: string; cause: string }
  | { type: "execute_failed"; pluginId: string; toolName: string; cause: string }

export interface PluginToolResult {
  tools: PluginTool[]
  errors: PluginToolError[]
}

interface ZodSchema {
  _def?: {
    typeName?: string
    values?: unknown[]
    shape?: () => Record<string, ZodSchema>
    innerType?: ZodSchema
    defaultValue?: () => unknown
  }
  shape?: Record<string, ZodSchema>
  describe?: (description: string) => ZodSchema
}

function zodType(schema: ZodSchema): string | undefined {
  return schema._def?.typeName
}

function zodEnumValues(schema: ZodSchema): unknown[] | undefined {
  return schema._def?.values
}

function zodShape(schema: ZodSchema): Record<string, ZodSchema> | undefined {
  if (schema.shape) return schema.shape
  if (schema._def?.shape) {
    try {
      return schema._def.shape()
    } catch {
      return undefined
    }
  }
  return undefined
}

function zodInnerType(schema: ZodSchema): ZodSchema | undefined {
  return schema._def?.innerType
}

function convertZodToJsonSchema(schema: ZodSchema): Record<string, unknown> | null {
  const typeName = zodType(schema)

  switch (typeName) {
    case "ZodString":
      return { type: "string" }
    case "ZodNumber":
      return { type: "number" }
    case "ZodBoolean":
      return { type: "boolean" }
    case "ZodEnum": {
      const values = zodEnumValues(schema)
      if (!values) return null
      return { type: "string", enum: values }
    }
    case "ZodObject": {
      const shape = zodShape(schema)
      if (!shape) return null
      const properties: Record<string, unknown> = {}
      const required: string[] = []
      for (const [key, value] of Object.entries(shape)) {
        const converted = convertZodToJsonSchema(value)
        if (!converted) return null
        properties[key] = converted
        if (!value._def?.defaultValue) {
          required.push(key)
        }
      }
      return {
        type: "object",
        properties,
        ...(required.length > 0 ? { required } : {}),
      }
    }
    case "ZodOptional": {
      const inner = zodInnerType(schema)
      if (!inner) return null
      return convertZodToJsonSchema(inner)
    }
    case "ZodArray": {
      const inner = zodInnerType(schema)
      if (!inner) return null
      const items = convertZodToJsonSchema(inner)
      if (!items) return null
      return { type: "array", items }
    }
    default:
      return null
  }
}

function extractPluginTools(plugin: PluginLoaded): PluginToolResult {
  const tools: PluginTool[] = []
  const errors: PluginToolError[] = []

  if (!plugin.hooks) {
    return { tools, errors }
  }

  for (const [key, value] of Object.entries(plugin.hooks)) {
    if (typeof value !== "function") continue

    const toolName = `${plugin.mod.id}.${key}`

    const tool: PluginTool = {
      name: toolName,
      description: `Plugin tool ${toolName}`,
      parameters: { type: "object", properties: {} },
      execute: async (args: Record<string, unknown>) => {
        try {
          return await value(args)
        } catch (e) {
          throw new Error(e instanceof Error ? e.message : String(e))
        }
      },
    }

    tools.push(tool)
  }

  return { tools, errors }
}

export function extractToolsFromPlugins(plugins: PluginLoaded[]): PluginToolResult {
  const allTools: PluginTool[] = []
  const allErrors: PluginToolError[] = []

  for (const plugin of plugins) {
    const result = extractPluginTools(plugin)
    allTools.push(...result.tools)
    allErrors.push(...result.errors)
  }

  return { tools: allTools, errors: allErrors }
}

export function pluginToolsToToolSpecs(tools: PluginTool[]): ToolSpec[] {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}

export async function executePluginTool(
  tool: PluginTool,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const result = await tool.execute(args)
    if (typeof result === "string") {
      return result
    }
    if (result && typeof result === "object") {
      const record = result as Record<string, unknown>
      if (record.title && record.output) {
        return JSON.stringify({
          title: record.title,
          output: record.output,
          metadata: record.metadata,
        })
      }
    }
    return JSON.stringify(result)
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : String(e))
  }
}
