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
  WEAPON_MASTERY_TOPPLE_SAVE_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DECISION_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_TARGET_HOLE_ID,
} from "./domain-constants.ts";
import { isHideousLaughterDamageRepeatSaveFill } from "./hideous-laughter-repeat-save.ts";
import { isMirrorImageDuplicateRollFill } from "./mirror-image-hit-interception.ts";

export function attackFillSet(fills: readonly BattleFill[]): AttackFillSet {
  let targetId: CombatantId | undefined;
  let targetSpatialFacts: readonly BattleTargetSpatialFact[] = [];
  let targetSpatialFactsFilled = false;
  let attackRoll: BattleAttackRollResult | undefined;
  let concentrationSavingThrow:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
  const concentrationSavingThrows: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[] = [];
  let damageDisposition: BattleAttackDamageDisposition = {
    kind: "ordinaryDamage",
  };
  let damageDispositionFilled = false;
  let weaponMasteryCleaveDamageDisposition: BattleAttackDamageDisposition = {
    kind: "ordinaryDamage",
  };
  let weaponMasteryCleaveDamageDispositionFilled = false;
  let damageRoll: BattleRolledDiceFill | undefined;
  let mirrorImageDuplicateRoll: BattleRolledDiceFill | undefined;
  let spellDamageReductionRoll: BattleRolledDiceFill | undefined;
  let attackDamageReductionRedirectTarget:
    | Extract<BattleFill, { readonly kind: "targetChoice" }>
    | undefined;
  let attackDamageReductionRedirectSave:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  let attackDamageReductionRedirectDamage: BattleRolledDiceFill | undefined;
  let weaponMasteryToppleSavingThrow:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  const hideousLaughterDamageRepeatSaves: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [];
  let weaponMasteryCleaveDecision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  let weaponMasteryCleaveTarget:
    | Extract<BattleFill, { readonly kind: "targetChoice" }>
    | undefined;
  let weaponMasteryCleaveAttackRoll:
    | Extract<BattleFill, { readonly kind: "attackRoll" }>
    | undefined;
  let weaponMasteryCleaveDamageRoll: BattleRolledDiceFill | undefined;
  for (const fill of fills) {
    if (fill.kind === "sanctuaryInterdictionOutcome") {
      continue;
    }

    if (
      fill.kind === "unitFeatureDecision" &&
      fill.holeId === WEAPON_MASTERY_CLEAVE_DECISION_HOLE_ID
    ) {
      if (weaponMasteryCleaveDecision !== undefined) {
        return {
          tag: "invalid",
          message: "Weapon Mastery Cleave decision was filled twice.",
        };
      }
      weaponMasteryCleaveDecision = fill;
      continue;
    }

    if (
      fill.kind === "targetChoice" &&
      fill.holeId === WEAPON_MASTERY_CLEAVE_TARGET_HOLE_ID
    ) {
      if (weaponMasteryCleaveTarget !== undefined) {
        return {
          tag: "invalid",
          message: "Weapon Mastery Cleave target was filled twice.",
        };
      }
      weaponMasteryCleaveTarget = fill;
      continue;
    }

    if (fill.kind === "targetChoice" && fill.holeId === ATTACK_TARGET_HOLE_ID) {
      if (targetId !== undefined) {
        return { tag: "invalid", message: "Attack target was filled twice." };
      }
      if (targetSpatialFactsFilled) {
        return {
          tag: "invalid",
          message: "Attack target spatial facts were filled twice.",
        };
      }
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      targetSpatialFactsFilled = true;
      const rangeFactValidation =
        validateUniqueAttackTargetRangeFacts(targetSpatialFacts);
      if (rangeFactValidation !== null) {
        return { tag: "invalid", message: rangeFactValidation };
      }
      const sightFactValidation =
        validateUniqueAttackSightFacts(targetSpatialFacts);
      if (sightFactValidation !== null) {
        return { tag: "invalid", message: sightFactValidation };
      }
      continue;
    }

    if (
      fill.kind === "targetSpatialFacts" &&
      fill.holeId === ATTACK_TARGET_HOLE_ID
    ) {
      if (targetSpatialFactsFilled) {
        return {
          tag: "invalid",
          message: "Attack target spatial facts were filled twice.",
        };
      }
      targetSpatialFacts = fill.spatialFacts;
      targetSpatialFactsFilled = true;
      const rangeFactValidation =
        validateUniqueAttackTargetRangeFacts(targetSpatialFacts);
      if (rangeFactValidation !== null) {
        return { tag: "invalid", message: rangeFactValidation };
      }
      const sightFactValidation =
        validateUniqueAttackSightFacts(targetSpatialFacts);
      if (sightFactValidation !== null) {
        return { tag: "invalid", message: sightFactValidation };
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
      fill.kind === "attackRoll" &&
      fill.holeId === WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_ID
    ) {
      if (weaponMasteryCleaveAttackRoll !== undefined) {
        return {
          tag: "invalid",
          message: "Weapon Mastery Cleave attack roll was filled twice.",
        };
      }
      weaponMasteryCleaveAttackRoll = fill;
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
      fill.kind === "savingThrowOutcome" &&
      fill.holeId === WEAPON_MASTERY_TOPPLE_SAVE_HOLE_ID
    ) {
      if (weaponMasteryToppleSavingThrow !== undefined) {
        return {
          tag: "invalid",
          message: "Weapon Mastery Topple Saving Throw was filled twice.",
        };
      }
      weaponMasteryToppleSavingThrow = fill;
      continue;
    }

    if (
      fill.kind === "savingThrowOutcome" &&
      isHideousLaughterDamageRepeatSaveFill(fill)
    ) {
      if (
        hideousLaughterDamageRepeatSaves.some(
          (candidate) => candidate.holeId === fill.holeId,
        )
      ) {
        return {
          tag: "invalid",
          message: "Hideous Laughter damage repeat save was filled twice.",
        };
      }
      hideousLaughterDamageRepeatSaves.push(fill);
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

    if (fill.kind === "rolledDice" && isMirrorImageDuplicateRollFill(fill)) {
      if (mirrorImageDuplicateRoll !== undefined) {
        return {
          tag: "invalid",
          message: "Mirror Image duplicate roll was filled twice.",
        };
      }
      mirrorImageDuplicateRoll = fill;
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

    if (
      fill.kind === "rolledDice" &&
      fill.holeId === WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID
    ) {
      if (weaponMasteryCleaveDamageRoll !== undefined) {
        return {
          tag: "invalid",
          message: "Weapon Mastery Cleave damage was filled twice.",
        };
      }
      weaponMasteryCleaveDamageRoll = fill;
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
      if (
        concentrationSavingThrows.some(
          (concentrationFill) => concentrationFill.holeId === fill.holeId,
        )
      ) {
        return {
          tag: "invalid",
          message: "Concentration Saving Throw hole was filled twice.",
        };
      }
      concentrationSavingThrows.push(fill);
      concentrationSavingThrow ??= fill;
      continue;
    }

    if (fill.kind === "attackDamageDisposition") {
      if (fill.holeId === ATTACK_DAMAGE_DISPOSITION_HOLE_ID) {
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
      if (fill.holeId === WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_ID) {
        if (weaponMasteryCleaveDamageDispositionFilled) {
          return {
            tag: "invalid",
            message:
              "Weapon Mastery Cleave damage disposition was filled twice.",
          };
        }
        weaponMasteryCleaveDamageDispositionFilled = true;
        weaponMasteryCleaveDamageDisposition = fill.value;
        continue;
      }
      if (
        fill.holeId !== ATTACK_DAMAGE_DISPOSITION_HOLE_ID &&
        fill.holeId !== WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_ID
      ) {
        return {
          tag: "invalid",
          message: "Attack damage disposition fill uses the wrong hole.",
        };
      }
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
    concentrationSavingThrows,
    hideousLaughterDamageRepeatSaves,
    damageDisposition,
    damageDispositionFilled,
    damageRoll,
    mirrorImageDuplicateRoll,
    spellDamageReductionRoll,
    attackDamageReductionRedirectTarget,
    attackDamageReductionRedirectSave,
    attackDamageReductionRedirectDamage,
    weaponMasteryToppleSavingThrow,
    weaponMasteryCleaveDecision,
    weaponMasteryCleaveTarget,
    weaponMasteryCleaveAttackRoll,
    weaponMasteryCleaveDamageRoll,
    weaponMasteryCleaveDamageDisposition,
    weaponMasteryCleaveDamageDispositionFilled,
  };
}

export function validateUniqueAttackSightFacts(
  facts: readonly BattleTargetSpatialFact[],
): string | null {
  const sightFacts = facts.filter(
    (fact) =>
      fact.kind === "attackAttackerCannotSeeTarget" ||
      fact.kind === "attackTargetCannotSeeAttacker",
  );
  const duplicate = sightFacts.find((fact, factIndex) =>
    sightFacts
      .slice(0, factIndex)
      .some(
        (previous) =>
          previous.kind === fact.kind &&
          previous.attackerId === fact.attackerId &&
          previous.targetId === fact.targetId,
      ),
  );
  if (duplicate === undefined) {
    return null;
  }
  return "Attack sight facts must contain at most one witness for each direction, attacker, and target.";
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
