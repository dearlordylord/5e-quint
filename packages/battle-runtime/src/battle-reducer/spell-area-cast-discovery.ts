import type {
  BattleActDiscoveryCandidate,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { spellAreaChoiceHole } from "./spells-holes-fills.ts";

type AreaChoiceSpellInvocation = Parameters<typeof spellAreaChoiceHole>[0];

export function discoverActionSpellAreaCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: AreaChoiceSpellInvocation,
): readonly BattleActDiscoveryCandidate[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [spellAreaChoiceHole(invocation)],
    },
  ];
}
