/** Language preference persistence — reads/writes .deepicode/lang.json */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Locale } from './strings.js';

const LANG_FILE = '.deepicode/lang.json';

function getConfigDir(): string {
  return join(process.cwd(), '.deepicode');
}

export function loadLang(): Locale | null {
  try {
    const dir = getConfigDir();
    const raw = readFileSync(join(dir, 'lang.json'), 'utf8');
    const data = JSON.parse(raw);
    if (data.lang === 'zh-CN' || data.lang === 'en') return data.lang;
  } catch {}
  return null;
}

export function saveLang(locale: Locale): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'lang.json'), JSON.stringify({ lang: locale }, null, 2), 'utf8');
}
