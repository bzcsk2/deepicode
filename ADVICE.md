# Deepicode Bug 跟踪与修复指南

**最后更新**: 2026-06-05

> 已修复项 → `DONE.md` ｜ 暂缓项 → `TODO.md`

---

## 待修复

| 编号 | 问题 | 位置 | 优先级 |
|------|------|------|--------|
| B6 | SessionLoader 恢复时系统消息重复（双 system prompt） | `core/src/session.ts` | P1 |
| B5 | repair.ts 1e+1f 组合策略缺失 | `core/src/context/repair.ts` | P2 |
| L2 | SessionWriter 队列无界增长（加队列上限） | `core/src/session.ts:114-142` | P2 |
| L5 | fuzzy-edit/hash-edit 未归一化 CRLF | `tools/src/fuzzy-edit.ts`, `hash-edit.ts` | P2 |
| L9 | reasoningText 消失导致布局跳动 | `tui/src/bridge.tsx:180-189` | P2 |
| — | notebook-edit 同步文件操作 → 异步 + 原子写入 | `tools/src/notebook-edit.ts` | P2 |
| — | /skill 跨包相对路径 import → package alias | `tui/src/App.tsx:171` | P2 |
| — | handleSessionSelect 卸载后 setState（加 isMountedRef） | `tui/src/App.tsx:217-230` | P3 |
| Q10 | tool_start key fallback 与 tool_progress/tool 不一致 | `tui/src/bridge.tsx:83,95,111` | P3 |
| — | tool_call_id 规范化（跨 provider 场景） | `core/src/loop.ts` | P3 |
| — | client.ts 3 处 `any`/`as` 类型断言 | `core/src/client.ts` | P3 |

---

## 已知限制（不修复）

| 编号 | 问题 | 理由 |
|------|------|------|
| K1 | Stale-read TOCTOU 窗口 | 毫秒级，atomic rename + exclusive 并发 |
| K2 | Session JSONL 崩溃一致性 | best-effort 设计 |
| K3 | Bash 黑名单可绕过 | 黑名单固有缺陷 |
| K4 | Tool 结果 200 字符截断 | 完整输出在 session 文件中可查 |
| K5 | Token 估算 ~20% 偏差 | 已知 tradeoff |
| K6 | 多进程并发编辑无冲突检测 | 单进程 Agent 设计范围外 |
| K7 | Push notification / monitor / cron 仅 Linux | 目标平台 |
| K8 | workflow / agent-tool 模拟执行 | 占位实现 |
| K9 | 跨 provider 会话迁移未清洗状态 | 当前仅 DeepSeek-compatible API |
| K10 | 权限检查大小写敏感 | 工具名 registry 统一小写 |
| K11 | 光标位置用 ref 不用 state | useInput 每次按键触发 re-render |

---

## 已修复记录

全部已修复项详见 `DONE.md`，包括：
- 前四轮 ADVICE 修复（37 项）
- P0-P3 批量修复（32 项，2026-06-05）
- B1-B4 测试 Bug 修复
- MockSseServer / CJK 双重计数等
