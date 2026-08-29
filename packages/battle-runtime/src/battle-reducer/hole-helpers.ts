// KERNEL-COVERAGE: runtime-owner BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.ORDINARY_OBJECT_PROCEDURE BATTLE.DAMAGE.OBJECT_DAMAGE_TRANSITION
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-creature-size-change
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.passive-ability-check-roll-mode
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.remarkable-athlete
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.hide-action-obscurement-permission
import { optionalProperty } from "../optional-property.ts";
import { Match } from "effect";
import { canSpendBonusAction } from "@dnd/shared-algebras/action-economy-algebra";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import { battleFillKind } from "../battle-protocol-kinds.ts";
import {
  difficultyClass,
  type Condition,
  type DifficultyClass,
} from "@dnd/shared/types";
import type { Ability, Skill } from "@dnd/surface/surface/types";
import { isPresentFindFamiliarCombatant } from "../find-familiar-state.ts";
import { mechanicalD20TestRollMode } from "../d20-test-circumstance.ts";
import type {
  BattleActiveEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import {
  type BattleMovementSpeedKind,
  type BattleSubject,
} from "../battle-subjects.ts";
import {
  characterUnitProcedureBindings,
  type UnitFeatureProcedureExecution,
  type UnitSupportProcedureExecution,
} from "../character-execution-queries.ts";
import {
  attackExecutionSelectionForOption,
  type BoundSupportedAttackActionOption,
  type SupportedAttackActionOption,
} from "../battle-action-options.ts";
import {
  resourceHasUsesRemaining,
  type CharacterBattleUseCountResourceState,
} from "../character-battle-resource-execution.ts";
import { ongoingSpellEffectSuppressedByAntimagicField } from "./antimagic-field-suppression.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./attack-roll.ts";
import {
  activeCreatureSizeChangeEffect,
  creatureSizeChangeStrengthRollMode,
} from "./creature-size-change-effects.ts";
import {
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  HIDE_ACTION_OBSCUREMENT_PERMISSION_SUPPORT_PROFILE,
  type AlternateActionCostAction,
  type HideActionObscurementPermissionProfile,
} from "../unit-feature-execution-constants.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleAbilityCheckHole,
  type BattleActiveEffect,
  type BattleFill,
  type BattleCreatureState,
  type BattleGrappleLink,
  type BattleGrappleOutcomeHole,
  type BattleShoveOutcomeHole,
  type BattleHole,
  type BattleState,
  type BattleTargetChoiceHole,
} from "../battle-state-execution.ts";
import {
  ATTACK_TARGET_HOLE_ID,
  ATTACK_TARGET_HOLE_INSTANCE,
  ESCAPE_GRAPPLE_OUTCOME_HOLE_ID,
  ESCAPE_GRAPPLE_OUTCOME_HOLE_INSTANCE,
  ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_ID,
  ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_INSTANCE,
  GRAPPLE_OUTCOME_HOLE_ID,
  GRAPPLE_OUTCOME_HOLE_INSTANCE,
  GRAPPLE_TARGET_HOLE_ID,
  GRAPPLE_TARGET_HOLE_INSTANCE,
  HIDE_ABILITY_CHECK_HOLE_ID,
  HIDE_ABILITY_CHECK_HOLE_INSTANCE,
  HIDE_DC,
  HYPNOTIC_PATTERN_SHAKE_AWAKE_TARGET_HOLE_ID,
  HYPNOTIC_PATTERN_SHAKE_AWAKE_TARGET_HOLE_INSTANCE,
  SEARCH_ABILITY_CHECK_HOLE_ID,
  SEARCH_ABILITY_CHECK_HOLE_INSTANCE,
  SEARCH_TARGET_HOLE_ID,
  SEARCH_TARGET_HOLE_INSTANCE,
  SHOVE_OUTCOME_HOLE_ID,
  SHOVE_OUTCOME_HOLE_INSTANCE,
  SHOVE_TARGET_HOLE_ID,
  SHOVE_TARGET_HOLE_INSTANCE,
  SLEEP_SHAKE_AWAKE_TARGET_HOLE_ID,
  SLEEP_SHAKE_AWAKE_TARGET_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";
import { spellSaveDcForCaster } from "./spell-save-dc.ts";
import {
  creatureSizeIsLargerThanSelf,
  grappleLinkForTarget,
  representedMovementSpeedKinds,
  shoveForTarget,
} from "./movement-speed.ts";
import { attackTargetConstraint } from "./statblock-attacks.ts";
import {
  attackRollMissToHitReplacementHolePayloadForAttacker,
  eligibleAttackDamageDieFloorProcedureRefs,
  eligibleWeaponDamageDiceRollChoiceProcedureRefs,
} from "./statblock-attacks.ts";
import { activeSpellWeaponDamageRiders } from "./damage-helpers.ts";
import { combatantEffectiveSize } from "./druid-wild-shape.ts";
import {
  THAUMATURGY_BOOMING_VOICE_INFLUENCE_ABILITY_CHECK_HOLE_ID,
  THAUMATURGY_BOOMING_VOICE_INFLUENCE_ABILITY_CHECK_HOLE_INSTANCE,
  THAUMATURGY_BOOMING_VOICE_INTIMIDATION_SKILL,
} from "./domain-constants.ts";
import {
  combatantCanTakeActions,
  isCharacterBattleCreatureState,
} from "./creature-state-execution.ts";
import {
  hypnoticPatternShakeAwakeTargetChoices,
  sleepShakeAwakeTargetChoices,
} from "./spell-condition-effects-helpers.ts";

const byBattleHoleKind = Match.discriminator("kind");

export type BattleHoleFamilyKind = BattleHole["kind"];

export function battleHoleFamilyKind(hole: BattleHole): BattleHoleFamilyKind {
  return Match.value(hole)
    .pipe(
      byBattleHoleKind("abilityCheck", () => "abilityCheck" as const),
      byBattleHoleKind("abilityChoice", () => "abilityChoice" as const),
      byBattleHoleKind(
        "attackDamageDisposition",
        () => "attackDamageDisposition" as const,
      ),
      byBattleHoleKind("attackRoll", () => "attackRoll" as const),
      byBattleHoleKind(
        "commandOptionChoice",
        () => "commandOptionChoice" as const,
      ),
      byBattleHoleKind(
        "companionReappearanceInitiative",
        () => "companionReappearanceInitiative" as const,
      ),
      byBattleHoleKind(
        "companionReappearancePlacement",
        () => "companionReappearancePlacement" as const,
      ),
      byBattleHoleKind(
        "concentrationSavingThrow",
        () => "concentrationSavingThrow" as const,
      ),
      byBattleHoleKind("conditionChoice", () => "conditionChoice" as const),
      byBattleHoleKind(
        "cunningStrikeEndTurnCoverFacts",
        () => "cunningStrikeEndTurnCoverFacts" as const,
      ),
      byBattleHoleKind(
        "damageRelationshipDecisions",
        () => "damageRelationshipDecisions" as const,
      ),
      byBattleHoleKind("damageTypeChoice", () => "damageTypeChoice" as const),
      byBattleHoleKind(
        "dancingLightsPlacement",
        () => "dancingLightsPlacement" as const,
      ),
      byBattleHoleKind("deathSavingThrow", () => "deathSavingThrow" as const),
      byBattleHoleKind(
        "findFamiliarConnection",
        () => "findFamiliarConnection" as const,
      ),
      byBattleHoleKind("grappleOutcome", () => "grappleOutcome" as const),
      byBattleHoleKind(
        "gustOfWindLineDirectionChoice",
        () => "gustOfWindLineDirectionChoice" as const,
      ),
      byBattleHoleKind("heldObjectFacts", () => "heldObjectFacts" as const),
      byBattleHoleKind(
        "helpAttackAllyDecision",
        () => "helpAttackAllyDecision" as const,
      ),
      byBattleHoleKind(
        "helpAttackEnemyDecision",
        () => "helpAttackEnemyDecision" as const,
      ),
    )
    .pipe(
      byBattleHoleKind(
        "hitPointHealingDistribution",
        () => "hitPointHealingDistribution" as const,
      ),
      byBattleHoleKind("interruptDecision", () => "interruptDecision" as const),
      byBattleHoleKind(
        "levitateAltitudeChange",
        () => "levitateAltitudeChange" as const,
      ),
      byBattleHoleKind(
        "levitateInitialRise",
        () => "levitateInitialRise" as const,
      ),
      byBattleHoleKind(
        "magicWeaponTargetItem",
        () => "magicWeaponTargetItem" as const,
      ),
      byBattleHoleKind(
        "movableZoneRamMovement",
        () => "movableZoneRamMovement" as const,
      ),
      byBattleHoleKind(
        "movableZoneRepositionMovement",
        () => "movableZoneRepositionMovement" as const,
      ),
      byBattleHoleKind("readyDeclaration", () => "readyDeclaration" as const),
      byBattleHoleKind("movement", () => "movement" as const),
      byBattleHoleKind(
        "objectContactTargets",
        () => "objectContactTargets" as const,
      ),
      byBattleHoleKind(
        "objectDropResolution",
        () => "objectDropResolution" as const,
      ),
      byBattleHoleKind(
        "objectTargetChoice",
        () => "objectTargetChoice" as const,
      ),
      byBattleHoleKind(
        "ongoingSpellTargetChoice",
        () => "ongoingSpellTargetChoice" as const,
      ),
      byBattleHoleKind("rolledDice", () => "rolledDice" as const),
      byBattleHoleKind(
        "sanctuaryInterdictionOutcome",
        () => "sanctuaryInterdictionOutcome" as const,
      ),
      byBattleHoleKind(
        "savingThrowOutcome",
        () => "savingThrowOutcome" as const,
      ),
      byBattleHoleKind(
        "selfTransformationModeChoice",
        () => "selfTransformationModeChoice" as const,
      ),
      byBattleHoleKind(
        "slowSomaticSpellFailureOutcome",
        () => "slowSomaticSpellFailureOutcome" as const,
      ),
    )
    .pipe(
      byBattleHoleKind("shoveOutcome", () => "shoveOutcome" as const),
      byBattleHoleKind("skillChoice", () => "skillChoice" as const),
      byBattleHoleKind("spellAreaChoice", () => "spellAreaChoice" as const),
      byBattleHoleKind(
        "spellTargetAllocation",
        () => "spellTargetAllocation" as const,
      ),
      byBattleHoleKind("spellTargetList", () => "spellTargetList" as const),
      byBattleHoleKind(
        "spellcastingAbilityCheck",
        () => "spellcastingAbilityCheck" as const,
      ),
      byBattleHoleKind(
        "spiritualWeaponForcePosition",
        () => "spiritualWeaponForcePosition" as const,
      ),
      byBattleHoleKind(
        "statBlockRechargeRoll",
        () => "statBlockRechargeRoll" as const,
      ),
      byBattleHoleKind(
        "targetAbilityChoices",
        () => "targetAbilityChoices" as const,
      ),
      byBattleHoleKind("targetChoice", () => "targetChoice" as const),
      byBattleHoleKind(
        "targetSpatialFacts",
        () => "targetSpatialFacts" as const,
      ),
      byBattleHoleKind(
        "teleportDestination",
        () => "teleportDestination" as const,
      ),
      byBattleHoleKind(
        "thaumaturgyActiveOneMinuteEffectCount",
        () => "thaumaturgyActiveOneMinuteEffectCount" as const,
      ),
      byBattleHoleKind(
        "toolPossessionFacts",
        () => "toolPossessionFacts" as const,
      ),
      byBattleHoleKind(
        "unitFeatureDecision",
        () => "unitFeatureDecision" as const,
      ),
      byBattleHoleKind(
        "wildShapeEquipmentDisposition",
        () => "wildShapeEquipmentDisposition" as const,
      ),
      Match.exhaustive,
    );
}

/**
 * Matches a fill to a Hole's protocol kind. Hole identity and fill value
 * validation remain owned by the procedure that consumes the pair.
 */
export function battleHoleAcceptsFill(
  hole: BattleHole,
  fill: BattleFill,
): boolean {
  const holeKind = battleHoleFamilyKind(hole);
  const fillKind = battleFillKind(fill);
  return (
    holeKind === fillKind ||
    (holeKind === "spellcastingAbilityCheck" && fillKind === "abilityCheck")
  );
}

export function bonusActionDashSubjectForSpeedKind(
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  speedKind: BattleMovementSpeedKind,
): Extract<BattleSubject, { readonly tag: "bonusActionStandardAction" }> {
  return {
    tag: "bonusActionStandardAction",
    actorId,
    procedureRef,
    action: "dash",
    speedKind,
  };
}

export function hideAbilityCheckHole(
  state: BattleState,
  actorId: CombatantId,
): BattleAbilityCheckHole {
  const rollMode = requiredAbilityCheckRollMode(state, actorId, "dex");
  return {
    holeInstanceKey: HIDE_ABILITY_CHECK_HOLE_INSTANCE,
    holeId: HIDE_ABILITY_CHECK_HOLE_ID,
    kind: "abilityCheck",
    label: `Hide Dexterity (Stealth) check (DC ${HIDE_DC})`,
    ability: "dex",
    skill: "stealth",
    dc: HIDE_DC,
    ...optionalProperty("rollMode", rollMode),
  };
}

export function searchAbilityCheckHole(
  dc: DifficultyClass,
  state: BattleState,
  actorId: CombatantId,
  targetId?: CombatantId,
): BattleAbilityCheckHole {
  const rollMode = requiredAbilityCheckRollMode(state, actorId, "wis", {
    skill: "perception",
    ...optionalProperty("targetId", targetId),
  });
  return {
    holeInstanceKey: SEARCH_ABILITY_CHECK_HOLE_INSTANCE,
    holeId: SEARCH_ABILITY_CHECK_HOLE_ID,
    kind: "abilityCheck",
    label: `Search Wisdom (Perception) check (DC ${dc})`,
    ability: "wis",
    skill: "perception",
    dc,
    ...optionalProperty("rollMode", rollMode),
  };
}

export function escapeSpellRestraintAbilityCheckHole(
  state: BattleState,
  effect: Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>,
  input: { readonly actorId: CombatantId; readonly targetId: CombatantId },
): BattleAbilityCheckHole {
  const dc = spellSaveDcForCaster(state, effect.sourceCombatantId);
  const rollMode = requiredAbilityCheckRollMode(state, input.actorId, "str");
  return {
    holeInstanceKey: ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_INSTANCE,
    holeId: ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_ID,
    kind: "abilityCheck",
    label: `Escape spell restraint Strength (Athletics) check (DC ${dc ?? 1})`,
    ability: "str",
    skill: "athletics",
    dc: dc ?? difficultyClass(1),
    ...optionalProperty("rollMode", rollMode),
    ...(input.actorId === input.targetId
      ? {}
      : { requiresTableSpatialFact: true }),
  };
}

export function thaumaturgyBoomingVoiceInfluenceAbilityCheckHole(
  state: BattleState,
  actorId: CombatantId,
  dc: DifficultyClass,
): BattleAbilityCheckHole {
  const rollMode = requiredAbilityCheckRollMode(state, actorId, "cha", {
    skill: THAUMATURGY_BOOMING_VOICE_INTIMIDATION_SKILL,
  });
  return {
    holeInstanceKey:
      THAUMATURGY_BOOMING_VOICE_INFLUENCE_ABILITY_CHECK_HOLE_INSTANCE,
    holeId: THAUMATURGY_BOOMING_VOICE_INFLUENCE_ABILITY_CHECK_HOLE_ID,
    kind: "abilityCheck",
    label: `Influence Charisma (Intimidation) check (DC ${dc})`,
    ability: "cha",
    skill: THAUMATURGY_BOOMING_VOICE_INTIMIDATION_SKILL,
    dc,
    ...optionalProperty("rollMode", rollMode),
  };
}

export function requiredAbilityCheckRollMode(
  state: BattleState,
  actorId: CombatantId,
  ability: Ability,
  context?: {
    readonly skill?: Skill;
    readonly targetId?: CombatantId;
  },
): AttackRollMode | undefined {
  const hasDisadvantage =
    activeAbilityCheckRollModeEffectMatches(
      state,
      actorId,
      ability,
      "disadvantage",
    ) ||
    [...state.combatants.values()].some((combatant) =>
      combatant.activeEffects.some(
        (effect) =>
          effect.kind === "spellMarkedDamageRider" &&
          effect.targetCombatantId === actorId &&
          effect.abilityCheckBehavior.kind === "abilityDisadvantage" &&
          effect.abilityCheckBehavior.ability === ability,
      ),
    );
  const hasAdvantage =
    activeAbilityCheckRollModeEffectMatches(
      state,
      actorId,
      ability,
      "advantage",
    ) ||
    (context?.skill !== undefined &&
      activeThaumaturgyBoomingVoiceAdvantageMatches(
        state,
        actorId,
        ability,
        context.skill,
      )) ||
    (context?.skill !== undefined &&
      context.targetId !== undefined &&
      activeMarkedDamageRiderFindingAdvantageMatches(
        state,
        actorId,
        ability,
        context.skill,
        context.targetId,
      )) ||
    (context?.skill !== undefined &&
      activeRemarkableAthleteAbilityCheckAdvantageMatches(
        state,
        actorId,
        ability,
        context.skill,
      ));
  return mechanicalD20TestRollMode({
    advantage: hasAdvantage,
    disadvantage: hasDisadvantage,
  });
}

export function requiredConditionEndAbilityCheckRollMode(
  state: BattleState,
  actorId: CombatantId,
  condition: Condition,
): AttackRollMode | undefined {
  const hasDisadvantage =
    activeAnyAbilityCheckRollModeEffectMatches(
      state,
      actorId,
      "disadvantage",
    ) || poisonedAbilityCheckDisadvantageMatches(state, actorId);
  const hasAdvantage =
    activeAnyAbilityCheckRollModeEffectMatches(state, actorId, "advantage") ||
    passiveConditionEndAbilityCheckRollModeMatches(
      state,
      actorId,
      condition,
      "advantage",
    );
  return mechanicalD20TestRollMode({
    advantage: hasAdvantage,
    disadvantage: hasDisadvantage,
  });
}

export function passivePerceptionModifierDelta(
  state: BattleState,
  actorId: CombatantId,
): number {
  return activeFixedAbilityCheckModifierDelta(state, actorId, {
    skill: "perception",
  });
}

function activeFixedAbilityCheckModifierDelta(
  state: BattleState,
  actorId: CombatantId,
  context: {
    readonly skill: Skill;
  },
): number {
  const actor = state.combatants.get(actorId);
  return (
    actor?.activeEffects.reduce((total, effect) => {
      if (
        effect.kind !== "d20RollModifier" ||
        !effect.on.includes("ability_check") ||
        (effect.skill !== null && effect.skill !== context.skill)
      ) {
        return total;
      }
      const magnitude =
        "amount" in effect.delta
          ? effect.delta.amount
          : effect.delta.dieSize === 1
            ? effect.delta.dice
            : 0;
      return total + (effect.delta.sign === "-" ? -magnitude : magnitude);
    }, 0) ?? 0
  );
}

function activeAbilityCheckRollModeEffectMatches(
  state: BattleState,
  actorId: CombatantId,
  ability: Ability,
  mode: AttackRollMode,
): boolean {
  const actor = state.combatants.get(actorId);
  const sizeChange = activeCreatureSizeChangeEffect(actor);
  return (
    (ability === "str" &&
      sizeChange !== null &&
      creatureSizeChangeStrengthRollMode(sizeChange) === mode) ||
    (actor?.activeEffects.some(
      (effect) =>
        ((effect.kind === "abilityCheckRollMode" &&
          effect.ability === ability) ||
          (effect.kind === "abilityD20TestRollModeEndTurnSave" &&
            effect.ability === ability) ||
          (effect.kind === "selfAttackRollAndAbilityCheckRollMode" &&
            !ongoingSpellEffectSuppressedByAntimagicField(state, {
              kind: "spellActiveEffect",
              activeEffectKind: "spellObjectContactDamage",
              effectRef: effect.sourceEffectRef,
            }))) &&
        effect.mode === mode,
    ) ??
      false)
  );
}

function activeAnyAbilityCheckRollModeEffectMatches(
  state: BattleState,
  actorId: CombatantId,
  mode: AttackRollMode,
): boolean {
  const actor = state.combatants.get(actorId);
  return (
    actor?.activeEffects.some(
      (effect) =>
        effect.kind === "selfAttackRollAndAbilityCheckRollMode" &&
        !ongoingSpellEffectSuppressedByAntimagicField(state, {
          kind: "spellActiveEffect",
          activeEffectKind: "spellObjectContactDamage",
          effectRef: effect.sourceEffectRef,
        }) &&
        effect.mode === mode,
    ) ?? false
  );
}

function poisonedAbilityCheckDisadvantageMatches(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  const actor = state.combatants.get(actorId);
  return actor === undefined
    ? false
    : hasCondition(actor.conditions, "poisoned");
}

function passiveConditionEndAbilityCheckRollModeMatches(
  state: BattleState,
  actorId: CombatantId,
  condition: Condition,
  mode: AttackRollMode,
): boolean {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return false;
  }
  return characterUnitProcedureBindings(actor.origin.execution).some(
    ({ procedure }) =>
      procedure.kind === "unitFeature" &&
      procedure.execution.kind === "passiveAbilityCheckRollMode" &&
      procedure.execution.abilityCheck.mode === mode &&
      procedure.execution.abilityCheck.scope.kind === "endingCondition" &&
      procedure.execution.abilityCheck.scope.condition === condition,
  );
}

function activeThaumaturgyBoomingVoiceAdvantageMatches(
  state: BattleState,
  actorId: CombatantId,
  ability: Ability,
  skill: Skill,
): boolean {
  const actor = state.combatants.get(actorId);
  return (
    ability === "cha" &&
    skill === THAUMATURGY_BOOMING_VOICE_INTIMIDATION_SKILL &&
    (actor?.activeEffects.some(
      (effect) =>
        effect.kind === "thaumaturgyBoomingVoice" &&
        effect.sourceCombatantId === actorId,
    ) ??
      false)
  );
}

function activeMarkedDamageRiderFindingAdvantageMatches(
  state: BattleState,
  actorId: CombatantId,
  ability: Ability,
  skill: Skill,
  targetId: CombatantId,
): boolean {
  const actor = state.combatants.get(actorId);
  return (
    actor?.activeEffects.some(
      (effect) =>
        effect.kind === "spellMarkedDamageRider" &&
        effect.sourceCombatantId === actorId &&
        effect.targetCombatantId === targetId &&
        effect.abilityCheckBehavior.kind === "findingAdvantage" &&
        effect.abilityCheckBehavior.ability === ability &&
        effect.abilityCheckBehavior.skills.some(
          (candidate) => candidate === skill,
        ),
    ) ?? false
  );
}

function activeRemarkableAthleteAbilityCheckAdvantageMatches(
  state: BattleState,
  actorId: CombatantId,
  ability: Ability,
  skill: Skill,
): boolean {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return false;
  }
  return characterUnitProcedureBindings(actor.origin.execution).some(
    ({ procedure }) =>
      procedure.kind === "unitFeature" &&
      procedure.execution.kind === "remarkableAthlete" &&
      procedure.execution.remarkableAthlete.abilityCheck.kind ===
        "rollAdvantage" &&
      procedure.execution.remarkableAthlete.abilityCheck.ability === ability &&
      procedure.execution.remarkableAthlete.abilityCheck.skill === skill,
  );
}

export function deduplicateBattleHolesById(
  holes: readonly BattleHole[],
): readonly BattleHole[] {
  return [...new Map(holes.map((hole) => [hole.holeId, hole])).values()];
}

export function attackTargetHole(
  state: BattleState,
  actorId: CombatantId,
  attack: BoundSupportedAttackActionOption,
): BattleTargetChoiceHole & {
  readonly attack: NonNullable<BattleTargetChoiceHole["attack"]>;
} {
  return {
    kind: "targetChoice",
    holeId: ATTACK_TARGET_HOLE_ID,
    holeInstanceKey: ATTACK_TARGET_HOLE_INSTANCE,
    label: "Attack target",
    requiresTableSpatialFact: true,
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      actorId,
      "attackRollAgainstEnemy",
    )
      ? {
          relationshipFactRequest: {
            kind: "attackRollTargetIsEnemy" as const,
            attackerId: actorId,
          },
        }
      : {}),
    attack: {
      actorId,
      selection: attackExecutionSelectionForOption(attack),
      targetConstraint: attackTargetConstraint(attack),
    },
    choices: attackTargetChoices(state, actorId, attack),
  };
}

export function ordinaryAttackTargetHole(
  state: BattleState,
  actorId: CombatantId,
  attack: BoundSupportedAttackActionOption,
): BattleTargetChoiceHole {
  const hole = attackTargetHole(state, actorId, attack);
  return ordinaryObjectAttackOptionIsSupported(state, actorId, attack)
    ? {
        ...hole,
        attack: { ...hole.attack, acceptsObjectTarget: true },
      }
    : hole;
}

export function ordinaryObjectAttackOptionIsSupported(
  state: BattleState,
  actorId: CombatantId,
  attack: BoundSupportedAttackActionOption,
): boolean {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, (option) => {
      const actor = state.combatants.get(actorId);
      return (
        actor?.origin.kind === "character" &&
        !option.hasWeaponMastery &&
        activeSpellWeaponDamageRiders(actor, option).length === 0 &&
        eligibleWeaponDamageDiceRollChoiceProcedureRefs(state, actorId, option)
          .length === 0 &&
        eligibleAttackDamageDieFloorProcedureRefs(
          state,
          actorId,
          option,
          option.procedureRef,
        ).length === 0 &&
        actor.origin.execution.procedureBindings.every(
          (binding) =>
            binding.procedure.kind !== "unitFeature" ||
            binding.procedure.execution.kind !== "attackDamageRider",
        ) &&
        attackRollMissToHitReplacementHolePayloadForAttacker(actor)
          .missToHitReplacements === undefined
      );
    }),
    Match.when({ kind: "unarmedStrike" }, () => false),
    Match.when(
      { kind: "statBlockAttack" },
      statBlockAttackSupportsOrdinaryObjectTarget,
    ),
    Match.exhaustive,
  );
}

function statBlockAttackSupportsOrdinaryObjectTarget(
  attack: Extract<
    BoundSupportedAttackActionOption,
    { readonly kind: "statBlockAttack" }
  >,
): boolean {
  return (
    attack.traitAttackRollModes === undefined &&
    attack.attack.onHit.conditionRider === undefined
  );
}

export function searchTargetHole(
  state: BattleState,
  actorId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: SEARCH_TARGET_HOLE_ID,
    holeInstanceKey: SEARCH_TARGET_HOLE_INSTANCE,
    label: "Hidden creature to Search for",
    choices: hiddenSearchTargetChoices(state, actorId),
  };
}

export function grappleTargetHole(
  state: BattleState,
  actorId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: GRAPPLE_TARGET_HOLE_ID,
    holeInstanceKey: GRAPPLE_TARGET_HOLE_INSTANCE,
    label: "Grapple target",
    requiresTableSpatialFact: true,
    choices: grappleTargetChoices(state, actorId),
  };
}

export function shoveTargetHole(
  state: BattleState,
  actorId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: SHOVE_TARGET_HOLE_ID,
    holeInstanceKey: SHOVE_TARGET_HOLE_INSTANCE,
    label: "Shove target",
    requiresTableSpatialFact: true,
    choices: shoveTargetChoices(state, actorId),
  };
}

export function sleepShakeAwakeTargetHole(
  state: BattleState,
  actorId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: SLEEP_SHAKE_AWAKE_TARGET_HOLE_ID,
    holeInstanceKey: SLEEP_SHAKE_AWAKE_TARGET_HOLE_INSTANCE,
    label: "Sleep target to shake awake",
    requiresTableSpatialFact: true,
    choices: sleepShakeAwakeTargetChoices(state, actorId),
  };
}

export function hypnoticPatternShakeAwakeTargetHole(
  state: BattleState,
  actorId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: HYPNOTIC_PATTERN_SHAKE_AWAKE_TARGET_HOLE_ID,
    holeInstanceKey: HYPNOTIC_PATTERN_SHAKE_AWAKE_TARGET_HOLE_INSTANCE,
    label: "Hypnotic Pattern target to shake awake",
    requiresTableSpatialFact: true,
    choices: hypnoticPatternShakeAwakeTargetChoices(state, actorId),
  };
}

export function grappleOutcomeHole(
  state: BattleState,
  link: BattleGrappleLink,
): BattleGrappleOutcomeHole {
  return {
    kind: "grappleOutcome",
    holeId: GRAPPLE_OUTCOME_HOLE_ID,
    holeInstanceKey: GRAPPLE_OUTCOME_HOLE_INSTANCE,
    label: "Grapple saving throw",
    actorId: link.grapplerId,
    targetId: link.targetId,
    dc: link.escapeDc,
    mode: "grappleSave",
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      link.grapplerId,
      "enemySavingThrow",
    )
      ? {
          relationshipFactRequest: {
            kind: "savingThrowTargetIsEnemy" as const,
            actorId: link.grapplerId,
          },
        }
      : {}),
  };
}

export function shoveOutcomeHole(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly dc: DifficultyClass;
}): BattleShoveOutcomeHole {
  return {
    kind: "shoveOutcome",
    holeId: SHOVE_OUTCOME_HOLE_ID,
    holeInstanceKey: SHOVE_OUTCOME_HOLE_INSTANCE,
    label: "Shove saving throw",
    actorId: input.actorId,
    targetId: input.targetId,
    dc: input.dc,
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      input.actorId,
      "enemySavingThrow",
    )
      ? {
          relationshipFactRequest: {
            kind: "savingThrowTargetIsEnemy" as const,
            actorId: input.actorId,
          },
        }
      : {}),
  };
}

export function escapeGrappleOutcomeHole(
  state: BattleState,
  link: BattleGrappleLink,
  actorId: CombatantId,
): BattleGrappleOutcomeHole {
  const rollMode = requiredConditionEndAbilityCheckRollMode(
    state,
    actorId,
    "grappled",
  );
  return {
    kind: "grappleOutcome",
    holeId: ESCAPE_GRAPPLE_OUTCOME_HOLE_ID,
    holeInstanceKey: ESCAPE_GRAPPLE_OUTCOME_HOLE_INSTANCE,
    label: "Escape Grapple ability check",
    actorId,
    targetId: link.grapplerId,
    dc: link.escapeDc,
    mode: "escapeCheck",
    ...optionalProperty("rollMode", rollMode),
  };
}

export function attackTargetChoices(
  state: BattleState,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): readonly CombatantId[];
export function attackTargetChoices(
  state: BattleState,
  actorId: CombatantId,
): readonly CombatantId[] {
  return [...state.combatants.keys()].filter(
    (id) => id !== actorId && state.combatants.has(id),
  );
}

export function hiddenSearchTargetChoices(
  state: BattleState,
  actorId: CombatantId,
): readonly CombatantId[] {
  return [...state.combatants.values()]
    .filter(
      (combatant) =>
        combatant.combatantId !== actorId && combatant.hidden !== null,
    )
    .map((combatant) => combatant.combatantId);
}

export function revealHidden(
  state: BattleState,
  combatantId: CombatantId,
): BattleState {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined || combatant.hidden === null) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, {
      ...combatant,
      hidden: null,
    }),
  };
}

export function bonusActionStandardActionActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (
    !combatantCanTakeActions(actor) ||
    !canSpendBonusAction(state.currentTurnResources)
  ) {
    return [];
  }

  const alternateCostActs = alternateActionCostProfilesForActor(actor).flatMap(
    (entry) =>
      entry.profile.from.actions.flatMap((action) => {
        if (!alternateActionCostActionAvailable(state, actorId, action)) {
          return [];
        }
        if (entry.source.kind === "spellEffect" && action !== "dash") {
          return [];
        }
        const speedKinds =
          action === "dash"
            ? representedMovementSpeedKinds(actor)
            : ["walk" as const];
        return speedKinds.map((speedKind): BattleActDiscoveryCandidate => {
          const execution = {
            initialHoles:
              action === "hide" ? [hideAbilityCheckHole(state, actorId)] : [],
          };
          if (entry.source.kind === "spellEffect") {
            return {
              ...execution,
              subject: {
                tag: "bonusActionStandardAction",
                actorId,
                procedureRef: entry.source.procedureRef,
                sourceEffectRef: entry.source.effectRef,
                action: "dash",
                speedKind,
              },
            };
          }
          if (action === "dash") {
            return {
              ...execution,
              subject: {
                tag: "bonusActionStandardAction",
                actorId,
                procedureRef: entry.source.procedureRef,
                action,
                speedKind,
              },
            };
          }
          return {
            ...execution,
            subject: {
              tag: "bonusActionStandardAction",
              actorId,
              procedureRef: entry.source.procedureRef,
              action,
            },
          };
        });
      }),
  );
  const dashTemporaryHitPointActs =
    bonusActionDashTemporaryHitPointsProfilesForActor(actor).flatMap((entry) =>
      representedMovementSpeedKinds(actor).map((speedKind) => ({
        subject: bonusActionDashSubjectForSpeedKind(
          actorId,
          entry.procedureRef,
          speedKind,
        ),
        initialHoles: [],
      })),
    );
  return [...alternateCostActs, ...dashTemporaryHitPointActs];
}

export function alternateActionCostProfilesForActor(
  combatant: BattleCreatureState | undefined,
): readonly {
  readonly source:
    | {
        readonly kind: "procedure";
        readonly procedureRef: BattleProcedureExecutionRef;
      }
    | {
        readonly kind: "spellEffect";
        readonly procedureRef: BattleProcedureExecutionRef;
        readonly effectRef: BattleActiveEffectExecutionRef;
      };
  readonly profile: Extract<
    UnitSupportProcedureExecution,
    { readonly kind: "alternateActionCost" }
  >;
}[] {
  if (!isCharacterBattleCreatureState(combatant)) {
    return [];
  }
  const characterProfiles =
    combatant.origin.execution.procedureBindings.flatMap((binding) => {
      const procedure = binding.procedure;
      return procedure.kind === "unitSupportProfile" &&
        typeof procedure.execution === "object" &&
        procedure.execution.kind === "alternateActionCost"
        ? [
            {
              source: {
                kind: "procedure" as const,
                procedureRef: binding.procedureRef,
              },
              profile: procedure.execution,
            },
          ]
        : [];
    });
  const spellEffectProfiles = combatant.activeEffects.flatMap((effect) =>
    effect.kind === "spellDashBonusAction"
      ? [
          {
            source: {
              kind: "spellEffect" as const,
              procedureRef: effect.sourceProcedureRef,
              effectRef: effect.effectRef,
            },
            profile: {
              kind: "alternateActionCost" as const,
              from: {
                kind: "standardAction" as const,
                actions: ["dash"] as const,
              },
              to: { kind: "bonusAction" as const },
            },
          },
        ]
      : [],
  );
  return [...characterProfiles, ...spellEffectProfiles];
}

export function bonusActionDashTemporaryHitPointsProfilesForActor(
  combatant: BattleCreatureState | undefined,
): readonly {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly profile: Extract<
    UnitFeatureProcedureExecution | UnitSupportProcedureExecution,
    { readonly kind: "bonusActionDashTemporaryHitPoints" }
  >;
  readonly resource: CharacterBattleUseCountResourceState;
}[] {
  if (combatant?.origin.kind !== "character") {
    return [];
  }
  const origin = combatant.origin;
  return origin.execution.procedureBindings.flatMap((binding) => {
    const procedure = binding.procedure;
    if (
      (procedure.kind !== "unitFeature" &&
        procedure.kind !== "unitSupportProfile") ||
      typeof procedure.execution !== "object" ||
      procedure.execution.kind !==
        BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE ||
      procedure.source.kind !== "resourcePool"
    ) {
      return [];
    }
    const resourcePoolRef = procedure.source.resourcePoolRef;
    const resource = origin.resources.find(
      (candidate) => candidate.resourcePoolRef === resourcePoolRef,
    );
    return resource !== undefined && resourceHasUsesRemaining(resource)
      ? [
          {
            procedureRef: binding.procedureRef,
            profile: procedure.execution,
            resource,
          },
        ]
      : [];
  });
}

export function alternateActionCostActionAvailable(
  state: BattleState,
  actorId: CombatantId,
  action: AlternateActionCostAction,
): boolean {
  return Match.value(action).pipe(
    Match.when("dash", () => true),
    Match.when("disengage", () => true),
    Match.when("hide", () => canHideInCurrentCircumstances(state, actorId)),
    Match.exhaustive,
  );
}

export function canHideInCurrentCircumstances(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  const prerequisite = state.hidePrerequisites.get(combatantId);
  if (prerequisite === undefined) return false;
  return Match.value(prerequisite).pipe(
    Match.when({ kind: "heavilyObscuredOutOfEnemyLineOfSight" }, () => true),
    Match.when({ kind: "coverOutOfEnemyLineOfSight" }, () => true),
    Match.when(
      { kind: "obscuredOnlyByCreatureOutOfEnemyLineOfSight" },
      (creatureObscurement) =>
        canHideWhenObscuredOnlyByCreature(
          state,
          combatantId,
          creatureObscurement.obscuringCreatureId,
        ),
    ),
    Match.exhaustive,
  );
}

function canHideWhenObscuredOnlyByCreature(
  state: BattleState,
  combatantId: CombatantId,
  obscuringCreatureId: CombatantId,
): boolean {
  const combatant = state.combatants.get(combatantId);
  const obscuringCreature = state.combatants.get(obscuringCreatureId);
  return (
    combatant !== undefined &&
    obscuringCreature !== undefined &&
    obscuredOnlyByLargerCreatureHidePermissionForCombatant(combatant) !==
      null &&
    creatureSizeIsLargerThanSelf(
      combatantEffectiveSize(combatant),
      combatantEffectiveSize(obscuringCreature),
    )
  );
}

function obscuredOnlyByLargerCreatureHidePermissionForCombatant(
  combatant: BattleCreatureState,
): Extract<
  UnitFeatureProcedureExecution | UnitSupportProcedureExecution,
  { readonly kind: "hideActionObscurementPermission" }
> | null {
  if (combatant.origin.kind !== "character") {
    return null;
  }
  for (const binding of combatant.origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      (procedure.kind === "unitFeature" ||
        procedure.kind === "unitSupportProfile") &&
      typeof procedure.execution === "object" &&
      procedure.execution.kind ===
        HIDE_ACTION_OBSCUREMENT_PERMISSION_SUPPORT_PROFILE &&
      hideActionObscurementPermissionAllowsLargerCreatureObscurement(
        procedure.execution.permission,
      )
    ) {
      return procedure.execution;
    }
  }
  return null;
}

function hideActionObscurementPermissionAllowsLargerCreatureObscurement(
  permission: HideActionObscurementPermissionProfile,
): boolean {
  return Match.value(permission.allowedObscurement).pipe(
    Match.when(
      {
        kind: "obscuredOnlyByCreature",
        creatureSizeRelationToSelf: "atLeastOneSizeLarger",
      },
      () => true,
    ),
    Match.exhaustive,
  );
}

export function grappleTargetChoices(
  state: BattleState,
  actorId: CombatantId,
): readonly CombatantId[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined || isPresentFindFamiliarCombatant(state, actorId)) {
    return [];
  }
  return [...state.combatants.keys()].filter((targetId) => {
    const link = grappleLinkForTarget(state, actorId, targetId, [
      {
        kind: "grappleTargetWithinReach",
        grapplerId: actorId,
        targetId,
      },
    ]);
    return link.tag === "ok";
  });
}

export function shoveTargetChoices(
  state: BattleState,
  actorId: CombatantId,
): readonly CombatantId[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined || isPresentFindFamiliarCombatant(state, actorId)) {
    return [];
  }
  return [...state.combatants.keys()].filter((targetId) => {
    const shove = shoveForTarget(state, actorId, targetId, [
      {
        kind: "shoveTargetWithinReach",
        shoverId: actorId,
        targetId,
      },
    ]);
    return shove.tag === "ok";
  });
}
