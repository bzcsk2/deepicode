// Deepicode TUI — 基于 oh-my-pi TUI 框架的终端用户界面，集成 ReasonixEngine
// 导入 TUI 框架核心组件：TUI（根界面）、Container（容器）、Text（文本）、Spacer（间距）、
// Input（输入框）、ProcessTerminal（终端适配器）、Loader（加载动画）
import { TUI, Container, Text, Spacer, Input, ProcessTerminal, Loader } from "../../../../oh-my-pi/packages/tui/src/index.ts"
// 配置加载函数，读取环境变量或默认值
import { loadConfig } from "../../core/src/config.js"
// 引擎：封装 LLM 对话循环、工具调用、上下文管理
import { ReasonixEngine } from "../../core/src/engine.js"

// 系统提示词：定义助手的行为准则（简洁、精确、只输出必要内容）
const SYSTEM_PROMPT = `你是一个高效的编码助手。你简洁、精确，只输出必要的内容。`

// 主入口函数：初始化配置、引擎、UI 组件，启动事件循环
async function main() {
  // 加载用户配置（apiKey / baseUrl / model / maxTokens / temperature）
  const config = loadConfig()
  // 创建对话引擎实例
  const engine = new ReasonixEngine(config)
  // 设置系统提示词
  engine.setSystemPrompt(SYSTEM_PROMPT)

  // 创建 TUI 根节点，绑定到 ProcessTerminal（真实终端适配器）
  const ui = new TUI(new ProcessTerminal())
  // 聊天内容容器：所有用户消息和助手回复都追加到此容器
  const chatContainer = new Container()
  // 输入框组件：初始为空，宽度占满终端，1 行高
  const inputField = new Input("", 1, 0)
  // 加载动画组件：用于在等待 LLM 响应时显示 "thinking" 动画
  const loader = new Loader(ui, (s) => s, (s) => s, "waiting")
  // 状态文本组件：显示工具调用状态、token 用量、错误信息等
  const statusText = new Text("", 1, 0)

  // 将子组件按顺序挂载到 TUI 根节点（渲染顺序：聊天 → 状态 → 加载动画 → 输入框）
  ui.addChild(chatContainer)
  ui.addChild(statusText)
  ui.addChild(loader)
  ui.addChild(inputField)

  // 隐藏加载动画：停止动画播放并清空文本
  const hideLoader = () => { loader.stop(); loader.setText("") }

  // Escape 键退出程序
  inputField.onEscape = () => { ui.stop(); process.exit(0) }
  // 回车提交：核心交互流程
  inputField.onSubmit = async (value: string) => {
    // 空输入忽略
    if (!value.trim()) return
    // 清空输入框
    inputField.setValue("")
    // 将用户输入作为新文本追加到聊天容器（显示 ">>> ..."）
    chatContainer.addChild(new Text(`>>> ${value}`, 1, 0))

    // 启动加载动画（等待 LLM 响应期间显示）
    loader.start()
    // 清空状态文本（准备显示新状态）
    statusText.setText("")

    // 创建助手回复文本组件（初始为空，后续逐字追加）
    const assistantComp = new Text("", 1, 0)
    chatContainer.addChild(assistantComp)
    // 请求 UI 重绘，立即显示用户消息
    ui.requestRender()

    // 调用引擎获取流式响应，逐事件处理
    for await (const event of engine.submit(value)) {
      switch (event.role) {
        // 助手文本增量：逐字追加到 assistantComp
        case "assistant_delta":
          hideLoader()  // 收到首个文本增量后隐藏加载动画
          assistantComp.setText(assistantComp.getText() + (event.content ?? ""))
          ui.requestRender()
          break
        // 工具调用开始：在状态栏显示工具名
        case "tool_start":
          statusText.setText(`[tool] ${event.toolName} ...`)
          ui.requestRender()
          break
        // 工具调用完成：更新状态为 "done"
        case "tool":
          statusText.setText(`[tool] ${event.toolName} done`)
          ui.requestRender()
          break
        // 流结束事件：停止动画，显示 token 用量统计
        case "done": {
          hideLoader()
          const s = engine.getState().stats
          statusText.setText(`in ${s.promptTokens} / out ${s.completionTokens}${s.cacheHitTokens ? ` cache+${s.cacheHitTokens}` : ""}`)
          break
        }
        // 错误事件：停止动画，显示错误信息
        case "error":
          hideLoader()
          statusText.setText(`error: ${event.content}`)
          ui.requestRender()
          break
      }
    }
    // 本轮对话结束后追加一个空行分隔
    chatContainer.addChild(new Spacer(1))
    ui.requestRender()
  }

  // 设置输入框为焦点组件（键盘事件优先发送到输入框）
  ui.setFocus(inputField)
  // 启动 TUI 事件循环（开始监听键盘输入并渲染界面）
  ui.start()
  // 强制首次重绘（true 参数表示全量重绘）
  ui.requestRender(true)

  // 信号处理：Ctrl+C / SIGTERM 优雅退出
  process.on("SIGINT", () => { ui.stop(); process.exit(0) })
  process.on("SIGTERM", () => { ui.stop(); process.exit(0) })
}

// 启动主函数，捕获顶层异常并退出
main().catch((e) => { console.error(e); process.exit(1) })
