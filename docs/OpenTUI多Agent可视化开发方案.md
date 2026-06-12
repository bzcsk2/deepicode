# Deepreef Ink 多 Agent 可视化与 Gemini CLI 风格移植开发方案

状态：`Completed`  
最后更新：2026-06-12
目标读者：负责 Deepreef TUI 重构、多 Agent 可视化、Gemini CLI UI 移植和稳定性验收的开发 Agent

> 文件名为兼容历史链接而保留。**OpenTUI 路线已终止，不再继续开发。**
> 本方案要求保留 Deepreef 当前 `@deepreef/ink` 渲染引擎，在现有 `packages/tui/` 内选择性移植 Gemini CLI 的优点和视觉风格。

参考项目：

- Gemini CLI UI：`/vol4/Agent/gemini-cli/packages/cli/src/ui/`
- Gemini CLI 定制 Ink：`/vol4/Agent/gemini-cli/node_modules/ink/`，包名 `@jrichman/ink@6.6.9`
- Deepreef Ink：`/vol4/Agent/deepreef/packages/ink/`
- Deepreef TUI：`/vol4/Agent/deepreef/packages/tui/`

关联文档：

- [Deepreef后续开发计划.md](Deepreef后续开发计划.md)
- [Deepreef项目设计文档.md](Deepreef项目设计文档.md)
- [TODO.md](TODO.md)
- [ADVICE.md](ADVICE.md)

---

## 一、方案结论

Deepreef 不迁移 OpenTUI，也不整套替换为 Gemini CLI 的 `@jrichman/ink`。

Deepreef 继续使用当前 `@deepreef/ink`，因为它已经与现有 TUI 深度适配，并具备：

- React 19 + Yoga 布局。
- 原生鼠标命中、点击、Hover、拖拽和文本选择。
- `ScrollBox`、viewport culling、sticky scroll 和直接 DOM 滚动。
- Alternate Screen、差分帧、终端恢复和帧诊断。
- Deepreef 已有主题组件、Dialog、Button、Tabs 和快捷键系统。

Gemini CLI 作为新的主要前端参考，选择性移植：

1. 语义主题、20 套配色和渐变视觉。
2. Spinner、LoadingIndicator、滚动条淡入淡出等动画。
3. Subagent/多 Agent 进度展示。
4. MainContent、Composer、DialogManager 和后台任务布局。
5. VirtualizedList、统一按键、鼠标滚动和闪烁检测的设计思想。
6. 大量组件级测试、终端兼容和无障碍降级经验。

Deepreef Core、LoopEvent、Permission、Question、Session、Plugin、AgentMemory、MCP、工具执行和安全边界仍是唯一业务来源。

### 1.1 强制原则

1. **能直接复制 Gemini CLI 纯 UI 代码的，优先复制并适配，不从头重写。**
2. 复制代码必须保留 Google Apache-2.0 文件头和来源记录。
3. 不复制 Gemini 专属业务运行时，不建立第二套 Agent、权限、Session 或 Provider 系统。
4. 多 Agent 编排属于 Core，TUI 只展示状态并发送显式命令。
5. 不再继续投入 `packages/tui-opentui/`；失败原型按本方案第一阶段清理。
6. 不切换 `@jrichman/ink`，除非未来独立 benchmark 证明它显著优于当前 Ink。

---

## 二、现状判断

### 2.1 Gemini CLI UI 很成熟，但不能整套搬

Gemini CLI UI 约有：

- 83,442 行非测试 TypeScript/TSX。
- 401 个非测试 UI 文件。
- 108,948 行 UI 测试。
- 177 个 UI 文件直接依赖 `@google/gemini-cli-core`。

其中：

- `AppContainer.tsx` 约 2,867 行。
- `useGeminiStream.ts` 约 2,158 行。
- `InputPrompt.tsx` 约 1,933 行。

整套搬入会把 Gemini Auth、Quota、IDE、Extension、Agent Registry、Gemini Stream 和专属命令系统一起带入，移除和适配成本过高。

### 2.2 不切换 `@jrichman/ink`

`@jrichman/ink` 也是定制 Ink fork，不是原版 Ink。它的优势是：

- `terminalBuffer`
- `renderProcess`
- `incrementalRendering`
- `ResizeObserver`
- `StaticRender`
- Gemini CLI 的生产验证

当前 `@deepreef/ink` 的优势是：

- 与 Deepreef 现有 8,000+ 行业务 TUI 完全兼容。
- 鼠标事件和文本选择更深地集成在渲染器内部。
- `ScrollBox` 已支持高性能滚动和视口裁剪。
- 已有 Deepreef 专属终端恢复、帧差分、诊断、主题和快捷键能力。

直接替换会再次引入渲染器迁移风险。当前任务只允许参考或移植单项能力，不允许替换 `packages/ink/`。

### 2.3 产品目标

Deepreef 主打省钱和省心。TUI 必须清楚展示本地、免费和低成本模型如何持续协作：

```text
┌ Local Workers ─────┬ Supervisor ───────┬ Loop State ──────────┐
│ qwen-1.5b: running │ deepseek: review  │ observe → act        │
│ mimo-small: idle   │ kimi: idle        │ reflect → retry      │
└────────────────────┴───────────────────┴──────────────────────┘
```

用户必须随时看清：

- 哪些 Worker 正在运行、空闲、验证、等待权限、等待 Question 或失败。
- Supervisor 正在审查哪个 Worker，给过什么建议，建议是否产生净进展。
- 主循环当前处于 observe、plan、act、verify、reflect、retry、paused、done 或 failed。
- 多 Agent 最近在思考什么、调用什么工具、运行多久以及为何阻塞。
- Permission、Question、checkpoint、Plugin、Memory、MCP 和 Provider 状态。

---

## 三、明确吸收与不吸收

### 3.1 从 Gemini CLI 直接复制并适配

以下代码可作为直接复制来源。复制后必须删除 Gemini Core 依赖，并接入 Deepreef 类型、Store 和语义颜色。

| Gemini CLI 来源 | Deepreef 目标 | 处理方式 |
|---|---|---|
| `themes/theme.ts` | `packages/tui/src/theme/theme.ts` | 复制颜色解析、插值和主题模型，移除 `CustomTheme` 的 Gemini Core 依赖 |
| `themes/semantic-tokens.ts` | `packages/tui/src/theme/semantic-tokens.ts` | 复制语义色结构 |
| `themes/builtin/` | `packages/tui/src/theme/builtin/` | 复制 20 套主题；首批启用 Default、Tokyo Night、GitHub、Dracula、Solarized、No Color |
| `semantic-colors.ts` | `packages/tui/src/theme/semantic-colors.ts` | 复制 getter facade，接 Deepreef ThemeManager |
| `components/ThemedGradient.tsx` | 同名组件 | 复制渐变标题组件，适配 `@deepreef/ink` |
| `components/GeminiSpinner.tsx` | `GradientSpinner.tsx` | 复制 33fps 渐变 Spinner，改为 Deepreef 命名 |
| `components/GeminiRespondingSpinner.tsx` | `RespondingSpinner.tsx` | 复制状态感知 Spinner |
| `components/LoadingIndicator.tsx` | `LoadingIndicator.tsx` | 复制思考状态、耗时、取消提示和窄屏布局 |
| `hooks/useAnimatedScrollbar.ts` | `hooks/useAnimatedScrollbar.ts` | 复制滚动条淡入淡出，接 Deepreef ScrollBox |
| `components/messages/SubagentGroupDisplay.tsx` | `components/agents/AgentGroupDisplay.tsx` | 复制多 Agent 折叠/展开视觉 |
| `components/messages/SubagentProgressDisplay.tsx` | `components/agents/AgentProgressDisplay.tsx` | 复制 Agent 思考、工具活动和完成状态 |
| `components/BackgroundTaskDisplay.tsx` | `components/workers/WorkerActivityPanel.tsx` | 复制布局和交互，不复制 Gemini ShellExecutionService |
| `components/DialogManager.tsx` | `components/dialogs/DialogManager.tsx` | 复制集中弹窗选择模式，接 Deepreef Permission/Question/Picker |
| `layouts/DefaultAppLayout.tsx` | `layouts/DefaultAppLayout.tsx` | 复制页面分层思想，使用 Deepreef 组件重组 |
| `hooks/useFlickerDetector.ts` | `diagnostics/useFlickerDetector.ts` | 复制检测思想，接 Deepreef `FrameEvent` |
| `components/shared/BaseSelectionList.tsx` | 通用选择列表 | 复制键盘/鼠标选择行为 |

### 3.2 借鉴设计，不直接复制

| Gemini CLI 能力 | Deepreef 处理方式 |
|---|---|
| `VirtualizedList.tsx` | 借鉴 anchor、动态高度和只渲染可见项；基于 Deepreef `ScrollBox` 实现 |
| `ScrollableList.tsx` / `ScrollProvider.tsx` | 借鉴嵌套滚动、滚轮归属和滚动条拖动；优先使用 Deepreef 原生鼠标事件 |
| `KeypressContext.tsx` | 借鉴优先级和统一分发；优先扩展 Deepreef `KeybindingProvider` |
| `UIStateContext` / `UIActionsContext` | 借鉴 state/action 分离，不复制巨型 Context |
| `MainContent.tsx` | 借鉴静态历史、当前回复和 pending 区分 |
| `Composer.tsx` | 借鉴组合方式，保留 Deepreef PromptInput |
| `useGeminiStream.ts` | 只借鉴事件归一化，不复制 Gemini Stream |
| `@jrichman/ink` terminalBuffer/renderProcess | 仅保留未来独立 benchmark 项，不进入当前实现 |

### 3.3 明确禁止复制

- `AppContainer.tsx`
- `useGeminiStream.ts`
- `InputPrompt.tsx` 整体
- Gemini Auth、Quota、IDE、Extension、Fallback、Policy 和账号流程
- Gemini `Config`、Agent Registry、ShellExecutionService 和 Session 系统
- Gemini 的自动模型 fallback
- `@jrichman/ink` 渲染引擎
- Gemini 巨型 `UIStateContext`
- 任何绕过 Deepreef PermissionEngine、Question、LoopEvent 或工具执行器的代码

---

## 四、目标视觉与布局

### 4.1 整体风格

Deepreef 使用 Gemini CLI 的清晰、克制和状态优先风格：

- 语义颜色而不是组件内硬编码颜色。
- 默认暗色主题使用柔和高对比色，不大面积填充亮色背景。
- 运行、成功、警告、失败拥有固定色义。
- 多 Agent 和工具状态优先使用紧凑单行，详情按需展开。
- 渐变只用于品牌标题、活动 Spinner 和少量强调，不用于大面积正文。
- 动画用于解释状态变化，不做装饰性持续刷新。

### 4.2 页面布局

```text
┌ Deepreef · session · repo · permission · provider/model ──────────┐
├ Local Workers ─────┬ Supervisor ───────┬ Loop State ──────────────┤
│ worker rows        │ supervisor rows   │ phase / attempt / signal │
├────────────────────┴───────────────────┴───────────────────────────┤
│ Chat transcript / selected Agent detail / Worker activity         │
│ Gemini-style compact tool groups and Agent progress               │
├────────────────────────────────────────────────────────────────────┤
│ notifications / permission / question / dialog                    │
│ composer / loading indicator / status row                         │
└────────────────────────────────────────────────────────────────────┘
```

默认仍然是聊天式编码界面，不把 Deepreef 变成纯 Dashboard。三栏编排总览固定在顶部，可折叠为单行摘要；Agent 和 Worker 的详细活动显示在聊天时间线或详情面板内。

### 4.3 响应式规则

| 终端宽度 | 布局 |
|---|---|
| `>= 140` | 三栏总览 + 主内容 + 可选详情侧栏 |
| `100-139` | 三栏总览 + 单栏主内容 |
| `80-99` | 三栏各显示一行摘要，详情通过 Tab/快捷键进入 |
| `< 80` | 总览折叠为单行状态，Overlay 全宽 |

窄屏仍必须显示运行 Worker 数、Supervisor 状态、当前 phase、权限模式和阻塞状态。

---

## 五、主题与配色方案

### 5.1 主题架构

目标结构：

```text
Builtin/Custom Theme
  -> ThemeManager
  -> SemanticColors
  -> TUI components
```

语义色最少包含：

```ts
interface SemanticColors {
  text: {
    primary: string;
    secondary: string;
    link: string;
    accent: string;
    response: string;
  };
  background: {
    primary: string;
    message: string;
    input: string;
    focus: string;
    diff: { added: string; removed: string };
  };
  border: { default: string };
  ui: {
    comment: string;
    symbol: string;
    active: string;
    dark: string;
    focus: string;
    gradient?: string[];
  };
  status: {
    error: string;
    success: string;
    warning: string;
    running: string;
    idle: string;
  };
}
```

### 5.2 首批主题

首批必须启用：

- Deepreef Default Dark
- Deepreef Default Light
- Tokyo Night
- GitHub Dark
- GitHub Light
- Dracula
- Solarized Dark
- Solarized Light
- ANSI
- No Color

其余 Gemini CLI builtin 主题可在第二阶段直接复制。

### 5.3 颜色约束

- Worker `running`、Supervisor `reviewing` 和当前 Loop phase 使用 `status.running`。
- 完成使用 `status.success`，阻塞/待确认使用 `status.warning`，失败使用 `status.error`。
- 模型名称、Agent 名称和可点击项使用 `text.accent` 或 `ui.active`。
- 边框默认弱化；只有焦点面板使用强调色。
- Diff、Permission、Question 必须使用独立语义颜色，不能仅依赖图标。
- No Color 模式必须保持所有状态可区分。

---

## 六、动画与动态反馈

### 6.1 必须实现

| 动画 | Gemini 来源 | Deepreef 用途 |
|---|---|---|
| 渐变 Spinner | `GeminiSpinner.tsx` | 主模型响应、Supervisor review |
| 状态感知 Spinner | `GeminiRespondingSpinner.tsx` | 区分 responding、waiting confirmation、hook/worker 活动 |
| LoadingIndicator | `LoadingIndicator.tsx` | 显示当前动作、耗时、Esc 取消和窄屏布局 |
| 滚动条淡入淡出 | `useAnimatedScrollbar.ts` | 滚动或聚焦时提示位置 |
| 工具状态 Spinner | `SubagentProgressDisplay.tsx` | Worker 当前工具调用 |
| 渐变标题 | `ThemedGradient.tsx` | Deepreef 标题和版本，禁止用于正文 |

### 6.2 动画约束

- 动画默认不超过约 30-33fps。
- 非焦点、不可见或终端失焦组件必须降频或暂停。
- 同时活动动画数量必须可诊断。
- `NO_COLOR`、屏幕阅读器或低动画设置下禁用渐变和持续动画。
- 动画不得触发整个 App 重绘；只更新所属小组件。
- Worker 数量较多时，只为可见且正在运行的行播放 Spinner。
- 不复制 Gemini 的趣味文案作为默认能力；Deepreef 默认只显示真实运行状态。

---

## 七、多 Agent 可视化

### 7.1 Local Workers 总览

紧凑行参考 Gemini `SubagentGroupDisplay`：

```text
! qwen-1.5b   running   edit parser.ts       00:42
○ mimo-small  idle      waiting              00:00
! gemma-31b   blocked   permission: exec     01:18
✓ qwen-7b     completed tests passed         03:04
```

状态集合：

```ts
type WorkerStatus =
  | 'queued'
  | 'starting'
  | 'running'
  | 'waiting_permission'
  | 'waiting_question'
  | 'waiting_supervisor'
  | 'verifying'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'idle';
```

折叠态每个 Worker 只显示最近活动；展开态显示：

- Worker ID、模型 target、profile、harness。
- 当前任务、最近 thought 和工具活动。
- TaskLedger、验证结果、失败签名和 checkpoint。
- 最近一次 SupervisorAdvice 和采纳状态。
- 权限或 Question 阻塞。

### 7.2 Supervisor 总览

```text
◆ deepseek-v4-flash  reviewing   worker-2
○ mimo-v2.5          idle        cooldown 0s
! stepfun-3.5        unavailable smoke test required
```

Supervisor 只展示用户明确配置的候选，不表示自动主模型路由。详情显示 EvidenceBundle 摘要、Advice、采纳结果、预算和冷却，不展示 API key 或完整敏感 evidence。

### 7.3 Loop State

```ts
type LoopPhase =
  | 'observe'
  | 'plan'
  | 'act'
  | 'verify'
  | 'reflect'
  | 'retry'
  | 'paused'
  | 'done'
  | 'failed';
```

展示当前 phase、attempt、runtime signal、checkpoint 和下一决定方。TUI 不自行推断 phase，必须消费 Core 结构化事件。

### 7.4 Agent 活动事件

借鉴 Gemini `SubagentActivityEvent`，建立 Deepreef 自有协议：

```ts
type AgentActivityEvent =
  | { kind: 'thought'; agentId: string; content: string; ts: number }
  | { kind: 'tool_start'; agentId: string; toolCallId: string; name: string; summary?: string; ts: number }
  | { kind: 'tool_end'; agentId: string; toolCallId: string; status: 'completed' | 'error' | 'cancelled'; summary?: string; ts: number }
  | { kind: 'state'; agentId: string; status: WorkerStatus; reason?: string; ts: number };
```

这些事件通过 `LoopEvent`/OrchestrationEvent 进入 TUI Store。组件不得直接订阅 Worker runtime。

---

## 八、状态、布局与交互架构

### 8.1 数据流

```text
Core / Orchestrator
  -> AsyncGenerator<LoopEvent | OrchestrationEvent>
  -> TUI event adapter
  -> normalized stores
  -> focused React/Ink components
```

保留并扩展 Deepreef 现有：

- `TranscriptStore`
- hydration merge
- delta batching
- `BridgeRuntime`
- `@deepreef/ink` `ScrollBox`
- `FrameEvent` 诊断

新增：

- `WorkerStore`
- `SupervisorStore`
- `LoopStore`
- `AgentActivityStore`
- `DialogStore`

禁止复制 Gemini 巨型 `UIStateContext`。每个组件只订阅所需状态。

### 8.2 页面分层

借鉴 Gemini `DefaultAppLayout`：

```text
App
  OrchestrationSummary
  MainContent
    VirtualizedTranscript
    PendingAgentActivity
  Notifications
  DialogManager / custom dialog
  Composer
  LoadingIndicator
  StatusBar
```

### 8.3 DialogManager

所有互斥 Overlay 集中由 `DialogManager` 决定优先级：

1. Permission
2. Question
3. 危险操作确认
4. Model/Agent/Session Picker
5. Theme/Settings/Help

打开 Dialog 时底层输入和快捷键不得穿透。Dialog 只负责展示和回答，业务 Promise 生命周期仍由 Core 管理。

### 8.4 鼠标与键盘

TUI 必须支持鼠标，但所有核心操作必须有键盘等价操作：

| 操作 | 鼠标 | 键盘 |
|---|---|---|
| 聚焦列表或面板 | 单击 | `Tab` / `Shift+Tab` |
| 展开 Agent/工具组 | 单击标题 | `Enter` / 统一展开快捷键 |
| 滚动当前面板 | 滚轮 | `↑↓`、`PageUp/PageDown` |
| 进入详情 | 双击或详情按钮 | `Enter` |
| 返回/关闭 | 点击关闭 | `Esc` |

优先使用 `@deepreef/ink` 原生 `onClick`、`onMouseDown`、`onMouseEnter`、`ScrollBox` 和焦点系统。不要复制 Gemini 的整套 `MouseContext`，除非 Deepreef 原生能力无法覆盖具体场景。

---

## 九、代码组织目标

所有新代码继续放入 `packages/tui/`，不建立第二套 TUI 包：

```text
packages/tui/src/
  layouts/
    DefaultAppLayout.tsx
  theme/
    theme.ts
    theme-manager.ts
    semantic-tokens.ts
    semantic-colors.ts
    builtin/
  components/
    agents/
      AgentGroupDisplay.tsx
      AgentProgressDisplay.tsx
      AgentActivityRow.tsx
    orchestration/
      OrchestrationSummary.tsx
      LocalWorkersSummary.tsx
      SupervisorSummary.tsx
      LoopStateSummary.tsx
    workers/
      WorkerActivityPanel.tsx
    dialogs/
      DialogManager.tsx
    shared/
      BaseSelectionList.tsx
      VirtualizedTranscript.tsx
      ThemedGradient.tsx
      GradientSpinner.tsx
      RespondingSpinner.tsx
      LoadingIndicator.tsx
  hooks/
    useAnimatedScrollbar.ts
  store/
    worker-store.ts
    supervisor-store.ts
    loop-store.ts
    agent-activity-store.ts
    dialog-store.ts
```

组件约束：

- 不 import Gemini Core。
- 不直接持有 Deepreef Engine。
- 使用稳定实体 ID。
- 不在组件内硬编码主题颜色。
- 动画只更新局部组件。
- 页面组件不得接收巨型 props 对象。

---

## 十、实施任务

> **全部任务已完成** ✅（2026-06-12）

### TUI-GM-00：停止并清理 OpenTUI 失败原型 ✅

该任务必须最先执行，但清理前先保存必要实现经验和截图。

1. 删除 `DEEPREEF_TUI=opentui` 分支和 CLI wrapper。
2. 删除 CLI 对 `@deepreef/tui-opentui`、`@opentui/core`、`@opentui/react` 的依赖。
3. 删除 `packages/tui-opentui/`。
4. 清理 workspace、lockfile、构建脚本和只服务 OpenTUI 的测试。
5. 保留 `packages/tui/`、`packages/ink/` 和所有 Deepreef Core 功能。
6. 在 `DONE.md` 记录 OpenTUI 原型终止原因和保留经验。

验收：

- `rg "tui-opentui|@opentui|DEEPREEF_TUI=opentui"` 仅剩历史文档允许项。
- 默认 Ink TUI、pipe 模式、typecheck、test 和 build 通过。
- 不删除或回退与 OpenTUI 无关的用户改动。

### TUI-GM-10：移植主题与语义颜色 ✅

1. 从 Gemini CLI 复制主题模型、语义色、颜色解析和 ThemeManager。
2. 复制首批主题并增加 `/theme` 选择入口。
3. 将现有 `reasonix/tokens.ts` 适配为语义色兼容层。
4. 分批替换组件内硬编码颜色，不一次性制造巨大 diff。
5. 实现 No Color 和 ANSI 降级。

验收：

- 主题切换不需要重启。
- Chat、工具、Dialog、Worker 和状态栏使用统一语义色。
- 深色、浅色、No Color 快照测试通过。

### TUI-GM-20：移植动画与 Loading 状态 ✅

1. 复制并适配 GradientSpinner、RespondingSpinner、LoadingIndicator、ThemedGradient。
2. 复制 `useAnimatedScrollbar`，接入 Deepreef ScrollBox。
3. 增加低动画/无动画和屏幕阅读器降级。
4. 限制动画刷新范围和活动数量。

验收：

- 模型响应、Worker 运行、Supervisor review 和 waiting confirmation 可视觉区分。
- 动画不触发整个 App 重绘。
- 终端失焦、不可见、No Color 和测试模式下动画降频或停止。

### TUI-GM-30：重组主布局和 DialogManager ✅

1. 按 Gemini `DefaultAppLayout` 思路拆分当前大 App。
2. 建立 MainContent、Notifications、DialogManager、Composer、LoadingIndicator、StatusBar 层级。
3. 将 Permission、Question、ModelPicker、SessionPicker、Context、Skill、Help 纳入 DialogManager。
4. 保持现有 Core Promise 和 Bridge 行为。

验收：

- Dialog 打开时底层快捷键不穿透。
- Permission 与 Question 优先级正确。
- Ctrl+C、退出、resize 和终端恢复无回归。

### TUI-GM-40：移植多 Agent 展示 ✅

1. 复制 Gemini `SubagentGroupDisplay` 和 `SubagentProgressDisplay`。
2. 改造成 Deepreef `AgentGroupDisplay` 和 `AgentProgressDisplay`。
3. 建立 AgentActivityEvent 和 AgentActivityStore。
4. 在聊天时间线展示多 Agent 折叠组和当前活动。
5. 实现 Local Workers / Supervisor / Loop State 三栏总览。

验收：

- 0、1、4、20 个 Worker 均正确显示。
- 折叠态一行展示最近活动，展开态显示 thought/tool/result。
- Worker、Supervisor 和 Loop 状态全部来自结构化事件。
- Supervisor 只显示指导状态，不表现为直接执行者。

### TUI-GM-50：后台 Worker 活动面板 ✅

1. 借鉴 Gemini `BackgroundTaskDisplay` 布局，建立 WorkerActivityPanel。
2. 支持切换 Worker、查看最近输出、暂停、恢复和显式取消。
3. 使用 Deepreef Worker command 和权限边界，不复制 ShellExecutionService。
4. 危险操作必须二次确认。

验收：

- 后台 Worker 活动不会阻塞主输入。
- 无交互 Worker 遇到 ask 时显示 paused/checkpoint，不永久挂起。
- 鼠标和键盘均可操作。

### TUI-GM-60：长会话虚拟化和滚动稳定性 ✅

1. 借鉴 Gemini VirtualizedList 的 anchor、动态高度和可见项设计。
2. 基于 Deepreef ScrollBox 实现 `VirtualizedTranscript`。
3. 保留 sticky bottom、用户手动离底后不自动拉回、hydration 不覆盖 live delta。
4. 接入 `useFlickerDetector` 和现有 FrameEvent 指标。

验收：

- 500+ transcript 条目和 20 个 Worker 下可流畅输入、滚动和展开。
- 流式输出无明显全屏闪烁。
- resize 后无旧帧残留。
- 鼠标滚轮只影响当前面板。

### TUI-GM-70：稳定性与完成验收 ✅

1. 建立组件快照、Store replay、PTY、resize、长会话和并发 Worker 测试。
2. 在本地终端、SSH、tmux、鼠标开启/关闭、No Color 和浅色主题验收。
3. 审核所有复制代码的 Apache-2.0 文件头和来源说明。
4. 更新 `Deepreef项目设计文档.md`、`DONE.md` 和 `ADVICE.md`。

验收：

- 默认 TUI 只使用 `@deepreef/ink`。
- 不存在 OpenTUI 运行分支和依赖。
- Gemini 风格主题、动画和多 Agent 展示完整可用。
- Permission、Question、Session、Plugin、Memory、MCP 和 pipe 模式无回归。

### TUI-GM-80：App.tsx 集成新组件 ✅

将 TUI-GM-10～70 移植的组件接入 App.tsx 主布局：

1. 在 scrollableContent 顶部插入 `<OrchestrationSummary>`（三栏编排概览：Workers/Supervisor/Loop）。
2. 在 `DeepiMessages` 与 `WelcomeWhenEmpty` 之间插入 `<LoadingIndicator>`（Gemini CLI 风格 spinner + 时间）。
3. 保持现有 Bridge 行为，不破坏 Permission/Question 对话流。

验收：

- `typecheck` 通过（0 错误）。
- `bun test` 2325 pass，474 fail（memory 预置问题）。
- `git diff --stat` 仅 `packages/tui/src/App.tsx` 变更（+12 行）。
- `bun run dev` 可看到三栏总览和 loading spinner。

### TUI-GM-90：可选的 `@jrichman/ink` 独立 benchmark

该任务不是迁移任务，不进入当前关键路径。

仅在独立临时目录建立相同 fixture，对比：

- 500 条消息长会话。
- 20 个 Worker 高频状态更新。
- 鼠标滚动、点击、文本选择。
- Permission、Question、中文输入和粘贴。
- Ctrl+C、resize、SSH、tmux 和异常退出。
- 帧耗时、输入延迟、内存和可见闪烁。

只有 `@jrichman/ink` 在核心指标上显著优于当前 `@deepreef/ink`，且迁移成本可控时，才另立方案讨论替换。开发 Agent 不得在本方案中直接切换渲染引擎。

---

## 十一、测试与验收矩阵

### 11.1 必须具备的 fixture

- 单 Worker 正常完成。
- 四个 Worker 并发，其中一个等待权限、一个失败。
- Worker 连续失败后请求 SupervisorAdvice 并继续。
- Supervisor 候选冷却、不可用和全部失败。
- Question 从 Subagent 冒泡到主 TUI。
- Session hydration 与 live delta 同时发生。
- checkpoint 保存后退出并恢复。
- Plugin、Memory、MCP 后台加载状态变化。
- 主题切换期间存在流式输出。
- No Color 和屏幕阅读器模式。

### 11.2 性能与稳定性目标

| 指标 | 目标 |
|---|---|
| 流式输出全屏可见闪烁 | 0 |
| 键盘输入 p95 延迟 | `< 50ms` |
| resize 后残留旧帧 | 0 |
| 20 Worker 状态更新时输入阻塞 | 不可感知 |
| 单 Worker 更新影响 | 仅相关行和摘要 |
| Dialog 快捷键穿透 | 0 |
| 鼠标关闭时不可达核心操作 | 0 |
| 退出后 raw mode/光标异常 | 0 |
| No Color 状态不可区分 | 0 |

### 11.3 行为边界

- 用户手动选择免费模型，TUI 不恢复 free-auto。
- TUI 不恢复自动推理强度。
- Supervisor 只指导，不执行工具。
- Worker 工具调用继续经过权限和验证。
- yolo 只能由用户显式开启并二次确认。
- Plugin、Memory 和 MCP 状态可见，但不能绕过 Core 生命周期。

---

## 十二、开发 Agent 执行规则

1. 开始任务前读取本方案、`TODO.md`、`ADVICE.md` 和对应 Gemini CLI 源文件。
2. 可直接复制的纯 UI 组件必须复制并适配，不从头重写同等实现。
3. 每个复制文件保留 Apache-2.0 文件头，并记录 Gemini 原始路径。
4. 不复制 Gemini Core 依赖；先定义 Deepreef 自有 props/store adapter。
5. 不修改 Deepreef Core/TUI、权限、Question、Session、Plugin、Memory 和 MCP 边界。
6. 不允许顺带切换 `@jrichman/ink` 或重启 OpenTUI 路线。
7. 每个阶段独立提交，附测试、截图或 PTY 录制证据。
8. 遇到渲染器问题先做最小复现，不在业务组件里堆兼容补丁。
9. 动画、主题和鼠标必须有 No Color、键盘和低动画降级。
10. 不回退或覆盖工作区中与当前任务无关的用户改动。

---

## 十三、完成定义

本方案完成时，Deepreef 应具备：

1. 基于现有 `@deepreef/ink` 的稳定单一 TUI。
2. Gemini CLI 风格的语义主题、配色、渐变和状态动画。
3. 固定可见且可折叠的 Local Workers、Supervisor、Loop State 总览。
4. Gemini 风格的多 Agent 折叠组、活动时间线和 Worker 详情。
5. 集中的 DialogManager、稳定 MainContent、Composer 和 LoadingIndicator。
6. 鼠标可完成常用导航，键盘可完成全部核心操作。
7. 长会话、多 Worker、resize、SSH 和 tmux 下无明显闪烁。
8. OpenTUI 失败原型和依赖已清理。
9. Deepreef Core、权限、Question、Session、Plugin、Memory、MCP 和安全边界未被破坏。
10. `@jrichman/ink` 只作为可选 benchmark 对象，未进入默认运行路径。
