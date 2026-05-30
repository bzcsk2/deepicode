# Deepicode 代码审查与建议

**最后更新**: 2026-06-05（B1/B2 已修复，新增 B5/B6）

> 已修复项见 `DONE.md`。

---

## 〇、测试发现的 Bug

### 代码 Bug（未修复）

#### B5. `repair.ts` 组合策略缺失（2026-06-05 测试发现）

| 项 | 内容 |
|---|------|
| **位置** | `packages/core/src/context/repair.ts` — `scavenge()` 策略 1e + 1f |
| **症状** | `{"key": "value` 同时有未闭合括号和未闭合引号，1e 补括号得到 `{"key": "value}`（无效 JSON），1f 补引号得到 `{"key": "value"`（仍缺括号），都不通过。真正的修复需要 1e+1f 组合补全为 `{"key": "value"}` |
| **测试** | `repair.test.ts` — "should fix unclosed quote+brace" 仅测试了 `{"key": "value`（有空格在末尾），未覆盖 `{"key": "value`（无空格） |
| **影响** | 低概率 — `{"key": "value` 格式的截断 rarely 出现 |
| **修复** | 新增 1g 策略：先补引号再补括号，组合修复 |

#### B6. `SessionLoader` 系统消息不过滤（2026-06-05 测试发现）

| 项 | 内容 |
|---|------|
| **位置** | `packages/core/src/session.ts` — `SessionLoader.read()` |
| **症状** | session 恢复时，之前存储的系统消息 + 当前引擎注入的系统消息叠加，造成双份 system prompt |
| **测试** | `session.test.ts` — system messages preserved ✅ 确认了"存什么返回什么"的当前行为 |
| **影响** | 中等 — 对话恢复后 system prompt 翻倍，可能影响模型行为 |
| **修复** | `SessionLoader.read()` 返回前过滤 `role: "system"` 的消息，由 Engine 重新注入 |

### 代码 Bug（已修复）

| Bug | 位置 | 原因 | 修复 |
|-----|------|------|------|
| B1 | `hooks.ts:51-57` | `runAfterToolCall` 回调抛异常中断后续 hook | try-catch 包裹每个回调 |
| B2 | `mcp-tools.ts` | McpAuth.set() stub 返回 `"stored"` 误导 | 改为 `"not_implemented"` |
| MockSseServer 连接泄漏 | `mock-sse-server.ts` | `server.close()` 未销毁 keep-alive socket | 追踪 `Set<Socket>` + `stop()` 时 `sock.destroy()` |
| CJK 双重计数 | `token-estimator.ts:14-18` | CJK 字符同时匹配 `CJK_RE` 和 `PUNCT_RE` | `PUNCT_RE` 排除 CJK 范围 |

### 测试维护（非代码 Bug）

| Bug | 说明 | 建议 |
|-----|------|------|
| B3 | sleep-clamp 测试预期值过时 | 更新断言值匹配当前 clamp 逻辑 |
| B4 | bash-integration-concurrent 偶发竞态 | 每个测试使用独立临时目录 |

---

## 一、BUG_REPORT.md 评估

基于 FindBugV2.md 112 条 bug 模式的审查，36 项发现质量较高。


### 需要修复（优先排序）

| 优先级 | 编号 | 问题 | 影响 |
|--------|------|------|------|
| 🟢 P3 | **H6** | shell-exec error 未设 done=true | 低概率 |
| 🟢 P3 | **H7** | glob Windows 路径越界 | 非目标平台 |
| 🟢 P3 | **H9** | Provider 切换未清理历史消息 | 低概率（仅 DeepSeek） |
| 🟢 P3 | **H10** | session 恢复后 stats 清零显示 0% | 已知 tradeoff |
| 🟢 P3 | **H11** | reasoning_content 持久化膨胀 | 已知 OBS-3 |
| 🟢 P3 | **M4** | sensitive `.env.local` 等变体未覆盖 | 低概率 |
| 🟢 P3 | **M5** | bash 路径正则只匹配 ASCII | 边缘场景 |
| 🟢 P3 | **M6** | bash denylist 可被绕过 | 黑名单固有缺陷 |
| 🟢 P3 | **M8** | MCP 超时 unhandled rejection | 有 try-catch 包裹 |
| 🟢 P3 | **M10** | snapshot Date.now() 碰撞 | 低概率 |
| 🟢 P3 | **M13** | permission 大小写敏感 | 边缘场景 |
| 🟢 P3 | **L1-L10** | 各类低风险 | 影响微小 |

--

## 二、未修复的已知限制

（同上轮，无变化）

## 三、未覆盖的风险

1. **SSE 流中断恢复**：`client.ts` 的 abort/retry 在 Bun 环境下的行为可能与 Node.js 不同
2. **大文件 hash 计算**：`hash-edit.ts` 的 `createReadStream` 在 100MB+ 文件上可能阻塞主线程
3. **Worker 生命周期**：`tokenizer-worker.js` 在 Bun 的 Worker 实现中可能有内存泄漏
4. **AbortSignal 仅 3/11 工具传递**：Ctrl+C 对大文件读/写无效
5. **错误格式不一致**：`[Error]` 前缀 vs `safeStringify({error:...})`

## 四、搁置的架构改进

- OBS-1: prefix.build() 重复调用
- OBS-3: reasoning_content 入库策略
- A1: 工具执行后无独立验证步骤
- A2: Fold 操作成本未记录
