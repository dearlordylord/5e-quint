// Attack replay fill parser extracted from attack-resolution.ts.
// Owns classification of attack fills and the uniqueness invariant for attack target range facts.

import {
ATTACK_DAMAGE_DISPOSITION_HOLE_ID,
ATTACK_ROLL_HOLE_ID,
ATTACK_TARGET_HOLE_ID,
type AttackFillSet,
type BattleAttackDamageDisposition,
type BattleAttackRollResult,
type BattleFill,
type BattleRolledDiceFill,
type BattleTargetSpatialFact,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { isSpellDamageReductionRollFill } from "./damage-helpers.ts";
import {
ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID,
ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_ID,
ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_ID,
} from "./domain-constants.ts";

export function attackFillSet(fills: readonly BattleFill[]): AttackFillSet {
  let targetId: CombatantId | undefined;
  let targetSpatialFacts: readonly BattleTargetSpatialFact[] = [];
  let attackRoll: BattleAttackRollResult | undefined;
  let concentrationSavingThrow:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
  let damageDisposition: BattleAttackDamageDisposition = {
    kind: "ordinaryDamage",
  };
  let damageDispositionFilled = false;
  let damageRoll: BattleRolledDiceFill | undefined;
  let spellDamageReductionRoll: BattleRolledDiceFill | undefined;
  let attackDamageReductionRedirectTarget:
    | Extract<BattleFill, { readonly kind: "targetChoice" }>
    | undefined;
  let attackDamageReductionRedirectSave:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  let attackDamageReductionRedirectDamage: BattleRolledDiceFill | undefined;
  for (const fill of fills) {
    if (fill.kind === "targetChoice" && fill.holeId === ATTACK_TARGET_HOLE_ID) {
      if (targetId !== undefined) {
        return { tag: "invalid", message: "Attack target was filled twice." };
      }
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      const rangeFactValidation =
        validateUniqueAttackTargetRangeFacts(targetSpatialFacts);
      if (rangeFactValidation !== null) {
        return { tag: "invalid", message: rangeFactValidation };
      }
      continue;
    }

    if (
      fill.kind === "targetChoice" &&
      fill.holeId ===
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_ID
    ) {
      if (attackDamageReductionRedirectTarget !== undefined) {
        return {
          tag: "invalid",
          message: "Attack damage reduction redirect target was filled twice.",
        };
      }
      attackDamageReductionRedirectTarget = fill;
      continue;
    }

    if (fill.kind === "attackRoll" && fill.holeId === ATTACK_ROLL_HOLE_ID) {
      if (attackRoll !== undefined) {
        return { tag: "invalid", message: "Attack roll was filled twice." };
      }
      attackRoll = fill.value;
      continue;
    }

    if (
      fill.kind === "savingThrowOutcome" &&
      fill.holeId === ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_ID
    ) {
      if (attackDamageReductionRedirectSave !== undefined) {
        return {
          tag: "invalid",
          message: "Attack damage reduction redirect save was filled twice.",
        };
      }
      attackDamageReductionRedirectSave = fill;
      continue;
    }

    if (
      fill.kind === "rolledDice" &&
      fill.holeId ===
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID
    ) {
      if (attackDamageReductionRedirectDamage !== undefined) {
        return {
          tag: "invalid",
          message: "Attack damage reduction redirect damage was filled twice.",
        };
      }
      attackDamageReductionRedirectDamage = fill;
      continue;
    }

    if (fill.kind === "rolledDice" && isSpellDamageReductionRollFill(fill)) {
      if (spellDamageReductionRoll !== undefined) {
        return {
          tag: "invalid",
          message: "Spell damage reduction roll was filled twice.",
        };
      }
      spellDamageReductionRoll = fill;
      continue;
    }

    if (fill.kind === "rolledDice") {
      if (damageRoll !== undefined) {
        return { tag: "invalid", message: "Attack damage was filled twice." };
      }
      damageRoll = fill;
      continue;
    }

    if (fill.kind === "concentrationSavingThrow") {
      if (concentrationSavingThrow !== undefined) {
        return {
          tag: "invalid",
          message: "Concentration Saving Throw was filled twice.",
        };
      }
      concentrationSavingThrow = fill;
      continue;
    }

    if (fill.kind === "attackDamageDisposition") {
      if (fill.holeId !== ATTACK_DAMAGE_DISPOSITION_HOLE_ID) {
        return {
          tag: "invalid",
          message: "Attack damage disposition fill uses the wrong hole.",
        };
      }
      if (damageDispositionFilled) {
        return {
          tag: "invalid",
          message: "Attack damage disposition was filled twice.",
        };
      }
      damageDispositionFilled = true;
      damageDisposition = fill.value;
      continue;
    }

    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Attack replay holes.`,
    };
  }

  return {
    tag: "ok",
    targetId,
    targetSpatialFacts,
    attackRoll,
    concentrationSavingThrow,
    damageDisposition,
    damageDispositionFilled,
    damageRoll,
    spellDamageReductionRoll,
    attackDamageReductionRedirectTarget,
    attackDamageReductionRedirectSave,
    attackDamageReductionRedirectDamage,
  };
}

export function validateUniqueAttackTargetRangeFacts(
  facts: readonly BattleTargetSpatialFact[],
): string | null {
  const rangeFacts = facts.filter(
    (fact) => fact.kind === "attackTargetInRangedRange",
  );
  const duplicate = rangeFacts.find((fact, factIndex) =>
    rangeFacts
      .slice(0, factIndex)
      .some(
        (previous) =>
          previous.actorId === fact.actorId &&
          previous.targetId === fact.targetId &&
          previous.attackName === fact.attackName,
      ),
  );
  if (duplicate === undefined) {
    return null;
  }
  return "Attack target range facts must contain at most one range band for each actor, target, and attack.";
}
