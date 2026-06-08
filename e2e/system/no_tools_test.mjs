import { loadConfig } from "@deepreef/core"
import { ReasonixEngine } from "@deepreef/core"
import { buildSystemPrompt } from "@deepreef/core"
import { clearReadTracker, normalizePlatform, resolveShellBackend } from "@deepreef/tools"
import { McpHost, setMcpHost } from "@deepreef/mcp"

const config = loadConfig()
const mcpHost = new McpHost()
setMcpHost(mcpHost)

const engine = new ReasonixEngine(config, clearReadTracker)
const platform = normalizePlatform()
const shellBackend = await resolveShellBackend(platform)
engine.setSystemPrompt(buildSystemPrompt(process.cwd(), {
  osPlatform: platform,
  shellBackend: `${shellBackend.id} (${shellBackend.executable})`,
}))

console.log('init done')
await engine.shutdown()
console.log('shutdown done')
