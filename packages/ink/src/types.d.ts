declare module 'bidi-js' {
  const bidi: any;
  export default bidi;
}

declare module '@alcalzone/ansi-tokenize' {
  export function tokenize(input: string): Array<{
    type: string;
    value: string;
    foreground?: string;
    background?: string;
  }>;
  export function ansiTokenize(input: string): any;
}

declare namespace Bun {
  function inspect(value: any): string;
  function write(value: any): void;
  const stdout: {
    write(data: any): boolean;
    readonly writable: boolean;
  };
}

interface DiffCallback {
  (x: number, y: number, removed: any, added: any): boolean | undefined;
}
