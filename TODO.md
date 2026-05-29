# Deepicode TODO

本文按开发优先级排列。完成后同步更新 `DONE.md`。

---

## 第一优先：TUI 接入 ✅

> 理由：当前 readline CLI 已无法支撑复杂交互（策略选择倒计时、流式工具进度、成本面板）。先让产品"能用"，再补策略和安全。

### T1. 复制 oh-my-pi TUI 核心组件 ✅

- 移植核心引擎：`tui.ts` / `terminal.ts` / `stdin-buffer.ts` / `bracketed-paste.ts` / `keybindings.ts` / `symbols.ts`
- 纯 JS 替代 Rust FFI：`utils.ts`（visibleWidth/wrapTextWithAnsi/truncateToWidth）+ `keys.ts`（matchesKey/parseKey/extractPrintableText）
- 验收：typecheck 通过，不依赖 oh-my-pi 源码

### T2. TUI 业务组件 ✅

- ChatView / ToolCallView / Input / StrategyNotify / TokenEstimate / DiffPreview / StatusLine
- 验收：7 组件全部实现，通过 typecheck

### T3. 事件桥接 + 集成 ✅

- `bridge.ts` 引擎事件 → TUI 组件
- `cli/tui.ts` 替换 readline，保留非 TTY 管道模式
- 验收：`bun run dev` TUI 启动

---

## 第二优先：安全层

> 理由：在产品可以交互之后，立即加固安全边界。Deny-first 权限引擎和 Hooks 系统是后续多 Agent、MCP 等扩展的安全底座。

### S1. Deny-first 权限引擎

**实施计划**: Step 5.1

目标：`packages/security/src/permission.ts`。三级判定——Deny 规则优先 → Allow 规则 → 默认 Ask。多级模式：`default` / `acceptEdits` / `dontAsk`。

验收：

- `rm -rf /` → Deny（不弹窗）
- `read_file` → Allow（静默通过）
- `edit` 未授权 → Ask（弹窗等待用户确认）
- `acceptEdits` 模式下 edit 自动 Allow

### S2. Hooks 系统

**实施计划**: Step 5.2

目标：`beforeToolCall` / `afterToolCall` 拦截器。System-level bypass 标志——stale-read 触发自动重读时静默放行，不弹 Ask 窗打断 Agent 闭环。

验收：

- `beforeToolCall` 可阻止工具执行并返回自定义错误
- `afterToolCall` 可修改工具返回值
- stale-read 自动重试路径注入 bypass 标志 → 不被拦截

### S3. Git Snapshot 单文件追踪

**实施计划**: Step 5.3

目标：`.deepicode_patches/` 目录，仅备份被修改的单文件旧版本。毫秒级 `revert()`。不拷贝全仓库。

验收：

- edit 前自动备份原文件
- `revert()` 恢复单文件到修改前状态
- DiffPreview 组件展示变更

---

## 第三优先：壳层增强 + 多 Agent

> 理由：安全底座就绪后，实现状态管理和事件系统，支撑多 Agent 协作。这是 Phase 6（MCP/LSP）的前置依赖。

### SH1. 集中式状态管理

**实施计划**: Step 3.1

目标：`packages/shell/src/state.ts`。`processEvents()` 接收事件队列，返回全新 state 对象（不可变更新）。

验收：支持 messages、tool status、stats、errors 四个子状态

### SH2. 双模式事件系统

**实施计划**: Step 3.2

目标：推模式 `EventStream` + Pub/Sub `EventBus`，桥接核心的拉模式 AsyncGenerator。

验收：多消费者同时订阅（TUI、日志、插件），互不干扰

### SH3. 多 Agent 系统

**实施计划**: Step 3.3

目标：Build Agent（全工具权限）+ Plan Agent（只读权限）。Tab 键切换，Plan-to-Build 时分析结论注入 `system-reminder`。

验收：

- JSON/Markdown 配置加载
- Agent 切换不修改消息历史
- Plan 模式下 write/edit/bash 被拦截

---

## 第四优先：智能推理强度调节

> 理由：策略系统的核心价值是降本。前期用 `deepseek-v4-flash` 已足够覆盖大部分场景，等用户量和长会话规模上来后再做精细化调度。

### ST1. Tier 配置定义

**实施计划**: Step 2.1

目标：`strategy/tier-config.ts`。CNY 原生计价，四档位。

验收：`chat-fast` / `chat-full` / `reasoner-budget` / `reasoner`，含 max_tokens 与 thinking 梯级

### ST2. TaskClassifier（任务分类器）

**实施计划**: Step 2.2

目标：纯规则引擎，0 Token 成本。文件引用数、跨模块关键词、长度信号 → 0-10 分。

验收：简单问答 → chat-fast，多文件重构 → reasoner，用户规则优先

### ST3. ChainEstimator（任务链估算器）

**实施计划**: Step 2.3

目标：滑动 TPS 窗口（最近 10 次）+ Agentic 链式补偿（score > 6 时乘 2~3 倍）。

验收：glob 扫描限 50 文件 / 500ms

### ST4. StrategySelector（策略选择器）

**实施计划**: Step 2.4

目标：编排分类 + 预估 → `StrategyNotifyEvent`（3 秒倒计时）。

验收：超时自动执行推荐档位，`resolveTierDecision()` 可提前确认

---

## 第五优先：工具层生态

### TL1. LSP 集成

**实施计划**: Step 6.2

目标：文件编辑后触发 `vscode-languageclient`，3 秒内获取 diagnostics，类型错误反馈给 LLM。

验收：编辑后自动触达，不阻塞主循环，类型错误本轮反推

### TL2. MCP 客户端

**实施计划**: Step 6.3

目标：接入 Model Context Protocol。支持 `.config/deepicode/mcp.json` 外挂服务。

验收：工具自动发现与注册

### TL3. Web Fetch & Python Kernel

**实施计划**: Step 6.4 + 4.5

目标：`web-fetch.ts` + `python-kernel.ts`。

验收：GET/POST + 超时；IPython 会话变量维系

---

## 第六优先：测试与调优

### TT1. SSE 边界测试

目标：streaming parser 在任意 chunk 切分下正确解析。1 字节 / 半个 UTF-8 / 半个 JSON 字段。

### TT2. E2E 场景

目标：自动化端到端测试，不依赖真实 API。bash / read_file / edit / 工具错误恢复 / 中断。

### TT3. 性能基准 & 计费校准

目标：抽样 10 轮多工具调用，CNY 预估 vs DeepSeek 账单误差 < 20%。TUI 帧率 > 30fps。

---

## 待清理

| # | 内容 | 说明 |
|---|------|------|
| D5 | `buildPiModel` + `vendor/pi.d.ts` + `vendor/pi.js` | 3 文件删除 |
| P2-4 | `computeFingerprint` 冗余 reasoning_content | `immutable.ts` 清理 |
| P2-5 | `SegmentedLog` 类死代码 | `session.ts` 删除 ✅ |

---

## 暂缓

- TTSR 规则系统
- Universal Config Discovery
- Python Kernel（独立于 TL3，完整 Jupyter 集成）
- 多前端（Web、IDE Plugin）

---

## 进度总览

| 优先级 | 内容 | Phase 映射 | 项数 | 状态 |
|--------|------|-----------|------|------|
| 0 | 脚手架 + 核心引擎 | Phase 0-1 | — | ✅ 全部完成 |
| **1** | **TUI 接入** ✅ | Phase 3 TUI 部分 | 3 | ✅ 完成 |
| **2** | **安全层** | Phase 5 | 3 | ⬜ |
| **3** | **壳层增强 + 多 Agent** | Phase 3 壳层部分 | 3 | ⬜ |
| **4** | **智能推理调节** | Phase 2 | 4 | ⬜ |
| 5 | 工具层生态 | Phase 4/6 部分 | 3 | ⬜ |
| 6 | 测试与调优 | Phase 6/7 部分 | 3 | ⬜ |
| — | 待清理 | — | 2 | ⬜ |
