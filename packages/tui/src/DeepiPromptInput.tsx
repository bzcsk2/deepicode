import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from '@deepicode/ink';

interface DeepiPromptInputProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const MAX_HISTORY = 100;

export function DeepiPromptInput({ onSubmit, isLoading, disabled }: DeepiPromptInputProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [cursorPos, setCursorPos] = useState(0);

  const submitLine = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setHistory(prev => [text, ...prev].slice(0, MAX_HISTORY));
    setHistoryIdx(-1);
    setInput('');
    setCursorPos(0);
    onSubmit(text);
  }, [input, onSubmit]);

  useInput((_input, key) => {
    if (disabled || isLoading) return;

    if (key.return) {
      submitLine();
      return;
    }

    if (key.upArrow) {
      setHistoryIdx(prev => {
        const next = Math.min(prev + 1, history.length - 1);
        if (next >= 0) {
          setInput(history[next] ?? '');
          setCursorPos((history[next] ?? '').length);
        }
        return next;
      });
      return;
    }

    if (key.downArrow) {
      setHistoryIdx(prev => {
        const next = prev - 1;
        if (next < 0) {
          setInput('');
          setCursorPos(0);
          return -1;
        }
        setInput(history[next] ?? '');
        setCursorPos((history[next] ?? '').length);
        return next;
      });
      return;
    }

    if (key.leftArrow) {
      setCursorPos(prev => Math.max(0, prev - 1));
      return;
    }

    if (key.rightArrow) {
      setCursorPos(prev => Math.min(input.length, prev + 1));
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorPos > 0) {
        setInput(prev => prev.slice(0, cursorPos - 1) + prev.slice(cursorPos));
        setCursorPos(prev => prev - 1);
      }
      return;
    }

    if (key.ctrl && _input === 'c') {
      setInput('');
      setCursorPos(0);
      return;
    }

    if (_input) {
      setInput(prev => prev.slice(0, cursorPos) + _input + prev.slice(cursorPos));
      setCursorPos(prev => prev + _input.length);
    }
  });

  const displayText = input || (isLoading ? '' : '输入消息...');
  const isPlaceholder = !input && !isLoading;

  return (
    <Box flexDirection="column" width="100%" borderStyle="round" paddingX={1}>
      <Text wrap="truncate-end">
        {isPlaceholder ? (
          <Text dimColor>{displayText}</Text>
        ) : (
          <Text>{input}</Text>
        )}
      </Text>
    </Box>
  );
}
