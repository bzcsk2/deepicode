# Deepreef 当前开发 TODO

最后整理：2026-06-13

本文只保留尚未完成、待人工验收或明确暂缓的工作。

- 已完成能力、历史实施记录和验证结果见 [DONE.md](DONE.md)。
- 当前架构方案见 [Deepreef项目设计文档.md](Deepreef项目设计文档.md)。
- 开发审核意见与领取限制见 [ADVICE.md](ADVICE.md)。
- 历史融合方案讨论见 [Deepreef后续开发计划.md](Deepreef后续开发计划.md)。

---

## 0. 当前状态

已归档到 `DONE.md`，不得重复领取：

- `RM-10` 至 `RM-30`
- `QST-10`、`PERM-10`
- `DRF-00` 至 `DRF-80`
- `FG-60-R`
- `CTX-70` 文档部分
- 已完成的 TUI、Harness、Plugin、MCP、AgentMemory 和滚动修复
- `DA-00` 永久双角色配置与迁移
- `DA-10` CapabilityCatalog 与 RoleCapabilityView
- `DA-20` WorkerRuntime/SupervisorRuntime 长期双运行时
- `DA-30` 固定 WorkflowCoordinator 与版本化通信
- `DA-40` 双角色 Session、Workflow checkpoint 与恢复
- `DA-50` TUI Tab 双向沟通与 Workflow 状态栏
- `DA-60` 兼容清理、端到端测试与发布门禁

当前开发主线：

> 将现有 Build/Plan 单引擎模式升级为永久 Worker/Supervisor 双角色运行时，并实现固定 Workflow 与 TUI 双向沟通。

固定领取顺序：

```text
DA-00 永久双角色配置与迁移
  → DA-10 CapabilityCatalog 与角色能力视图
  → DA-20 长期双 Agent Runtime
  → DA-30 固定 WorkflowCoordinator
  → DA-40 双角色 Session 与恢复
  → DA-50 TUI Tab 双向沟通与 Workflow 状态栏
  → DA-60 兼容清理、端到端验收与发布门禁
```

| 顺序 | 任务 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|
| 1 | `DA-00` 永久双角色配置与旧配置迁移 | P0 | 无 | ✅ |
| 2 | `DA-10` CapabilityCatalog 与 RoleCapabilityView | P0 | DA-00 | ✅ |
| 3 | `DA-20` WorkerRuntime/SupervisorRuntime 长期双运行时 | P0 | DA-10 | ✅ |
| 4 | `DA-30` 固定 WorkflowCoordinator 与版本化通信 | P0 | DA-20 | ✅ |
| 5 | `DA-40` 双角色 Session、Workflow checkpoint 与恢复 | P1 | DA-30 | ✅ |
| 6 | `DA-50` TUI Tab 双向沟通与 Workflow 状态栏 | P1 | DA-40 | ✅ |
| 7 | `DA-60` 兼容清理、端到端测试与发布门禁 | P1 | DA-50 | ✅ |

---

## 1. 开发规则

### 1.1 每次只领取一个闭环

1. 按固定顺序领取任务，不跨阶段并行修改相同运行时边界。
2. 先阅读目标文件、邻近测试、设计文档和 `ADVICE.md`。
3. 优先复制、抽取和适配 Deepreef 已有实现，不重新实现第二套 Context、Session、ToolRegistry、PluginRuntime、McpHost 或 TUI 框架。
4. 先补失败测试，再做最小实现。
5. 完成后从本文删除对应任务，在 `DONE.md` 写入实际修改、接线位置、验证命令和保留限制。

### 1.2 不可破坏的边界

| 边界 | 必须保持 |
|---|---|
| Core/TUI | Core 只通过结构化事件向 TUI 暴露状态，不 import React/Ink |
| 双角色 | Worker/Supervisor 拥有独立上下文和配置，不使用单一 `currentAgent` 切换伪装 |
| 工具执行 | Worker 继续走 StreamingToolExecutor、PermissionEngine、Harness 和 Verification Gate |
| Supervisor | 只读、只规划检查、只返回结构化 Advice，不能执行写工具 |
| Plugin/MCP | 底层只加载一次，通过角色能力视图过滤暴露 |
| 模型控制 | 用户明确选择 Provider/model/thinking；不得自动切换 |
| 免费模型 | 不恢复 `free-auto`，不自动切换到其他免费或付费模型 |
| 缓存 | Evidence、Advice、TaskLedger 和运行态进入可变上下文 |
| Workflow | 默认最多 9 轮；达到上限必须阻塞并请求用户 |
| TUI | Workflow 状态栏固定在输入框正上方，不放入滚动区或屏幕顶部 |

### 1.3 统一验证门禁

```bash
bun run typecheck
bun test
git diff --check
```

涉及远程模型时必须提供默认跳过的显式 smoke test，CI 不依赖免费接口稳定性。

---

## 2. DA-00：永久双角色配置与迁移

### 目标

将现有全局或单会话 Agent 配置升级为两套永久角色配置：

```ts
type AgentRole = "worker" | "supervisor"

interface AgentRoleProfile {
  role: AgentRole
  modelTarget: string
  harness: "strict" | "normal" | "loose"
  thinking: "off" | "open" | "high"
  contextWindow?: number
  maxTokens?: number
  temperature?: number
  tools: { allow?: string[]; deny?: string[] }
  plugins: string[]
  mcpServers: string[]
  skills: string[]
}
```

项目配置文件固定为 `.deepreef/agents.json`。

### 实施

- 新增 `packages/core/src/agent-profile/types.ts`。
- 新增 `packages/core/src/agent-profile/schema.ts`。
- 新增 `packages/core/src/agent-profile/store.ts`。
- 使用 Zod 严格校验和版本字段。
- API Key 不写入角色配置，继续由 ModelTarget key policy 和环境变量解析。
- `contextWindow` 必须 clamp 到 ModelTarget 声明窗口。
- 将旧 `build/plan`、`ui-settings.agent`、全局 thinking、项目 harness 和 activeSkills 幂等迁移为两套配置。
- 保存时只写 `worker/supervisor`；旧名称只读兼容。
- 修改配置从对应角色下一次调用生效，不中断正在执行的请求。

### 验收

- 两个角色重启后分别恢复模型、Harness、Thinking、上下文和能力配置。
- 修改 Worker 不影响 Supervisor，反向同理。
- 非法配置给出诊断并安全回退。
- 旧配置迁移幂等，不丢用户选择。

---

## 3. DA-10：CapabilityCatalog 与角色能力视图

### 目标

共享加载底层能力，按角色过滤暴露：

```text
CapabilityCatalog
  ├─ builtin tools
  ├─ plugin tools/hooks/assets
  ├─ MCP tools/resources
  └─ skills

RoleCapabilityView(worker)
RoleCapabilityView(supervisor)
```

### 实施

- 从当前 CLI 启动接线抽出统一 `CapabilityCatalog`。
- PluginRuntime、McpHost、MCP 连接和 Plugin Hook 只初始化一次。
- 根据角色配置过滤工具、Plugin、MCP server 和 Skill。
- Supervisor 最终强制只读；配置错误也不得获得写工具、危险 Shell、直接 patch 或权限 bypass。
- Worker 能力继续经过现有权限、安全和治理入口。
- Hook 事件携带 role/workflow metadata。

### 验收

- 同一 MCP/Plugin 不会因两个角色重复启动。
- 两角色能力清单不同且符合配置。
- Supervisor 配置写工具时被 schema 和 runtime 双重拒绝。

---

## 4. DA-20：长期双 Agent Runtime

### 目标

将单一 `ReasonixEngine.currentAgent` 模式升级为：

```ts
DualAgentRuntime {
  worker: AgentRuntime
  supervisor: AgentRuntime
  workflow: WorkflowCoordinator
}
```

### 实施

- Worker 和 Supervisor 分别持有 ChatClient、ContextManager、ImmutablePrefix、AppendOnlyLog、VolatileScratch、压缩策略和运行状态。
- Worker 从 Build Agent system prompt 和权限边界迁移。
- Supervisor 从 Plan Agent 和 guided-loop prompt 迁移。
- 用户与 Supervisor 的讨论不得追加到 Worker 历史。
- 新增 `sendTo(role, input)`、`interruptRole(role)` 和 `getRoleState(role)`。
- 不使用 `AgentTool` 或一次性 Subagent 模拟两个主角色。
- `switchAgent(build|plan)` 仅保留短期兼容适配器，映射到对话目标并发出弃用警告。
- Supervisor 永远没有写执行器。

### 验收

- 两个角色保持独立长对话和上下文。
- Supervisor 流式输出不覆盖 Worker 状态和历史。
- 中断一个角色不终止另一个角色和整个 TUI。

---

## 5. DA-30：固定 WorkflowCoordinator

### 固定状态机

```text
Supervisor analyse/plan
  → Worker do
  → Worker report/verify
  → Supervisor check
  → continue/revise/approve/blocked/ask_user
  → 最多 9 轮
```

### 实施

- `/run <goal>` 或明确 TUI 动作启动 Workflow；普通 Tab 对话不得自动修改项目。
- 首轮执行前必须有 Supervisor 计划。
- Supervisor 未配置或不可用时请求用户选择降级，不得静默跳过。
- 扩展 EvidenceBundle、SupervisorAdvice 和 WorkflowLoopState：
  - `workflowId`
  - `iteration`
  - `ledgerVersion`
  - `basedOnLedgerVersion`
  - Supervisor 决策字段
- Supervisor 消费冻结 EvidenceBundle；Advice 只在 Worker 安全点采用。
- ledgerVersion 不一致的 Advice 标记 stale，禁止注入。
- 完成条件为 Worker 报告完成、Verification Gate 通过或明确豁免、Supervisor approve。
- 9 轮上限、无进展、预算耗尽和角色不可用进入 blocked/ask_user。

### 验收

- 覆盖 approve、revise、stale Advice、Supervisor 不可用、用户改计划、9 轮上限和恢复。
- 测试证明 Supervisor 不执行工具，Worker 不可绕过检查自行宣布完成。

---

## 6. DA-40：双角色 Session 与恢复

### 实施

- Session 记录增加 role、agentSessionId、workflow snapshot、EvidenceBundle 摘要和 Advice 采用/拒绝结果。
- 两个角色消息分别持久化和恢复，不把 Supervisor 对话混入 Worker prefix。
- Workflow checkpoint 恢复后继续原 iteration/phase，不重复采用同一 Advice。
- 角色偏好保存在 `.deepreef/agents.json`；任务运行态保存在 Session/checkpoint，二者不可混用。

### 验收

- 在 analyse、Worker do、等待 check 和 blocked 阶段强制退出后均可恢复。
- 恢复后角色配置、消息历史、TaskLedger 和 Workflow 进度一致。

---

## 7. DA-50：TUI Tab 双向沟通与 Workflow 状态栏

### 固定布局

```text
[Supervisor] [Worker]                         active: Worker
...当前角色的独立对话记录...

DeepReef   Workflow  [D] analyse > [W] do > [W] report  <- loops: 9 r
┌──────────────────┬──────────────────┬──────────────────────────────┐
│ Supervisor  wait │ Worker      work │ goal: fix all bugs           │
└──────────────────┴──────────────────┴──────────────────────────────┘
> 发送给 Worker
```

优先复用现有 `OrchestrationStore`、`OrchestrationSummary`、`ChoiceMenu`、TranscriptStore 和消息滚动实现，不重写 TUI 框架。

### 交互

- 无覆盖层、无 Question/Permission、无自动补全候选时，`Tab` 切换 Supervisor/Worker 对话和输入目标。
- 自动补全打开时 Tab 保留原用途；Question、Permission 和危险确认优先。
- 两个 Tab 分别保存草稿、消息列表和滚动锁定位置。
- Workflow 状态栏固定在输入框正上方，属于 `bottomContent`；不得放在屏幕顶部或滚动消息区。
- 状态栏固定为两行：
  - 第一行：`DeepReef + Workflow 阶段链 + loops`
  - 第二行：单张 `Supervisor | Worker | goal` 三段卡片
- `[D] analyse` 表示 DeepReef 调度 Supervisor 分析；`[W] do/report` 表示 Worker 实施和报告。
- 当前阶段通过颜色或粗体高亮。
- 消息输出、历史滚动和 Tab 切换不得改变状态栏位置。
- 窄终端优先截断 goal，再缩短角色状态；状态栏不得换行造成聊天区跳动。
- 输入框和 StatusBar 明确显示当前发送目标。
- `/talk worker|supervisor` 与 Tab 等价。
- `/agent-config worker|supervisor` 打开角色永久配置菜单。
- 旧 `/agent build|plan` 只显示迁移提示。

### 验收

- Worker 输出过程中可切到 Supervisor 交谈，再切回原滚动位置。
- 向 Supervisor 发消息不会进入 Worker 工具上下文。
- Workflow 运行期间 Tab 切换不暂停、不取消、不重启任一角色。

---

## 8. DA-60：兼容清理与发布门禁

### 清理

- 删除主路径对 `ReasonixEngine.currentAgent`、全局 thinkingMode、全局 activeSkills 和单一 sessionStrictness 的依赖。
- `build/plan` 仅保留一个版本周期的读取迁移适配器。
- 更新帮助文本、命令说明、设计文档和 DONE。
- 不得把旧模式与新双角色模式同时宣称为主架构。

### 端到端矩阵

1. 两角色使用不同 Provider/model/context/harness/thinking。
2. 两角色使用不同 Tool/Plugin/MCP/Skill 能力视图。
3. 固定 Workflow 完整成功、修订、失败、恢复和 9 轮阻塞。
4. Tab 双向沟通、独立草稿、独立滚动、流式输出期间切换。
5. Supervisor 无写权限、无工具执行、无隐式付费模型调用。
6. 重启后角色配置和运行中 Workflow 正确恢复。

### 完成门禁

- `bun run typecheck`
- 双角色 Core/TUI 聚焦测试
- 真实 Engine 端到端测试
- `bun test` 真实结果
- `git diff --check`

---

## 9. 待人工验收

### OS-12/13-R：macOS 与 Windows 原生体验

- 在真实 macOS/Windows 终端验证 PTY/ConPTY。
- 验证中文路径、通知、剪贴板和进程树终止。
- CI 自动化已覆盖基础行为，但不能替代真实终端验收。

### CTX-70：Context 长会话人工验收

- 验证长会话 trim/compact。
- 验证 summarizer fallback。
- 验证重启后配置持久化。

### 可选远程 Smoke

- 使用 `DEEPREEF_SUPERVISOR_SMOKE=1` 验证用户显式配置的免费 Supervisor。
- StepFun 候选通过真实 smoke 后才能启用。
- Smoke 失败不得阻塞本地 Worker 或触发自动模型切换。

---

## 10. 待项目负责人决定

以下不阻塞 `DA-00`，进入对应阶段前必须确认或采用保守默认值：

1. **远程 Supervisor 隐私**：默认关闭；首次启用明确提示 Evidence 可能包含路径、错误日志和代码片段。
2. **付费 Oracle**：默认禁用；配置后仍需每次或每 Session 确认。
3. **Worker 默认模型**：不硬编码具体本地模型，通过 `worker.local` target 和 Profile 匹配。
4. **Supervisor 文件读取**：首版只接收有界 EvidenceBundle，不直接读取仓库。
5. **达到预算后的行为**：保存 checkpoint 后暂停并请求用户，不无人值守无限重试。

---

## 11. 明确暂缓

除非 Benchmark 或用户明确要求，不要顺手实现：

- 完整 iceCoder TaskGraph。
- L1/L2 Supervisor takeover/handoff 和自动权限提升。
- Supervisor 直接执行工具或修改文件。
- 自动调用付费模型。
- 免费接口并行竞速。
- 整仓复制 iceCoder 或 SmallCode。
- 替换 Deepreef Context、Session、MCP、Memory 或 TUI 架构。
- 为每个模型写大段独立 system prompt。
- 动态 Bash 并发判断、Python Kernel、Web/IDE 多前端和完整 OAuth MCP。
