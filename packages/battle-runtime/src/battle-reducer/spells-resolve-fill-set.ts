// Spell replay fill parser extracted from spells-resolve.ts.
// Owns classification and validation of supplied fills against spell replay holes.

import { type AttackRollResult } from "@dnd/shared-algebras/runtime-hole-algebra";
import type { Skill } from "@dnd/surface/surface/types";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_TARGET_HOLE_ID,
  isScalarBuffTargetListInvocation,
  isTargetListSpellInvocation,
  type BattleAttackRollResult,
  type BattleFill,
  type BattleSpellSavingThrowOutcomeValue,
  type BattleSpellTargetAllocation,
  type BattleSpellTargetAllocationSpatialFact,
  type BattleSpellTargetListSpatialFact,
  type BattleTargetSpatialFact,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { BattleObjectId, CombatantId } from "../identity.ts";
import { isSpellDamageReductionRollFill } from "./damage-helpers.ts";
import {
  spellBurstDamageHole,
  spellDamageHole,
  spellDamageTypeChoiceHole,
  spellObjectTargetHoleId,
  spellRollModifierSkillChoiceHoleId,
  spellSavingThrowOutcomeHoleId,
  spellTargetAllocationHoleId,
  spellTargetListHoleId,
} from "./spells-holes-fills.ts";

export type SpellFillSet =
  | {
      readonly tag: "ok";
      readonly targetId: CombatantId | undefined;
      readonly objectTarget:
        | {
            readonly objectId: BattleObjectId;
            readonly spatialFacts: readonly Extract<
              BattleTargetSpatialFact,
              { readonly kind: "spellObjectTarget" }
            >[];
          }
        | undefined;
      readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
      readonly targetAllocation:
        | {
            readonly allocations: readonly BattleSpellTargetAllocation[];
            readonly spatialFacts: readonly BattleSpellTargetAllocationSpatialFact[];
          }
        | undefined;
      readonly targetList:
        | {
            readonly targetIds: readonly CombatantId[];
            readonly spatialFacts: readonly BattleSpellTargetListSpatialFact[];
          }
        | undefined;
      readonly attackRoll: BattleAttackRollResult | undefined;
      readonly savingThrowOutcomes:
        | BattleSpellSavingThrowOutcomeValue
        | undefined;
      readonly skillChoice: Skill | undefined;
      readonly damageTypeChoice:
        | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
        | undefined;
      readonly concentrationSavingThrows: readonly Extract<
        BattleFill,
        { readonly kind: "concentrationSavingThrow" }
      >[];
      readonly damageDispositions: readonly Extract<
        BattleFill,
        { readonly kind: "attackDamageDisposition" }
      >[];
      readonly damageRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
      readonly spellDamageReductionRolls: readonly Extract<
        BattleFill,
        { readonly kind: "rolledDice" }
      >[];
      readonly attackBurstDamageRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
      readonly healingRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };

export function spellFillSet(
  fills: readonly BattleFill[],
  invocation: SupportedSpellInvocation,
): SpellFillSet {
  let targetId: CombatantId | undefined;
  let objectTarget:
    | {
        readonly objectId: BattleObjectId;
        readonly spatialFacts: readonly Extract<
          BattleTargetSpatialFact,
          { readonly kind: "spellObjectTarget" }
        >[];
      }
    | undefined;
  let targetSpatialFacts: readonly BattleTargetSpatialFact[] = [];
  let targetAllocation:
    | {
        readonly allocations: readonly BattleSpellTargetAllocation[];
        readonly spatialFacts: readonly BattleSpellTargetAllocationSpatialFact[];
      }
    | undefined;
  let targetList:
    | {
        readonly targetIds: readonly CombatantId[];
        readonly spatialFacts: readonly BattleSpellTargetListSpatialFact[];
      }
    | undefined;
  let attackRoll: AttackRollResult | undefined;
  let savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue | undefined;
  let skillChoice: Skill | undefined;
  let damageTypeChoice:
    | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
    | undefined;
  const concentrationSavingThrows: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[] = [];
  const damageDispositions: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >[] = [];
  let damageRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  const spellDamageReductionRolls: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >[] = [];
  let attackBurstDamageRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  let healingRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  for (const fill of fills) {
    if (fill.kind === "targetChoice" && fill.holeId === ATTACK_TARGET_HOLE_ID) {
      if (targetId !== undefined) {
        return { tag: "invalid", message: "Spell target was filled twice." };
      }
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      continue;
    }

    if (fill.kind === "objectTargetChoice") {
      if (
        invocation.procedure !== "spellAttackDamage" ||
        invocation.targeting.kind !== "singleCreatureOrObject"
      ) {
        return {
          tag: "invalid",
          message: "Object target fill does not match this spell act.",
        };
      }
      if (fill.holeId !== spellObjectTargetHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Object target fill must use the selected spell act object-target hole.",
        };
      }
      if (objectTarget !== undefined) {
        return {
          tag: "invalid",
          message: "Spell object target was filled twice.",
        };
      }
      objectTarget = {
        objectId: fill.value,
        spatialFacts: fill.spatialFacts,
      };
      continue;
    }

    if (fill.kind === "spellTargetAllocation") {
      if (invocation.procedure !== "repeatedDamageAllocation") {
        return {
          tag: "invalid",
          message: "Spell target allocation does not match this spell act.",
        };
      }
      if (fill.holeId !== spellTargetAllocationHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Spell target allocation must use the selected spell act allocation hole.",
        };
      }
      if (targetAllocation !== undefined) {
        return {
          tag: "invalid",
          message: "Spell target allocation was filled twice.",
        };
      }
      targetAllocation = {
        allocations: fill.value.allocations,
        spatialFacts: fill.spatialFacts,
      };
      continue;
    }

    if (fill.kind === "spellTargetList") {
      if (
        invocation.procedure !== "directHitPointRestoration" &&
        invocation.procedure !== "scalarBuff" &&
        invocation.procedure !== "rollModifier" &&
        invocation.procedure !== "damageReduction" &&
        invocation.procedure !== "saveGatedCondition" &&
        invocation.procedure !==
          "conditionImmunityAndTurnStartTemporaryHitPoints"
      ) {
        return {
          tag: "invalid",
          message: "Spell target list does not match this spell act.",
        };
      }
      if (
        (invocation.procedure === "scalarBuff" &&
          !isScalarBuffTargetListInvocation(invocation)) ||
        (invocation.procedure === "saveGatedCondition" &&
          !isTargetListSpellInvocation(invocation))
      ) {
        return {
          tag: "invalid",
          message: "Spell target list does not match this spell act.",
        };
      }
      if (fill.holeId !== spellTargetListHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Spell target list must use the selected spell act target-list hole.",
        };
      }
      if (targetList !== undefined) {
        return {
          tag: "invalid",
          message: "Spell target list was filled twice.",
        };
      }
      targetList = {
        targetIds: fill.value.targetIds,
        spatialFacts: fill.spatialFacts,
      };
      continue;
    }

    if (fill.kind === "attackRoll" && fill.holeId === ATTACK_ROLL_HOLE_ID) {
      if (attackRoll !== undefined) {
        return {
          tag: "invalid",
          message: "Spell attack roll was filled twice.",
        };
      }
      attackRoll = fill.value;
      continue;
    }

    if (fill.kind === "savingThrowOutcome") {
      if (
        invocation.procedure !== "attackBurstSaveDamage" &&
        invocation.procedure !== "saveGatedDamage" &&
        invocation.procedure !== "saveGatedCondition" &&
        invocation.procedure !== "afterHitSaveGatedCondition" &&
        invocation.procedure !== "saveGatedAttackRollAdvantage" &&
        !(
          invocation.procedure === "rollModifier" &&
          invocation.saveGate !== null
        )
      ) {
        return {
          tag: "invalid",
          message: "Spell saving throw outcomes do not match this spell act.",
        };
      }
      if (fill.holeId !== spellSavingThrowOutcomeHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Spell saving throw outcomes must use the selected spell act outcome hole.",
        };
      }
      if (savingThrowOutcomes !== undefined) {
        return {
          tag: "invalid",
          message: "Spell saving throw outcomes were filled twice.",
        };
      }
      if (
        invocation.procedure !== "rollModifier" &&
        spellFillSetSavingThrowTargeting(invocation).kind !==
          "singleCombatant" &&
        spellFillSetSavingThrowTargeting(invocation).kind !== "targetList" &&
        !("area" in fill.value)
      ) {
        return {
          tag: "invalid",
          message: "Spell saving throw outcomes require area facts.",
        };
      }
      if (
        invocation.procedure !== "rollModifier" &&
        spellFillSetSavingThrowTargeting(invocation).kind ===
          "singleCombatant" &&
        "area" in fill.value
      ) {
        return {
          tag: "invalid",
          message:
            "Single-target save-gate spell outcomes must not include area facts.",
        };
      }
      savingThrowOutcomes = fill.value;
      continue;
    }

    if (fill.kind === "skillChoice") {
      if (
        invocation.procedure !== "rollModifier" ||
        invocation.skillChoices === null
      ) {
        return {
          tag: "invalid",
          message: "Spell skill choice does not match this spell act.",
        };
      }
      if (fill.holeId !== spellRollModifierSkillChoiceHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Spell skill choice must use the selected spell act skill-choice hole.",
        };
      }
      if (skillChoice !== undefined) {
        return {
          tag: "invalid",
          message: "Spell skill choice was filled twice.",
        };
      }
      skillChoice = fill.value;
      continue;
    }

    if (fill.kind === "damageTypeChoice") {
      if (
        invocation.procedure !== "damageReduction" &&
        invocation.procedure !== "spellHostedWeaponAttack"
      ) {
        return {
          tag: "invalid",
          message: "Spell damage type choice does not match this spell act.",
        };
      }
      if (fill.holeId !== spellDamageTypeChoiceHole(invocation).holeId) {
        return {
          tag: "invalid",
          message:
            "Spell damage type choice must use the selected spell act choice hole.",
        };
      }
      if (damageTypeChoice !== undefined) {
        return {
          tag: "invalid",
          message: "Spell damage type choice was filled twice.",
        };
      }
      damageTypeChoice = fill;
      continue;
    }

    if (fill.kind === "rolledDice") {
      if (isSpellDamageReductionRollFill(fill)) {
        if (
          spellDamageReductionRolls.some(
            (candidate) => candidate.holeId === fill.holeId,
          )
        ) {
          return {
            tag: "invalid",
            message: "Spell damage reduction roll was filled twice.",
          };
        }
        spellDamageReductionRolls.push(fill);
        continue;
      }
      if (
        invocation.procedure === "directHitPointRestoration" ||
        (invocation.procedure === "scalarBuff" &&
          invocation.effect.kind === "temporaryHitPoints")
      ) {
        if (healingRoll !== undefined) {
          return {
            tag: "invalid",
            message: "Spell scalar dice result was filled twice.",
          };
        }
        healingRoll = fill;
        continue;
      }
      if (invocation.procedure === "attackBurstSaveDamage") {
        const attackDamageHole = spellDamageHole(invocation, false);
        const criticalAttackDamageHole = spellDamageHole(invocation, true);
        const burstDamageHole = spellBurstDamageHole(invocation);
        if (
          fill.holeId === attackDamageHole.holeId ||
          fill.holeId === criticalAttackDamageHole.holeId
        ) {
          if (attackBurstDamageRoll !== undefined) {
            return {
              tag: "invalid",
              message: "Ice Knife attack damage was filled twice.",
            };
          }
          attackBurstDamageRoll = fill;
          continue;
        }
        if (fill.holeId === burstDamageHole.holeId) {
          if (damageRoll !== undefined) {
            return {
              tag: "invalid",
              message: "Ice Knife burst damage was filled twice.",
            };
          }
          damageRoll = fill;
          continue;
        }
        return {
          tag: "invalid",
          message: "Ice Knife damage must use an Ice Knife damage hole.",
        };
      }
      if (damageRoll !== undefined) {
        return { tag: "invalid", message: "Spell damage was filled twice." };
      }
      damageRoll = fill;
      continue;
    }

    if (fill.kind === "concentrationSavingThrow") {
      if (
        concentrationSavingThrows.some(
          (candidate) => candidate.holeId === fill.holeId,
        )
      ) {
        return {
          tag: "invalid",
          message: "Concentration Saving Throw was filled twice.",
        };
      }
      concentrationSavingThrows.push(fill);
      continue;
    }

    if (fill.kind === "attackDamageDisposition") {
      if (
        damageDispositions.some((candidate) => candidate.holeId === fill.holeId)
      ) {
        return {
          tag: "invalid",
          message: "Damage disposition was filled twice.",
        };
      }
      damageDispositions.push(fill);
      continue;
    }

    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the spell replay holes.`,
    };
  }

  return {
    tag: "ok",
    targetId,
    objectTarget,
    targetSpatialFacts,
    targetAllocation,
    targetList,
    attackRoll,
    savingThrowOutcomes,
    skillChoice,
    damageTypeChoice,
    concentrationSavingThrows,
    damageDispositions,
    damageRoll,
    spellDamageReductionRolls,
    attackBurstDamageRoll,
    healingRoll,
  };
}

export function spellFillSetSavingThrowTargeting(
  invocation: SupportedSpellInvocation,
): SpellTargeting {
  return invocation.procedure === "attackBurstSaveDamage"
    ? invocation.burst.targeting
    : invocation.procedure === "saveGatedDamage" ||
        invocation.procedure === "saveGatedCondition" ||
        invocation.procedure === "afterHitSaveGatedCondition" ||
        invocation.procedure === "saveGatedAttackRollAdvantage"
      ? invocation.targeting
      : { kind: "singleCombatant" };
}
