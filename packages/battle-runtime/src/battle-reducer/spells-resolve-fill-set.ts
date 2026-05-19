// Spell replay fill parser extracted from spells-resolve.ts.
// Owns classification and validation of supplied fills against spell replay holes.

import { type AttackRollResult } from "@dnd/shared-algebras/runtime-hole-algebra";
import type { Condition } from "@dnd/shared/types";
import type { Ability, Skill } from "@dnd/surface/surface/types";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_TARGET_HOLE_ID,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  isScalarBuffTargetListInvocation,
  isTargetListSpellInvocation,
  type BattleAttackRollResult,
  type BattleCommandOption,
  type BattleFill,
  type BattleHoleId,
  type BattleSpellAreaIdentityChoice,
  type BattleSpellSavingThrowOutcomeValue,
  type BattleSpellTargetAllocation,
  type BattleSpellTargetAllocationSpatialFact,
  type BattleSpellTargetListSpatialFact,
  type BattleSpellCastReactionFact,
  type BattleTargetSpatialFact,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { BattleObjectId, CombatantId } from "../identity.ts";
import { isSpellDamageReductionRollFill } from "./damage-helpers.ts";
import { validateUniqueAttackSightFacts } from "./attack-fill-set.ts";
import { isHideousLaughterDamageRepeatSaveFill } from "./hideous-laughter-repeat-save.ts";
import {
  spellBurstDamageHole,
  spellAttackSequencePartAttackRollHoleId,
  spellAttackSequencePartDamageHoleId,
  spellAttackSequencePartObjectTargetHoleId,
  spellAttackSequencePartTargetHoleId,
  commandOptionChoiceHoleId,
  spellDamageHole,
  spellDamageTypeChoiceHole,
  saveGatedConditionHasConditionChoice,
  spellAreaChoiceHoleId,
  spellConditionChoiceHoleId,
  spellObjectTargetHoleId,
  spellAbilityChoiceHoleId,
  spellRollModifierAbilityChoiceHoleId,
  spellRollModifierSkillChoiceHoleId,
  spellSavingThrowOutcomeHoleId,
  spellTargetAllocationHoleId,
  spellTargetListHoleId,
} from "./spells-holes-fills.ts";
import { spellDancingLightsPlacementHoleId } from "./spells-targeting.ts";
import { THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID } from "./domain-constants.ts";

export type SpellAttackSequencePartTargetFill =
  | {
      readonly kind: "combatant";
      readonly targetId: CombatantId;
      readonly spatialFacts: readonly BattleTargetSpatialFact[];
    }
  | {
      readonly kind: "object";
      readonly objectId: BattleObjectId;
      readonly spatialFacts: readonly Extract<
        BattleTargetSpatialFact,
        { readonly kind: "spellObjectTarget" | "spellObjectTargetSight" }
      >[];
    };

export type SpellAttackSequencePartFillSet = {
  readonly target: SpellAttackSequencePartTargetFill | undefined;
  readonly attackRoll: BattleAttackRollResult | undefined;
  readonly damageRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
};
type SpellObjectTargetFact = Extract<
  BattleTargetSpatialFact,
  {
    readonly kind:
      | "spellObjectLightTarget"
      | "spellTouchedObjectTarget"
      | "spellObjectIgnition"
      | "spellObjectTarget"
      | "spellObjectTargetSight";
  }
>;
export type SpellCastReactionFact = BattleSpellCastReactionFact;

export type SpellFillSet =
  | {
      readonly tag: "ok";
      readonly targetId: CombatantId | undefined;
      readonly objectTarget:
        | {
            readonly objectId: BattleObjectId;
            readonly spatialFacts: readonly Extract<
              BattleTargetSpatialFact,
              {
                readonly kind:
                  | "spellObjectLightTarget"
                  | "spellTouchedObjectTarget"
                  | "spellObjectIgnition"
                  | "spellObjectTarget"
                  | "spellObjectTargetSight";
              }
            >[];
          }
        | undefined;
      readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
      readonly reactionSpellTargetFacts: readonly SpellCastReactionFact[];
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
      readonly attackSequencePartFills: readonly SpellAttackSequencePartFillSet[];
      readonly attackRoll: BattleAttackRollResult | undefined;
      readonly savingThrowOutcomes:
        | BattleSpellSavingThrowOutcomeValue
        | undefined;
      readonly skillChoice: Skill | undefined;
      readonly abilityChoice: Ability | undefined;
      readonly thaumaturgyActiveOneMinuteEffectCount:
        | Extract<
            BattleFill,
            { readonly kind: "thaumaturgyActiveOneMinuteEffectCount" }
      >
        | undefined;
      readonly commandOptionChoice: BattleCommandOption | undefined;
      readonly conditionChoice: Condition | undefined;
      readonly areaChoice: BattleSpellAreaIdentityChoice | undefined;
      readonly teleportDestination:
        | Extract<BattleFill, { readonly kind: "teleportDestination" }>
        | undefined;
      readonly dancingLightsPlacement:
        | Extract<BattleFill, { readonly kind: "dancingLightsPlacement" }>
        | undefined;
      readonly damageTypeChoice:
        | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
        | undefined;
      readonly concentrationSavingThrows: readonly Extract<
        BattleFill,
        { readonly kind: "concentrationSavingThrow" }
      >[];
      readonly hideousLaughterDamageRepeatSaves: readonly Extract<
        BattleFill,
        { readonly kind: "savingThrowOutcome" }
      >[];
      readonly damageDispositions: readonly Extract<
        BattleFill,
        { readonly kind: "attackDamageDisposition" }
      >[];
      readonly damageRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
      readonly movement:
        | Extract<BattleFill, { readonly kind: "movement" }>
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
          {
            readonly kind:
              | "spellObjectLightTarget"
              | "spellTouchedObjectTarget"
              | "spellObjectIgnition"
              | "spellObjectTarget"
              | "spellObjectTargetSight";
          }
        >[];
      }
    | undefined;
  let targetSpatialFacts: readonly BattleTargetSpatialFact[] = [];
  let reactionSpellTargetFacts: readonly SpellCastReactionFact[] = [];
  let reactionSpellTargetFactsFilled = false;
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
  const attackSequencePartFills: SpellAttackSequencePartFillSet[] =
    invocation.procedure === "spellAttackSequence"
      ? Array.from({ length: invocation.targeting.attackCount }, () => ({
          target: undefined,
          attackRoll: undefined,
          damageRoll: undefined,
        }))
      : [];
  let savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue | undefined;
  let skillChoice: Skill | undefined;
  let abilityChoice: Ability | undefined;
  let thaumaturgyActiveOneMinuteEffectCount:
    | Extract<
        BattleFill,
        { readonly kind: "thaumaturgyActiveOneMinuteEffectCount" }
      >
    | undefined;
  let commandOptionChoice: BattleCommandOption | undefined;
  let conditionChoice: Condition | undefined;
  let areaChoice: BattleSpellAreaIdentityChoice | undefined;
  let teleportDestination:
    | Extract<BattleFill, { readonly kind: "teleportDestination" }>
    | undefined;
  let dancingLightsPlacement:
    | Extract<BattleFill, { readonly kind: "dancingLightsPlacement" }>
    | undefined;
  let damageTypeChoice:
    | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
    | undefined;
  const concentrationSavingThrows: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[] = [];
  const hideousLaughterDamageRepeatSaves: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [];
  const damageDispositions: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >[] = [];
  let damageRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  let movement: Extract<BattleFill, { readonly kind: "movement" }> | undefined;
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
    if (fill.kind === "sanctuaryInterdictionOutcome") {
      continue;
    }

    if (fill.kind === "targetChoice" && fill.holeId === ATTACK_TARGET_HOLE_ID) {
      if (targetId !== undefined) {
        return { tag: "invalid", message: "Spell target was filled twice." };
      }
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      const sightFactValidation = attackSightFactValidation(targetSpatialFacts);
      if (sightFactValidation !== null) return sightFactValidation;
      continue;
    }

    if (
      fill.kind === "targetSpatialFacts" &&
      fill.holeId === SPELL_CAST_REACTION_FACTS_HOLE_ID
    ) {
      if (reactionSpellTargetFactsFilled) {
        return {
          tag: "invalid",
          message: "Spell-cast Reaction trigger facts were filled twice.",
        };
      }
      const reactionFactValidation = parseSpellCastReactionFactsFill(fill);
      if (reactionFactValidation.tag === "invalid") {
        return { tag: "invalid", message: reactionFactValidation.message };
      }
      if (reactionFactValidation.tag === "notSpellCastReactionFactsFill") {
        return {
          tag: "invalid",
          message:
            "Spell-cast Reaction trigger facts must use the spell-cast Reaction facts hole.",
        };
      }
      reactionSpellTargetFacts = reactionFactValidation.facts;
      reactionSpellTargetFactsFilled = true;
      continue;
    }

    if (
      fill.kind === "targetChoice" &&
      invocation.procedure === "spellAttackSequence"
    ) {
      const partIndex = spellAttackSequencePartIndexForHole(
        invocation,
        fill.holeId,
        "target",
      );
      if (partIndex !== null) {
        const attackSequencePartFill = attackSequencePartFills[partIndex];
        if (attackSequencePartFill === undefined) {
          return {
            tag: "invalid",
            message: "Spell attack sequence target is outside this spell act.",
          };
        }
        if (attackSequencePartFill.target !== undefined) {
          return {
            tag: "invalid",
            message: "Spell attack sequence target was filled twice.",
          };
        }
        const spatialFacts = fill.spatialFacts ?? [];
        const sightFactValidation = attackSightFactValidation(spatialFacts);
        if (sightFactValidation !== null) return sightFactValidation;
        attackSequencePartFills[partIndex] = {
          ...attackSequencePartFill,
          target: {
            kind: "combatant",
            targetId: fill.value,
            spatialFacts,
          },
        };
        continue;
      }
    }

    if (fill.kind === "objectTargetChoice") {
      if (invocation.procedure === "spellAttackSequence") {
        const partIndex = spellAttackSequencePartIndexForHole(
          invocation,
          fill.holeId,
          "object",
        );
        if (partIndex !== null) {
          const attackSequencePartFill = attackSequencePartFills[partIndex];
          if (attackSequencePartFill === undefined) {
            return {
              tag: "invalid",
              message: "Spell attack sequence object target is outside this spell act.",
            };
          }
          if (attackSequencePartFill.target !== undefined) {
            return {
              tag: "invalid",
              message: "Spell attack sequence target was filled twice.",
            };
          }
          attackSequencePartFills[partIndex] = {
            ...attackSequencePartFill,
            target: {
              kind: "object",
              objectId: fill.value,
              spatialFacts: fill.spatialFacts.filter(
                (
                  fact,
                ): fact is Extract<
                  BattleTargetSpatialFact,
                  {
                    readonly kind:
                      | "spellObjectTarget"
                      | "spellObjectTargetSight";
                  }
                > =>
                  fact.kind === "spellObjectTarget" ||
                  fact.kind === "spellObjectTargetSight",
              ),
            },
          };
          continue;
        }
      }
      if (
        (invocation.procedure !== "heldLightHurl" &&
          invocation.procedure !== "objectLight" &&
          invocation.procedure !== "spellAttackDamage") ||
        (invocation.targeting.kind !== "singleCreatureOrObject" &&
          invocation.targeting.kind !== "singleObject")
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
        spatialFacts: fill.spatialFacts.filter(
          (fact): fact is SpellObjectTargetFact =>
            fact.kind === "spellObjectLightTarget" ||
            fact.kind === "spellTouchedObjectTarget" ||
            fact.kind === "spellObjectIgnition" ||
            fact.kind === "spellObjectTarget" ||
            fact.kind === "spellObjectTargetSight",
        ),
      };
      continue;
    }

    if (fill.kind === "spellAreaChoice") {
      if (
        invocation.procedure !== "fogCloudObscurement" &&
        invocation.procedure !== "flamingSphere"
      ) {
        return {
          tag: "invalid",
          message: "Spell area choice does not match this spell act.",
        };
      }
      if (fill.holeId !== spellAreaChoiceHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Spell area choice must use the selected spell act area-choice hole.",
        };
      }
      if (areaChoice !== undefined) {
        return { tag: "invalid", message: "Spell area was filled twice." };
      }
      areaChoice = fill.value;
      continue;
    }

    if (fill.kind === "teleportDestination") {
      if (invocation.procedure !== "selfTeleport") {
        return {
          tag: "invalid",
          message: "Teleport destination does not match this spell act.",
        };
      }
      if (teleportDestination !== undefined) {
        return {
          tag: "invalid",
          message: "Teleport destination was filled twice.",
        };
      }
      teleportDestination = fill;
      continue;
    }

    if (fill.kind === "dancingLightsPlacement") {
      if (
        invocation.procedure !== "dancingLightsSeparateCast" &&
        invocation.procedure !== "dancingLightsCombinedCast" &&
        invocation.procedure !== "dancingLightsReposition"
      ) {
        return {
          tag: "invalid",
          message: "Dancing Lights placement does not match this spell act.",
        };
      }
      if (
        fill.holeId !==
        spellDancingLightsPlacementHoleId(invocation, fill.value.form)
      ) {
        return {
          tag: "invalid",
          message:
            "Dancing Lights placement must use the selected spell act placement hole.",
        };
      }
      if (dancingLightsPlacement !== undefined) {
        return {
          tag: "invalid",
          message: "Dancing Lights placement was filled twice.",
        };
      }
      dancingLightsPlacement = fill;
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
        invocation.procedure !== "hideousLaughter" &&
        invocation.procedure !== "command" &&
        invocation.procedure !== "jumpMovementReplacement" &&
        invocation.procedure !== "featherFallMitigation" &&
        invocation.procedure !== "sanctuaryTargetingInterdiction" &&
        invocation.procedure !== "directCondition" &&
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
          !isTargetListSpellInvocation(invocation)) ||
        (invocation.procedure === "hideousLaughter" &&
          !isTargetListSpellInvocation(invocation)) ||
        (invocation.procedure === "command" &&
          !isTargetListSpellInvocation(invocation)) ||
        (invocation.procedure === "sanctuaryTargetingInterdiction" &&
          !isTargetListSpellInvocation(invocation)) ||
        (invocation.procedure === "directCondition" &&
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

    if (
      fill.kind === "attackRoll" &&
      invocation.procedure === "spellAttackSequence"
    ) {
      const partIndex = spellAttackSequencePartIndexForHole(
        invocation,
        fill.holeId,
        "attackRoll",
      );
      if (partIndex !== null) {
        const attackSequencePartFill = attackSequencePartFills[partIndex];
        if (attackSequencePartFill === undefined) {
          return {
            tag: "invalid",
            message: "Spell attack sequence attack roll is outside this spell act.",
          };
        }
        if (attackSequencePartFill.attackRoll !== undefined) {
          return {
            tag: "invalid",
            message: "Spell attack sequence attack roll was filled twice.",
          };
        }
        attackSequencePartFills[partIndex] = { ...attackSequencePartFill, attackRoll: fill.value };
        continue;
      }
    }

    if (fill.kind === "savingThrowOutcome") {
      if (isHideousLaughterDamageRepeatSaveFill(fill)) {
        if (
          hideousLaughterDamageRepeatSaves.some(
            (candidate) => candidate.holeId === fill.holeId,
          )
        ) {
          return {
            tag: "invalid",
            message: "Hideous Laughter repeat save was filled twice.",
          };
        }
        hideousLaughterDamageRepeatSaves.push(fill);
        continue;
      }
      if (
        invocation.procedure !== "attackBurstSaveDamage" &&
        invocation.procedure !== "saveGatedDamage" &&
        invocation.procedure !== "saveGatedCondition" &&
        invocation.procedure !== "afterHitSaveGatedCondition" &&
        invocation.procedure !== "saveGatedAttackRollAdvantage" &&
        invocation.procedure !== "counterspell" &&
        invocation.procedure !== "sleepTargetAdmission" &&
        invocation.procedure !== "hideousLaughter" &&
        invocation.procedure !== "command" &&
        invocation.procedure !== "greaseGroundHazard" &&
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

    if (fill.kind === "commandOptionChoice") {
      if (invocation.procedure !== "command") {
        return {
          tag: "invalid",
          message: "Command option choice does not match this spell act.",
        };
      }
      if (fill.holeId !== commandOptionChoiceHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Command option choice must use the selected spell act command-option hole.",
        };
      }
      if (commandOptionChoice !== undefined) {
        return {
          tag: "invalid",
          message: "Command option choice was filled twice.",
        };
      }
      commandOptionChoice = fill.value;
      continue;
    }

    if (fill.kind === "conditionChoice") {
      if (
        invocation.procedure !== "saveGatedCondition" ||
        !saveGatedConditionHasConditionChoice(invocation)
      ) {
        return {
          tag: "invalid",
          message: "Spell condition choice does not match this spell act.",
        };
      }
      if (fill.holeId !== spellConditionChoiceHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Spell condition choice must use the selected spell act condition-choice hole.",
        };
      }
      if (!invocation.effect.choices.includes(fill.value)) {
        return {
          tag: "invalid",
          message: "Spell condition choice is not available for this spell.",
        };
      }
      if (conditionChoice !== undefined) {
        return {
          tag: "invalid",
          message: "Spell condition choice was filled twice.",
        };
      }
      conditionChoice = fill.value;
      continue;
    }

    if (fill.kind === "abilityChoice") {
      if (invocation.procedure === "rollModifier") {
        if (invocation.abilityChoices === null) {
          return {
            tag: "invalid",
            message: "Spell ability choice does not match this spell act.",
          };
        }
        if (fill.holeId !== spellRollModifierAbilityChoiceHoleId(invocation)) {
          return {
            tag: "invalid",
            message:
              "Spell ability choice must use the selected spell act ability-choice hole.",
          };
        }
        if (!invocation.abilityChoices.includes(fill.value)) {
          return {
            tag: "invalid",
            message: "Spell ability choice is not available for this spell.",
          };
        }
        if (abilityChoice !== undefined) {
          return {
            tag: "invalid",
            message: "Spell ability choice was filled twice.",
          };
        }
        abilityChoice = fill.value;
        continue;
      }
      if (
        invocation.procedure !== "markedDamageRider" ||
        invocation.action !== "cast" ||
        invocation.abilityCheckBehavior.kind !== "chosenAbilityDisadvantage"
      ) {
        return {
          tag: "invalid",
          message: "Spell ability choice does not match this spell act.",
        };
      }
      if (fill.holeId !== spellAbilityChoiceHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Spell ability choice must use the selected spell act ability-choice hole.",
        };
      }
      if (!invocation.abilityCheckBehavior.choices.includes(fill.value)) {
        return {
          tag: "invalid",
          message: "Spell ability choice is not available for this spell.",
        };
      }
      if (abilityChoice !== undefined) {
        return {
          tag: "invalid",
          message: "Spell ability choice was filled twice.",
        };
      }
      abilityChoice = fill.value;
      continue;
    }

    if (fill.kind === "thaumaturgyActiveOneMinuteEffectCount") {
      if (invocation.procedure !== "thaumaturgyBoomingVoice") {
        return {
          tag: "invalid",
          message:
            "Thaumaturgy active-effect count does not match this spell act.",
        };
      }
      if (fill.holeId !== THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID) {
        return {
          tag: "invalid",
          message:
            "Thaumaturgy active-effect count must use the selected spell act count hole.",
        };
      }
      if (thaumaturgyActiveOneMinuteEffectCount !== undefined) {
        return {
          tag: "invalid",
          message: "Thaumaturgy active-effect count was filled twice.",
        };
      }
      thaumaturgyActiveOneMinuteEffectCount = fill;
      continue;
    }

    if (fill.kind === "damageTypeChoice") {
      if (
        invocation.procedure !== "damageReduction" &&
        !(
          invocation.procedure === "spellAttackDamage" &&
          invocation.damage.kind === "sorcerousBurstDamageTypeChoice"
        ) &&
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
      if (invocation.procedure === "spellAttackSequence") {
        const partIndex = spellAttackSequencePartIndexForHole(
          invocation,
          fill.holeId,
          "damage",
        );
        if (partIndex !== null) {
          const attackSequencePartFill = attackSequencePartFills[partIndex];
          if (attackSequencePartFill === undefined) {
            return {
              tag: "invalid",
              message: "Spell attack sequence damage is outside this spell act.",
            };
          }
          if (attackSequencePartFill.damageRoll !== undefined) {
            return {
              tag: "invalid",
              message: "Spell attack sequence damage was filled twice.",
            };
          }
          attackSequencePartFills[partIndex] = { ...attackSequencePartFill, damageRoll: fill };
          continue;
        }
      }
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

    if (fill.kind === "movement") {
      if (
        invocation.procedure !== "saveGatedDamage" ||
        !invocation.failedSavePostDamageRiders.some(
          (rider) => rider.kind === "forcedReactionMovement",
        )
      ) {
        return {
          tag: "invalid",
          message: "Movement fill does not match this spell act.",
        };
      }
      if (movement !== undefined) {
        return {
          tag: "invalid",
          message: "Spell forced movement was filled twice.",
        };
      }
      movement = fill;
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
    reactionSpellTargetFacts,
    targetAllocation,
    targetList,
    attackSequencePartFills,
    attackRoll,
    savingThrowOutcomes,
    skillChoice,
    abilityChoice,
    thaumaturgyActiveOneMinuteEffectCount,
    commandOptionChoice,
    conditionChoice,
    areaChoice,
    teleportDestination,
    dancingLightsPlacement,
    damageTypeChoice,
    concentrationSavingThrows,
    hideousLaughterDamageRepeatSaves,
    damageDispositions,
    damageRoll,
    movement,
    spellDamageReductionRolls,
    attackBurstDamageRoll,
    healingRoll,
  };
}

export function spellFillSetContainsOnlySpellCastReactionFacts(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
  options: { readonly allowSavingThrowOutcomes?: boolean },
): boolean {
  return (
    fillSet.targetId === undefined &&
    fillSet.objectTarget === undefined &&
    fillSet.targetSpatialFacts.length === 0 &&
    fillSet.targetAllocation === undefined &&
    fillSet.targetList === undefined &&
    fillSet.attackSequencePartFills.every(
      (attackSequencePartFill) =>
        attackSequencePartFill.target === undefined &&
        attackSequencePartFill.attackRoll === undefined &&
        attackSequencePartFill.damageRoll === undefined,
    ) &&
    fillSet.attackRoll === undefined &&
    (options.allowSavingThrowOutcomes === true ||
      fillSet.savingThrowOutcomes === undefined) &&
    fillSet.skillChoice === undefined &&
    fillSet.abilityChoice === undefined &&
    fillSet.thaumaturgyActiveOneMinuteEffectCount === undefined &&
    fillSet.commandOptionChoice === undefined &&
    fillSet.conditionChoice === undefined &&
    fillSet.areaChoice === undefined &&
    fillSet.teleportDestination === undefined &&
    fillSet.dancingLightsPlacement === undefined &&
    fillSet.damageTypeChoice === undefined &&
    fillSet.concentrationSavingThrows.length === 0 &&
    fillSet.hideousLaughterDamageRepeatSaves.length === 0 &&
    fillSet.damageDispositions.length === 0 &&
    fillSet.damageRoll === undefined &&
    fillSet.movement === undefined &&
    fillSet.spellDamageReductionRolls.length === 0 &&
    fillSet.attackBurstDamageRoll === undefined &&
    fillSet.healingRoll === undefined
  );
}

export function parseSpellCastReactionFactsFill(
  fill: BattleFill,
):
  | { readonly tag: "notSpellCastReactionFactsFill" }
  | { readonly tag: "ok"; readonly facts: readonly SpellCastReactionFact[] }
  | { readonly tag: "invalid"; readonly message: string } {
  if (
    fill.kind !== "targetSpatialFacts" ||
    fill.holeId !== SPELL_CAST_REACTION_FACTS_HOLE_ID
  ) {
    return { tag: "notSpellCastReactionFactsFill" };
  }
  return fill.spatialFacts.every(isSpellCastReactionFact)
    ? { tag: "ok", facts: fill.spatialFacts }
    : {
        tag: "invalid",
        message:
          "Spell-cast Reaction trigger facts must describe Counterspell caster visibility.",
      };
}

function isSpellCastReactionFact(
  fact: BattleTargetSpatialFact,
): fact is SpellCastReactionFact {
  return fact.kind === "counterspellTriggerCasterVisibleWithinRange";
}

function attackSightFactValidation(
  facts: readonly BattleTargetSpatialFact[],
): Extract<SpellFillSet, { readonly tag: "invalid" }> | null {
  const message = validateUniqueAttackSightFacts(facts);
  return message === null ? null : { tag: "invalid", message };
}

export function spellFillSetSavingThrowTargeting(
  invocation: SupportedSpellInvocation,
): SpellTargeting {
  return invocation.procedure === "attackBurstSaveDamage"
    ? invocation.burst.targeting
    : invocation.procedure === "saveGatedDamage" ||
        invocation.procedure === "saveGatedCondition" ||
        invocation.procedure === "afterHitSaveGatedCondition" ||
        invocation.procedure === "saveGatedAttackRollAdvantage" ||
        invocation.procedure === "counterspell" ||
        invocation.procedure === "sleepTargetAdmission" ||
        invocation.procedure === "hideousLaughter" ||
        invocation.procedure === "command" ||
        invocation.procedure === "greaseGroundHazard"
      ? invocation.targeting
      : { kind: "singleCombatant" };
}

function spellAttackSequencePartIndexForHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  holeId: BattleHoleId,
  kind: "attackRoll" | "damage" | "object" | "target",
): number | null {
  for (
    let partIndex = 0;
    partIndex < invocation.targeting.attackCount;
    partIndex += 1
  ) {
    if (
      (kind === "target" &&
        spellAttackSequencePartTargetHoleId(invocation, partIndex) === holeId) ||
      (kind === "object" &&
        invocation.targeting.kind === "spellAttackSequenceCreatureOrObject" &&
        spellAttackSequencePartObjectTargetHoleId(invocation, partIndex) === holeId) ||
      (kind === "attackRoll" &&
        spellAttackSequencePartAttackRollHoleId(invocation, partIndex) === holeId) ||
      (kind === "damage" &&
        (spellAttackSequencePartDamageHoleId(invocation, partIndex, false) === holeId ||
          spellAttackSequencePartDamageHoleId(invocation, partIndex, true) === holeId))
    ) {
      return partIndex;
    }
  }
  return null;
}
