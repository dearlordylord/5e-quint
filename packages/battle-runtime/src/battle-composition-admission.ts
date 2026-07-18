import type { CharacterProcedureBattleSubject } from "./battle-subjects.ts";
import type { CharacterBattleCreatureState } from "./battle-reducer.ts";
import {
  BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY,
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  DRUID_WILD_SHAPE_PROCEDURE_QUERY,
  MONK_FOCUS_PROCEDURE_QUERY,
  characterSpellProcedureRef,
  characterSpellProcedureRefForInvocationRef,
  characterUnitProcedureRef,
  type CharacterUnitProcedureQuery,
} from "./character-execution.ts";
import type { BattleProcedureExecutionRef } from "./identity.ts";
import { supportedSpellActs } from "./battle-reducer/spells-profiles.ts";
import { supportedSpellInvocationMatchesRef } from "./battle-reducer/spells-holes-fills.ts";
export type CharacterProcedureSelectionSubject =
  CharacterProcedureBattleSubject;

export function characterUnitProcedureQueryForSubject(
  subject: CharacterProcedureSelectionSubject,
): CharacterUnitProcedureQuery | undefined {
  if (
    subject.tag === "unitFeature" ||
    subject.tag === "unitFeatureHeldWeaponActivation"
  ) {
    return CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY;
  }
  if (subject.tag === "druidWildShape") {
    return DRUID_WILD_SHAPE_PROCEDURE_QUERY;
  }
  if (subject.tag === "bonusActionStandardAction") {
    return BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY;
  }
  if (subject.tag === "monkFocusOption") {
    return MONK_FOCUS_PROCEDURE_QUERY;
  }
  return undefined;
}

/**
 * Admits the authored selection carried by the outer composition envelope.
 * Reducer execution receives the returned binding ref and never repeats this
 * authored lookup.
 */
export function admitCharacterProcedureSelection(
  actor: CharacterBattleCreatureState,
  subject: CharacterProcedureSelectionSubject,
): BattleProcedureExecutionRef | undefined {
  if (
    subject.tag === "actionSpell" ||
    subject.tag === "bonusActionSpell" ||
    subject.tag === "bonusActionDashSpell" ||
    subject.tag === "findFamiliarTouchSpell"
  ) {
    return admitSpellSelection(actor, subject);
  }
  if (
    subject.tag === "unitFeature" ||
    subject.tag === "unitFeatureHeldWeaponActivation"
  ) {
    return characterUnitProcedureRef(
      actor.origin.execution,
      subject.unitId,
      CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
    );
  }
  if (subject.tag === "druidWildShape") {
    return characterUnitProcedureRef(
      actor.origin.execution,
      subject.unitId,
      DRUID_WILD_SHAPE_PROCEDURE_QUERY,
    );
  }
  if (subject.tag === "bonusActionStandardAction") {
    const unitProcedureRef = characterUnitProcedureRef(
      actor.origin.execution,
      subject.sourceUnitId,
      BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY,
    );
    if (unitProcedureRef !== undefined) return unitProcedureRef;
    const invocation = supportedSpellActs(actor).find(
      (candidate) =>
        candidate.procedure === "expeditiousRetreatDash" &&
        candidate.spell.id === subject.sourceUnitId,
    );
    return invocation === undefined
      ? undefined
      : characterSpellProcedureRef(actor.origin.execution, invocation);
  }
  return characterUnitProcedureRef(
    actor.origin.execution,
    subject.resourceUnitId,
    MONK_FOCUS_PROCEDURE_QUERY,
  );
}

function admitSpellSelection(
  actor: CharacterBattleCreatureState,
  subject: Extract<
    CharacterProcedureSelectionSubject,
    {
      readonly tag:
        | "actionSpell"
        | "bonusActionSpell"
        | "bonusActionDashSpell"
        | "findFamiliarTouchSpell";
    }
  >,
): BattleProcedureExecutionRef | undefined {
  const componentWeaponItemId =
    "componentWeaponItemId" in subject
      ? subject.componentWeaponItemId
      : undefined;
  const invocation = supportedSpellActs(actor).find(
    (candidate) =>
      supportedSpellInvocationMatchesRef(candidate, subject.invocation) &&
      (candidate.procedure !== "spellHostedWeaponAttack" ||
        componentWeaponItemId === candidate.componentWeapon.itemId) &&
      (candidate.procedure !== "weaponAttackOverride" ||
        componentWeaponItemId === candidate.attachedWeapon.itemId),
  );
  return invocation === undefined
    ? characterSpellProcedureRefForInvocationRef(
        actor.origin.execution,
        subject.invocation,
      )
    : characterSpellProcedureRef(actor.origin.execution, invocation);
}
