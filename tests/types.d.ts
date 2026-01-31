declare module '@yarnpkg/lockfile' {
  export type ParseResult = {
    type: 'success' | 'merge' | 'conflict';
    object: Record<string, unknown>;
  };

  export function parse(content: string): ParseResult;
}
