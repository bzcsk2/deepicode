# Deepicode Bug 跟踪与修复指南

**最后更新**: 2026-06-05（P0-P3 批量修复完成）

---

## 一、P0 — 必须立即修复（0 项，全部已修复 ✓）

所有 P0 项已于本轮修复，详见 §六。

---

## 二、P1 — 建议近期修复（0 项，全部已修复 ✓）

所有 P1 项已于本轮修复，详见 §六。

---

## 三、P2 — 下个迭代

| 编号 | 问题 | 位置 |
|------|------|------|
| L2 | SessionWriter 队列无界增长（加队列上限 10000 条） | `core/src/session.ts:114-142` |
| L5 | fuzzy-edit/hash-edit 未归一化 CRLF | `tools/src/fuzzy-edit.ts`, `hash-edit.ts` |
| L9 | reasoningText 消失导致布局跳动（UX 改进） | `tui/src/bridge.tsx:180-189` |
| — | notebook-edit 同步文件操作 → 异步 + 原子写入 | `tools/src/notebook-edit.ts` |
| — | /skill 跨包相对路径 import 改为 package alias | `tui/src/App.tsx:171` |
| — | handleSessionSelect 卸载后 setState（加 isMountedRef） | `tui/src/App.tsx:217-230` |

---

## 四、P3 — 代码质量改进

| 编号 | 问题 | 位置 |
|------|------|------|
| Q10 | tool_start key fallback 与其他事件不一致 | `tui/src/bridge.tsx:83,95,111` |
| — | tool_call_id 规范化（跨 provider 场景，当前不需要） | `core/src/loop.ts` |
| — | client.ts 3 处 `any`/`as` 类型断言 | `core/src/client.ts` |
| — | notebook-edit 同步 I/O → 异步 | `tools/src/notebook-edit.ts` |

---

## 五、已知限制（不修复，记录在案）

| 编号 | 问题 | 理由 |
|------|------|------|
| K1 | Stale-read TOCTOU 窗口 | 毫秒级，atomic rename + exclusive 并发 |
| K2 | Session JSONL 崩溃一致性 | best-effort 设计 |
| K3 | Bash 命令黑名单可绕过 | 黑名单固有缺陷 |
| K4 | Tool 结果 200 字符截断 | 完整输出在 session 文件中可查 |
| K5 | Token 估算 ~20% 偏差 | 已知 tradeoff，待 tokenizer 接入后校准 |
| K6 | 多进程并发编辑无冲突检测 | 单进程 Agent 设计范围外 |
| K7 | Push notification / monitor / cron 仅 Linux | 目标平台 |
| K8 | workflow / agent-tool 为模拟执行 | 占位实现，待后续完善 |
| K9 | 跨 provider 会话迁移未清洗状态 | 当前仅 DeepSeek-compatible API |
| K10 | 权限检查大小写敏感 | 工具名在 registry 中统一小写 |
| K11 | 光标位置用 ref 不用 state | useInput 每次按键触发 re-render，读取 ref 正确 |

---

## 六、已修复（本轮 P0-P3 批量修复，2026-06-05）

### P0（6 项）

| 编号 | 问题 | 文件 | 改动 |
|------|------|------|------|
| P0-1 | LSP 路径解析未使用 ctx.cwd + 无敏感文件检查 | `tools/src/lsp.ts` | `resolve(ctx.cwd, args.file_path)` + `isSensitive()` |
| P0-2 | web-browser navigate/screenshot 无 SSRF 防护 | `tools/src/web-browser.ts` | `validateUrl()` + `hasPrivateIP()` + `isPrivateHostname()` + redirect 后重校验 + `isPrivateHostnameSync()` |
| P0-3 | Token 计费公式双重计费 cache tokens | `core/src/pricing.ts` | `nonCachePrompt = promptTokens - cacheHitTokens - cacheMissTokens` |
| P0-4 | Agent 配置 model/temperature/maxTokens 被忽略 | `core/src/engine.ts` | `ac.model ?? this.config.model` 等 fallback 链 |
| P0-5 | Session 持久化丢失 tool results | `core/src/loop.ts` | `toolExecutor.run()` 后追加 `sessionWriter.enqueue(messages)` |
| P0-6 | bridge.tsx 直接突变 React state | `tui/src/bridge.tsx` | `assistant_final` 改用不可变更新 `prev.messages.map(...)` |

### P1（13 项）

| 编号 | 问题 | 文件 | 改动 |
|------|------|------|------|
| S1 | Cron 换行符/命令注入 | `tools/src/cron.ts` | command + name 过滤 `[\n\r]` |
| S2 | read_file 未检测二进制文件 | `tools/src/file-ops.ts` | `hasBinaryEncoding()` 检测，拒绝二进制文件 |
| S3 | 工具缺少 isSensitive() | `tools/src/notebook-edit.ts`, `worktree.ts` | 添加敏感路径检查 |
| S4 | write-file 缺少大小限制 | `tools/src/write-file.ts` | `MAX_FILE_SIZE = 10MB` |
| R1 | shell-exec child.on("error") 未清理 timer | `tools/src/shell-exec.ts` | `clearTimeout(timer)` + `clearTimeout(sigtermTimer)` |
| R2 | anySignal 事件监听器内存泄漏 | `tools/src/web-fetch.ts`, `web-search.ts`, `web-browser.ts` | anySignal 返回 `{ signal, cleanup }`，fetch 后 cleanup |
| R3 | TokenizerPool shutdown pending Promise 悬空 | `core/src/context/tokenizer-pool.ts` | shutdown 时先 reject 全部 pending |
| D2 | loadApiKeyFromProjectFile 仅 DEEPSEEK | `core/src/config.ts` | 根据 provider 动态查找 `{PROVIDER}_API_KEY` |
| D3 | QueryEngine.query() tool call 返回空串 | `core/src/query-engine.ts` | tool call 场景返回标记字符串 |
| D4 | safe-stringify 截断后非合法 JSON | `tools/src/safe-stringify.ts` | 截断时输出合法 JSON 结构 |
| D5 | web-browser screenshot Date.now() 命名 | `tools/src/web-browser.ts` | `Date.now()` → `randomUUID()` |
| T1 | Delete 键被当作 Backspace | `tui/src/DeepiPromptInput.tsx` | 拆分 Backspace/Delete 分支 |
| T2 | SessionPicker 空列表 selIdx = -1 | `tui/src/SessionPicker.tsx` | 下行时检查 `sessions.length > 0` |

### P2（6 项）

| 编号 | 问题 | 文件 | 改动 |
|------|------|------|------|
| L1 | SSE 注释行（`:` 开头）未跳过 | `core/src/client.ts` | `if (trimmed.startsWith(":")) continue` |
| L3 | worktree runGit 无 AbortSignal | `tools/src/worktree.ts` | `runGit()` 添加 `signal` 参数，3 处调用点传递 `ctx.signal` |
| L4 | sensitive.ts 模式不完整 | `tools/src/sensitive.ts` | 补充 `.dockercfg`、`.netrc`、`.htpasswd`、`token.json` 等 6 个模式 |
| L6 | bash 未设置非交互式环境变量 | `tools/src/shell-exec.ts` | `env: { GIT_EDITOR: "true", GIT_SEQUENCE_EDITOR: "true", EDITOR: "true" }` |
| L7 | 500 错误未加入重试列表 | `core/src/client.ts` | `retryableStatuses` 加入 500 |
| L8 | web-fetch.ts hasPrivateIP/isPrivateHostname 未导出 | `tools/src/web-fetch.ts` | 改为 `export function` |

### P3（7 项）

| 编号 | 问题 | 文件 | 改动 |
|------|------|------|------|
| Q1 | getFoldDecision 冗余条件分支 | `core/src/context/token-estimator.ts` | 合并 `<= 0.75` / `<= 0.80` 为 `<= 0.80` |
| Q2 | AgentEvent 死代码 | `core/src/types.ts` | 删除未使用的 `AgentEvent` 接口 |
| Q3 | loop.ts 字符串索引访问私有属性 | `core/src/loop.ts` + `manager.ts` | `ctx['contextWindow']` → `ctx.getContextWindow()` |
| Q5 | CoreEngine 接口与实现签名不匹配 | `core/src/interface.ts` | `getState()` 接口增加可选参数 |
| Q6 | registry 未检查同名工具重复注册 | `tools/src/registry.ts` | `register()` 检查重复并抛异常 |
| Q8 | ModelPicker Ctrl+V 仅小写 v | `tui/src/ModelPicker.tsx` | `_input === 'v' \|\| _input === 'V'` |

---

## 七、测试发现的 Bug

| 编号 | 问题 | 状态 |
|------|------|------|
| B5 | repair.ts 1e+1f 组合策略缺失 | 未修复（低概率） |
| B6 | SessionLoader 恢复时系统消息重复 | 未修复（中等影响） |
| B1-B4 | afterToolCall / McpAuth / sleep / bash 竞态 | 已修复 |

---

## 八、此前累计修复（记录于 DONE.md，共 37+ 项）

详见 DONE.md §五 已修复列表。
