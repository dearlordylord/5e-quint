import type {
  AvailableCharacterSession,
  InBattleCharacterSession,
} from "./session-store.ts";

export function projectCharacterSessionInBattle(input: {
  readonly session: AvailableCharacterSession;
  readonly battleId: InBattleCharacterSession["battleId"];
}): InBattleCharacterSession {
  return {
    tag: "inBattle",
    sheet: input.session,
    battleId: input.battleId,
  };
}
