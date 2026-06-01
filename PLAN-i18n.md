# T30/T31/T32 i18n 实现计划

## Context
TUI 当前有 ~55 个硬编码用户可见字符串分布在 14 个文件中，语言混合（部分中/部分英）。需要建立 i18n 基础设施，支持中英文切换。

## 架构设计

### 核心模块：`packages/tui/src/i18n/strings.ts`

参考 `reasonix/tokens.ts` 的 proxy 模式：

```typescript
type Locale = 'zh-CN' | 'en';

interface Strings {
  // 输入
  placeholder: string;
  queued: (n: number) => string;
  processing: string;
  // 权限
  allow: string;
  alwaysAllow: string;
  deny: string;
  permissionTitle: string;
  requestsToExecute: string;
  parameters: (n: number) => string;
  permissionHint: string;
  // 消息卡片
  thinking: string;
  toolUse: string;
  you: string;
  assistant: string;
  reply: string;
  ctrlO: string;
  // 状态栏
  inputTokens: string;
  outputTokens: string;
  cacheHit: string;
  // 会话
  sessions: string;
  sessionHint: string;
  loading: string;
  error: string;
  noSessions: string;
  msgs: (n: number) => string;
  // 模型
  modelSettings: string;
  selectProvider: string;
  current: string;
  enterApiKey: (name: string) => string;
  escToGoBack: string;
  selectModel: (name: string) => string;
  // 斜杠命令
  cmdExit: string;
  cmdHelp: string;
  cmdModel: string;
  cmdSessions: string;
  cmdAgent: string;
  cmdSkill: string;
  cmdLang: string;
  // App
  pressCtrlC: string;
  shuttingDown: string;
  helpCommands: string;
  helpAgents: string;
  helpCurrent: string;
  loadedSkills: (n: number) => string;
  failedLoadSkills: (e: string) => string;
  switchedTo: (label: string) => string;
  switchedModel: (provider: string, model: string) => string;
  resumedSession: (id: string, n: number) => string;
  // StreamingCard
  writing: string;
  aborted: string;
  tps: (rate: string) => string;
  linesDropped: (n: number) => string;
  truncatedByEsc: string;
  // ToolCard
  rejected: string;
  exitCode: (code: number) => string;
  // CommandAutocomplete
  cmdAutocompleteHint: string;
  // Bridge
  unknownError: string;
  unknownWarning: string;
  unknown: string;
  // stringUtils
  plural: (n: number, word: string) => string;
}
```

实现方式：简单对象查找，不用 proxy（i18n 不需要像颜色那样惰性代理）。

```typescript
let activeLocale: Locale = 'zh-CN';
const dicts: Record<Locale, Strings> = { 'zh-CN': zhCN, en };

export function t(): Strings { return dicts[activeLocale]; }
export function setLocale(locale: Locale): void { activeLocale = locale; }
export function getLocale(): Locale { return activeLocale; }
```

### 文件结构

```
packages/tui/src/i18n/
  index.ts        — 导出 t, setLocale, getLocale, Locale 类型
  strings.ts      — Strings 接口定义 + activeLocale 管理
  zh-CN.ts        — 中文字典
  en.ts           — 英文字典
```

## 实现步骤

### Step 1: T30 — 创建 i18n 基础设施
- 创建 `packages/tui/src/i18n/` 目录
- 实现 `strings.ts`（接口 + 切换逻辑）
- 实现 `zh-CN.ts` 和 `en.ts` 字典
- 实现 `index.ts` 导出

### Step 2: T31 — 替换硬编码字符串
逐文件替换（14 个文件，~55 个字符串）：

| 文件 | 改动 |
|------|------|
| `DeepiPromptInput.tsx` | placeholder, queued, processing |
| `PermissionPrompt.tsx` | allow/deny/title/hint |
| `DeepiMessages.tsx` | Thinking/Tool use/You/Assistant/Reply/ctrl+o |
| `App.tsx` | help 输出, skill 列表, 切换确认, 退出消息 |
| `bridge.tsx` | Unknown error/warning |
| `StatusBar.tsx` | in/out/hit 标签 |
| `SessionPicker.tsx` | Sessions/Loading/No sessions |
| `ModelPicker.tsx` | Model Settings/Select provider/API key |
| `CommandRegistry.ts` | 命令描述 |
| `CommandAutocomplete.tsx` | 键盘提示 |
| `StreamingCard.tsx` | writing/aborted/tps/truncated |
| `ToolCard.tsx` | rejected/exit |
| `stringUtils.ts` | plural 改为调用 t().plural |
| `reasonix/markdown.tsx` | image alt text |

### Step 3: T32 — /lang 命令
- App.tsx 的 `/lang` 分支：循环 zh-CN ↔ en
- 持久化到 `.deepicode/config.json` 的 `lang` 字段
- 启动时从 config 读取并 `setLocale()`
- CommandRegistry.ts 的 `/lang` 描述动态更新

## 验证
1. `bun run typecheck` — 零错误
2. `bun test` — 全部通过
3. 手动验证：启动 TUI，输入 `/lang` 切换语言，所有字符串跟随切换
