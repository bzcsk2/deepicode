import { parentPort } from "node:worker_threads"

const CHARS_PER_TOKEN = 4
const MSG_OVERHEAD = 10

parentPort?.on("message", (msg: { id: number; messages: Array<{ content?: string | null; reasoning_content?: string | null }> }) => {
  let total = 0
  for (const m of msg.messages) {
    total += MSG_OVERHEAD
    if (m.content) total += refinedEstimate(m.content)
    if (m.reasoning_content) total += refinedEstimate(m.reasoning_content)
  }
  parentPort!.postMessage({ id: msg.id, result: total })
})

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g
const PUNCT_RE = /[^\w\s]/g

function refinedEstimate(text: string): number {
  const cjkCount = (text.match(CJK_RE) || []).length
  const punctCount = (text.match(PUNCT_RE) || []).length
  const asciiCount = text.length - cjkCount - punctCount
  const tokens = Math.ceil(cjkCount * 1.5 + punctCount * 2 + asciiCount / CHARS_PER_TOKEN)
  return tokens
}
