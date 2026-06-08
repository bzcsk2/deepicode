// @ts-nocheck — standalone hook script, not a module. Dead code in Deepreef (replaced by DeepreefMemoryBridge).
import { randomBytes } from "node:crypto"

const REST_URL = process.env["III_REST_URL"] || process.env["III_REST_PORT"] || "http://localhost:3111"
const SECRET = process.env["AGENTMEMORY_SECRET"] || process.env["III_AUTH_TOKEN"] || ""

async function sendObservation(body: Record<string, unknown>): Promise<void> {
  const url = `${REST_URL}/agentmemory/v1/agent/observe`
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (SECRET) headers["authorization"] = `Bearer ${SECRET}`
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) })
  if (!res.ok) process.exit(1)
}

async function main(): Promise<void> {
  const input = await new Promise<string>((r) => { let d = ""; process.stdin.on("data", (c: Buffer) => d += c); process.stdin.on("end", () => r(d)) })
  const payload = JSON.parse(input)
  const timestamp = new Date().toISOString()
  const hookType = payload.hookType || "pre_tool_use"
  const raw = JSON.stringify(payload)
  const sessionId = payload.sessionId || "unknown"
  const observation = { hookType, sessionId, timestamp, raw, toolName: payload.toolName, toolInput: payload.toolInput }
  await sendObservation(observation)
}

main().catch(() => process.exit(1))
