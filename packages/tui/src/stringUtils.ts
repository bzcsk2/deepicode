import { t } from './i18n/index.js';

export function plural(n: number, word: string): string {
  return t().plural(n, word);
}
