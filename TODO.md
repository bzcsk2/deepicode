# Deepicode TODO

本文按实施计划 Phase 记录待完成任务，优先级从高到低。完成后同步更新 `DONE.md`。

---

## Phase 1 遗留（已完成）

### 1.1 Tokenizer Worker Pool ✅

**实施计划**: Step 1.4

状态：完成（2026-05-30）

- `tokenizer-pool.ts` + Worker 线程入口
- O(1) Map 任务调度，5 秒超时自动降级
- Worker 不可用时回退 CHARS_PER_TOKEN=4 近似估算

### 1.2 Tool-call Repair 流水线 ✅

**实施计划**: Step 1.6

状态：完成（2026-05-30）

- `repair.ts` 三阶段：Scavenge（6 子策略）→ Truncation → Storm
- 修复失败时不触发 API 重试

### 1.3 CacheFirstLoop 独立拆分 + 预算/Fold 集成 ✅

**实施计划**: Step 1.7

状态：完成（2026-05-30）

- `loop.ts` 从 engine.ts 析出独立 `runLoop()`，engine.ts `submit()` 简化为 ≈12 行
- Fold 决策（65%/75%/80%）在循环前非阻塞触发
- Fold force 时 yield `status` 事件通知

---

## Phase 2: 智能推理强度调节（5 项）

### 2.1 Tier 配置定义

**实施计划**: Step 2.1

目标：CNY 原生计价。四档位（chat-fast / chat-full / reasoner-budget / reasoner）。

验收：

- `strategy/tier-config.ts`
- CNY 定价常量（非 USD 换算）
- max_tokens / thinking 梯级配置

### 2.2 TaskClassifier（任务分类器）

**实施计划**: Step 2.2

目标：纯规则引擎，0 Token 成本。文件引用数、跨模块关键词、长度信号打分 → 0-10 分。

验收：

- `strategy/task-classifier.ts`
- 加载用户 `classifier.json`（优先）
- 单测覆盖：简单问答 → chat-fast，重构 → reasoner

### 2.3 ChainEstimator（任务链估算器）

**实施计划**: Step 2.3

目标：滑动 TPS 窗口（最近 10 次）+ Agentic 链式补偿（score > 6 时输出 Token 乘 2~3 倍）。

验收：

- `strategy/chain-estimator.ts`
- 异步 glob 扫描限 50 文件 / 500ms 超时

### 2.4 StrategySelector（策略选择器）

**实施计划**: Step 2.4

目标：编排分类 + 预估 → `StrategyNotifyEvent`（3 秒倒计时）。

验收：

- `strategy/strategy-selector.ts`
- 倒计时超时自动执行推荐档位
- `resolveTierDecision()` 可提前确认

### 2.5 TUI StrategyNotify 组件

**实施计划**: Step 2.5

目标：终端内渲染 4 档对比卡片，左右键切换，Enter 确认。

验收：

- `packages/tui/src/components/StrategyNotify.tsx`
- 超时自动使用推荐
- CNY 价格区间显示

---

## Phase 3: 壳层增强（3 项）

### 3.1 集中式状态管理

**实施计划**: Step 3.1

目标：`packages/shell/src/state.ts` 实现不可变状态更新。`processEvents()` 接收事件队列，派生出全新 TUI 渲染树。

验收：

- 声明式状态更新（返回新对象）
- 支持 messages、tool status、stats、errors 四个子状态

### 3.2 双模式事件系统

**实施计划**: Step 3.2

目标：推模式 `EventStream` + Pub/Sub `EventBus`，桥接核心的拉模式 AsyncGenerator。

验收：

- `packages/shell/src/events.ts`
- 多消费者订阅（TUI、日志、插件）

### 3.3 多 Agent 系统

**实施计划**: Step 3.3

目标：Build Agent（全工具权限）+ Plan Agent（只读权限）。Tab 键切换，Plan-to-Build 时分析结论注入 `system-reminder`。

验收：

- `packages/shell/src/agents/`
- JSON/Markdown 配置加载
- Agent 切换不修改消息历史

---

## Phase 4: 工具层完善（3 项）

### 4.1 LSP 集成

**实施计划**: Step 6.2（原 Phase 6，提前到工具层）

目标：文件编辑后触发 `vscode-languageclient`，3 秒内自动获取 diagnostics，类型错误反馈给 LLM。

验收：

- `packages/tools/src/lsp-client.ts`
- 编辑后自动触达，不阻塞主循环
- 类型错误在本轮内反推给模型

### 4.2 MCP 客户端

**实施计划**: Step 6.3

目标：接入 Model Context Protocol。支持 `.config/deepicode/mcp.json` 外挂服务。

验收：

- `packages/tools/src/mcp-client.ts`
- 工具自动发现与注册

### 4.3 Web Fetch & Python Kernel

**实施计划**: Step 6.4 + 4.5

目标：`web-fetch.ts`（HTTP 请求工具）、`python-kernel.ts`（IPython 会话）。

验收：

- web-fetch 支持 GET/POST，超时控制
- python-kernel 维系会话变量

---

## Phase 5: 安全层（3 项）

### 5.1 Deny-first 权限引擎

**实施计划**: Step 5.1

目标：三级判定——Deny 规则优先 → Allow 规则 → 默认 Ask。

验收：

- `packages/security/src/permission.ts`
- 多级模式：`default` / `acceptEdits` / `dontAsk`

### 5.2 Hooks 系统

**实施计划**: Step 5.2

目标：`beforeToolCall` / `afterToolCall` 拦截器。System-level bypass 标志用于 stale-read 自动重试的静默放行。

验收：

- `packages/security/src/hooks.ts`
- 死锁提权：stale-read 触发自动重读时不弹 Ask 窗

### 5.3 Git Snapshot 单文件追踪

**实施计划**: Step 5.3

目标：`.deepicode_patches/` 目录，仅备份被修改的单文件旧版本。毫秒级 `revert()`。

验收：

- `packages/security/src/git-snapshot.ts`
- 不拷贝全仓库（monorepo 友好）
- DiffPreview 终端差异展示

---

## Phase 6: 集成测试与调优（3 项）

### 6.1 SSE 边界测试（#14）

目标：streaming parser 在任意 chunk 切分下正确解析。

验收：

- 1 字节切分 / 半个 UTF-8 字符 / 半个 JSON 字段
- 最后一个 chunk 不完整时不崩溃

### 6.2 E2E 场景（#18）

目标：自动化端到端测试，不依赖真实 API。

建议场景：

- bash 执行 `pwd` 并返回结果
- read_file 读取 `package.json`
- edit 修改临时文件并验证内容
- 工具错误后模型继续回复
- 中断正在执行的 bash

### 6.3 性能基准 & 计费校准

**实施计划**: Step 7.2

目标：抽样 10 轮多工具调用，核对 DeepSeek 控制台账单与终端 CNY 预估，误差 < 20%。

验收：

- 基准测试脚本
- TUI 帧率 > 30fps（大文件 Hash 计算时）

---

## 待清理（3 项）

| # | 内容 | 说明 |
|---|------|------|
| D5 | `buildPiModel` + `vendor/pi.d.ts` + `vendor/pi.js` 死代码 | 3 文件删除 |
| P2-4 | `computeFingerprint` 冗余 reasoning_content | `immutable.ts` 清理 |
| P2-5 | `SegmentedLog` 类死代码 | `session.ts` 删除 ✅ |

---

## 暂缓

以下任务价值高但当前不做：

- MCP / LSP / Python Kernel（已在 Phase 4 中，优先于安全层）
- TTSR 规则系统
- Universal Config Discovery
- 多前端（Web、IDE Plugin）

---

## 进度总览

| Phase | 内容 | 完成 | 待做 |
|-------|------|------|------|
| 0 | 脚手架 | ✅ | — |
| 1 | 核心引擎 | ✅ 全部完成 | — |
| 2 | 智能推理调节 | — | 2.1~2.5 |
| 3 | 壳层增强 | — | 3.1~3.3 |
| 4/6 | 工具层 + 生态 | 7 工具可用 | 4.1~4.3 |
| 5 | 安全层 | — | 5.1~5.3 |
| 6/7 | 测试与调优 | — | 6.1~6.3 |
| — | 清理 | — | 3 项 |
