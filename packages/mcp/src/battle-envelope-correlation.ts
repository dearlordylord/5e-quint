import type { McpActiveSessionSnapshot } from "./session-snapshot-output.ts";

type BattleEnvelopeIdentity = {
  readonly checkpoint: {
    readonly battleId: string;
    readonly currentActorId: string;
  };
};

/**
 * The presented checkpoint and the session summary describe one active
 * Battle. Keep their identity check in one boundary predicate so every MCP
 * consumer rejects a cross-Battle or cross-actor envelope consistently.
 */
export function battleEnvelopeMatchesActiveSession(input: {
  readonly envelope: BattleEnvelopeIdentity;
  readonly session: Pick<McpActiveSessionSnapshot, "battleState">;
}): boolean {
  return (
    input.envelope.checkpoint.battleId === input.session.battleState.battleId &&
    input.envelope.checkpoint.currentActorId ===
      input.session.battleState.currentActorId
  );
}
