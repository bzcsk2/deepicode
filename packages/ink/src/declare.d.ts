declare var Bun: {
  inspect(value: any, options?: any): string;
  write(...values: any[]): void;
  readonly stdout: {
      readonly writable: boolean;
      write(data: any): boolean;
  };
  [key: string]: any;
};

declare module 'bidi-js' {
  const bidi: any;
  export default bidi;
}

declare module '@alcalzone/ansi-tokenize' {
  export interface AnsiCode {
    type: "ansi";
    code: string;
    endCode: string;
  }
  export interface ControlCode {
    type: "control";
    code: string;
  }
  export interface Char {
    type: "char";
    value: string;
    fullWidth: boolean;
  }
  export type Token = AnsiCode | ControlCode | Char;
  export interface StyledChar extends Char {
    styles: AnsiCode[];
  }
  export function tokenize(str: string, endChar?: number): Token[];
  export function ansiCodesToString(codes: AnsiCode[]): string;
  export function diffAnsiCodes(before: AnsiCode[], after: AnsiCode[]): AnsiCode[];
  export function styledCharsFromTokens(tokens: Token[]): StyledChar[];
  export function styledCharsToString(chars: StyledChar[]): string;
  export function reduceAnsiCodes(codes: AnsiCode[]): AnsiCode[];
  export function reduceAnsiCodesIncremental(codes: AnsiCode[]): AnsiCode[];
  export function undoAnsiCodes(codes: AnsiCode[]): AnsiCode[];
}
