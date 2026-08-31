// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.remarkable-athlete
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-range-increase
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// Spell replay fill parser extracted from spells-resolve.ts.
// Owns classification and validation of supplied fills against spell replay holes.

// KERNEL-COVERAGE: runtime-owner BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES BATTLE.COMMAND.OPTION_AND_NEXT_TURN BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
import type { Condition, MovementFeet } from "@dnd/shared/types";
import type { Ability, Skill } from "@dnd/surface/surface/types";
import {
  type BattleAttackRollResult,
  type BattleAttackRollRelationshipFact,
  type BattleCompelledBehaviorOption,
  type BattleFill,
  type BattleHoleId,
  type BattleSpellAreaIdentityChoice,
  type BattleSpellSavingThrowOutcomeValue,
  type BattleSpellTargetAllocation,
  type BattleSpellTargetAllocationSpatialFact,
  type BattleSpellTargetListSpatialFact,
  type BattleSpellTargetListRelationshipFact,
  type BattleSpellCastReactionFact,
  type BattleWeaponEnhancementTargetItemFact,
  type BattleSavingThrowRelationshipFact,
  type BattleSpatialMeleeSpellAttackProxyPosition,
  type BattleObjectContactTargetSpatialFact,
  type BattleOngoingSpellTargetWithinRangeFact,
  type BattleTargetSpatialFact,
  type BattleState,
} from "../battle-state-execution.ts";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_TARGET_HOLE_ID,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
} from "./battle-runtime-protocol.ts";
import {
  isScalarBuffTargetListInvocation,
  isTargetListSpellInvocation,
} from "./spells-invocation-guards.ts";
import { type SelfTransformationModeKind } from "./domain-constants.ts";
import type { RuntimeSpellProcedureExecution } from "../character-execution.ts";
import type {
  BattleObjectId,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import {
  parseAttackTargetChoiceFill,
  parseSavingThrowRelationshipFacts,
  parseSpellTargetListRelationshipFacts,
} from "./roll-trigger-relationship-facts.ts";
import {
  isSourceDamageRollPenaltyRollFill,
  isSpellDamageReductionRollFill,
} from "./damage-helpers.ts";
import { validateUniqueAttackSightFacts } from "./attack-fill-set.ts";
import { isSaveGatedConditionWithRepeatDamageRepeatSaveFill } from "./staged-condition-repeat-save.ts";

import { DamageRelationshipDecisionsByHole } from "./damage-relationship-decisions.ts";
import {
  isDuplicateHitInterceptionDuplicateRollFill,
  duplicateHitInterceptionRollHoleId,
} from "./duplicate-hit-interception.ts";
import {
  spellBurstDamageHole,
  rollModifierUsesTargetAbilityChoices,
  spellAttackSequencePartAttackRollHoleId,
  spellAttackSequencePartDamageHoleId,
  spellAttackSequencePartObjectTargetHoleId,
  spellAttackSequencePartTargetHoleId,
  compelledBehaviorOptionChoiceHoleId,
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
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./attack-roll.ts";
import {
  weaponAttackDamageEnhancementTargetItemHoleId,
  spellMovableLightPlacementHoleId,
  spatialMeleeSpellAttackProxyPositionHole,
  spatialMeleeSpellAttackProxyPositionInvalidReason,
  spellTargetRequiresAttackRollRelationshipFact,
} from "./spells-targeting.ts";
import { controlledVerticalSuspensionInitialRiseHole } from "./controlled-vertical-suspension.ts";
import { effectiveD20TestNaturalOneRerollSavingThrowOutcomes } from "./d20-test-natural-one-reroll.ts";
import {
  REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_ID,
  REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_ID,
  MINOR_WONDER_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID,
} from "./domain-constants.ts";

type RuntimeSpellProcedure = RuntimeSpellProcedureExecution;

const DUPLICATE_HIT_INTERCEPTION_ROLL_PROCEDURES = [
  "spellAttackSequence",
  "spellAttackDamage",
  "heldLightHurl",
  "attackBurstSaveDamage",
  "spatialMeleeSpellAttackProxy",
] as const satisfies readonly RuntimeSpellProcedure["procedure"][];
const DUPLICATE_HIT_INTERCEPTION_ROLL_PROCEDURE_SET: ReadonlySet<
  RuntimeSpellProcedure["procedure"]
> = new Set(DUPLICATE_HIT_INTERCEPTION_ROLL_PROCEDURES);

export type SpellAttackSequencePartTargetFill =
  | {
      readonly kind: "combatant";
      readonly targetId: CombatantId;
      readonly spatialFacts: readonly BattleTargetSpatialFact[];
      readonly relationshipFacts: readonly BattleAttackRollRelationshipFact[];
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
  readonly duplicateHitInterceptionRoll:
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
      readonly weaponAttackDamageEnhancementTargetItem:
        | {
            readonly holeId: BattleHoleId;
            readonly value: BattleWeaponEnhancementTargetItemFact;
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
      readonly damageRelationshipDecisions: DamageRelationshipDecisionsByHole;
      readonly targetRelationshipFacts: readonly BattleAttackRollRelationshipFact[];
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
            readonly relationshipFacts: readonly BattleSpellTargetListRelationshipFact[];
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
      readonly savingThrowRelationshipFacts: readonly BattleSavingThrowRelationshipFact[];
      readonly skillChoice: Skill | undefined;
      readonly abilityChoice: Ability | undefined;
      readonly targetAbilityChoices:
        | Extract<BattleFill, { readonly kind: "targetAbilityChoices" }>
        | undefined;
      readonly temporaryAbilityCheckRollModeActiveEffectCount:
        | Extract<
            BattleFill,
            { readonly kind: "temporaryAbilityCheckRollModeActiveEffectCount" }
          >
        | undefined;
      readonly compelledBehaviorOptionChoice:
        | BattleCompelledBehaviorOption
        | undefined;
      readonly selfTransformationModeChoice:
        | SelfTransformationModeKind
        | undefined;
      readonly conditionChoice: Condition | undefined;
      readonly controlledVerticalSuspensionInitialRiseFeet:
        | MovementFeet
        | undefined;
      readonly areaChoice: BattleSpellAreaIdentityChoice | undefined;
      readonly teleportDestination:
        | Extract<BattleFill, { readonly kind: "teleportDestination" }>
        | undefined;
      readonly spatialMeleeSpellAttackProxyPosition:
        | BattleSpatialMeleeSpellAttackProxyPosition
        | undefined;
      readonly movableLightPlacement:
        | Extract<BattleFill, { readonly kind: "movableLightPlacement" }>
        | undefined;
      readonly damageTypeChoice:
        | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
        | undefined;
      readonly concentrationSavingThrows: readonly Extract<
        BattleFill,
        { readonly kind: "concentrationSavingThrow" }
      >[];
      readonly saveGatedConditionWithRepeatDamageRepeatSaves: readonly Extract<
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
      readonly duplicateHitInterceptionRoll:
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
  invocation: RuntimeSpellProcedure,
  sourceProcedureRef: BattleProcedureExecutionRef,
  actorId: CombatantId,
  state: BattleState,
): SpellFillSet {
  const attackRelationshipDecisionRequired =
    ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      actorId,
      "attackRollAgainstEnemy",
    );
  const savingThrowRelationshipDecisionRequired =
    ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      actorId,
      "enemySavingThrow",
    );
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
  let weaponAttackDamageEnhancementTargetItem:
    | {
        readonly holeId: BattleHoleId;
        readonly value: BattleWeaponEnhancementTargetItemFact;
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
  let targetRelationshipFacts: readonly BattleAttackRollRelationshipFact[] = [];
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
        readonly relationshipFacts: readonly BattleSpellTargetListRelationshipFact[];
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
          duplicateHitInterceptionRoll: undefined,
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
  let savingThrowRelationshipFacts: readonly BattleSavingThrowRelationshipFact[] =
    [];
  let skillChoice: Skill | undefined;
  let abilityChoice: Ability | undefined;
  let targetAbilityChoices:
    | Extract<BattleFill, { readonly kind: "targetAbilityChoices" }>
    | undefined;
  let temporaryAbilityCheckRollModeActiveEffectCount:
    | Extract<
        BattleFill,
        { readonly kind: "temporaryAbilityCheckRollModeActiveEffectCount" }
      >
    | undefined;
  let compelledBehaviorOptionChoice: BattleCompelledBehaviorOption | undefined;
  let selfTransformationModeChoice: SelfTransformationModeKind | undefined;
  let conditionChoice: Condition | undefined;
  let controlledVerticalSuspensionInitialRiseFeet: MovementFeet | undefined;
  let areaChoice: BattleSpellAreaIdentityChoice | undefined;
  let teleportDestination:
    | Extract<BattleFill, { readonly kind: "teleportDestination" }>
    | undefined;
  let spatialMeleeSpellAttackProxyPosition:
    | BattleSpatialMeleeSpellAttackProxyPosition
    | undefined;
  let movableLightPlacement:
    | Extract<BattleFill, { readonly kind: "movableLightPlacement" }>
    | undefined;
  let damageTypeChoice:
    | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
    | undefined;
  const concentrationSavingThrows: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[] = [];
  const saveGatedConditionWithRepeatDamageRepeatSaves: Extract<
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
  let duplicateHitInterceptionRoll:
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
    if (fill.kind === "damageRelationshipDecisions") {
      continue;
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fill.kind === "attackRoll" && fill.relationshipFacts !== undefined) {
      /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
      return {
        tag: "invalid",
        message:
          "Spell attack roll relationship facts do not match a requested spell attack-roll decision.",
      };
    }
    /* v8 ignore stop -- @preserve */
    if (fill.kind === "turnConstraintSomaticSpellFailureOutcome") {
      continue;
    }

    if (fill.kind === "targetingSaveInterdictionOutcome") {
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
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (partIndex === null) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message:
              "Remarkable Athlete movement decision must follow a spell attack sequence attack roll.",
          };
        }
        /* v8 ignore stop -- @preserve */
        const attackSequencePartFill = attackSequencePartFills[partIndex];
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (attackSequencePartFill === undefined) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message:
              "Remarkable Athlete movement decision is outside this spell act.",
          };
        }
        /* v8 ignore stop -- @preserve */
        attackSequencePartFills[partIndex] = {
          ...attackSequencePartFill,
          remarkableAthleteCriticalHitMovementDecision: fill,
        };
        continue;
      }
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!spellInvocationCanUseRemarkableAthleteCriticalMovement(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Remarkable Athlete movement decision does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (remarkableAthleteCriticalHitMovementDecision !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Remarkable Athlete movement decision was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
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
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (partIndex === null) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message:
              "Remarkable Athlete movement must follow a spell attack sequence use decision.",
          };
        }
        /* v8 ignore stop -- @preserve */
        const attackSequencePartFill = attackSequencePartFills[partIndex];
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (attackSequencePartFill === undefined) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Remarkable Athlete movement is outside this spell act.",
          };
        }
        /* v8 ignore stop -- @preserve */
        attackSequencePartFills[partIndex] = {
          ...attackSequencePartFill,
          remarkableAthleteCriticalHitMovement: fill,
        };
        continue;
      }
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!spellInvocationCanUseRemarkableAthleteCriticalMovement(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Remarkable Athlete movement does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (remarkableAthleteCriticalHitMovement !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Remarkable Athlete movement was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      remarkableAthleteCriticalHitMovement = fill;
      continue;
    }

    if (fill.kind === "targetChoice" && fill.holeId === ATTACK_TARGET_HOLE_ID) {
      const requiresAttackRelationship =
        spellTargetRequiresAttackRollRelationshipFact(invocation);
      const parsed = requiresAttackRelationship
        ? parseAttackTargetChoiceFill(
            fill,
            actorId,
            attackRelationshipDecisionRequired,
          )
        : null;
      if (parsed?.tag === "invalid") return parsed;
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!requiresAttackRelationship && fill.relationshipFacts !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Non-attack spell target does not accept attack-roll relationship facts.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (targetId !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return { tag: "invalid", message: "Spell target was filled twice." };
      }
      /* v8 ignore stop -- @preserve */
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      targetRelationshipFacts = parsed?.fill.relationshipFacts ?? [];
      const sightFactValidation = attackSightFactValidation(targetSpatialFacts);
      if (sightFactValidation !== null) return sightFactValidation;
      continue;
    }

    if (fill.holeId === heightenedSpellTargetChoiceHoleId(sourceProcedureRef)) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.kind !== "targetChoice") {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Heightened Spell target must use the Heightened Spell target hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      continue;
    }

    if (
      fill.kind === "targetSpatialFacts" &&
      fill.holeId === SPELL_CAST_REACTION_FACTS_HOLE_ID
    ) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (reactionSpellTargetFactsFilled) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell-cast Reaction trigger facts were filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      const reactionFactValidation = parseSpellCastReactionFactsFill(fill);
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (reactionFactValidation.tag === "invalid") {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return { tag: "invalid", message: reactionFactValidation.message };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (reactionFactValidation.tag === "notSpellCastReactionFactsFill") {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Spell-cast Reaction trigger facts must use the spell-cast Reaction facts hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
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
        const parsed = parseAttackTargetChoiceFill(
          fill,
          actorId,
          attackRelationshipDecisionRequired,
        );
        if (parsed.tag === "invalid") return parsed;
        const attackSequencePartFill = attackSequencePartFills[partIndex];
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (attackSequencePartFill === undefined) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Spell attack sequence target is outside this spell act.",
          };
        }
        /* v8 ignore stop -- @preserve */
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (attackSequencePartFill.target !== undefined) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Spell attack sequence target was filled twice.",
          };
        }
        /* v8 ignore stop -- @preserve */
        const spatialFacts = fill.spatialFacts ?? [];
        const sightFactValidation = attackSightFactValidation(spatialFacts);
        if (sightFactValidation !== null) return sightFactValidation;
        attackSequencePartFills[partIndex] = {
          ...attackSequencePartFill,
          target: {
            kind: "combatant",
            targetId: fill.value,
            spatialFacts,
            relationshipFacts: parsed.fill.relationshipFacts ?? [],
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
          /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
          if (attackSequencePartFill === undefined) {
            /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
            return {
              tag: "invalid",
              message:
                "Spell attack sequence object target is outside this spell act.",
            };
          }
          /* v8 ignore stop -- @preserve */
          /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
          if (attackSequencePartFill.target !== undefined) {
            /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
            return {
              tag: "invalid",
              message: "Spell attack sequence target was filled twice.",
            };
          }
          /* v8 ignore stop -- @preserve */
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
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        (invocation.procedure !== "heldLightHurl" &&
          invocation.procedure !== "objectLight" &&
          invocation.procedure !== "objectContactDamage" &&
          invocation.procedure !== "spellAttackDamage") ||
        (invocation.targeting.kind !== "singleCreatureOrObject" &&
          invocation.targeting.kind !== "singleManufacturedMetalObject" &&
          invocation.targeting.kind !== "singleObject")
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Object target fill does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.holeId !== spellObjectTargetHoleId(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Object target fill must use the selected spell act object-target hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (objectTarget !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell object target was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
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
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (invocation.procedure !== "ongoingSpellEnd") {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Ongoing spell target fill does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (ongoingSpellTarget !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Ongoing spell target was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      ongoingSpellTarget = {
        holeId: fill.holeId,
        target: fill.value,
        spatialFacts: fill.spatialFacts,
      };
      continue;
    }

    if (fill.kind === "objectContactTargets") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        invocation.procedure !== "objectContactDamage" &&
        invocation.procedure !== "objectContactDamageRepeat"
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Object-contact target fill does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (objectContactTargets !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Object-contact targets were filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      objectContactTargets = {
        holeId: fill.holeId,
        targetIds: fill.value.targetIds,
        spatialFacts: fill.spatialFacts,
      };
      continue;
    }

    if (fill.kind === "objectDropResolution") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        invocation.procedure !== "objectContactDamage" &&
        invocation.procedure !== "objectContactDamageRepeat"
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Object drop resolution does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (objectDropResolution !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Object drop resolution was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      objectDropResolution = fill;
      continue;
    }

    if (fill.kind === "weaponAttackDamageEnhancementTargetItem") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (invocation.procedure !== "weaponAttackDamageEnhancement") {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Weapon-enhancement item target does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        fill.holeId !==
        weaponAttackDamageEnhancementTargetItemHoleId(invocation)
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Weapon-enhancement item target must use the selected spell act item-target hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (weaponAttackDamageEnhancementTargetItem !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Weapon-enhancement item target was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      weaponAttackDamageEnhancementTargetItem = {
        holeId: fill.holeId,
        value: fill.value,
      };
      continue;
    }

    if (fill.kind === "spellAreaChoice") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        invocation.procedure !== "persistentAreaTrait" &&
        invocation.procedure !== "magicalDarknessPointOrigin" &&
        invocation.procedure !== "magicSuppressionEmanation" &&
        invocation.procedure !== "persistentAreaSaveDamage" &&
        invocation.procedure !== "areaMovementDistanceDamage" &&
        invocation.procedure !== "persistentAreaSaveComposite" &&
        invocation.procedure !== "persistentAreaSaveConditionEscape"
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell area choice does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.holeId !== spellAreaChoiceHoleId(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Spell area choice must use the selected spell act area-choice hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (areaChoice !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return { tag: "invalid", message: "Spell area was filled twice." };
      }
      /* v8 ignore stop -- @preserve */
      areaChoice = fill.value;
      continue;
    }

    if (fill.kind === "teleportDestination") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (invocation.procedure !== "selfTeleport") {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Teleport destination does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (teleportDestination !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Teleport destination was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      teleportDestination = fill;
      continue;
    }

    if (fill.kind === "movableLightPlacement") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (invocation.procedure !== "movableLightManifestation") {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "movable-light manifestation placement does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        fill.holeId !==
        spellMovableLightPlacementHoleId(invocation, fill.value.form)
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "movable-light manifestation placement must use the selected spell act placement hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (movableLightPlacement !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "movable-light manifestation placement was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      movableLightPlacement = fill;
      continue;
    }

    if (fill.kind === "spellTargetAllocation") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (invocation.procedure !== "repeatedDamageAllocation") {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell target allocation does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.holeId !== spellTargetAllocationHoleId(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Spell target allocation must use the selected spell act allocation hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (targetAllocation !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell target allocation was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
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
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!isTargetListSpellInvocation(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell target list does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        (invocation.procedure === "scalarBuff" &&
          !isScalarBuffTargetListInvocation(invocation)) ||
        (invocation.procedure === "saveGatedCondition" &&
          !isTargetListSpellInvocation(invocation)) ||
        (invocation.procedure === "abilityD20TestRollModeSaveGate" &&
          !isTargetListSpellInvocation(invocation)) ||
        (invocation.procedure === "saveGatedConditionWithRepeat" &&
          !isTargetListSpellInvocation(invocation)) ||
        (invocation.procedure === "compelledNextTurnBehavior" &&
          !isTargetListSpellInvocation(invocation)) ||
        (invocation.procedure === "targetingSaveInterdiction" &&
          !isTargetListSpellInvocation(invocation)) ||
        (invocation.procedure === "directCondition" &&
          !isTargetListSpellInvocation(invocation))
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell target list does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.holeId !== spellTargetListHoleId(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Spell target list must use the selected spell act target-list hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (targetList !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell target list was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      const relationshipFactsRequired =
        "saveRollModeRule" in invocation &&
        invocation.saveRollModeRule?.kind === "hostileTarget";
      const relationshipFacts = relationshipFactsRequired
        ? parseSpellTargetListRelationshipFacts(
            fill.relationshipFacts ?? [],
            actorId,
            sourceProcedureRef,
            fill.value.targetIds,
          )
        : fill.relationshipFacts === undefined
          ? []
          : null;
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (relationshipFacts === null) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Spell target relationship facts must answer the target-list hole request.",
        };
      }
      /* v8 ignore stop -- @preserve */
      targetList = {
        targetIds: fill.value.targetIds,
        spatialFacts: fill.spatialFacts,
        relationshipFacts,
      };
      continue;
    }

    if (fill.kind === "attackRoll" && fill.holeId === ATTACK_ROLL_HOLE_ID) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (attackRoll !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell attack roll was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
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
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (attackSequencePartFill === undefined) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message:
              "Spell attack sequence attack roll is outside this spell act.",
          };
        }
        /* v8 ignore stop -- @preserve */
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (attackSequencePartFill.attackRoll !== undefined) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Spell attack sequence attack roll was filled twice.",
          };
        }
        /* v8 ignore stop -- @preserve */
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
      if (isSaveGatedConditionWithRepeatDamageRepeatSaveFill(fill)) {
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (
          saveGatedConditionWithRepeatDamageRepeatSaves.some(
            (candidate) => candidate.holeId === fill.holeId,
          )
        ) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Staged-condition repeat save was filled twice.",
          };
        }
        /* v8 ignore stop -- @preserve */
        saveGatedConditionWithRepeatDamageRepeatSaves.push(
          effectiveSavingThrowOutcomeFill,
        );
        continue;
      }
      if (
        invocation.procedure === "objectContactDamage" ||
        invocation.procedure === "objectContactDamageRepeat"
      ) {
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (objectContactSavingThrowOutcome !== undefined) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Object-contact saving throw outcome was filled twice.",
          };
        }
        /* v8 ignore stop -- @preserve */
        objectContactSavingThrowOutcome = effectiveSavingThrowOutcomeFill;
        continue;
      }
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.holeId !== spellSavingThrowOutcomeHoleId(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Spell saving throw outcomes must use the selected spell act outcome hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (savingThrowOutcomes !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell saving throw outcomes were filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        spellFillSetSavingThrowTargeting(invocation).kind !==
          "singleCombatant" &&
        spellFillSetSavingThrowTargeting(invocation).kind !== "targetList" &&
        !("area" in fill.value)
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell saving throw outcomes require area facts.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        spellFillSetSavingThrowTargeting(invocation).kind ===
          "singleCombatant" &&
        "area" in fill.value
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Single-target save-gate spell outcomes must not include area facts.",
        };
      }
      /* v8 ignore stop -- @preserve */
      savingThrowOutcomes = effectiveSavingThrowOutcomeFill.value;
      const parsedRelationshipFacts = parseSavingThrowRelationshipFacts(
        fill.relationshipFacts ?? [],
        actorId,
        effectiveSavingThrowOutcomeFill.value.outcomes.map(
          (outcome) => outcome.targetId,
        ),
        savingThrowRelationshipDecisionRequired,
      );
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (parsedRelationshipFacts === null) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Saving Throw relationship facts must answer the saving-throw hole request.",
        };
      }
      /* v8 ignore stop -- @preserve */
      savingThrowRelationshipFacts = parsedRelationshipFacts;
      continue;
    }

    if (fill.kind === "skillChoice") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!isRollModifierInvocation(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell skill choice does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.holeId !== spellRollModifierSkillChoiceHoleId(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Spell skill choice must use the selected spell act skill-choice hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (skillChoice !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell skill choice was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      skillChoice = fill.value;
      continue;
    }

    if (fill.kind === "compelledBehaviorOptionChoice") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (invocation.procedure !== "compelledNextTurnBehavior") {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Compelled-behavior option choice does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.holeId !== compelledBehaviorOptionChoiceHoleId(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Compelled-behavior option choice must use the selected spell act option hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (compelledBehaviorOptionChoice !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Compelled-behavior option choice was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      compelledBehaviorOptionChoice = fill.value;
      continue;
    }

    if (fill.kind === "selfTransformationModeChoice") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (invocation.procedure !== "selfTransformationMode") {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Self-transformation mode choice does not match this spell.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.holeId !== selfTransformationModeChoiceHoleId(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Self-transformation mode choice must use the selected spell act mode-choice hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!invocation.modeChoices.includes(fill.value)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Self-transformation mode choice is not available.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (selfTransformationModeChoice !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Self-transformation mode was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      selfTransformationModeChoice = fill.value;
      continue;
    }

    if (fill.kind === "conditionChoice") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!spellInvocationHasConditionChoice(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell condition choice does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.holeId !== spellConditionChoiceHoleId(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Spell condition choice must use the selected spell act condition-choice hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!spellConditionChoices(invocation).includes(fill.value)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell condition choice is not available for this spell.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (conditionChoice !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell condition choice was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      conditionChoice = fill.value;
      continue;
    }

    if (fill.kind === "controlledVerticalSuspensionInitialRise") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        invocation.procedure !== "controlledVerticalSuspension" ||
        targetId === undefined
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "ControlledVerticalSuspension initial rise must follow the selected ControlledVerticalSuspension creature target.",
        };
      }
      /* v8 ignore stop -- @preserve */
      const hole = controlledVerticalSuspensionInitialRiseHole({
        actorId: invocation.activeEffect.sourceCombatantId,
        targetId,
        maxDistanceFeet: invocation.maxInitialRiseFeet,
      });
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.holeId !== hole.holeId) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "ControlledVerticalSuspension initial rise must use the selected spell act initial-rise hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        fill.value.distanceFeet < 0 ||
        fill.value.distanceFeet > invocation.maxInitialRiseFeet ||
        !Number.isInteger(fill.value.distanceFeet)
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "ControlledVerticalSuspension initial rise must be a whole number no greater than the spell limit.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (controlledVerticalSuspensionInitialRiseFeet !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "ControlledVerticalSuspension initial rise was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      controlledVerticalSuspensionInitialRiseFeet = fill.value.distanceFeet;
      continue;
    }

    if (fill.kind === "abilityChoice") {
      if (invocation.procedure === "rollModifier") {
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (invocation.abilityChoices === null) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Spell ability choice does not match this spell act.",
          };
        }
        /* v8 ignore stop -- @preserve */
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (rollModifierUsesTargetAbilityChoices(invocation)) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message:
              "Per-target roll modifier spells require target ability choices.",
          };
        }
        /* v8 ignore stop -- @preserve */
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (fill.holeId !== spellRollModifierAbilityChoiceHoleId(invocation)) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message:
              "Spell ability choice must use the selected spell act ability-choice hole.",
          };
        }
        /* v8 ignore stop -- @preserve */
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (!invocation.abilityChoices.includes(fill.value)) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Spell ability choice is not available for this spell.",
          };
        }
        /* v8 ignore stop -- @preserve */
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (abilityChoice !== undefined) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Spell ability choice was filled twice.",
          };
        }
        /* v8 ignore stop -- @preserve */
        abilityChoice = fill.value;
        continue;
      }
      if (invocation.procedure === "saveGatedDamage") {
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (invocation.failedSaveAbilityChoices === null) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Spell ability choice does not match this spell act.",
          };
        }
        /* v8 ignore stop -- @preserve */
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (fill.holeId !== spellAbilityChoiceHoleId(invocation)) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message:
              "Spell ability choice must use the selected spell act ability-choice hole.",
          };
        }
        /* v8 ignore stop -- @preserve */
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (!invocation.failedSaveAbilityChoices.includes(fill.value)) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Spell ability choice is not available for this spell.",
          };
        }
        /* v8 ignore stop -- @preserve */
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (abilityChoice !== undefined) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Spell ability choice was filled twice.",
          };
        }
        /* v8 ignore stop -- @preserve */
        abilityChoice = fill.value;
        continue;
      }
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        invocation.procedure !== "markedDamageRider" ||
        invocation.action !== "cast" ||
        invocation.abilityCheckBehavior.kind !== "chosenAbilityDisadvantage"
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell ability choice does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.holeId !== spellAbilityChoiceHoleId(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Spell ability choice must use the selected spell act ability-choice hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!invocation.abilityCheckBehavior.choices.includes(fill.value)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell ability choice is not available for this spell.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (abilityChoice !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell ability choice was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      abilityChoice = fill.value;
      continue;
    }

    if (fill.kind === "targetAbilityChoices") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        fill.holeId !== spellRollModifierTargetAbilityChoicesHoleId(invocation)
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Spell target ability choices must use the selected spell act target-ability-choices hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (targetAbilityChoices !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell target ability choices were filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!isTargetAbilityChoicesRollModifierInvocation(invocation)) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell target ability choices do not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      const seenTargets = new Set<CombatantId>();
      for (const choice of fill.value.choices) {
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (!invocation.abilityChoices.includes(choice.ability)) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message:
              "Spell target ability choice is not available for this spell.",
          };
        }
        /* v8 ignore stop -- @preserve */
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (seenTargets.has(choice.targetId)) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Spell target ability choice includes a target twice.",
          };
        }
        /* v8 ignore stop -- @preserve */
        seenTargets.add(choice.targetId);
      }
      targetAbilityChoices = fill;
      continue;
    }

    if (fill.kind === "temporaryAbilityCheckRollModeActiveEffectCount") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (invocation.procedure !== "temporaryAbilityCheckRollMode") {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Temporary ability-check roll-mode active-effect count does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.holeId !== MINOR_WONDER_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Temporary ability-check roll-mode active-effect count must use the selected spell act count hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (temporaryAbilityCheckRollModeActiveEffectCount !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Temporary ability-check roll-mode active-effect count was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      temporaryAbilityCheckRollModeActiveEffectCount = fill;
      continue;
    }

    if (fill.kind === "damageTypeChoice") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        invocation.procedure !== "damageReduction" &&
        invocation.procedure !== "chosenDamageResistance" &&
        invocation.procedure !== "grantedAreaSaveDamageAction" &&
        !(
          invocation.procedure === "spellAttackDamage" &&
          invocation.damage.kind === "spellAttackDamageTypeChoice"
        ) &&
        invocation.procedure !== "selfTransformationMode" &&
        invocation.procedure !== "spellHostedWeaponAttack"
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell damage type choice does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        fill.holeId !==
        spellDamageTypeChoiceHole({ ...invocation, sourceProcedureRef }).holeId
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "Spell damage type choice must use the selected spell act choice hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (damageTypeChoice !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell damage type choice was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      damageTypeChoice = fill;
      continue;
    }

    if (fill.kind === "spatialMeleeSpellAttackProxyPosition") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (invocation.procedure !== "spatialMeleeSpellAttackProxy") {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "spatial melee spell-attack proxy force position does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        fill.holeId !==
        spatialMeleeSpellAttackProxyPositionHole({
          ...invocation,
          sourceProcedureRef,
        }).holeId
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "spatial melee spell-attack proxy force position must use the selected spell act position hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      const spatialMeleeSpellAttackProxyPositionError =
        spatialMeleeSpellAttackProxyPositionInvalidReason(
          fill.value,
          invocation,
        );
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (spatialMeleeSpellAttackProxyPositionError !== null) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: spatialMeleeSpellAttackProxyPositionError,
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (spatialMeleeSpellAttackProxyPosition !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message:
            "spatial melee spell-attack proxy force position was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      spatialMeleeSpellAttackProxyPosition = fill.value;
      continue;
    }

    if (fill.kind === "rolledDice") {
      if (isDuplicateHitInterceptionDuplicateRollFill(fill)) {
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (
          !DUPLICATE_HIT_INTERCEPTION_ROLL_PROCEDURE_SET.has(
            invocation.procedure,
          )
        ) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message:
              "Duplicate-interception roll does not match this spell act.",
          };
        }
        /* v8 ignore stop -- @preserve */
        if (invocation.procedure === "spellAttackSequence") {
          const partIndex =
            spellAttackSequencePartIndexForDuplicateInterceptionRoll(
              invocation,
              fill.holeId,
            );
          /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
          if (partIndex === null) {
            /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
            return {
              tag: "invalid",
              message:
                "Duplicate-interception roll does not match this spell attack sequence.",
            };
          }
          /* v8 ignore stop -- @preserve */
          const attackSequencePartFill = attackSequencePartFills[partIndex];
          /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
          if (attackSequencePartFill === undefined) {
            /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
            return {
              tag: "invalid",
              message: "Duplicate-interception roll is outside this spell act.",
            };
          }
          /* v8 ignore stop -- @preserve */
          /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
          if (
            attackSequencePartFill.duplicateHitInterceptionRoll !== undefined
          ) {
            /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
            return {
              tag: "invalid",
              message:
                "Spell attack sequence duplicate-interception roll was filled twice.",
            };
          }
          /* v8 ignore stop -- @preserve */
          attackSequencePartFills[partIndex] = {
            ...attackSequencePartFill,
            duplicateHitInterceptionRoll: fill,
          };
          continue;
        }
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (duplicateHitInterceptionRoll !== undefined) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Duplicate-interception roll was filled twice.",
          };
        }
        /* v8 ignore stop -- @preserve */
        duplicateHitInterceptionRoll = fill;
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
          /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
          if (attackSequencePartFill === undefined) {
            /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
            return {
              tag: "invalid",
              message:
                "Spell attack sequence damage is outside this spell act.",
            };
          }
          /* v8 ignore stop -- @preserve */
          /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
          if (attackSequencePartFill.damageRoll !== undefined) {
            /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
            return {
              tag: "invalid",
              message: "Spell attack sequence damage was filled twice.",
            };
          }
          /* v8 ignore stop -- @preserve */
          attackSequencePartFills[partIndex] = {
            ...attackSequencePartFill,
            damageRoll: fill,
          };
          continue;
        }
      }
      if (isSpellDamageReductionRollFill(fill)) {
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (
          spellDamageReductionRolls.some(
            (candidate) => candidate.holeId === fill.holeId,
          )
        ) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Spell damage reduction roll was filled twice.",
          };
        }
        /* v8 ignore stop -- @preserve */
        spellDamageReductionRolls.push(fill);
        continue;
      }
      if (isSourceDamageRollPenaltyRollFill(fill)) {
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (
          sourceDamageRollPenaltyRolls.some(
            (candidate) => candidate.holeId === fill.holeId,
          )
        ) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Source damage roll penalty was filled twice.",
          };
        }
        /* v8 ignore stop -- @preserve */
        sourceDamageRollPenaltyRolls.push(fill);
        continue;
      }
      if (
        invocation.procedure === "directHitPointRestoration" ||
        (invocation.procedure === "scalarBuff" &&
          invocation.effect.kind === "temporaryHitPoints")
      ) {
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (healingRoll !== undefined) {
          /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
          return {
            tag: "invalid",
            message: "Spell scalar dice result was filled twice.",
          };
        }
        /* v8 ignore stop -- @preserve */
        healingRoll = fill;
        continue;
      }
      if (invocation.procedure === "attackBurstSaveDamage") {
        const executionInvocation = { ...invocation, sourceProcedureRef };
        const attackDamageHole = spellDamageHole(executionInvocation, false);
        const criticalAttackDamageHole = spellDamageHole(
          executionInvocation,
          true,
        );
        const burstDamageHole = spellBurstDamageHole(executionInvocation);
        if (
          fill.holeId === attackDamageHole.holeId ||
          fill.holeId === criticalAttackDamageHole.holeId
        ) {
          /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
          if (attackBurstDamageRoll !== undefined) {
            /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
            return {
              tag: "invalid",
              message: "Attack-burst initial damage was filled twice.",
            };
          }
          /* v8 ignore stop -- @preserve */
          attackBurstDamageRoll = fill;
          continue;
        }
        if (fill.holeId === burstDamageHole.holeId) {
          /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
          if (damageRoll !== undefined) {
            /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
            return {
              tag: "invalid",
              message: "Attack-burst secondary damage was filled twice.",
            };
          }
          /* v8 ignore stop -- @preserve */
          damageRoll = fill;
          continue;
        }
        /* v8 ignore start -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Attack-burst damage must use its matching damage hole.",
        };
        /* v8 ignore stop -- @preserve */
      }
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (damageRoll !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return { tag: "invalid", message: "Spell damage was filled twice." };
      }
      /* v8 ignore stop -- @preserve */
      damageRoll = fill;
      continue;
    }

    if (fill.kind === "concentrationSavingThrow") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        concentrationSavingThrows.some(
          (candidate) => candidate.holeId === fill.holeId,
        )
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Concentration Saving Throw was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      concentrationSavingThrows.push(fill);
      continue;
    }

    if (fill.kind === "attackDamageDisposition") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        damageDispositions.some((candidate) => candidate.holeId === fill.holeId)
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Damage disposition was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      damageDispositions.push(fill);
      continue;
    }

    if (fill.kind === "movement") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        invocation.procedure !== "saveGatedDamage" ||
        !invocation.failedSavePostDamageRiders.some(
          (rider) => rider.kind === "forcedReactionMovement",
        )
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Movement fill does not match this spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (movement !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Spell forced movement was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      movement = fill;
      continue;
    }

    if (
      fill.kind === "abilityCheck" &&
      invocation.procedure === "ongoingSpellEnd"
    ) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        ongoingSpellAbilityChecks.some(
          (candidate) => candidate.holeId === fill.holeId,
        )
      ) {
        /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
        return {
          tag: "invalid",
          message: "Ongoing spell ending ability check was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      ongoingSpellAbilityChecks.push(fill);
      continue;
    }

    /* v8 ignore start -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the spell replay holes.`,
    };
    /* v8 ignore stop -- @preserve */
  }

  const relationshipDecisions = DamageRelationshipDecisionsByHole.parse({
    fills,
    damageEventHoleIds: new Set(
      [
        damageRoll,
        attackBurstDamageRoll,
        ...attackSequencePartFills.map((part) => part.damageRoll),
      ].flatMap((fill) => (fill === undefined ? [] : [fill.holeId])),
    ),
    owner: "a Spell",
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipDecisions.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed fill set: discovery is the canonical hole contract; this return rejects a duplicate, wrong-kind, wrong-hole, or contradictory spell fill. */
    return {
      tag: "invalid",
      message: relationshipDecisions.message,
    };
  }
  /* v8 ignore stop -- @preserve */

  return {
    tag: "ok",
    targetId,
    objectTarget,
    objectContactTargets,
    objectContactSavingThrowOutcome,
    objectDropResolution,
    weaponAttackDamageEnhancementTargetItem,
    ongoingSpellTarget,
    ongoingSpellAbilityChecks,
    targetSpatialFacts,
    damageRelationshipDecisions:
      relationshipDecisions.decisionsByRelationshipHole,
    targetRelationshipFacts,
    reactionSpellTargetFacts,
    targetAllocation,
    targetList,
    attackSequencePartFills,
    attackRoll,
    remarkableAthleteCriticalHitMovementDecision,
    remarkableAthleteCriticalHitMovement,
    savingThrowOutcomes,
    savingThrowRelationshipFacts,
    skillChoice,
    abilityChoice,
    targetAbilityChoices,
    temporaryAbilityCheckRollModeActiveEffectCount,
    compelledBehaviorOptionChoice,
    selfTransformationModeChoice,
    conditionChoice,
    controlledVerticalSuspensionInitialRiseFeet,
    areaChoice,
    teleportDestination,
    spatialMeleeSpellAttackProxyPosition,
    movableLightPlacement,
    damageTypeChoice,
    concentrationSavingThrows,
    saveGatedConditionWithRepeatDamageRepeatSaves,
    damageDispositions,
    damageRoll,
    duplicateHitInterceptionRoll,
    movement,
    spellDamageReductionRolls,
    sourceDamageRollPenaltyRolls,
    attackBurstDamageRoll,
    healingRoll,
  };
}

function spellAttackSequencePartIndexForDuplicateInterceptionRoll(
  invocation: Extract<
    RuntimeSpellProcedure,
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
      duplicateHitInterceptionRollHoleId(
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
  invocation: RuntimeSpellProcedure,
): boolean {
  return (
    invocation.procedure === "spellAttackDamage" ||
    invocation.procedure === "heldLightHurl" ||
    invocation.procedure === "spellCreatedHeldObjectAttack" ||
    invocation.procedure === "spatialMeleeSpellAttackProxy" ||
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
          "Spell-cast Reaction trigger facts must describe interrupted-caster visibility.",
      };
}

function isSpellCastReactionFact(
  fact: BattleTargetSpatialFact,
): fact is SpellCastReactionFact {
  return fact.kind === "spellCastInterruptionTriggerCasterVisibleWithinRange";
}

function attackSightFactValidation(
  facts: readonly BattleTargetSpatialFact[],
): Extract<SpellFillSet, { readonly tag: "invalid" }> | null {
  const message = validateUniqueAttackSightFacts(facts);
  return message === null ? null : { tag: "invalid", message };
}

export function spellFillSetSavingThrowTargeting(
  invocation: RuntimeSpellProcedure,
) {
  return invocation.procedure === "attackBurstSaveDamage"
    ? invocation.burst.targeting
    : invocation.procedure === "saveGatedDamage" ||
        invocation.procedure === "saveGatedCondition" ||
        invocation.procedure === "saveGatedConditionImmunity" ||
        invocation.procedure === "afterHitSaveGatedCondition" ||
        invocation.procedure === "saveGatedAttackRollAdvantage" ||
        invocation.procedure === "abilityD20TestRollModeSaveGate" ||
        invocation.procedure === "spellCastInterruptionReaction" ||
        invocation.procedure === "stagedSaveCondition" ||
        invocation.procedure === "saveGatedConditionWithRepeat" ||
        invocation.procedure === "saveGatedAreaControl" ||
        invocation.procedure === "compelledNextTurnBehavior" ||
        invocation.procedure === "creatureSizeIncrease" ||
        invocation.procedure === "creatureSizeDecrease" ||
        invocation.procedure === "controlledVerticalSuspension" ||
        invocation.procedure === "persistentAreaSaveCondition" ||
        invocation.procedure === "directionalPersistentArea" ||
        invocation.procedure === "saveGatedTurnConstraintBundle"
      ? invocation.targeting
      : { kind: "singleCombatant" };
}

function isTargetAbilityChoicesRollModifierInvocation<
  I extends RuntimeSpellProcedure,
>(
  invocation: I,
): invocation is I &
  Extract<RuntimeSpellProcedure, { readonly procedure: "rollModifier" }> & {
    readonly abilityChoices: readonly Ability[];
  } {
  return invocation.procedure === "rollModifier"
    ? invocation.abilityChoices !== null &&
        rollModifierUsesTargetAbilityChoices(invocation)
    : false;
}

function isRollModifierInvocation<I extends RuntimeSpellProcedure>(
  invocation: I,
): invocation is I &
  Extract<RuntimeSpellProcedure, { readonly procedure: "rollModifier" }> {
  return invocation.procedure === "rollModifier";
}

function spellAttackSequencePartIndexForHole(
  invocation: Extract<
    RuntimeSpellProcedure,
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
