# Deepicode Bug 跟踪与修复指南

**最后更新**: 2026-06-01（新增中途指令与工具执行可靠性实施约束）

> **历史审计记录，不是当前开发队列。** 多个条目已经失效。开始开发前以 `TODO.md` 为唯一入口，并核对 `DONE.md`。
> 已修复项 → `DONE.md` ｜ 当前待办与暂缓项 → `TODO.md`

---


### 确认保留：需要进入开发队列

| ID | 优先级 | 结论 | 代码依据 | 实施约束 | 状态 |
|----|--------|------|----------|----------|------|
| AUD-01 | P0 | `bash` 的敏感文件扫描可绕过。命令中的 `.env`、`.npmrc` 等无扩展名文件不会被 `pathRe` 提取，后续 `isSensitive()` 没有机会执行。 | `packages/tools/src/shell-exec.ts:53-61` | 不要把扩展名改成简单可选后扫描所有单词。应提取 shell token 后检查敏感 basename；至少增加 `cat .env`、`cat .npmrc`、相对路径和绝对路径测试。 | ✅ 已修复 |
| AUD-02 | P1 | 结果溢出持久化配额尚未闭环。`sessionQuotaBytes` 和 `DEFAULT_SESSION_QUOTA_BYTES` 已定义，但写入前没有使用，也没有清理策略。 | `packages/core/src/result-persistence.ts:16-22,61-83` | 实现确定性的 per-session 配额核算、拒绝后 preview fallback、旧文件清理和并发写入测试。不要只加进程内 `Map` 后宣称完成跨重启配额。 | ⬜ 待实现 |
| AUD-03 | P1 | 上下文预算的 `force` 分支目前只发提示，不执行 token 硬边界。已有 `maxRounds` 机械截断，但少量超大消息仍可能越过模型窗口。 | `packages/core/src/context/manager.ts:65-94`，`packages/core/src/loop.ts:84-96` | 保留 tool-call/tool-result 原子组和 system prefix；增加 token 预算下的机械 fallback。不要照抄报告中可能切断工具消息组的简单倒序 slice。 | ⬜ 待实现 |
| AUD-04 | P1 | 自动 thinking mode 的 emergency 生命周期未闭环。`resetEmergency()` 只有测试调用点；一次错误进入 emergency 后，生产路径没有恢复入口。 | `packages/core/src/mode-selector.ts:43-45,62-89` | 先明确恢复策略：显式命令、连续成功轮次或冷却时间。不要把问题误写成"成功时立即清空 errorHistory"，否则会破坏 10 分钟错误频率规则。 | ✅ 已修复 |
| AUD-05 | P1 | 编辑 fallback 的歧义保护不完整。报告对 Pass 7 的判断是误报，但 Pass 2、Pass 3、Pass 6 等路径仍使用 `indexOf()` 直接选择首个匹配；主编辑路径同样会替换首个精确匹配。 | `packages/tools/src/fuzzy-edit.ts:18-33,140-175`，`packages/tools/src/edit.ts:93-100` | 对每个会写文件的匹配路径统一执行唯一性校验。已有依赖"替换首个重复项"的测试必须重新审视产品语义，不能静默保留危险行为。 | ⬜ 待实现 |
| AUD-06 | P2 | fallback tool-call ID 不是并发稳健的。全局 `toolCallSeq` 每轮重置，并拼接 `Date.now()`；并发 `runLoop()` 或自定义 client 缺失 ID 时存在碰撞窗口。 | `packages/core/src/loop.ts:19-25,107` | fallback 改用 `randomUUID()`；保留 provider 返回的非空 ID。该项是稳健性修复，不是报告声称的常规路径 P0。 | ✅ 已修复 |
| AUD-07 | P2 | Hook 失败可观测性仍未接入运行时 logger。`HookManager` 已有 `setErrorObserver()`，但 Engine 没有注册 observer；before hook 失败会 fail-safe deny，却缺少诊断事件。 | `packages/security/src/hooks.ts:41-77`，`packages/core/src/engine.ts:127-157` | 在日志专项中接线，记录 phase 和错误，不记录敏感参数。保持 before hook 失败时 deny、after/loop hook 失败时不阻断主流程。 | ⬜ 待实现 |
| AUD-08 | P2 | `repair.ts` 的 `storm()` 会从不可解析输入中提取第一个 KV 并宣告成功，可能丢弃其他参数后执行错误工具调用。 | `packages/core/src/context/repair.ts:97-110` | 限制为可证明只有一个 KV 的场景，或返回 partial 状态并拒绝直接执行。增加多参数残缺输入测试。 | ⬜ 待实现 |
| AUD-09 | P3 | SSE 首事件 BOM 容错可补充。 | `packages/core/src/client.ts:198-248` | `TextDecoder` 后应处理 Unicode `\uFEFF`，不要照抄报告中的字节串 `\xEF\xBB\xBF`。 | ✅ 已修复 |
| AUD-10 | P3 | runtime logger 的敏感 key 规则可补充 `private_key` 等变体。 | `packages/core/src/runtime-logger.ts:328-351` | 作为日志专项测试项处理。`apikey`、`auth_token`、`access_token` 已被现有正则覆盖，不要重复误报。 | ✅ 已修复 |

### 合理但降级：需要独立设计或接受 tradeoff

| ID | 结论 | 处理方式 |
|----|------|----------|
| AUD-D1 | `AsyncSessionWriter` 在 `appendFile()` 失败时会丢掉已从队列 splice 的 chunk。报告描述的 enqueue 竞态不成立，因为 `finally` 会再次 flush 剩余队列；真实问题是 best-effort 持久化语义和失败可观测性。 | 与日志系统、退出 flush 一并设计。不要为了 session JSONL 引入阻塞主循环的同步写。 |
| AUD-D2 | 权限确认 Promise 没有超时。TUI cancel 已会 `respondPermission(false)`，交互式等待本身不是 Bug。 | 可增加可配置超时和超时拒绝事件，定位为 UX 防挂起增强。 |
| AUD-D3 | Windows 子进程树清理不完整。Unix 已使用进程组；Windows 不是当前目标平台。 | 保持已知限制。未来支持 Windows 时再引入 `taskkill /T` 或平台抽象。 |
| AUD-D4 | `edit.ts` 会整体读取最大 10 MiB 文件。内存使用有明确上界，不构成当前高危缺陷。 | 性能优化候选，不要为此提前引入复杂流式编辑。 |
| AUD-D5 | `contextUsage` 使用最近一次 API 请求的 prompt token，而累计费用使用 `tokens.input`。这更符合“当前上下文占用”语义。 | 如 UI 文案不清晰，改标签或补测试；不要改成累计值。 |

### 驳回：不要进入 TODO

| 来源条目 | 驳回理由 |
|----------|----------|
| Audit A1：Pass 7 缺少多匹配保护 | 误判。`allMatches.length !== 1` 已同时拒绝 0 次和多次匹配。真正问题见 AUD-05。 |
| Audit R1：`hash-edit.ts` 在 reader 未结束时 `writer.end()` | 误判。`writer.end()` 位于 `for await` 完成之后。可单独优化 close/unlink 的等待顺序，但不存在报告描述的继续向已关闭 writer 写入。 |
| Audit R3：shared batch 中断后未 settled | 当前 executor 已有外层 catch，并为全部 unsettled tool call 补错误结果。仍应通过专项 H 测试验证 generator 提前关闭场景，但不能按报告补一套重复 settled 逻辑。 |
| Audit T3：TUI tool key 必须改为 `tool_call_id` | 当前 `LoopEvent` 没有向 TUI 暴露 tool-call ID，正常批次内 `toolCallIndex` 是稳定关联键。报告给出的修复无法直接落地；异常重复 index 应在 SSE 层校验。 |
| Packages 1.1.1：SSE envelope 使用渐进式 JSON 修补器 | 错误分层。SSE envelope 是 provider 协议 JSON，解析失败应记录并丢弃或报错；工具参数修复已在 executor 单独处理。对 envelope 做单引号替换、截断补括号会掩盖协议损坏。 |
| Packages 3.2.1：恢复会话后重新计算 token 消耗并写入 stats | 误判。当前 `stats` 是本次 engine 生命周期内 API usage/cost 统计，恢复会话后 reset 是现有语义；上下文 token 占用由 `ContextManager.estimateTokens()` 独立计算。 |
| Packages 6.1.1：所有 TUI 文本统一手工裁切 | 未提供可复现问题，且底层 Ink 已负责布局。先补超长文本渲染测试，有失败再在最小边界修复。 |
| Packages 6.2.1：bridge 可能 stale closure | 未给出具体闭包或复现路径。`bridge.tsx` 的状态更新已使用函数式 `setState(prev => ...)`。 |

### 对两份报告的使用规则

1. `Deepicode-Audit-2026-06-02.md` 保留为线索来源，不覆盖 `TODO.md`。
2. `packages_review_report_final.md` 保留为方法论参考，其中“可能缺少”条目必须先复现。
3. 新 Agent 开发时以 `TODO.md` 为唯一领取入口；本节条目需要进入开发时，再拆入 `TODO.md` 并标注测试矩阵。
4. 两份报告中的优先级不直接继承，以本节复核后的优先级为准。

---

## 2026-06-01 专项设计审查：中途指令与工具执行可靠性

详细实施规范见 [`Deepicode-Full-Implementation-Plan.md`](Deepicode-Full-Implementation-Plan.md)。该文件已经按当前仓库接口重写，可直接用于分阶段开发。

### 结论

旧稿方向合理，但不能直接实施。旧稿混用了过时接口、重复队列和共享 AbortController 方案，容易破坏现有 TUI 串行提交与 Core 中断生命周期。新稿将专项拆为：

1. 工具结果恰好写入一次。
2. Core 中途指令队列与 loop 安全点。
3. TUI 注入优先路由与原有 `messageQueue` fallback。
4. 独立可选的结果溢出持久化。
5. 独立可选的 Hook 可观测性增强。

### 必须遵守的决策

| 主题 | 决策 |
|------|------|
| LoopEvent | 保留 `{ role, content?, metadata? }`，不要改成 `{ type: ... }` 联合类型 |
| runLoop | 保留 `LoopOptions` 对象参数 |
| AbortController | 保留每次 `submit()` 独立 controller；禁止跨请求共享 |
| Core 队列 | 新增 `pendingInstructionQueue`，只负责同一 submit 内的安全点注入 |
| TUI 队列 | 保留 `bridge.tsx` 的 `messageQueue`，只负责后续独立 submit |
| 注入消息 | 写入普通 user message；禁止伪装 `<system-reminder>` 或修改 prefix |
| submit 消费 | 禁止 Core 尾递归 `submit()` |
| 工具结果 | executor 负责每个 tool call 恰好追加一个 ToolResult；loop 禁止整批盲补 |
| 工具并发 | 保持静态 `shared/exclusive`；暂不根据 bash 文本动态判断 |
| 级联取消 | 暂不增加 bash 名称特判；需要时设计通用 dependency group 或 `failFast` 元数据 |
| 结果摘要 | 默认不调用 LLM；先实现确定性截断与安全落盘 |

### 为什么先修工具结果

当前 `loop.ts` 在 executor 抛错后会给整批 tool calls 盲目追加中断结果。若部分工具已经完成，可能生成重复 tool result。另一方面，shared batch 权限拒绝路径也可能没有向上下文补写错误结果。中途指令只能在 tool results 完整后安全写入，因此必须先完成 executor settled 跟踪。

### Agent 领取规则

每次只领取实施规范中的一个 Phase。先写失败测试，再做最小实现。完成后运行目标测试、`bun run typecheck`、`bun test`、`git diff --check`，并把结果记录到 `DONE.md`。不得顺手实现暂缓项。

---

## 历史审计条目（可能已失效）

| # | 问题 | 位置 | 优先级 |
|---|------|------|--------|
| B6 | SessionLoader 恢复时系统消息重复 | `core/src/session.ts` | P1 |
| B5 | repair.ts 1e+1f 组合策略缺失 | `core/src/context/repair.ts` | P2 |
| L2 | SessionWriter 队列无界增长 | `core/src/session.ts:114-142` | P2 |
| L5 | fuzzy-edit/hash-edit 未归一化 CRLF | `tools/src/fuzzy-edit.ts`, `hash-edit.ts` | P2 |
| L9 | reasoningText 消失导致布局跳动 | `tui/src/bridge.tsx:180-189` | P2 |
| — | Bash 确认 UI 4 个 Bug（U1-U4） | 多文件 | P1 |
| N5 | MCP auth `set` 接收明文 `api_key`（当前已返回 not_implemented，暂不处理） | `mcp/src/auth.ts` | P3 |
| N14 | API 重试未覆盖网络级错误（现有 catch 块已覆盖，经验证） | `core/src/client.ts` | 已验证 |

---

## 本轮审查——驳回项

| 来源 | 编号 | 原描述 | 驳回理由 |
|------|------|--------|---------|
| v4 | C1 | write_file 未从 index.ts 导出 | **误判**。代码中已 `export { createWriteFileTool } from "./write-file.js"` |
| v4 | C3 | MCP 超时硬编码 30s 不可配置 | 降级（已知 tradeoff）。30s 对当前场景足够 |
| pkg | 1.8 | AbortSignal 未传给工具 | **误判**。`ToolContext.signal` 已存在且 `ctx.signal` 已传给各工具 |
| pkg | 1.5 | Windows bash 不兼容 | 非目标平台 |
| v4 | H1 | bash OOM 无界内存 | 降级。`maxChars` 已有默认 200K 限制，截断前 OOM 场景极罕见 |
| v4 | H4 | 会话文件无写锁 | 已知限制。单用户单实例场景不触发 |
| v4 | H6 | 临时文件权限 | 降级。非安全关键路径 |
| v4 | M2 | SSE 不支持 `\r\n` | 降级。DeepSeek API 仅用 `\n` |
| v4 | M4 | safeStringify 截断破坏 JSON | **已修复**。P0-P3 批量修复中已改为合法 JSON |
| sec | 1.1 | 权限大小写敏感 | 已知限制 K10 |
| sec | 4.1 | 终端恢复缺 Ink unmount | **已修复**。DONE.md SIGINT 三轮修复 |
| sec | 5.3 | 危险命令正则可绕过 | 已知限制 K3 |
| pkg | 1.3 | JSONL 非原子写入 | 已知限制 K2 |

---

## 已知限制（不修复）

| # | 问题 | 理由 |
|---|------|------|
| K1 | Stale-read TOCTOU 窗口 | 毫秒级 |
| K2 | Session JSONL 崩溃一致性 | best-effort 设计 |
| K3 | Bash 黑名单可绕过 | 黑名单固有缺陷 |
| K4 | Tool 结果 200 字符截断 | 完整输出在 session 文件中 |
| K5 | Token 估算 ~20% 偏差 | 已知 tradeoff |
| K6 | 多进程并发编辑无冲突检测 | 单进程设计 |
| K7 | Push/monitor/cron 仅 Linux | 目标平台 |
| K8 | workflow/agent-tool 模拟执行 | 占位实现 |
| K9 | 跨 provider 会话迁移 | 仅 DeepSeek-compatible |
| K10 | 权限检查大小写敏感 | 工具名统一小写 |
| K11 | 光标位置用 ref | useInput 触发 re-render |
