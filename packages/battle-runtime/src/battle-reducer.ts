/**
 * Compatibility surface for callers that consume the complete battle runtime.
 *
 * State-only execution code imports `battle-state-execution.ts` directly so it
 * cannot acquire session orchestration through this aggregation boundary.
 */
export * from "./battle-state-execution.ts";
export * from "./battle-session-execution.ts";
