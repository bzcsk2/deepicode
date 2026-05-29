import type { ReasonixEngine } from '@deepicode/core';
import type { ChatMessage } from '@deepicode/core';

export interface ToolStatus {
  name: string;
  status: 'running' | 'done' | 'error';
  input?: Record<string, unknown>;
  output?: string;
}

export interface BridgeState {
  messages: ChatMessage[];
  isLoading: boolean;
  streamingText: string | null;
  activeTools: Map<string, ToolStatus>;
  tokens: { input: number; output: number };
  error: string | null;
}

export function createBridge(
  engine: ReasonixEngine,
  setState: React.Dispatch<React.SetStateAction<BridgeState>>
): {
  submit: (text: string) => Promise<void>;
  cancel: () => void;
} {
  let assistantContent = "";
  let activeAssistantMsg: ChatMessage | null = null;

  const submit = async (text: string) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, { role: 'user' as const, content: text }],
      isLoading: true,
      streamingText: null,
      error: null,
    }));

    assistantContent = "";
    activeAssistantMsg = null;

    try {
      for await (const event of engine.submit(text)) {
        switch (event.role) {
          case "assistant_delta":
            if (!activeAssistantMsg) {
              activeAssistantMsg = { role: 'assistant', content: '' };
              setState(prev => ({
                ...prev,
                messages: [...prev.messages, activeAssistantMsg!],
              }));
            }
            assistantContent += event.content ?? "";
            setState(prev => ({ ...prev, streamingText: assistantContent }));
            break;

          case "assistant_final":
            if (activeAssistantMsg) {
              activeAssistantMsg.content = assistantContent;
              setState(prev => ({ ...prev, streamingText: null }));
            }
            activeAssistantMsg = null;
            assistantContent = "";
            break;

          case "reasoning_delta":
            break;

          case "tool_start":
            setState(prev => {
              const newTools = new Map(prev.activeTools);
              newTools.set(`tool_${event.toolCallIndex ?? Date.now()}`, {
                name: event.toolName ?? 'unknown',
                status: 'running',
              });
              return { ...prev, activeTools: newTools };
            });
            break;

          case "tool_progress":
            if (event.toolName) {
              setState(prev => {
                const newTools = new Map(prev.activeTools);
                for (const [key, tool] of newTools) {
                  if (tool.name === event.toolName) {
                    newTools.set(key, { ...tool, status: 'running' });
                  }
                }
                return { ...prev, activeTools: newTools };
              });
            }
            break;

          case "tool":
            setState(prev => {
              const newTools = new Map(prev.activeTools);
              for (const [key, tool] of newTools) {
                if (tool.name === event.toolName && tool.status === 'running') {
                  newTools.set(key, { ...tool, status: 'done', output: event.content });
                }
              }
              return { ...prev, activeTools: newTools };
            });
            break;

          case "error":
            setState(prev => ({
              ...prev,
              error: event.content ?? 'Unknown error',
            }));
            break;

          case "warning":
            setState(prev => ({
              ...prev,
              error: `⚠ ${event.content ?? ''}`,
            }));
            break;

          case "status":
            break;
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setState(prev => ({ ...prev, error: msg }));
    } finally {
      setState(prev => ({
        ...prev,
        isLoading: false,
        streamingText: null,
        activeTools: new Map(),
      }));
    }
  };

  const cancel = () => {
    engine.interrupt();
  };

  return { submit, cancel };
}
