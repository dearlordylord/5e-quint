// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.remarkable-athlete
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-range-increase
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// Spell replay fill parser extracted from spells-resolve.ts.
// Owns classification and validation of supplied fills against spell replay holes.

// KERNEL-COVERAGE: runtime-owner BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES BATTLE.COMMAND.OPTION_AND_NEXT_TURN BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
import type { Condition, MovementFeet } from "@dnd/shared/types";
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
  type BattleMagicWeaponTargetItemFact,
  type BattleSpiritualWeaponForcePosition,
  type BattleObjectContactTargetSpatialFact,
  type BattleOngoingSpellTargetWithinRangeFact,
  type SelfTransformationModeKind,
  type BattleTargetSpatialFact,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { BattleObjectId, CombatantId } from "../identity.ts";
import {
  isSourceDamageRollPenaltyRollFill,
  isSpellDamageReductionRollFill,
} from "./damage-helpers.ts";
import { validateUniqueAttackSightFacts } from "./attack-fill-set.ts";
import { isHideousLaughterDamageRepeatSaveFill } from "./hideous-laughter-repeat-save.ts";
import {
  isMirrorImageDuplicateRollFill,
  mirrorImageDuplicateRollHoleId,
} from "./mirror-image-hit-interception.ts";
import {
  spellBurstDamageHole,
  rollModifierUsesTargetAbilityChoices,
  spellAttackSequencePartAttackRollHoleId,
  spellAttackSequencePartDamageHoleId,
  spellAttackSequencePartObjectTargetHoleId,
  spellAttackSequencePartTargetHoleId,
  commandOptionChoiceHoleId,
  spellDamageHole,
  spellDamageTypeChoiceHole,
  spellConditionChoices,
  spellInvocationHasConditionChoice,
  spellAreaChoiceHoleId,
  carefulSpellProtectedTargetsHoleId,
  spellConditionChoiceHoleId,
  heightenedSpellTargetChoiceHoleId,
  spellObjectTargetHoleId,
  spellAbilityChoiceHoleId,
  spellRollModifierAbilityChoiceHoleId,
  spellRollModifierSkillChoiceHoleId,
  spellRollModifierTargetAbilityChoicesHoleId,
  spellSavingThrowOutcomeHoleId,
  selfTransformationModeChoiceHoleId,
  spellTargetAllocationHoleId,
  spellTargetListHoleId,
} from "./spells-holes-fills.ts";
import {
  magicWeaponTargetItemHoleId,
  spellDancingLightsPlacementHoleId,
  spiritualWeaponForcePositionHole,
  spiritualWeaponForcePositionInvalidReason,
} from "./spells-targeting.ts";
import { levitateInitialRiseHole } from "./levitate-creature.ts";
import { effectiveD20TestNaturalOneRerollSavingThrowOutcomes } from "./d20-test-natural-one-reroll.ts";
import {
  REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_ID,
  REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_ID,
  THAUMATURGY_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID,
} from "./domain-constants.ts";

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
  readonly remarkableAthleteCriticalHitMovementDecision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  readonly remarkableAthleteCriticalHitMovement:
    | Extract<BattleFill, { readonly kind: "movement" }>
    | undefined;
  readonly mirrorImageDuplicateRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  readonly damageRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
};
type SpellObjectTargetFact = Extract<
  BattleTargetSpatialFact,
  {
    readonly kind:
      | "spellObjectLightTarget"
      | "spellDistantObjectLightTarget"
      | "spellTouchedObjectTarget"
      | "spellDistantTouchedObjectTarget"
      | "spellObjectIgnition"
      | "spellManufacturedMetalObjectTarget"
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
            readonly spatialFacts: readonly SpellObjectTargetFact[];
          }
        | undefined;
      readonly objectContactTargets:
        | {
            readonly holeId: BattleHoleId;
            readonly targetIds: readonly CombatantId[];
            readonly spatialFacts: readonly BattleObjectContactTargetSpatialFact[];
          }
        | undefined;
      readonly objectContactSavingThrowOutcome:
        | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
        | undefined;
      readonly objectDropResolution:
        | Extract<BattleFill, { readonly kind: "objectDropResolution" }>
        | undefined;
      readonly magicWeaponTargetItem:
        | {
            readonly holeId: BattleHoleId;
            readonly value: BattleMagicWeaponTargetItemFact;
          }
        | undefined;
      readonly ongoingSpellTarget:
        | {
            readonly holeId: BattleHoleId;
            readonly target: Extract<
              BattleFill,
              { readonly kind: "ongoingSpellTargetChoice" }
            >["value"];
            readonly spatialFacts: readonly BattleOngoingSpellTargetWithinRangeFact[];
          }
        | undefined;
      readonly ongoingSpellAbilityChecks: readonly Extract<
        BattleFill,
        { readonly kind: "abilityCheck" }
      >[];
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
      readonly remarkableAthleteCriticalHitMovementDecision:
        | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
        | undefined;
      readonly remarkableAthleteCriticalHitMovement:
        | Extract<BattleFill, { readonly kind: "movement" }>
        | undefined;
      readonly savingThrowOutcomes:
        | BattleSpellSavingThrowOutcomeValue
        | undefined;
      readonly skillChoice: Skill | undefined;
      readonly abilityChoice: Ability | undefined;
      readonly targetAbilityChoices:
        | Extract<BattleFill, { readonly kind: "targetAbilityChoices" }>
        | undefined;
      readonly thaumaturgyActiveOneMinuteEffectCount:
        | Extract<
            BattleFill,
            { readonly kind: "thaumaturgyActiveOneMinuteEffectCount" }
          >
        | undefined;
      readonly commandOptionChoice: BattleCommandOption | undefined;
      readonly selfTransformationModeChoice:
        | SelfTransformationModeKind
        | undefined;
      readonly conditionChoice: Condition | undefined;
      readonly levitateInitialRiseFeet: MovementFeet | undefined;
      readonly areaChoice: BattleSpellAreaIdentityChoice | undefined;
      readonly teleportDestination:
        | Extract<BattleFill, { readonly kind: "teleportDestination" }>
        | undefined;
      readonly spiritualWeaponForcePosition:
        | BattleSpiritualWeaponForcePosition
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
      readonly mirrorImageDuplicateRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
      readonly movement:
        | Extract<BattleFill, { readonly kind: "movement" }>
        | undefined;
      readonly spellDamageReductionRolls: readonly Extract<
        BattleFill,
        { readonly kind: "rolledDice" }
      >[];
      readonly sourceDamageRollPenaltyRolls: readonly Extract<
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
        readonly spatialFacts: readonly SpellObjectTargetFact[];
      }
    | undefined;
  let objectContactTargets:
    | {
        readonly holeId: BattleHoleId;
        readonly targetIds: readonly CombatantId[];
        readonly spatialFacts: readonly BattleObjectContactTargetSpatialFact[];
      }
    | undefined;
  let objectContactSavingThrowOutcome:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  let objectDropResolution:
    | Extract<BattleFill, { readonly kind: "objectDropResolution" }>
    | undefined;
  let magicWeaponTargetItem:
    | {
        readonly holeId: BattleHoleId;
        readonly value: BattleMagicWeaponTargetItemFact;
      }
    | undefined;
  let ongoingSpellTarget:
    | {
        readonly holeId: BattleHoleId;
        readonly target: Extract<
          BattleFill,
          { readonly kind: "ongoingSpellTargetChoice" }
        >["value"];
        readonly spatialFacts: readonly BattleOngoingSpellTargetWithinRangeFact[];
      }
    | undefined;
  const ongoingSpellAbilityChecks: Extract<
    BattleFill,
    { readonly kind: "abilityCheck" }
  >[] = [];
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
  let attackRoll: BattleAttackRollResult | undefined;
  const attackSequencePartFills: SpellAttackSequencePartFillSet[] =
    invocation.procedure === "spellAttackSequence"
      ? Array.from({ length: invocation.targeting.attackCount }, () => ({
          target: undefined,
          attackRoll: undefined,
          remarkableAthleteCriticalHitMovementDecision: undefined,
          remarkableAthleteCriticalHitMovement: undefined,
          mirrorImageDuplicateRoll: undefined,
          damageRoll: undefined,
        }))
      : [];
  let remarkableAthleteCriticalHitMovementDecision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  let remarkableAthleteCriticalHitMovement:
    | Extract<BattleFill, { readonly kind: "movement" }>
    | undefined;
  let savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue | undefined;
  let skillChoice: Skill | undefined;
  let abilityChoice: Ability | undefined;
  let targetAbilityChoices:
    | Extract<BattleFill, { readonly kind: "targetAbilityChoices" }>
    | undefined;
  let thaumaturgyActiveOneMinuteEffectCount:
    | Extract<
        BattleFill,
        { readonly kind: "thaumaturgyActiveOneMinuteEffectCount" }
      >
    | undefined;
  let commandOptionChoice: BattleCommandOption | undefined;
  let selfTransformationModeChoice: SelfTransformationModeKind | undefined;
  let conditionChoice: Condition | undefined;
  let levitateInitialRiseFeet: MovementFeet | undefined;
  let areaChoice: BattleSpellAreaIdentityChoice | undefined;
  let teleportDestination:
    | Extract<BattleFill, { readonly kind: "teleportDestination" }>
    | undefined;
  let spiritualWeaponForcePosition:
    | BattleSpiritualWeaponForcePosition
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
  let mirrorImageDuplicateRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  let movement: Extract<BattleFill, { readonly kind: "movement" }> | undefined;
  const spellDamageReductionRolls: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >[] = [];
  const sourceDamageRollPenaltyRolls: Extract<
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

    if (
      fill.kind === "unitFeatureDecision" &&
      fill.holeId === REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_ID
    ) {
      if (invocation.procedure === "spellAttackSequence") {
        const partIndex =
          latestAttackSequencePartIndexForRemarkableAthleteDecision(
            attackSequencePartFills,
          );
        if (partIndex === null) {
          return {
            tag: "invalid",
            message:
              "Remarkable Athlete movement decision must follow a spell attack sequence attack roll.",
          };
        }
        const attackSequencePartFill = attackSequencePartFills[partIndex];
        if (attackSequencePartFill === undefined) {
          return {
            tag: "invalid",
            message:
              "Remarkable Athlete movement decision is outside this spell act.",
          };
        }
        attackSequencePartFills[partIndex] = {
          ...attackSequencePartFill,
          remarkableAthleteCriticalHitMovementDecision: fill,
        };
        continue;
      }
      if (!spellInvocationCanUseRemarkableAthleteCriticalMovement(invocation)) {
        return {
          tag: "invalid",
          message:
            "Remarkable Athlete movement decision does not match this spell act.",
        };
      }
      if (remarkableAthleteCriticalHitMovementDecision !== undefined) {
        return {
          tag: "invalid",
          message: "Remarkable Athlete movement decision was filled twice.",
        };
      }
      remarkableAthleteCriticalHitMovementDecision = fill;
      continue;
    }

    if (
      fill.kind === "movement" &&
      fill.holeId === REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_ID
    ) {
      if (invocation.procedure === "spellAttackSequence") {
        const partIndex =
          latestAttackSequencePartIndexForRemarkableAthleteMovement(
            attackSequencePartFills,
          );
        if (partIndex === null) {
          return {
            tag: "invalid",
            message:
              "Remarkable Athlete movement must follow a spell attack sequence use decision.",
          };
        }
        const attackSequencePartFill = attackSequencePartFills[partIndex];
        if (attackSequencePartFill === undefined) {
          return {
            tag: "invalid",
            message: "Remarkable Athlete movement is outside this spell act.",
          };
        }
        attackSequencePartFills[partIndex] = {
          ...attackSequencePartFill,
          remarkableAthleteCriticalHitMovement: fill,
        };
        continue;
      }
      if (!spellInvocationCanUseRemarkableAthleteCriticalMovement(invocation)) {
        return {
          tag: "invalid",
          message: "Remarkable Athlete movement does not match this spell act.",
        };
      }
      if (remarkableAthleteCriticalHitMovement !== undefined) {
        return {
          tag: "invalid",
          message: "Remarkable Athlete movement was filled twice.",
        };
      }
      remarkableAthleteCriticalHitMovement = fill;
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

    if (fill.holeId === heightenedSpellTargetChoiceHoleId(invocation)) {
      if (fill.kind !== "targetChoice") {
        return {
          tag: "invalid",
          message:
            "Heightened Spell target must use the Heightened Spell target hole.",
        };
      }
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
              message:
                "Spell attack sequence object target is outside this spell act.",
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
          invocation.procedure !== "objectContactDamage" &&
          invocation.procedure !== "spellAttackDamage") ||
        (invocation.targeting.kind !== "singleCreatureOrObject" &&
          invocation.targeting.kind !== "singleManufacturedMetalObject" &&
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
            fact.kind === "spellDistantObjectLightTarget" ||
            fact.kind === "spellTouchedObjectTarget" ||
            fact.kind === "spellDistantTouchedObjectTarget" ||
            fact.kind === "spellObjectIgnition" ||
            fact.kind === "spellManufacturedMetalObjectTarget" ||
            fact.kind === "spellObjectTarget" ||
            fact.kind === "spellObjectTargetSight",
        ),
      };
      continue;
    }

    if (fill.kind === "ongoingSpellTargetChoice") {
      if (invocation.procedure !== "ongoingSpellEnd") {
        return {
          tag: "invalid",
          message: "Ongoing spell target fill does not match this spell act.",
        };
      }
      if (ongoingSpellTarget !== undefined) {
        return {
          tag: "invalid",
          message: "Ongoing spell target was filled twice.",
        };
      }
      ongoingSpellTarget = {
        holeId: fill.holeId,
        target: fill.value,
        spatialFacts: fill.spatialFacts,
      };
      continue;
    }

    if (fill.kind === "objectContactTargets") {
      if (
        invocation.procedure !== "objectContactDamage" &&
        invocation.procedure !== "objectContactDamageRepeat"
      ) {
        return {
          tag: "invalid",
          message: "Object-contact target fill does not match this spell act.",
        };
      }
      if (objectContactTargets !== undefined) {
        return {
          tag: "invalid",
          message: "Object-contact targets were filled twice.",
        };
      }
      objectContactTargets = {
        holeId: fill.holeId,
        targetIds: fill.value.targetIds,
        spatialFacts: fill.spatialFacts,
      };
      continue;
    }

    if (fill.kind === "objectDropResolution") {
      if (
        invocation.procedure !== "objectContactDamage" &&
        invocation.procedure !== "objectContactDamageRepeat"
      ) {
        return {
          tag: "invalid",
          message: "Object drop resolution does not match this spell act.",
        };
      }
      if (objectDropResolution !== undefined) {
        return {
          tag: "invalid",
          message: "Object drop resolution was filled twice.",
        };
      }
      objectDropResolution = fill;
      continue;
    }

    if (fill.kind === "magicWeaponTargetItem") {
      if (invocation.procedure !== "magicWeaponEnhancement") {
        return {
          tag: "invalid",
          message: "Magic Weapon item target does not match this spell act.",
        };
      }
      if (fill.holeId !== magicWeaponTargetItemHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Magic Weapon item target must use the selected spell act item-target hole.",
        };
      }
      if (magicWeaponTargetItem !== undefined) {
        return {
          tag: "invalid",
          message: "Magic Weapon item target was filled twice.",
        };
      }
      magicWeaponTargetItem = {
        holeId: fill.holeId,
        value: fill.value,
      };
      continue;
    }

    if (fill.kind === "spellAreaChoice") {
      if (
        invocation.procedure !== "fogCloudObscurement" &&
        invocation.procedure !== "magicalDarknessPointOrigin" &&
        invocation.procedure !== "antimagicFieldOngoingSpellSuppression" &&
        invocation.procedure !== "flamingSphere" &&
        invocation.procedure !== "spikeGrowthMovementHazard" &&
        invocation.procedure !== "moonbeam" &&
        invocation.procedure !== "webRestraintHazard"
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
      if (fill.holeId === carefulSpellProtectedTargetsHoleId(invocation)) {
        continue;
      }
      if (!isTargetListSpellInvocation(invocation)) {
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
        (invocation.procedure === "abilityD20TestRollModeSaveGate" &&
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
            message:
              "Spell attack sequence attack roll is outside this spell act.",
          };
        }
        if (attackSequencePartFill.attackRoll !== undefined) {
          return {
            tag: "invalid",
            message: "Spell attack sequence attack roll was filled twice.",
          };
        }
        attackSequencePartFills[partIndex] = {
          ...attackSequencePartFill,
          attackRoll: fill.value,
        };
        continue;
      }
    }

    if (fill.kind === "savingThrowOutcome") {
      const effectiveSavingThrowOutcomeFill = {
        ...fill,
        value: effectiveD20TestNaturalOneRerollSavingThrowOutcomes(fill.value),
      };
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
        hideousLaughterDamageRepeatSaves.push(effectiveSavingThrowOutcomeFill);
        continue;
      }
      if (
        invocation.procedure === "objectContactDamage" ||
        invocation.procedure === "objectContactDamageRepeat"
      ) {
        if (objectContactSavingThrowOutcome !== undefined) {
          return {
            tag: "invalid",
            message: "Object-contact saving throw outcome was filled twice.",
          };
        }
        objectContactSavingThrowOutcome = effectiveSavingThrowOutcomeFill;
        continue;
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
      savingThrowOutcomes = effectiveSavingThrowOutcomeFill.value;
      continue;
    }

    if (fill.kind === "skillChoice") {
      if (!isRollModifierInvocation(invocation)) {
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

    if (fill.kind === "selfTransformationModeChoice") {
      if (invocation.procedure !== "selfTransformationMode") {
        return {
          tag: "invalid",
          message: "Self-transformation mode choice does not match this spell.",
        };
      }
      if (fill.holeId !== selfTransformationModeChoiceHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Self-transformation mode choice must use the selected spell act mode-choice hole.",
        };
      }
      if (!invocation.modeChoices.includes(fill.value)) {
        return {
          tag: "invalid",
          message: "Self-transformation mode choice is not available.",
        };
      }
      if (selfTransformationModeChoice !== undefined) {
        return {
          tag: "invalid",
          message: "Self-transformation mode was filled twice.",
        };
      }
      selfTransformationModeChoice = fill.value;
      continue;
    }

    if (fill.kind === "conditionChoice") {
      if (!spellInvocationHasConditionChoice(invocation)) {
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
      if (!spellConditionChoices(invocation).includes(fill.value)) {
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

    if (fill.kind === "levitateInitialRise") {
      if (
        invocation.procedure !== "levitatedCreature" ||
        targetId === undefined
      ) {
        return {
          tag: "invalid",
          message:
            "Levitate initial rise must follow the selected Levitate creature target.",
        };
      }
      const hole = levitateInitialRiseHole({
        actorId: invocation.activeEffect.sourceCombatantId,
        targetId,
        maxDistanceFeet: invocation.maxInitialRiseFeet,
      });
      if (fill.holeId !== hole.holeId) {
        return {
          tag: "invalid",
          message:
            "Levitate initial rise must use the selected spell act initial-rise hole.",
        };
      }
      if (
        fill.value.distanceFeet < 0 ||
        fill.value.distanceFeet > invocation.maxInitialRiseFeet ||
        !Number.isInteger(fill.value.distanceFeet)
      ) {
        return {
          tag: "invalid",
          message:
            "Levitate initial rise must be a whole number no greater than the spell limit.",
        };
      }
      if (levitateInitialRiseFeet !== undefined) {
        return {
          tag: "invalid",
          message: "Levitate initial rise was filled twice.",
        };
      }
      levitateInitialRiseFeet = fill.value.distanceFeet;
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
        if (rollModifierUsesTargetAbilityChoices(invocation)) {
          return {
            tag: "invalid",
            message:
              "Per-target roll modifier spells require target ability choices.",
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

    if (fill.kind === "targetAbilityChoices") {
      if (
        fill.holeId !== spellRollModifierTargetAbilityChoicesHoleId(invocation)
      ) {
        return {
          tag: "invalid",
          message:
            "Spell target ability choices must use the selected spell act target-ability-choices hole.",
        };
      }
      if (targetAbilityChoices !== undefined) {
        return {
          tag: "invalid",
          message: "Spell target ability choices were filled twice.",
        };
      }
      if (!isTargetAbilityChoicesRollModifierInvocation(invocation)) {
        return {
          tag: "invalid",
          message: "Spell target ability choices do not match this spell act.",
        };
      }
      const seenTargets = new Set<CombatantId>();
      for (const choice of fill.value.choices) {
        if (!invocation.abilityChoices.includes(choice.ability)) {
          return {
            tag: "invalid",
            message:
              "Spell target ability choice is not available for this spell.",
          };
        }
        if (seenTargets.has(choice.targetId)) {
          return {
            tag: "invalid",
            message: "Spell target ability choice includes a target twice.",
          };
        }
        seenTargets.add(choice.targetId);
      }
      targetAbilityChoices = fill;
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
        invocation.procedure !== "chosenDamageResistance" &&
        invocation.procedure !== "dragonsBreathInitial" &&
        !(
          invocation.procedure === "spellAttackDamage" &&
          invocation.damage.kind === "sorcerousBurstDamageTypeChoice"
        ) &&
        invocation.procedure !== "selfTransformationMode" &&
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

    if (fill.kind === "spiritualWeaponForcePosition") {
      if (
        invocation.procedure !== "spiritualWeaponAttackProxy" &&
        invocation.procedure !== "spiritualWeaponRepeatAttack"
      ) {
        return {
          tag: "invalid",
          message:
            "Spiritual Weapon force position does not match this spell act.",
        };
      }
      if (fill.holeId !== spiritualWeaponForcePositionHole(invocation).holeId) {
        return {
          tag: "invalid",
          message:
            "Spiritual Weapon force position must use the selected spell act position hole.",
        };
      }
      const spiritualWeaponForcePositionError =
        spiritualWeaponForcePositionInvalidReason(fill.value, invocation);
      if (spiritualWeaponForcePositionError !== null) {
        return {
          tag: "invalid",
          message: spiritualWeaponForcePositionError,
        };
      }
      if (spiritualWeaponForcePosition !== undefined) {
        return {
          tag: "invalid",
          message: "Spiritual Weapon force position was filled twice.",
        };
      }
      spiritualWeaponForcePosition = fill.value;
      continue;
    }

    if (fill.kind === "rolledDice") {
      if (isMirrorImageDuplicateRollFill(fill)) {
        if (
          invocation.procedure !== "spellAttackSequence" &&
          invocation.procedure !== "spellAttackDamage" &&
          invocation.procedure !== "heldLightHurl" &&
          invocation.procedure !== "attackBurstSaveDamage"
        ) {
          return {
            tag: "invalid",
            message:
              "Mirror Image duplicate roll does not match this spell act.",
          };
        }
        if (invocation.procedure === "spellAttackSequence") {
          const partIndex = spellAttackSequencePartIndexForMirrorImageRoll(
            invocation,
            fill.holeId,
          );
          if (partIndex === null) {
            return {
              tag: "invalid",
              message:
                "Mirror Image duplicate roll does not match this spell attack sequence.",
            };
          }
          const attackSequencePartFill = attackSequencePartFills[partIndex];
          if (attackSequencePartFill === undefined) {
            return {
              tag: "invalid",
              message: "Mirror Image duplicate roll is outside this spell act.",
            };
          }
          if (attackSequencePartFill.mirrorImageDuplicateRoll !== undefined) {
            return {
              tag: "invalid",
              message:
                "Spell attack sequence Mirror Image duplicate roll was filled twice.",
            };
          }
          attackSequencePartFills[partIndex] = {
            ...attackSequencePartFill,
            mirrorImageDuplicateRoll: fill,
          };
          continue;
        }
        if (mirrorImageDuplicateRoll !== undefined) {
          return {
            tag: "invalid",
            message: "Mirror Image duplicate roll was filled twice.",
          };
        }
        mirrorImageDuplicateRoll = fill;
        continue;
      }
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
              message:
                "Spell attack sequence damage is outside this spell act.",
            };
          }
          if (attackSequencePartFill.damageRoll !== undefined) {
            return {
              tag: "invalid",
              message: "Spell attack sequence damage was filled twice.",
            };
          }
          attackSequencePartFills[partIndex] = {
            ...attackSequencePartFill,
            damageRoll: fill,
          };
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
      if (isSourceDamageRollPenaltyRollFill(fill)) {
        if (
          sourceDamageRollPenaltyRolls.some(
            (candidate) => candidate.holeId === fill.holeId,
          )
        ) {
          return {
            tag: "invalid",
            message: "Source damage roll penalty was filled twice.",
          };
        }
        sourceDamageRollPenaltyRolls.push(fill);
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

    if (
      fill.kind === "abilityCheck" &&
      invocation.procedure === "ongoingSpellEnd"
    ) {
      if (
        ongoingSpellAbilityChecks.some(
          (candidate) => candidate.holeId === fill.holeId,
        )
      ) {
        return {
          tag: "invalid",
          message: "Ongoing spell ending ability check was filled twice.",
        };
      }
      ongoingSpellAbilityChecks.push(fill);
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
    objectContactTargets,
    objectContactSavingThrowOutcome,
    objectDropResolution,
    magicWeaponTargetItem,
    ongoingSpellTarget,
    ongoingSpellAbilityChecks,
    targetSpatialFacts,
    reactionSpellTargetFacts,
    targetAllocation,
    targetList,
    attackSequencePartFills,
    attackRoll,
    remarkableAthleteCriticalHitMovementDecision,
    remarkableAthleteCriticalHitMovement,
    savingThrowOutcomes,
    skillChoice,
    abilityChoice,
    targetAbilityChoices,
    thaumaturgyActiveOneMinuteEffectCount,
    commandOptionChoice,
    selfTransformationModeChoice,
    conditionChoice,
    levitateInitialRiseFeet,
    areaChoice,
    teleportDestination,
    spiritualWeaponForcePosition,
    dancingLightsPlacement,
    damageTypeChoice,
    concentrationSavingThrows,
    hideousLaughterDamageRepeatSaves,
    damageDispositions,
    damageRoll,
    mirrorImageDuplicateRoll,
    movement,
    spellDamageReductionRolls,
    sourceDamageRollPenaltyRolls,
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
    fillSet.objectContactTargets === undefined &&
    fillSet.objectContactSavingThrowOutcome === undefined &&
    fillSet.objectDropResolution === undefined &&
    fillSet.magicWeaponTargetItem === undefined &&
    fillSet.ongoingSpellTarget === undefined &&
    fillSet.ongoingSpellAbilityChecks.length === 0 &&
    fillSet.spiritualWeaponForcePosition === undefined &&
    fillSet.targetSpatialFacts.length === 0 &&
    fillSet.targetAllocation === undefined &&
    fillSet.targetList === undefined &&
    fillSet.attackSequencePartFills.every(
      (attackSequencePartFill) =>
        attackSequencePartFill.target === undefined &&
        attackSequencePartFill.attackRoll === undefined &&
        attackSequencePartFill
          .remarkableAthleteCriticalHitMovementDecision === undefined &&
        attackSequencePartFill.remarkableAthleteCriticalHitMovement ===
          undefined &&
        attackSequencePartFill.mirrorImageDuplicateRoll === undefined &&
        attackSequencePartFill.damageRoll === undefined,
    ) &&
    fillSet.attackRoll === undefined &&
    fillSet.remarkableAthleteCriticalHitMovementDecision === undefined &&
    fillSet.remarkableAthleteCriticalHitMovement === undefined &&
    (options.allowSavingThrowOutcomes === true ||
      fillSet.savingThrowOutcomes === undefined) &&
    fillSet.skillChoice === undefined &&
    fillSet.abilityChoice === undefined &&
    fillSet.targetAbilityChoices === undefined &&
    fillSet.thaumaturgyActiveOneMinuteEffectCount === undefined &&
    fillSet.commandOptionChoice === undefined &&
    fillSet.selfTransformationModeChoice === undefined &&
    fillSet.conditionChoice === undefined &&
    fillSet.levitateInitialRiseFeet === undefined &&
    fillSet.areaChoice === undefined &&
    fillSet.teleportDestination === undefined &&
    fillSet.dancingLightsPlacement === undefined &&
    fillSet.damageTypeChoice === undefined &&
    fillSet.concentrationSavingThrows.length === 0 &&
    fillSet.hideousLaughterDamageRepeatSaves.length === 0 &&
    fillSet.damageDispositions.length === 0 &&
    fillSet.damageRoll === undefined &&
    fillSet.mirrorImageDuplicateRoll === undefined &&
    fillSet.movement === undefined &&
    fillSet.spellDamageReductionRolls.length === 0 &&
    fillSet.sourceDamageRollPenaltyRolls.length === 0 &&
    fillSet.attackBurstDamageRoll === undefined &&
    fillSet.healingRoll === undefined
  );
}

function spellAttackSequencePartIndexForMirrorImageRoll(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  holeId: BattleHoleId,
): number | null {
  for (
    let partIndex = 0;
    partIndex < invocation.targeting.attackCount;
    partIndex += 1
  ) {
    if (
      mirrorImageDuplicateRollHoleId(
        spellAttackSequencePartAttackRollHoleId(invocation, partIndex),
      ) === holeId
    ) {
      return partIndex;
    }
  }
  return null;
}

function latestAttackSequencePartIndexForRemarkableAthleteDecision(
  partFills: readonly SpellAttackSequencePartFillSet[],
): number | null {
  for (let index = partFills.length - 1; index >= 0; index -= 1) {
    const partFill = partFills[index];
    if (
      partFill !== undefined &&
      partFill.attackRoll !== undefined &&
      partFill.remarkableAthleteCriticalHitMovementDecision === undefined
    ) {
      return index;
    }
  }
  return null;
}

function latestAttackSequencePartIndexForRemarkableAthleteMovement(
  partFills: readonly SpellAttackSequencePartFillSet[],
): number | null {
  for (let index = partFills.length - 1; index >= 0; index -= 1) {
    const partFill = partFills[index];
    if (
      partFill !== undefined &&
      partFill.remarkableAthleteCriticalHitMovementDecision !== undefined &&
      partFill.remarkableAthleteCriticalHitMovement === undefined
    ) {
      return index;
    }
  }
  return null;
}

function spellInvocationCanUseRemarkableAthleteCriticalMovement(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    invocation.procedure === "spellAttackDamage" ||
    invocation.procedure === "heldLightHurl" ||
    invocation.procedure === "spellCreatedHeldObjectAttack" ||
    invocation.procedure === "spiritualWeaponAttackProxy" ||
    invocation.procedure === "spiritualWeaponRepeatAttack" ||
    invocation.procedure === "attackBurstSaveDamage"
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
        invocation.procedure === "saveGatedConditionImmunity" ||
        invocation.procedure === "afterHitSaveGatedCondition" ||
        invocation.procedure === "saveGatedAttackRollAdvantage" ||
        invocation.procedure === "abilityD20TestRollModeSaveGate" ||
        invocation.procedure === "counterspell" ||
        invocation.procedure === "sleepTargetAdmission" ||
        invocation.procedure === "hideousLaughter" ||
        invocation.procedure === "hypnoticPattern" ||
        invocation.procedure === "command" ||
        invocation.procedure === "creatureSizeIncrease" ||
        invocation.procedure === "creatureSizeDecrease" ||
        invocation.procedure === "levitatedCreature" ||
        invocation.procedure === "greaseGroundHazard" ||
        invocation.procedure === "gustOfWindLine"
      ? invocation.targeting
      : { kind: "singleCombatant" };
}

function isTargetAbilityChoicesRollModifierInvocation(
  invocation: SupportedSpellInvocation,
): invocation is Extract<
  SupportedSpellInvocation,
  { readonly procedure: "rollModifier" }
> & { readonly abilityChoices: readonly Ability[] } {
  return invocation.procedure === "rollModifier"
    ? invocation.abilityChoices !== null &&
        rollModifierUsesTargetAbilityChoices(invocation)
      : false;
}

function isRollModifierInvocation(
  invocation: SupportedSpellInvocation,
): invocation is Extract<
  SupportedSpellInvocation,
  { readonly procedure: "rollModifier" }
> {
  return invocation.procedure === "rollModifier";
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
        spellAttackSequencePartTargetHoleId(invocation, partIndex) ===
          holeId) ||
      (kind === "object" &&
        invocation.targeting.kind === "spellAttackSequenceCreatureOrObject" &&
        spellAttackSequencePartObjectTargetHoleId(invocation, partIndex) ===
          holeId) ||
      (kind === "attackRoll" &&
        spellAttackSequencePartAttackRollHoleId(invocation, partIndex) ===
          holeId) ||
      (kind === "damage" &&
        (spellAttackSequencePartDamageHoleId(invocation, partIndex, false) ===
          holeId ||
          spellAttackSequencePartDamageHoleId(invocation, partIndex, true) ===
            holeId))
    ) {
      return partIndex;
    }
  }
  return null;
}
