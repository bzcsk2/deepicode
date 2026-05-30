# Deepicode TODO

本文只记录**待完成**工作。已完成项见 `DONE.md`。

> **关联文档**：[实施计划](Deepicode实施计划.md) | [ADVICE](ADVICE.md) | [DONE](DONE.md)

---

## 一、Bug 修复（来自 ADVICE）

| # | 问题 | 位置 | 优先级 |
|---|------|------|--------|
| B6 | SessionLoader 恢复时系统消息重复 | `core/src/session.ts` | P1 |
| B5 | repair.ts 1e+1f 组合策略缺失 | `core/src/context/repair.ts` | P2 |
| L2 | SessionWriter 队列无界增长 | `core/src/session.ts:114-142` | P2 |
| L5 | fuzzy-edit/hash-edit 未归一化 CRLF | `tools/src/fuzzy-edit.ts`, `hash-edit.ts` | P2 |
| L9 | reasoningText 消失导致布局跳动 | `tui/src/bridge.tsx:180-189` | P2 |
| — | notebook-edit 同步文件操作 → 异步 + 原子写入 | `tools/src/notebook-edit.ts` | P2 |
| — | /skill 跨包相对路径 import → package alias | `tui/src/App.tsx:171` | P2 |
| — | handleSessionSelect 卸载后 setState | `tui/src/App.tsx:217-230` | P3 |
| Q10 | tool_start key fallback 不一致 | `tui/src/bridge.tsx:83,95,111` | P3 |
| — | tool_call_id 规范化（跨 provider） | `core/src/loop.ts` | P3 |
| — | client.ts 3 处 any/as 类型断言 | `core/src/client.ts` | P3 |

---

## 二、测试与调优

### TT1. SSE 边界测试 ✅
### TT2. E2E 场景 ✅
### TT3. 性能基准 & 计费校准 ✅

已全部完成，见 DONE.md。

---

## 三、Phase 2：智能推理强度调节

参考：**RNX** `src/loop.ts`（strategy select 内嵌逻辑）

| # | 内容 | 说明 |
|---|------|------|
| ST1 | Tier 配置定义（CNY 四档） | `packages/core/src/strategy/` 目录不存在 |
| ST2 | TaskClassifier（纯规则打分） | LoopEvent 已预留 `strategy_notify` / `strategy_estimate_refined` |
| ST3 | ChainEstimator（滑动 TPS + Agentic 补偿） | |
| ST4 | StrategySelector + TUI 倒计时 | |

---

## 四、旧代码清理 ✅

| # | 内容 | 状态 |
|---|------|------|
| D5 | `buildPiModel` + `vendor/pi.d.ts` + `vendor/pi.js` + `integration.test.ts`（pi.js 死代码） | ✅ 已清理 |

---

## 五、暂缓

- TTSR 规则系统
- Universal Config Discovery
- Python Kernel
- 多前端（Web、IDE Plugin）
- LSP 完整集成（当前仅返回 status:unavailable）
- E2E 测试覆盖 TUI 流程
- 长会话压测（50+ 轮）
- README / 配置指南 / 发布包

---

## 进度总览

| 内容 | 状态 |
|------|------|
| Phase 0-5 全部 + TUI 重构 + 安全层 + 壳层 + 多 Agent + 30+ 工具 + Skills + MCP | ✅ DONE.md |
| ADVICE 审计修复 38 项 + P0-P3 批量修复 32 项 | ✅ DONE.md |
| TT1-TT3 测试 | ✅ DONE.md |
| Bug 修复（B5/B6 等 11 项） | ⬜ |
| Phase 2 智能推理调节（ST1-4） | ⬜ |
| 旧代码清理 | ⬜ |
| Phase 6/7 剩余 | ⬜ |
