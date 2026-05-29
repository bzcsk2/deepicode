  经过对全部 30 个源文件的系统审查，发现以下问题，按严重程度排列:

  ---
   🔴 严重 Bug — 全部已修复 ✅

   B1: done 事件重复发射导致工具调用轮循环提前终止
   ✅ 已修复（commit 794d414）：
   - client.ts: 增加 finishReasonYielded 标记，[DONE] 时不重复发射
   - engine.ts: 增加 finishedWithToolUse 防御，第二个 done 直接跳过

  ---
   B2: edit 工具无 write_file 功能——无法创建新文件
   ✅ 已修复（commit 794d414）：新增 packages/tools/src/write-file.ts

  ---
   🟡 中等 Bug — 全部已修复 ✅

   B3: bash 工具 cwd 路径未基于 ctx.cwd 解析
   ✅ 已修复（commit 794d414）：增加 resolve(ctx.cwd, args.cwd)

  ---
   B4: hashAnchoredReplaceOnce 临时文件并发碰撞
   ✅ 已修复（commit d76f3c0）：Date.now() → crypto.randomUUID()

  ---
   B5: fuzzyReplaceOnce 正则模式可能匹配到错误位置
   ✅ 已修复（commit d76f3c0）：改为 split(/\s+/) 分段转义后 join('\\s+')

  ---
   🟠 功能/实现遗漏

   C1: 缺少关键工具 — list_dir / grep / write_file
   ✅ 已修复（commit 794d414）：
   - write_file: packages/tools/src/write-file.ts
   - list_dir: packages/tools/src/list-dir.ts
   - grep: packages/tools/src/grep.ts

  C2: Session 恢复未实现 (TODO #12)

  JSONL 写入可工作但不可恢复。session.ts 只有写路径没有读路径。

  C3: Token 估算完全缺失 (TODO #11)

  没有 tokenizer worker pool，没有 fold 决策。长会话会静默超出 DeepSeek
  上下文窗口导致不可预期的截断或错误。

  C4: 9-Pass Fuzzy Edit 只实现了 4 pass (TODO #8)

  fuzzy-edit.ts 只有 exact、trimmed_full、trimmed_lines、flexible_whitespace 四个
  pass。缺少
  blockAnchor、escapeNormalized、trimmedBoundary、contextAware、multiOccurrence 五个
  pass。

  C5: 事件体系分层未实现 (TODO #9)

  tool_progress 事件未实现，协议事件和展示事件混在一起。

  C6: SSE 解析分片边界无测试 (TODO #14)

  没有任何测试覆盖 SSE chunk 被任意切分的情况。

  ---
  🔵 代码改进建议

   D1: SENSITIVE_FILE_PATTERNS 重复定义
   ✅ 已修复（commit d76f3c0）：提取到 packages/tools/src/sensitive.ts

   D2: known_hosts 保护未在 edit 中生效
   ✅ 已修复（commit 794d414）：edit.ts 补上 known_hosts 模式

   D3: engine.ts:70 getState() 硬编码 streamingMessage: "" 和 isStreaming: false
   ✅ 已修复（commit d76f3c0）：改为参数化接口 getState(isStreaming, streamingMessage, pendingToolCalls)

  D4: ImmutablePrefix.computeFingerprint 中空 messages 数组产生空哈希

  如果 build() 调用时 systemPrompt 为空字符串，生成的 prefix 只有一条空 content 的
  system 消息，hash 仍能生成但可能与其他空 system prompt 实例相同。实际不导致问题。

  D5: buildPiModel 导入了未使用的 vendor/pi.d.ts 类型

  config.ts 导入了 Model 类型用于 buildPiModel 返回值，但该函数在 engine.ts
  中并未被调用。这是死代码——ReasonixEngine 直接使用 DeepSeekClient 而非 pi-ai。

  ---
  优先级建议

   ┌────────┬──────────────────┬───────────────────────────────────────────────────┐
   │  状态  │      问题        │                         commit                    │
   ├────────┼──────────────────┼───────────────────────────────────────────────────┤
   │ ✅ 已修 │ B1: done 事件重复│ 794d414                                            │
   ├────────┼──────────────────┼───────────────────────────────────────────────────┤
   │ ✅ 已修 │ B2: 缺少 write   │ 794d414                                            │
   │        │ _file            │                                                   │
   ├────────┼──────────────────┼───────────────────────────────────────────────────┤
   │ ✅ 已修 │ B3: cwd 不解析   │ 794d414                                            │
   ├────────┼──────────────────┼───────────────────────────────────────────────────┤
   │ ✅ 已修 │ C1: list_dir/grep│ 794d414                                            │
   ├────────┼──────────────────┼───────────────────────────────────────────────────┤
   │ ✅ 已修 │ B4, B5           │ d76f3c0                                            │
   ├────────┼──────────────────┼───────────────────────────────────────────────────┤
   │ ✅ 已修 │ D1-D3            │ d76f3c0                                            │
   ├────────┼──────────────────┼───────────────────────────────────────────────────┤
   │ ⬜ 未修 │ D4-D5, C2-C6     │ 待后续迭代                                          │
   └────────┴──────────────────┴───────────────────────────────────────────────────┘

新的

  1. 隐患 上下文无界增长引发的会话“硬终止”
- 📍 影响位置：packages/core/src/context/append-log.ts
- Bug 描述：AppendOnlyLog 没有任何裁剪机制，对话历史只会无限追加。随着会话进行，token 消耗量会线性增长。当达到 DeepSeek API 上下文限制时，API 会返回 400 context_length_exceeded。
- 问题分析：在 client.ts 的重试逻辑中，400 属于不可重试错误。这意味着一旦达到上下文上限，当前 Agent 会话将直接报错、退出，且无法通过重试恢复。
- 潜在后果：长会话 Agent 无法正常运行，用户被迫强制重启会话。
2. 隐患 工具输出序列化引发的崩溃风险
- 📍 影响位置：packages/tools/src/shell-exec.ts / file-ops.ts
- Bug 描述：工具执行后，直接对返回的对象执行了 JSON.stringify(out)。
- 问题分析：如果 bash 命令输出的内容包含非 UTF-8 编码的二进制流、无法被 JSON 序列化的数据，或者因为极度长导致 JSON.stringify 抛出 RangeError (字符串过长)，execute 方法内部将抛出未被捕获的异常，这会导致 StreamingToolExecutor 直接崩溃，从而导致整个 Agent Loop 停机，而不是将其包装为可控的 ToolResult。
- 潜在后果：Agent 在执行复杂 Shell 命令时极易因非法输出而崩溃。
3. Bug hash-edit.ts 强行中断引发的临时文件泄漏 (Zombie Temp Files)
- 📍 影响位置：packages/tools/src/hash-edit.ts
- Bug 描述：编辑操作在流式写入 tmpPath 期间，如果 ctx.signal 触发了 Abort，函数会直接抛出异常退出。
- 问题分析：由于函数逻辑未包含 finally 块或明确的异常捕获来删除这个 tmpPath，一旦用户中断编辑或网络断开，该临时文件将永久驻留在文件系统中。
- 潜在后果：长时间运行后，磁盘空间会被残留的临时文件耗尽。
4. 设计缺陷 stale-read.ts 状态追踪的全局污染
- 📍 影响位置：packages/tools/src/stale-read.ts
- Bug 描述：track 是一个全局的 Map<string, ReadRecord>，其生命周期是随整个进程绑定的。
- 问题分析：如果 Deepicode 服务长期运行（例如作为一个持续的后台 Agent），且读取过非常多的文件，这个 Map 不会随会话（Session）结束而清理。这意味着如果一个文件在两个不同的会话中被读取，旧会话的记录会干扰新会话对文件状态的校验。
- 潜在后果：导致在新会话中出现错误的文件一致性校验（Stale read validation）冲突，引发不必要的“先读再写”强制阻断。
下一步建议 (Plan)
作为 Agent，我已完成深度的“Bug 扫描”。为了不违反只读约束，我不会修复它们，但建议将这些纳入您的后续开发迭代：
1. 架构治理：针对 Bug 1，需要引入 Tokenizer 模块进行预估，并在达到阈值时触发 ContextManager 的裁剪 (Fold) 策略。
2. 防御性编程：针对 Bug 2，所有工具的 execute 方法返回前应引入一个 safeStringify() 工具，处理特殊字符和超长截断。
3. 资源管理：针对 Bug 3，使用 finally 块确保临时文件在任何异常路径下都能被 unlink。
4. 作用域隔离：针对 Bug 4，将 StaleReadTracker 实例注入到 Agent Engine 中，随 Session 生命周期销毁，而非全局单例。