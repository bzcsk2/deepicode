import { useState, useRef, useEffect } from 'react';
import { Box, Text, useInput } from '@deepicode/ink';
import { t } from './i18n/index.js';

interface PermissionPromptProps {
  toolName: string;
  args: Record<string, unknown>;
  onSelect: (allow: boolean, alwaysAllow?: boolean) => void;
}

function getOptions() {
  return [
    { label: t().allow, value: 'allow' as const },
    { label: t().alwaysAllow, value: 'always' as const },
    { label: t().deny, value: 'deny' as const },
  ];
}

function formatArgs(toolName: string, args: Record<string, unknown>): string {
  const name = toolName.toLowerCase();
  if (name === 'bash' || name === 'shell' || name === 'shell_exec') {
    const cmd = args.command ?? args.cmd ?? '';
    return typeof cmd === 'string' ? cmd : JSON.stringify(cmd);
  }
  if (args.path) return String(args.path);
  if (args.command) return String(args.command);
  const keys = Object.keys(args);
  if (keys.length <= 2) return keys.map(k => `${k}=${JSON.stringify(args[k])}`).join(' ');
  return t().parameters(keys.length);
}

export function PermissionPrompt({ toolName, args, onSelect }: PermissionPromptProps) {
  const [selected, setSelected] = useState(0);
  const alive = useRef(true);
  const options = getOptions();

  useEffect(() => { return () => { alive.current = false; }; }, []);

  useInput((_input, key) => {
    if (key.upArrow) {
      setSelected(prev => (prev - 1 + options.length) % options.length);
    } else if (key.downArrow) {
      setSelected(prev => (prev + 1) % options.length);
    } else if (key.return) {
      const opt = options[selected];
      if (!alive.current) return;
      if (opt.value === 'allow') onSelect(true);
      else if (opt.value === 'always') onSelect(true, true);
      else onSelect(false);
    } else if (key.escape) {
      if (alive.current) onSelect(false);
    }
  });

  const cmd = formatArgs(toolName, args);

  return (
    <Box flexDirection="column" width="100%" borderStyle="round" borderColor="warning" paddingX={1} paddingY={1} marginBottom={1}>
      <Box marginBottom={1}>
        <Text bold color="warning">{`🔐 ${t().permissionTitle}`}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>
          <Text bold>{toolName}</Text>
          <Text>{t().requestsToExecute}</Text>
        </Text>
      </Box>
      <Box paddingLeft={1} marginBottom={1}>
        <Text color="warning">$ {cmd}</Text>
      </Box>
      {options.map((opt, i) => (
        <Box key={opt.value} paddingLeft={1}>
          <Text color={i === selected ? 'warning' : undefined}>
            {i === selected ? '▸ ' : '  '}
          </Text>
          <Text bold={i === selected} color={i === selected ? 'warning' : undefined}>
            {opt.label}
          </Text>
        </Box>
      ))}
      <Box marginTop={1} paddingLeft={1}>
        <Text dimColor>{t().permissionHint}</Text>
      </Box>
    </Box>
  );
}
