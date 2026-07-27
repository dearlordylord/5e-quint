import type {
  BattleActDiscoveryCandidate,
  BattleHole,
} from "../battle-state-execution.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";

export function actionSpellCastCandidate(
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  initialHoles: readonly BattleHole[],
): BattleActDiscoveryCandidate {
  return spellCastCandidate("actionSpell", actorId, procedureRef, initialHoles);
}

export function spellCastCandidate(
  subjectTag: "actionSpell" | "bonusActionSpell",
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  initialHoles: readonly BattleHole[],
): BattleActDiscoveryCandidate {
  return {
    subject: {
      tag: subjectTag,
      actorId,
      procedureRef,
      mode: { tag: "cast" },
    },
    initialHoles,
  };
}

export function actionSpellCastCandidatesForTargetHole(
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  targetHole: BattleHole & { readonly choices: readonly unknown[] },
  additionalHoles: readonly BattleHole[] = [],
): readonly BattleActDiscoveryCandidate[] {
  return spellCastCandidatesForTargetHole(
    "actionSpell",
    actorId,
    procedureRef,
    targetHole,
    additionalHoles,
  );
}

export function spellCastCandidatesForTargetHole(
  subjectTag: "actionSpell" | "bonusActionSpell",
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  targetHole: BattleHole & { readonly choices: readonly unknown[] },
  additionalHoles: readonly BattleHole[] = [],
): readonly BattleActDiscoveryCandidate[] {
  return targetHole.choices.length === 0
    ? []
    : [
        spellCastCandidate(subjectTag, actorId, procedureRef, [
          targetHole,
          ...additionalHoles,
        ]),
      ];
}
