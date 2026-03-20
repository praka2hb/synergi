/**
 * Load @e2b/code-interpreter with a runtime dynamic import so Node does not use
 * require() (e2b → chalk is ESM-only and breaks CJS on Vercel).
 */
export type E2bCodeInterpreterModule = typeof import("@e2b/code-interpreter");

export function loadE2bCodeInterpreter(): Promise<E2bCodeInterpreterModule> {
  return Function(
    "s",
    "return import(s)",
  )("@e2b/code-interpreter") as Promise<E2bCodeInterpreterModule>;
}
