import { Match } from "effect";
import type { SpellAttackKind } from "../active-effect/execution-vocabulary.ts";

export function spellAttackKindForRedirect(attackKind: SpellAttackKind) {
  return Match.value(attackKind).pipe(
    Match.when("melee_spell_attack", () => "melee" as const),
    Match.when("ranged_spell_attack", () => "ranged" as const),
    Match.exhaustive,
  );
}
