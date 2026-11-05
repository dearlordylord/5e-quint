import { Match, Result } from "effect";
import type { CombatantId } from "../identity.ts";
import type {
  BattleSpellAreaChoice,
  BattleSpellAreaOriginAnchor,
  BattleState,
} from "../battle-state-execution.ts";

type CombatantAnchoredArea = Extract<
  BattleSpellAreaChoice,
  { readonly originAnchorId: CombatantId }
>;

export function combatantAnchoredAreaOriginIs(
  area: BattleSpellAreaChoice,
  combatantId: CombatantId,
): area is CombatantAnchoredArea {
  return "originAnchorId" in area && area.originAnchorId === combatantId;
}

export function admitSpellAreaOrigin(
  state: BattleState,
  area: BattleSpellAreaChoice,
): Result.Result<BattleSpellAreaOriginAnchor, string> {
  const origin: BattleSpellAreaOriginAnchor =
    "originAnchor" in area
      ? area.originAnchor
      : { kind: "combatant", combatantId: area.originAnchorId };
  return Match.value(origin).pipe(
    Match.when({ kind: "tableSelectedPoint" }, (anchor) =>
      Result.succeed(anchor),
    ),
    Match.when({ kind: "combatant" }, (anchor) =>
      state.combatants.has(anchor.combatantId)
        ? Result.succeed(anchor)
        : Result.fail(
            "Save-gate spell area origin anchor must be a combatant in this battle.",
          ),
    ),
    Match.exhaustive,
  );
}

export function spellAreaOriginMatchesCombatant(
  origin: BattleSpellAreaOriginAnchor,
  combatantId: CombatantId | undefined,
): boolean {
  return Match.value(origin).pipe(
    Match.when(
      { kind: "combatant" },
      (anchor) => anchor.combatantId === combatantId,
    ),
    Match.when({ kind: "tableSelectedPoint" }, () => false),
    Match.exhaustive,
  );
}
