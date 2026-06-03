import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Box, Text, AlternateScreen, instances, SHOW_CURSOR, EXIT_ALT_SCREEN, useInput } from '@deepicode/ink';
import { writeSync } from 'node:fs';
import type { ReasonixEngine } from '@deepicode/core';
import type { ChatMessage, DeepicodeConfig } from '@deepicode/core';
import { PROVIDERS, AGENTS, saveLastConfig } from '@deepicode/core';
import { createBridge, timelineFromMessages, type BridgeState } from './bridge.js';
import { DeepiMessages } from './DeepiMessages.js';
import { DeepiPromptInput, type DeepiPromptInputHandle } from './DeepiPromptInput.js';
import { StatusBar } from './StatusBar.js';
import { FullscreenLayout, TerminalHeader } from './FullscreenLayout.js';
import { WelcomeScreen } from './WelcomeScreen.js';
import { isFullscreenEnvEnabled } from './fullscreen.js';
import { ModelPicker } from './ModelPicker.js';
import { SessionPicker } from './SessionPicker.js';
import { PermissionPrompt } from './PermissionPrompt.js';
import { CommandAutocomplete } from './CommandAutocomplete.js';
import { SearchOverlay } from './SearchOverlay.js';
import { CenteredStage } from './CenteredStage.js';
import { ChoiceMenu } from './ChoiceMenu.js';
import { SkillModal } from './SkillModal.js';
import { ContextModal } from './ContextModal.js';
import { formatStatus } from './status/format.js';
import { t, setLocale } from './i18n/index.js';
import {
  buildHelpText,
  parseSlashCommand,
  validateThinkingMode,
} from './commands.js';

// ---- Module-level interrupt state (shared by SIGINT handler + useInput \x03 handler) ----

let tuiState: 'idle' | 'loading' = 'idle';
export function setTUIState(s: 'idle' | 'loading') { tuiState = s; }

let exitTimer: ReturnType<typeof setTimeout> | null = null;
let exitPending = false;

// Module-level callbacks set by the App component on mount
let _cancel: (() => void) | null = null;
let _interrupt: (() => void) | null = null;
let _setStatusMsg: ((m: string | null) => void) | null = null;

function cleanupTerminal(): void {
  const inst = instances.get(process.stdout);

  // 1. Disable mouse tracking FIRST — gives terminal time to process
  //    while we're busy unmounting the React tree
  try { writeSync(1, '\x1b[?1006l\x1b[?1003l\x1b[?1002l\x1b[?1000l'); } catch {}

  // 2. Full Ink unmount — renders last frame on alt buffer, exits alt screen,
  //    unsubscribes from signal-exit so it won't double-fire on process.exit
  if (inst?.isAltScreenActive) {
    try {
      inst.unmount();
    } catch {
      try { writeSync(1, EXIT_ALT_SCREEN); } catch {}
    }
  }

  // 3. Drain stdin — catches mouse/input events that arrived during tree-walk
  try { inst?.drainStdin(); } catch {}

  // 4. Mark unmounted + restore raw mode so signal-exit won't re-run unmount()
  try { inst?.detachForShutdown(); } catch {}

  // 5. Show cursor
  try { writeSync(1, SHOW_CURSOR); } catch {}
}

function doInterrupt(): void {
  if (exitPending) return;

  if (tuiState === 'loading') {
    _cancel?.();
    return;
  }

  // Idle: double-tap to exit
  if (exitTimer) {
    clearTimeout(exitTimer);
    exitTimer = null;
    exitPending = true;
    _interrupt?.();
    cleanupTerminal();
    process.exit(0);
  }

  exitTimer = setTimeout(() => { exitTimer = null; _setStatusMsg?.(null); }, 2000);
  _setStatusMsg?.(t().pressCtrlC);
}

const initialState: BridgeState = {
  timeline: [],
  isLoading: false,
  messageQueue: [],
  pendingInstructionCount: 0,
  tokens: { input: 0, output: 0, cacheHit: 0, cacheMiss: 0 },
  contextUsage: 0,
  warnings: [],
  error: null,
  permissionPrompt: null,
  thinkingMode: 'off',
};

const MAX_INPUT_HISTORY = 100;

interface SkillRecord {
  name: string;
  description: string;
  content: string;
}

function extractSkillTags(text: string): string[] {
  const names = new Set<string>();
  for (const match of text.matchAll(/(?:^|\s)#([A-Za-z0-9_.-]+)/g)) {
    if (match[1]) names.add(match[1]);
  }
  return [...names];
}

function parseSkillDetail(content: string): SkillRecord {
  const parsed = JSON.parse(content) as Partial<SkillRecord>;
  if (!parsed.name || !parsed.description || !parsed.content) {
    throw new Error('invalid skill payload');
  }
  return { name: parsed.name, description: parsed.description, content: parsed.content };
}

async function loadTaggedSkills(names: string[]): Promise<SkillRecord[]> {
  if (names.length === 0) return [];
  const { createSkillTool } = await import('@deepicode/tools');
  const tool = createSkillTool();
  const loaded: SkillRecord[] = [];
  for (const name of names) {
    const output = await tool.execute({ command: 'load', query: name }, { cwd: process.cwd(), sessionId: '' });
    if (output.isError) continue;
    const content = typeof output.content === 'string' ? output.content : String(output.content ?? '');
    loaded.push(parseSkillDetail(content));
  }
  return loaded;
}

export function getProviderLabel(provider: string): string {
  const info = PROVIDERS[provider];
  return info ? info.label : provider;
}

interface AppProps {
  engine: ReasonixEngine;
  config: DeepicodeConfig;
}

export function App({ engine, config }: AppProps) {
  const [bridgeState, setBridgeState] = useState<BridgeState>(initialState);
  const bridge = useMemo(() => createBridge(engine, setBridgeState), [engine]);
  const bridgeRef = useRef(bridge);
  bridgeRef.current = bridge;
  const contextTotal = config.contextWindow ?? 128_000;
  const engineRef = useRef(engine);
  const mountedRef = useRef(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const appendMessage = useCallback((message: ChatMessage) => {
    setBridgeState(prev => ({
      ...prev,
      timeline: [...prev.timeline, {
        id: `message-${crypto.randomUUID()}`,
        kind: 'message',
        message,
      }],
    }));
  }, []);

  // Wire module-level callbacks for doInterrupt()
  _cancel = () => bridgeRef.current.cancel();
  _interrupt = () => engineRef.current.interrupt();
  _setStatusMsg = setStatusMessage;

  // SIGINT handler (Linux: Ctrl+C generates signal, not character)
  useEffect(() => {
    process.on('SIGINT', doInterrupt);
    return () => { process.off('SIGINT', doInterrupt); };
  }, []);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // \x03 character handler (raw mode working properly — Ctrl+C arrives as character)
  useInput((input, key) => {
    if (input === '\x03' || (key.ctrl && input === 'c')) {
      doInterrupt();
    }
    if (key.ctrl && input === 'f') {
      setShowSearch(prev => !prev);
    }
  });

  const handleCancel = useCallback(() => {
    bridgeRef.current.cancel();
  }, []);
  const scrollRef = useRef<any>(null);
  const promptInputRef = useRef<DeepiPromptInputHandle>(null);

  const [activeProvider, setActiveProvider] = useState(config.provider ?? 'zen');
  const [activeModel, setActiveModel] = useState(config.model);
  const [inputText, setInputText] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showThinkingMenu, setShowThinkingMenu] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [activeAgent, setActiveAgent] = useState(engine.getAgentName?.() ?? 'build');
  const [activeSkills, setActiveSkills] = useState(engine.getActiveSkills?.() ?? []);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [inputInjection, setInputInjection] = useState<{ id: number; text: string } | undefined>(undefined);
  const [contextPolicy, setContextPolicy] = useState(engine.getContextPolicy());

  const handleSubmit = useCallback((text: string) => {
    const submitted = text.trim();
    if (submitted) {
      setInputHistory(prev => [
        submitted,
        ...prev.filter(item => item !== submitted),
      ].slice(0, MAX_INPUT_HISTORY));
    }
    setShowAutocomplete(false);
    const command = parseSlashCommand(submitted);
    if (command?.name === 'exit') {
      exitPending = true;
      engineRef.current.interrupt();
      appendMessage({ role: 'assistant' as const, content: t().shuttingDown });
      cleanupTerminal();
      process.exit(0);
    }
    if (command?.name === 'help') {
      appendMessage({
        role: 'assistant' as const,
        content: buildHelpText(activeAgent, t()),
      });
      return;
    }
    if (command?.name === 'status') {
      void (async () => {
        try {
          const snapshot = await engineRef.current.getStatusSnapshot();
          appendMessage({ role: 'assistant' as const, content: formatStatus(snapshot) });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          appendMessage({ role: 'assistant' as const, content: `Failed to load status: ${msg}` });
        }
      })();
      return;
    }
    if (command?.name === 'model') {
      setShowModelPicker(true);
      return;
    }
    if (command?.name === 'sessions') {
      setShowSessionPicker(true);
      return;
    }
    if (command?.name === 'skill') {
      setShowSkillModal(true);
      return;
    }
    if (command?.name === 'context') {
      setShowContextModal(true);
      return;
    }
    if (command?.name === 'agent') {
      setShowAgentMenu(true);
      return;
    }
    if (command?.name === 'thinking') {
      if (command.mode) {
        const error = validateThinkingMode(command.mode);
        if (error) {
          appendMessage({ role: 'assistant' as const, content: `${error}\nCurrent: ${bridgeState.thinkingMode}` });
          return;
        }
        engineRef.current.setThinkingMode(command.mode as any);
        setBridgeState(prev => ({ ...prev, thinkingMode: command.mode }));
        appendMessage({ role: 'assistant' as const, content: `Thinking mode set to: ${command.mode}` });
        return;
      }
      setShowThinkingMenu(true);
      return;
    }
    if (command?.name === 'lang') {
      setShowLangMenu(true);
      return;
    }
    const taggedSkillNames = extractSkillTags(submitted);
    if (taggedSkillNames.length === 0) {
      bridge.submit(submitted);
      return;
    }

    void (async () => {
      const previousSkills = engineRef.current.getActiveSkills();
      const taggedSkills = await loadTaggedSkills(taggedSkillNames);
      const merged = [
        ...previousSkills.filter(skill => !taggedSkills.some(tagged => tagged.name === skill.name)),
        ...taggedSkills,
      ];
      engineRef.current.setActiveSkills(merged);
      try {
        await bridge.submit(submitted);
      } finally {
        engineRef.current.setActiveSkills(previousSkills);
      }
    })();
  }, [activeAgent, appendMessage, bridge]);

  const handleAgentChoose = useCallback((next: string) => {
    const label = engineRef.current.switchAgent(next);
    setActiveAgent(next);
    setShowAgentMenu(false);
    appendMessage({ role: 'assistant' as const, content: t().switchedTo(label) });
  }, [appendMessage]);

  const handleLangChoose = useCallback((next: string) => {
    setLocale(next as any);
    setShowLangMenu(false);
    appendMessage({ role: 'assistant' as const, content: t().switchedLang(next) });
  }, [appendMessage]);

  const handleThinkingChoose = useCallback((mode: string) => {
    const error = validateThinkingMode(mode);
    if (error) {
      appendMessage({ role: 'assistant' as const, content: `${error}\nCurrent: ${bridgeState.thinkingMode}` });
      return;
    }
    engineRef.current.setThinkingMode(mode as any);
    setBridgeState(prev => ({ ...prev, thinkingMode: mode }));
    setShowThinkingMenu(false);
    appendMessage({ role: 'assistant' as const, content: `Thinking mode set to: ${mode}` });
  }, [appendMessage, bridgeState.thinkingMode]);

  const handleModelSelect = useCallback((sel: { provider: string; model: string; apiKey: string; baseUrl: string }) => {
    engineRef.current.updateConfig({
      provider: sel.provider,
      model: sel.model,
      apiKey: sel.apiKey,
      baseUrl: sel.baseUrl,
    });
    setActiveProvider(sel.provider);
    setActiveModel(sel.model);
    saveLastConfig({ provider: sel.provider, model: sel.model, baseUrl: sel.baseUrl });
    setShowModelPicker(false);
    appendMessage({ role: 'assistant' as const, content: t().switchedModel(PROVIDERS[sel.provider]?.label ?? sel.provider, sel.model) });
  }, [appendMessage]);

  const handleModelCancel = useCallback(() => {
    setShowModelPicker(false);
  }, []);

  const handleSessionSelect = useCallback(async (sessionId: string) => {
    setShowSessionPicker(false);
    // Load session messages into the current engine
    const msgs = await engineRef.current.loadSession(sessionId);
    // Guard against post-unmount setState
    if (!mountedRef.current) return;
    // Reset bridge state with recovered messages
    setBridgeState({
      ...initialState,
      timeline: timelineFromMessages(msgs),
    });
    appendMessage({ role: 'assistant' as const, content: t().resumedSession(sessionId.slice(0, 8), msgs.length) });
  }, [appendMessage]);

  const handleSessionCancel = useCallback(() => {
    setShowSessionPicker(false);
  }, []);

  const handlePermissionSelect = useCallback((allow: boolean, alwaysAllow?: boolean) => {
    engineRef.current.respondPermission(allow, alwaysAllow);
    setBridgeState(prev => ({ ...prev, permissionPrompt: null }));
  }, []);

  const providerLabel = getProviderLabel(activeProvider);

  if (showModelPicker) {
    return (
      <CenteredStage width={88}>
        <ModelPicker
          currentProvider={activeProvider}
          currentModel={activeModel}
          onSelect={handleModelSelect}
          onCancel={handleModelCancel}
        />
      </CenteredStage>
    );
  }

  if (showSessionPicker) {
    return (
      <CenteredStage width={92}>
        <SessionPicker
          onSelect={handleSessionSelect}
          onCancel={handleSessionCancel}
        />
      </CenteredStage>
    );
  }

  if (showAgentMenu) {
    return (
      <ChoiceMenu
        title="Agent"
        subtitle="选择切换目标"
        items={[
          { value: "build", label: "Build Agent", description: "完整读写工具" },
          { value: "plan", label: "Plan Agent", description: "只读分析" },
        ]}
        onChoose={handleAgentChoose}
        onCancel={() => setShowAgentMenu(false)}
      />
    );
  }

  if (showLangMenu) {
    return (
      <ChoiceMenu
        title="Language"
        subtitle="选择界面语言"
        items={[
          { value: "zh-CN", label: "中文", description: "切换到中文界面" },
          { value: "en", label: "English", description: "switch to English" },
        ]}
        onChoose={handleLangChoose}
        onCancel={() => setShowLangMenu(false)}
      />
    );
  }

  if (showThinkingMenu) {
    return (
      <ChoiceMenu
        title="Thinking"
        subtitle="选择推理档位"
        items={[
          { value: "off", label: "off", description: "disable reasoning" },
          { value: "low", label: "low", description: "light reasoning" },
          { value: "medium", label: "medium", description: "balanced reasoning" },
          { value: "high", label: "high", description: "strong reasoning" },
          { value: "max", label: "max", description: "maximum reasoning" },
        ]}
        onChoose={handleThinkingChoose}
        onCancel={() => setShowThinkingMenu(false)}
      />
    );
  }

  if (showSkillModal) {
    return (
      <SkillModal
        activeSkills={activeSkills}
        onChange={(skills) => {
          setActiveSkills(skills);
          engineRef.current.setActiveSkills(skills);
        }}
        onInsertSkill={(skillName) => {
          const text = `#${skillName} `;
          setInputInjection(prev => ({ id: (prev?.id ?? 0) + 1, text }));
          setInputText(text);
          setShowSkillModal(false);
        }}
        onClose={() => setShowSkillModal(false)}
      />
    );
  }

  if (showContextModal) {
    return (
      <ContextModal
        policy={contextPolicy}
        loadStatus={() => engineRef.current.getContextPolicyStatus()}
        onPolicyChange={async (policy) => {
          await engineRef.current.setContextPolicy(policy);
          setContextPolicy(engineRef.current.getContextPolicy());
        }}
        onRunReduction={() => engineRef.current.runContextReduction()}
        onClose={() => setShowContextModal(false)}
      />
    );
  }

  const scrollableContent = (
    <>
      <SearchOverlay
        timeline={bridgeState.timeline}
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
      />
      <DeepiMessages
        timeline={bridgeState.timeline}
        scrollRef={scrollRef}
      />
      {bridgeState.timeline.length === 0 && !bridgeState.isLoading && !bridgeState.error ? (
        <WelcomeScreen
          model={activeModel}
          provider={providerLabel}
          agent={AGENTS[activeAgent]?.label ?? activeAgent}
          thinkingMode={bridgeState.thinkingMode}
        />
      ) : null}
      {bridgeState.warnings.map((w, i) => (
        <Box key={i} paddingX={1}>
          <Text color="warning">⚠ {w}</Text>
        </Box>
      ))}
      {bridgeState.error && (
        <Box paddingX={1} marginTop={1}>
          <Text color="error">✗ {bridgeState.error}</Text>
        </Box>
      )}
      {bridgeState.permissionPrompt && (
        <PermissionPrompt
          toolName={bridgeState.permissionPrompt.toolName}
          args={bridgeState.permissionPrompt.args}
          onSelect={handlePermissionSelect}
        />
      )}
    </>
  );

  const bottomContent = (
    <Box flexDirection="column" width="100%">
      {showAutocomplete && (
        <CommandAutocomplete
          query={inputText}
          onSubmit={(cmd) => {
            promptInputRef.current?.writeText('');
            setInputText('');
            setShowAutocomplete(false);
            handleSubmit(cmd);
          }}
          onComplete={(cmd) => {
            promptInputRef.current?.writeText(cmd + ' ');
            setShowAutocomplete(false);
          }}
          onClose={() => setShowAutocomplete(false)}
        />
      )}
      <DeepiPromptInput
        ref={promptInputRef}
        onSubmit={handleSubmit}
        history={inputHistory}
        injectedText={inputInjection}
        onChange={(text) => {
          setInputText(text);
          setShowAutocomplete(text.startsWith('/') && !text.includes(' '));
        }}
        isLoading={bridgeState.isLoading}
        disabled={!!bridgeState.permissionPrompt}
        queueCount={bridgeState.messageQueue.length}
        onCancel={handleCancel}
        suppressHistory={showAutocomplete}
        suppressSubmit={showAutocomplete}
      />
      <StatusBar
        model={activeModel}
        provider={providerLabel}
        agent={AGENTS[activeAgent]?.label ?? activeAgent}
        inputTokens={bridgeState.tokens.input}
        outputTokens={bridgeState.tokens.output}
        cacheHitTokens={bridgeState.tokens.cacheHit}
        cacheMissTokens={bridgeState.tokens.cacheMiss}
        contextUsed={bridgeState.contextUsage}
        contextTotal={contextTotal}
        pendingInstructionCount={bridgeState.pendingInstructionCount}
        statusMessage={statusMessage}
        thinkingMode={bridgeState.thinkingMode}
        tier={engine.getTier?.()?.label}
        cwd={process.cwd()}
      />
    </Box>
  );

  if (isFullscreenEnvEnabled()) {
    return (
      <AlternateScreen>
        <FullscreenLayout
          scrollRef={scrollRef}
          scrollable={scrollableContent}
          bottom={bottomContent}
        />
      </AlternateScreen>
    );
  }

  return (
    <>
      <TerminalHeader />
      {scrollableContent}
      {bottomContent}
    </>
  );
}
