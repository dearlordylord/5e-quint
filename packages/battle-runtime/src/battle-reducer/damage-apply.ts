// RAW-COVERAGE: runtime-owner RAW-RULES-GLOSSARY-CONCENTRATION-DAMAGE-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll unit-feature.enemy-zero-hit-point-temporary-hit-points
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-duration-and-concentration
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// Spell-condition protocol helpers live in spell-condition-effects-helpers.ts
// so damage application and spell effects can share them without a cycle.
// KERNEL-COVERAGE: runtime-owner SHARED.HIT_POINTS.POSITIVE_DAMAGE BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES BATTLE.SPELL.DAMAGE_SAVE_OR_ATTACK_PROCEDURE BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE

import { optionalProperty } from "../optional-property.ts";
import {
  applyCondition,
  hasCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import {
  addDeathFailures,
  resetDeathSaveRuntimeState,
  resolveDeathSavingThrow,
} from "@dnd/shared-algebras/death-saves-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  DieRollResult,
  Hp,
  damageAmount as toDamageAmount,
  type DamageAmount,
} from "@dnd/shared/types";
import { Match, Result } from "effect";
import {
  applyStatBlockRechargeRolls,
  unavailableStatBlockRechargePoolRefs,
} from "../stat-block-execution-state.ts";
import { KNOCKED_OUT_UNCONSCIOUS } from "../positive-hp-unconscious.ts";
import {
  type AttackDamageRider,
  type BattleActiveEffect,
  type BattleAttackDamageDisposition,
  type BattleConcentration,
  type BattleConcentrationSavingThrowHole,
  type BattleCreatureState,
  type BattleDeathSavingThrowHole,
  type BattleFlySpeedGrantEndFallCleanupFrame,
  type BattleFill,
  type BattleDamageRelationshipDecision,
  type BattleDamageRelationshipDecisions,
  type BattleReadiedSpell,
  type BattleStatBlockRechargeRollHole,
  type BattleStatBlockRechargeRollResult,
  type BattleState,
  type BattleTargetSpatialFact,
  type WeaponDamageDiceRollChoiceFill,
  type WeaponDamageDiceRollChoiceUsage,
} from "../battle-state-execution.ts";
import {
  CONCENTRATION_SAVING_THROW_HOLE_INSTANCE_PREFIX,
  DEATH_SAVING_THROW_HOLE_ID,
  DEATH_SAVING_THROW_HOLE_INSTANCE,
  STAT_BLOCK_RECHARGE_ROLL_HOLE_ID,
  STAT_BLOCK_RECHARGE_ROLL_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";
import { zeroHpLifecycleIsTerminal } from "./creature-state-leaves.ts";
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
  type CharacterBattleUseCountResourceState,
} from "../character-battle-resource-execution.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";
import { setCompanion } from "../companion-state.ts";
import { findPresentFamiliarById } from "../spawned-companion-state.ts";
import { retainedStoredFormForPresentCompanion } from "../companion-stored-form.ts";
import { findFamiliarDisappearedAtZeroHitPointsState } from "../companion-state.ts";
import type { ZeroHpLifecycle } from "../zero-hp-lifecycle.ts";
import { removeBattleCombatants } from "./combatant-removal.ts";
import {
  appliedHitPointMaximumIncreaseAmount,
  effectiveHitPointMaximum,
  hitPointMaximumIncreaseAmount,
} from "./hit-point-maximum.ts";
import {
  currentActorId,
  normalizeBattleGrapples,
} from "./creature-state-leaves.ts";
import {
  battleCreatureStateWithDamageProjection,
  battleCreatureStateWithKnockOutPreservedConditions,
  battleCreatureStateWithoutKnockOut,
  knockedOutConditionState,
  knockedOutOneHp,
} from "./creature-hit-point-state.ts";
import {
  activeDruidWildShape,
  applyActiveDruidWildShapeRechargeRolls,
} from "./druid-wild-shape.ts";
import { concentrationSavingThrowDc } from "./domain-helpers.ts";
import {
  battleStateWithFlySpeedGrantEndFallCleanupFrames,
  flySpeedGrantEndFallCleanupFramesForExpiredEffects,
} from "./fly-speed-grant-end-fall-cleanup.ts";
import {
  checkSaveGatedConditionWithRepeatDamageRepeatSaveFills,
  saveGatedConditionWithRepeatDamageRepeatSaveHoles,
  saveGatedConditionWithRepeatRepeatSavingThrowOutcomeHole,
  validateSaveGatedConditionWithRepeatRepeatSavingThrowOutcome,
} from "./hideous-laughter-repeat-save.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";
import {
  conditionsAfterExpiringSpellConditionEffects,
  removeSaveGatedAreaControlEffectsFromTarget,
  removeSaveGatedConditionWithRepeatEffectFromTarget,
  removeSleepEffectsFromTarget,
} from "./spell-condition-effects-helpers.ts";
import { battleCreatureWithSpellCreatedHeldObjectHandStateFromActiveEffects } from "./spell-created-held-object.ts";
import {
  battleCreatureWithSpellEndTargetStatePromotions,
  END_OF_NEXT_TURN_DURING_TURN,
  spellEndTargetStatePromotesIncapacitated,
} from "./spell-end-target-state.ts";
import { battleStateWithoutCurrentActorSpellGrantedActionResourcesForEffects } from "./spell-granted-action-resource.ts";
import { enemyZeroHitPointTemporaryHitPointsAwards } from "./enemy-zero-hit-point-temporary-hit-points.ts";
import {
  d20TestNaturalOneRerollOutcomeIssue,
  effectiveD20TestNaturalOneRerollConcentrationSavingThrow,
} from "./d20-test-natural-one-reroll.ts";
import {
  battleStateAfterLinkedDefenseResistanceDamageShareCasterZeroHitPoints,
  isLinkedDefenseResistanceDamageShareEffect,
  linkedDefenseResistanceDamageShareSavingThrowFlatBonusProjectionsForTarget,
} from "./warding-bond.ts";

type ConcentrationSavingThrowFill = Extract<
  BattleFill,
  { readonly kind: "concentrationSavingThrow" }
>;
type SavingThrowOutcomeFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;
type SaveGatedConditionWithRepeatRepeatSaveHole = ReturnType<
  typeof saveGatedConditionWithRepeatDamageRepeatSaveHoles
>[number];
type SaveGatedConditionWithRepeatEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "saveGatedConditionWithRepeat" }
>;
type ConcentrationSavingThrowFillHolePair = {
  readonly fill: ConcentrationSavingThrowFill;
  readonly hole: BattleConcentrationSavingThrowHole;
};

export function breakBattleConcentration(
  state: BattleState,
  combatantId: CombatantId,
): BattleState {
  const concentration = state.combatants.get(combatantId)?.concentration;
  const currentActorExpiringEffects =
    currentActorEffectsExpiringFromConcentrationBreak(
      state,
      combatantId,
      concentration ?? null,
    );
  let readiedSpells: ReadonlyMap<CombatantId, BattleReadiedSpell> =
    state.readiedSpells;
  if (concentration?.effectKind === "readiedSpell") {
    const remainingReadiedSpells = new Map(state.readiedSpells);
    remainingReadiedSpells.delete(combatantId);
    readiedSpells = remainingReadiedSpells;
  }
  const broken = breakCombatantConcentration(
    state,
    state.combatants,
    combatantId,
  );
  const brokenState = battleStateWithFlySpeedGrantEndFallCleanupFrames(
    {
      ...state,
      combatants: broken.value,
      objectOutlines: state.objectOutlines.filter(
        (outline) => outline.expiresAt.combatantId !== combatantId,
      ),
      readiedSpells,
    },
    broken.flySpeedGrantEndFallCleanupFrames,
  );
  const cleanedState =
    battleStateWithoutCurrentActorSpellGrantedActionResourcesForEffects(
      brokenState,
      currentActorExpiringEffects,
    );
  return battleStateAfterSpellEndTargetStatePromotionConcentrationBreaks(
    cleanedState,
    broken.spellEndTargetStatePromotionIds,
  );
}

export function breakBattleConcentrationAfterDamage(input: {
  readonly state: BattleState;
  readonly combatantId: CombatantId;
  readonly priorConcentration: BattleConcentration | null;
  readonly priorCombatant: BattleCreatureState;
}): BattleState {
  const currentConcentration =
    input.state.combatants.get(input.combatantId)?.concentration ?? null;
  if (currentConcentration !== null) {
    return breakBattleConcentration(input.state, input.combatantId);
  }
  if (input.priorConcentration?.effectKind === "spellEffect") {
    return battleStateAfterCombatantConcentrationBreak({
      state: input.state,
      combatantId: input.combatantId,
      priorConcentration: input.priorConcentration,
      priorCombatant: input.priorCombatant,
    });
  }
  if (input.priorConcentration?.effectKind !== "readiedSpell") {
    return input.state;
  }
  const readiedSpells = new Map(input.state.readiedSpells);
  readiedSpells.delete(input.combatantId);
  return { ...input.state, readiedSpells };
}

type BreakCombatantConcentrationResult = {
  readonly value: ReadonlyMap<CombatantId, BattleCreatureState>;
  readonly flySpeedGrantEndFallCleanupFrames: readonly BattleFlySpeedGrantEndFallCleanupFrame[];
  readonly spellEndTargetStatePromotionIds: readonly CombatantId[];
};

export function battleStateAfterSpellEndTargetStatePromotionConcentrationBreaks(
  state: BattleState,
  combatantIds: readonly CombatantId[],
): BattleState {
  return [...new Set(combatantIds)].reduce((nextState, combatantId) => {
    const combatant = nextState.combatants.get(combatantId);
    return combatant !== undefined &&
      combatant.concentration !== null &&
      hasCondition(combatant.conditions, "incapacitated")
      ? breakBattleConcentration(nextState, combatantId)
      : nextState;
  }, state);
}

function battleStateAfterCombatantConcentrationBreak(input: {
  readonly state: BattleState;
  readonly combatantId: CombatantId;
  readonly priorConcentration: BattleConcentration;
  readonly priorCombatant: BattleCreatureState;
}): BattleState {
  const currentActorExpiringEffects =
    currentActorEffectsExpiringFromConcentrationBreak(
      input.state,
      input.combatantId,
      input.priorConcentration,
    );
  const broken = breakCombatantConcentration(
    input.state,
    input.state.combatants,
    input.combatantId,
    input.priorConcentration,
  );
  const priorFrames = flySpeedGrantEndFallCleanupFramesForExpiredEffects(
    input.priorCombatant.combatantId,
    input.priorCombatant.activeEffects.filter((effect) =>
      concentrationBrokenEffectFrom(
        effect,
        input.combatantId,
        input.priorConcentration,
      ),
    ),
  ).filter(
    (frame) =>
      !broken.flySpeedGrantEndFallCleanupFrames.some(
        (candidate) => candidate.endedEffect === frame.endedEffect,
      ),
  );
  const brokenState = battleStateWithFlySpeedGrantEndFallCleanupFrames(
    {
      ...input.state,
      combatants: broken.value,
    },
    [...broken.flySpeedGrantEndFallCleanupFrames, ...priorFrames],
  );
  const cleanedState =
    battleStateWithoutCurrentActorSpellGrantedActionResourcesForEffects(
      brokenState,
      currentActorExpiringEffects,
    );
  return battleStateAfterSpellEndTargetStatePromotionConcentrationBreaks(
    cleanedState,
    broken.spellEndTargetStatePromotionIds,
  );
}

export function resolveBattleConcentrationDamage(input: {
  readonly state: BattleState;
  readonly combatantId: CombatantId;
  readonly damageAmount: number;
  readonly savingThrowSucceeded: boolean;
}): BattleState {
  const combatant = input.state.combatants.get(input.combatantId);
  if (
    combatant?.concentration === null ||
    combatant === undefined ||
    input.damageAmount <= 0 ||
    input.savingThrowSucceeded
  ) {
    return input.state;
  }
  return breakBattleConcentration(input.state, input.combatantId);
}

export function applyTemporaryHitPoints(
  combatant: BattleCreatureState,
  temporaryHitPoints: number,
): BattleCreatureState {
  return {
    ...combatant,
    tempHp: Hp(Math.max(Number(combatant.tempHp), temporaryHitPoints)),
  };
}

type HitPointMaximumIncreaseEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "hitPointMaximumIncrease" }
>;

export function applyHitPointMaximumIncrease(
  combatant: BattleCreatureState,
  effect: HitPointMaximumIncreaseEffect,
): BattleCreatureState {
  const amount = hitPointMaximumIncreaseAmount(effect);
  if (amount <= 0 || zeroHpLifecycleIsTerminal(combatant)) {
    return combatant;
  }
  const activeAmount = appliedHitPointMaximumIncreaseAmount(
    combatant.activeEffects,
  );
  const activeEffects = [...combatant.activeEffects, effect];
  const nextActiveAmount = appliedHitPointMaximumIncreaseAmount(activeEffects);
  const currentHitPointIncrease = nextActiveAmount - activeAmount;
  if (currentHitPointIncrease <= 0) {
    return { ...combatant, activeEffects };
  }
  return applyCurrentHitPointIncrease(
    {
      ...combatant,
      activeEffects,
    },
    currentHitPointIncrease,
  );
}

export function applyHitPointMaximumIncreaseExpiration(
  combatant: BattleCreatureState,
  expiring: readonly BattleActiveEffect[],
): BattleCreatureState {
  const amount =
    appliedHitPointMaximumIncreaseAmount([
      ...combatant.activeEffects,
      ...expiring,
    ]) - appliedHitPointMaximumIncreaseAmount(combatant.activeEffects);
  if (amount <= 0 || zeroHpLifecycleIsTerminal(combatant)) {
    return combatant;
  }
  const nextHp = Hp(Math.max(0, Number(combatant.hp) - amount));
  const updated = battleCreatureStateWithoutKnockOut(
    combatant,
    nextHp,
    combatant.conditions,
  );
  return Number(nextHp) > 0 ? updated : applyInitialZeroHpLifecycle(updated);
}

function applyCurrentHitPointIncrease(
  combatant: BattleCreatureState,
  amount: number,
): BattleCreatureState {
  return battleCreatureStateAfterHitPointIncrease(
    combatant,
    Hp(Number(combatant.hp) + amount),
  );
}

function battleCreatureStateAfterHitPointIncrease(
  combatant: BattleCreatureState,
  nextHp: Hp,
): BattleCreatureState {
  if (Number(combatant.hp) <= 0 && Number(nextHp) > 0) {
    return {
      ...battleCreatureStateWithoutKnockOut(
        combatant,
        nextHp,
        removeCondition(combatant.conditions, "unconscious"),
      ),
      zeroHpLifecycle:
        combatant.zeroHpLifecycle.policy === "usesDeathSavingThrows"
          ? {
              ...combatant.zeroHpLifecycle,
              deathSaves: resetDeathSaveRuntimeState(),
            }
          : combatant.zeroHpLifecycle,
    };
  }
  if (combatant.positiveHpUnconscious !== null) {
    return battleCreatureStateWithoutKnockOut(
      combatant,
      nextHp,
      removeCondition(combatant.conditions, "unconscious"),
    );
  }
  return battleCreatureStateWithoutKnockOut(
    combatant,
    nextHp,
    combatant.conditions,
  );
}

export function applyBattleHitPointDamage(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly damageAmount: number;
  readonly deathFailuresAtZeroHp: 1 | 2;
  readonly damageDisposition?: BattleAttackDamageDisposition | undefined;
  readonly damageSourceId?: CombatantId | undefined;
  readonly concentrationSavingThrow?:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
  readonly linkedDefenseResistanceDamageShareConcentrationSavingThrows?: readonly ConcentrationSavingThrowFill[];
  readonly saveGatedConditionWithRepeatDamageRepeatSaves?: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly saveGatedConditionWithRepeatDamageRepeatSaveEventKey?:
    | string
    | undefined;
  readonly spatialFacts?: readonly BattleTargetSpatialFact[];
  readonly relationshipDecisions?: BattleDamageRelationshipDecisions;
  readonly suppressLinkedDefenseResistanceDamageShareDamageShare?: true;
}): BattleState {
  const damaged = applyHpDamage(input.target, input.damageAmount, {
    deathFailuresAtZeroHp: input.deathFailuresAtZeroHp,
    ...optionalProperty("damageDisposition", input.damageDisposition),
  });
  const targetId = input.target.combatantId;
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(targetId, damaged),
  };
  const afterMarkDrop = markMarkedDamageRiderTransferAvailable(
    nextState,
    targetId,
    input.target.hp,
    damaged.hp,
  );
  const effectiveConcentrationSavingThrow =
    input.concentrationSavingThrow === undefined
      ? undefined
      : effectiveD20TestNaturalOneRerollConcentrationSavingThrow(
          input.concentrationSavingThrow,
        );
  const afterConcentration =
    input.damageAmount > 0 &&
    (effectiveConcentrationSavingThrow?.value.succeeded === false ||
      (input.target.concentration !== null && damaged.concentration === null))
      ? breakBattleConcentrationAfterDamage({
          state: afterMarkDrop,
          combatantId: targetId,
          priorConcentration: input.target.concentration,
          priorCombatant: input.target,
        })
      : afterMarkDrop;
  const afterCasterOrAllyDamageEscapes =
    input.damageAmount > 0 && input.damageSourceId !== undefined
      ? removeSpellConditionEffectsFromTargetDamagedByCasterOrAlly(
          afterConcentration,
          input.damageSourceId,
          targetId,
          input.relationshipDecisions ?? [],
        )
      : afterConcentration;
  const afterTargetActionEarlyEnd =
    input.damageAmount > 0 && input.damageSourceId !== undefined
      ? battleStateAfterTargetActionEarlyEndForActor(
          afterCasterOrAllyDamageEscapes,
          input.damageSourceId,
        )
      : afterCasterOrAllyDamageEscapes;
  const afterSleep =
    input.damageAmount > 0
      ? removeSleepEffectsFromTarget(afterTargetActionEarlyEnd, targetId)
      : afterTargetActionEarlyEnd;
  const afterSaveGatedAreaControl =
    input.damageAmount > 0
      ? removeSaveGatedAreaControlEffectsFromTarget(afterSleep, targetId)
      : afterSleep;
  const afterSaveGatedConditionWithRepeat =
    input.damageAmount > 0
      ? applySaveGatedConditionWithRepeatDamageRepeatSaves(
          afterSaveGatedAreaControl,
          targetId,
          input.saveGatedConditionWithRepeatDamageRepeatSaves ?? [],
          input.saveGatedConditionWithRepeatDamageRepeatSaveEventKey,
        )
      : afterSaveGatedAreaControl;
  const afterEnemyZeroHitPointTemporaryHitPoints =
    input.damageAmount > 0
      ? applyEnemyZeroHitPointTemporaryHitPointsAwards({
          state: afterSaveGatedConditionWithRepeat,
          damageSourceId: input.damageSourceId,
          targetId,
          priorTarget: input.target,
          damagedTarget: damaged,
          spatialFacts: input.spatialFacts ?? [],
          relationshipDecisions: input.relationshipDecisions ?? [],
        })
      : afterSaveGatedConditionWithRepeat;
  const afterFamiliar = applyFindFamiliarZeroHitPointDisappearanceAfterDamage({
    state: afterEnemyZeroHitPointTemporaryHitPoints,
    targetId,
    priorHp: input.target.hp,
    nextHp: damaged.hp,
  });
  const afterLinkedDefenseResistanceDamageShareDamageShare =
    input.damageAmount > 0 &&
    input.suppressLinkedDefenseResistanceDamageShareDamageShare !== true
      ? applyLinkedDefenseResistanceDamageShareDamageShare({
          state: afterFamiliar,
          target: input.target,
          damageAmount: input.damageAmount,
          concentrationSavingThrows:
            input.linkedDefenseResistanceDamageShareConcentrationSavingThrows ??
            [],
          saveGatedConditionWithRepeatDamageRepeatSaves:
            input.saveGatedConditionWithRepeatDamageRepeatSaves ?? [],
          saveGatedConditionWithRepeatDamageRepeatSaveEventKey:
            input.saveGatedConditionWithRepeatDamageRepeatSaveEventKey,
        })
      : afterFamiliar;
  return battleStateAfterLinkedDefenseResistanceDamageShareCasterZeroHitPoints(
    afterLinkedDefenseResistanceDamageShareDamageShare,
  );
}

function applyEnemyZeroHitPointTemporaryHitPointsAwards(input: {
  readonly state: BattleState;
  readonly damageSourceId: CombatantId | undefined;
  readonly targetId: CombatantId;
  readonly priorTarget: BattleCreatureState;
  readonly damagedTarget: BattleCreatureState;
  readonly spatialFacts: readonly BattleTargetSpatialFact[];
  readonly relationshipDecisions: readonly BattleDamageRelationshipDecision[];
}): BattleState {
  const awards = enemyZeroHitPointTemporaryHitPointsAwards(input);
  if (awards.length === 0) {
    return input.state;
  }
  let combatants = input.state.combatants;
  for (const award of awards) {
    const beneficiary = combatants.get(award.beneficiaryId);
    if (beneficiary === undefined) {
      continue;
    }
    combatants = new Map(combatants).set(
      award.beneficiaryId,
      applyTemporaryHitPoints(beneficiary, award.temporaryHitPoints),
    );
  }
  return combatants === input.state.combatants
    ? input.state
    : { ...input.state, combatants };
}

export function damageLifecycleConcentrationSavingThrowHoles(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly damageAmount: number;
}): readonly BattleConcentrationSavingThrowHole[] {
  const targetHole = concentrationSavingThrowHole(
    input.target,
    input.damageAmount,
  );
  return [
    ...(targetHole === null ? [] : [targetHole]),
    ...linkedDefenseResistanceDamageShareConcentrationSavingThrowHoles(input),
  ];
}

export function fillsMatchingHoleIds<F extends { readonly holeId: unknown }>(
  fills: readonly F[],
  holes: readonly { readonly holeId: unknown }[],
): readonly F[] {
  const holeIds = new Set(holes.map((hole) => String(hole.holeId)));
  return fills.filter((fill) => holeIds.has(String(fill.holeId)));
}

export function damageLifecycleConcentrationSavingThrowFillCheck(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly damageAmount: number;
  readonly fills: readonly ConcentrationSavingThrowFill[];
}):
  | {
      readonly tag: "ok";
      readonly holes: readonly BattleConcentrationSavingThrowHole[];
    }
  | {
      readonly tag: "needsHoles";
      readonly holes: readonly BattleConcentrationSavingThrowHole[];
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const holes = damageLifecycleConcentrationSavingThrowHoles(input);
  const missingHoles = holes.filter(
    (hole) => !input.fills.some((fill) => fill.holeId === hole.holeId),
  );
  if (missingHoles.length > 0) {
    return { tag: "needsHoles", holes: missingHoles };
  }
  const pairs: readonly ConcentrationSavingThrowFillHolePair[] =
    input.fills.flatMap((fill) => {
      const hole = holes.find((candidate) => candidate.holeId === fill.holeId);
      return hole === undefined ? [] : [{ fill, hole }];
    });
  const everyFillHasMatchingHole = pairs.length === input.fills.length;
  if (everyFillHasMatchingHole) {
    const d20TestNaturalOneRerollIssue =
      concentrationD20TestNaturalOneRerollIssue(input.state, pairs);
    return d20TestNaturalOneRerollIssue === null
      ? { tag: "ok", holes }
      : { tag: "invalid", message: d20TestNaturalOneRerollIssue };
  }
  return {
    tag: "invalid",
    message:
      holes.length === 0
        ? "Concentration Saving Throw fill is only valid for a concentrating damaged target."
        : "Concentration Saving Throw fill does not match the damaged target or linked-protection caster.",
  };
}

function concentrationD20TestNaturalOneRerollIssue(
  state: BattleState,
  pairs: readonly ConcentrationSavingThrowFillHolePair[],
): string | null {
  for (const { fill, hole } of pairs) {
    const actor = state.combatants.get(hole.combatantId);
    const issue = d20TestNaturalOneRerollOutcomeIssue({
      actor,
      rollMode: hole.rollMode,
      rolledD20s: fill.value.rolledD20s,
      originalNaturalD20: fill.value.naturalD20,
      decision: fill.value.d20TestNaturalOneReroll,
      withoutRoll: fill.value.withoutRoll,
      succeeded: fill.value.succeeded,
    });
    if (issue !== null) {
      return issue;
    }
  }
  return null;
}

export function linkedDefenseResistanceDamageShareConcentrationSavingThrowHoles(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly damageAmount: number;
}): readonly BattleConcentrationSavingThrowHole[] {
  if (input.damageAmount <= 0) {
    return [];
  }
  return linkedDefenseResistanceDamageShareCasters(
    input.state,
    input.target,
  ).flatMap((caster) => {
    const hole = concentrationSavingThrowHole(caster, input.damageAmount);
    return hole === null ? [] : [hole];
  });
}

export function damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly damageAmount: number;
  readonly fills: readonly SavingThrowOutcomeFill[];
  readonly damageEventKey?: string | undefined;
}): ReturnType<typeof checkSaveGatedConditionWithRepeatDamageRepeatSaveFills> {
  const holes =
    damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles(input);
  return checkSaveGatedConditionWithRepeatDamageRepeatSaveFills({
    holes,
    fills: input.fills,
  });
}

export function damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly damageAmount: number;
  readonly damageEventKey?: string | undefined;
}): readonly SaveGatedConditionWithRepeatRepeatSaveHole[] {
  return input.damageAmount > 0
    ? [
        ...saveGatedConditionWithRepeatDamageRepeatSaveHoles(
          input.target,
          input.damageEventKey,
        ),
        ...linkedDefenseResistanceDamageShareSaveGatedConditionWithRepeatRepeatSaveHoles(
          input,
        ),
      ]
    : [];
}

function linkedDefenseResistanceDamageShareSaveGatedConditionWithRepeatRepeatSaveHoles(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly damageAmount: number;
  readonly damageEventKey?: string | undefined;
}): ReturnType<typeof saveGatedConditionWithRepeatDamageRepeatSaveHoles> {
  return linkedDefenseResistanceDamageShareCasters(
    input.state,
    input.target,
  ).flatMap((caster) =>
    saveGatedConditionWithRepeatDamageRepeatSaveHoles(
      caster,
      input.damageEventKey,
    ),
  );
}

function applyLinkedDefenseResistanceDamageShareDamageShare(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly damageAmount: number;
  readonly concentrationSavingThrows: readonly ConcentrationSavingThrowFill[];
  readonly saveGatedConditionWithRepeatDamageRepeatSaves: readonly SavingThrowOutcomeFill[];
  readonly saveGatedConditionWithRepeatDamageRepeatSaveEventKey?:
    | string
    | undefined;
}): BattleState {
  return input.target.activeEffects
    .filter(isLinkedDefenseResistanceDamageShareEffect)
    .reduce((state, effect) => {
      const caster = linkedDefenseResistanceDamageShareCaster(
        state,
        input.target,
        effect.sourceCombatantId,
      );
      if (caster === null) {
        return state;
      }
      const concentrationSave = concentrationSavingThrowHole(
        caster,
        input.damageAmount,
      );
      const concentrationSavingThrow =
        concentrationSave === null
          ? undefined
          : input.concentrationSavingThrows.find(
              (fill) => fill.holeId === concentrationSave.holeId,
            );
      return applyBattleHitPointDamage({
        state,
        target: caster,
        damageAmount: input.damageAmount,
        deathFailuresAtZeroHp: 1,
        concentrationSavingThrow,
        saveGatedConditionWithRepeatDamageRepeatSaves:
          input.saveGatedConditionWithRepeatDamageRepeatSaves,
        saveGatedConditionWithRepeatDamageRepeatSaveEventKey:
          input.saveGatedConditionWithRepeatDamageRepeatSaveEventKey,
        suppressLinkedDefenseResistanceDamageShareDamageShare: true,
      });
    }, input.state);
}

function linkedDefenseResistanceDamageShareCasters(
  state: BattleState,
  target: BattleCreatureState,
): readonly BattleCreatureState[] {
  return target.activeEffects
    .filter(isLinkedDefenseResistanceDamageShareEffect)
    .flatMap((effect) => {
      const caster = linkedDefenseResistanceDamageShareCaster(
        state,
        target,
        effect.sourceCombatantId,
      );
      return caster === null ? [] : [caster];
    });
}

function linkedDefenseResistanceDamageShareCaster(
  state: BattleState,
  target: BattleCreatureState,
  casterId: CombatantId,
): BattleCreatureState | null {
  const caster = state.combatants.get(casterId);
  if (
    caster === undefined ||
    caster.combatantId === target.combatantId ||
    Number(caster.hp) === 0
  ) {
    return null;
  }
  return caster;
}

function applyFindFamiliarZeroHitPointDisappearanceAfterDamage(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly priorHp: Hp;
  readonly nextHp: Hp;
}): BattleState {
  if (input.priorHp <= 0 || input.nextHp !== 0) {
    return input.state;
  }
  const entry = findPresentFamiliarById(input.state, input.targetId);
  if (entry === null) {
    return input.state;
  }
  const retainedForm = retainedStoredFormForPresentCompanion({
    state: input.state,
    companionId: entry.companionId,
    companion: entry.familiar,
  });
  if (typeof retainedForm === "string") {
    return removeInvalidPresentFindFamiliarAfterZeroHitPointDamage({
      state: input.state,
      companionId: entry.companionId,
      ownerId: entry.ownerId,
    });
  }
  const target = input.state.combatants.get(input.targetId);
  /* v8 ignore start -- @preserve -- A present familiar is removed only after its live combatant has been resolved; a missing entry is malformed cross-record state. */
  if (target === undefined) {
    return removeInvalidPresentFindFamiliarAfterZeroHitPointDamage({
      state: input.state,
      companionId: entry.companionId,
      ownerId: entry.ownerId,
    });
  }
  /* v8 ignore stop -- @preserve */
  const disappearedFamiliar = findFamiliarDisappearedAtZeroHitPointsState({
    storedForm: retainedForm,
    ownerId: entry.ownerId,
    identity: entry.familiar.identity,
    protocol: entry.familiar.protocol,
    creatureTypeOverride: entry.familiar.creatureTypeOverride,
    reactionAvailable: target.reactionAvailable,
  });
  const removed = removeBattleCombatants({
    state: input.state,
    combatantIds: [input.targetId],
  });
  const stateWithoutFamiliar = Result.isFailure(removed)
    ? input.state
    : removed.success;
  return {
    ...stateWithoutFamiliar,
    companions: setCompanion(
      stateWithoutFamiliar.companions,
      disappearedFamiliar,
    ),
  };
}

/* v8 ignore start -- @preserve -- Malformed cross-record state repair: runtime admission creates present familiars with matching Stat Block combatants; this branch defensively removes an independently decoded or forged inconsistent companion record. */
function removeInvalidPresentFindFamiliarAfterZeroHitPointDamage(input: {
  readonly state: BattleState;
  readonly companionId: CombatantId;
  readonly ownerId: CombatantId;
}): BattleState {
  const removed = removeBattleCombatants({
    state: input.state,
    combatantIds: [input.companionId],
  });
  const stateWithoutCombatant = Result.isFailure(removed)
    ? input.state
    : removed.success;
  const companions = new Map(stateWithoutCombatant.companions);
  companions.delete(input.ownerId);
  return { ...stateWithoutCombatant, companions };
}
/* v8 ignore stop -- @preserve */

function applySaveGatedConditionWithRepeatDamageRepeatSaves(
  state: BattleState,
  targetId: CombatantId,
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  damageEventKey: string | undefined,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const succeededEffects = target.activeEffects
    .filter(
      (effect): effect is SaveGatedConditionWithRepeatEffect =>
        effect.kind === "saveGatedConditionWithRepeat",
    )
    .filter((effect) => {
      const hole = saveGatedConditionWithRepeatRepeatSavingThrowOutcomeHole(
        targetId,
        effect,
        "damage",
        damageEventKey,
      );
      const fill = fills.find((candidate) => candidate.holeId === hole.holeId);
      if (
        fill === undefined ||
        validateSaveGatedConditionWithRepeatRepeatSavingThrowOutcome(
          fill.value,
          targetId,
        ) !== null
      ) {
        return false;
      }
      return fill.value.outcomes[0]?.succeeded === true;
    });
  return succeededEffects.reduce(
    (nextState, effect) =>
      removeSaveGatedConditionWithRepeatEffectFromTarget(
        nextState,
        targetId,
        effect.effectRef,
      ),
    state,
  );
}

export function applyAttackDamageAmount(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly damageAmount: DamageAmount;
  readonly deathFailuresAtZeroHp: 1 | 2;
  readonly damageDisposition: BattleAttackDamageDisposition;
  readonly attackDamageRiders: readonly AttackDamageRider[];
  readonly weaponDamageDiceRollChoice?:
    | WeaponDamageDiceRollChoiceFill
    | undefined;
  readonly concentrationSavingThrow?:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
  readonly saveGatedConditionWithRepeatDamageRepeatSaves?: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly linkedDefenseResistanceDamageShareConcentrationSavingThrows?: readonly ConcentrationSavingThrowFill[];
  readonly spatialFacts?: readonly BattleTargetSpatialFact[];
  readonly relationshipDecisions?:
    | BattleDamageRelationshipDecisions
    | undefined;
}): BattleState {
  const target = input.state.combatants.get(input.targetId);
  if (target == null) {
    return input.state;
  }
  const afterDamage = applyBattleHitPointDamage({
    state: input.state,
    target,
    damageAmount: Number(input.damageAmount),
    deathFailuresAtZeroHp: input.deathFailuresAtZeroHp,
    damageDisposition: input.damageDisposition,
    damageSourceId: input.attackerId,
    concentrationSavingThrow: input.concentrationSavingThrow,
    linkedDefenseResistanceDamageShareConcentrationSavingThrows:
      input.linkedDefenseResistanceDamageShareConcentrationSavingThrows ?? [],
    saveGatedConditionWithRepeatDamageRepeatSaves:
      input.saveGatedConditionWithRepeatDamageRepeatSaves ?? [],
    spatialFacts: input.spatialFacts ?? [],
    ...optionalProperty("relationshipDecisions", input.relationshipDecisions),
  });
  return normalizeBattleGrapples(
    recordAttackDamageUnitsUsed(
      afterDamage,
      input.attackDamageRiders.map((rider) => ({
        ...rider,
        attackerId: input.attackerId,
      })),
      input.weaponDamageDiceRollChoice === undefined
        ? []
        : [
            {
              attackerId: input.attackerId,
              procedureRef: input.weaponDamageDiceRollChoice.procedureRef,
            },
          ],
    ),
  );
}

export function recordAttackDamageUnitsUsed(
  state: BattleState,
  attackDamageRiders: readonly AttackDamageRider[],
  weaponDamageDiceRollChoices: readonly WeaponDamageDiceRollChoiceUsage[] = [],
): BattleState {
  if (
    attackDamageRiders.length === 0 &&
    weaponDamageDiceRollChoices.length === 0
  ) {
    return state;
  }
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      attackDamageRidersUsedThisTurn: [
        ...state.currentTurnResources.attackDamageRidersUsedThisTurn,
        ...attackDamageRiders.map((rider) => ({
          attackerId: rider.attackerId,
          procedureRef: rider.procedureRef,
        })),
      ],
      weaponDamageDiceRollChoicesUsedThisTurn: [
        ...state.currentTurnResources.weaponDamageDiceRollChoicesUsedThisTurn,
        ...weaponDamageDiceRollChoices,
      ],
    },
  };
}

export function markMarkedDamageRiderTransferAvailable(
  state: BattleState,
  targetId: CombatantId,
  priorHp: Hp,
  nextHp: Hp,
): BattleState {
  if (priorHp <= 0 || nextHp !== 0) {
    return state;
  }
  const combatants = new Map(state.combatants);
  let changed = false;
  for (const [combatantId, combatant] of combatants) {
    const activeEffects = combatant.activeEffects.map((effect) => {
      if (
        effect.kind !== "spellMarkedDamageRider" ||
        effect.targetCombatantId !== targetId ||
        effect.transfer.kind !== "awaitingTargetDrop"
      ) {
        return effect;
      }
      return {
        ...effect,
        transfer:
          effect.transfer.retargetTiming === "sameTurn"
            ? { kind: "available", retargetTiming: "sameTurn" }
            : {
                kind: "availableAfterTurn",
                retargetTiming: "laterTurn",
                droppedOnTurn: {
                  actorId: currentActorId(state),
                  round: state.initiative.round,
                },
              },
      } satisfies BattleActiveEffect;
    });
    if (
      activeEffects.some(
        (effect, index) => effect !== combatant.activeEffects[index],
      )
    ) {
      changed = true;
      combatants.set(combatantId, { ...combatant, activeEffects });
    }
  }
  return changed ? { ...state, combatants } : state;
}

export function removeSpellConditionEffectsFromTargetDamagedByCasterOrAlly(
  state: BattleState,
  damageSourceId: CombatantId,
  targetId: CombatantId,
  relationshipDecisions: readonly BattleDamageRelationshipDecision[],
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const expiring = target.activeEffects.filter(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "spellCondition" | "unitFeatureCondition" }
    > =>
      (effect.kind === "spellCondition" &&
        effect.escape?.kind === "targetDamagedByCasterOrAlly" &&
        (damageSourceId === effect.sourceCombatantId ||
          relationshipDecisions.some(
            (decision) =>
              decision.kind === "targetDamagedByCasterOrAlly" &&
              decision.targetId === targetId &&
              decision.effectSourceId === effect.sourceCombatantId &&
              decision.sourceIsAlly,
          ))) ||
      (effect.kind === "unitFeatureCondition" &&
        effect.earlyEnd?.kind === "targetTakesAnyDamage"),
  );
  if (expiring.length === 0) {
    return state;
  }
  const activeEffects = target.activeEffects.filter(
    (effect) => !expiring.some((expired) => expired === effect),
  );
  const nextCombatant: BattleCreatureState =
    target.positiveHpUnconscious === null
      ? {
          ...target,
          activeEffects,
          conditions: conditionsAfterExpiringSpellConditionEffects(
            target.conditions,
            activeEffects,
            expiring,
          ),
        }
      : { ...target, activeEffects };
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, nextCombatant),
  };
}

type BattleDamageContext = {
  readonly deathFailuresAtZeroHp: 1 | 2;
  readonly damageDisposition?: BattleAttackDamageDisposition;
};

export function applyHpDamage(
  combatant: BattleCreatureState,
  damageAmount: number,
  context: BattleDamageContext,
): BattleCreatureState {
  const projection = hpDamageProjection(combatant, damageAmount);
  if (projection.effectiveDamage <= 0 || zeroHpLifecycleIsTerminal(combatant)) {
    return combatant;
  }

  const damaged = battleCreatureStateWithDamageProjection(
    combatant,
    projection,
  );

  if (projection.currentHp <= 0) {
    return projection.massiveDamageKills
      ? applyInstantDeath(damaged)
      : applyDamageAtZeroHp(damaged, context);
  }

  if (Number(projection.nextHp) > 0) {
    return damaged;
  }

  if (context.damageDisposition?.kind === "knockOut") {
    return applyKnockOut(damaged);
  }

  const zeroHitPointReplacementProcedureRef =
    context.damageDisposition?.kind === "zeroHitPointReplacement"
      ? context.damageDisposition.procedureRef
      : undefined;
  if (
    zeroHitPointReplacementProcedureRef !== undefined &&
    hpDamageProjectionAllowsKnockOut(projection) &&
    !projection.massiveDamageKills &&
    combatant.origin.kind === "character"
  ) {
    const capability = zeroHitPointReplacementCapabilities(
      combatant.origin,
    ).find(
      (candidate) =>
        candidate.procedureRef === zeroHitPointReplacementProcedureRef,
    );
    const resource =
      capability === undefined
        ? null
        : availableZeroHitPointReplacementResource(
            combatant.origin,
            capability.resourcePoolRef,
          );
    if (resource !== null) {
      return applyZeroHitPointReplacement(
        combatant,
        projection,
        combatant.origin,
        resource,
      );
    }
  }

  return projection.massiveDamageKills
    ? applyInstantDeath(damaged)
    : applyDropToZeroHpLifecycle(damaged);
}

import type { HpDamageProjection } from "./battle-runtime-protocol.ts";

export function hpDamageProjection(
  combatant: BattleCreatureState,
  damageAmount: number,
): HpDamageProjection {
  const effectiveDamage = Math.max(0, Math.floor(damageAmount));
  const currentTempHp = Number(combatant.tempHp);
  const currentHp = Number(combatant.hp);
  const tempHpAbsorbed = Math.min(currentTempHp, effectiveDamage);
  const hpDamage = effectiveDamage - tempHpAbsorbed;
  const nextHp = Hp(Math.max(0, currentHp - hpDamage));
  return {
    effectiveDamage,
    currentTempHp,
    tempHpAbsorbed,
    currentHp,
    hpDamage,
    nextHp,
    massiveDamageKills:
      hpDamage > 0 &&
      (currentHp <= 0 ? hpDamage : hpDamage - currentHp) >=
        Number(effectiveHitPointMaximum(combatant)),
  };
}

export function damageAllowsKnockOut(
  combatant: BattleCreatureState,
  damageAmount: number,
): boolean {
  return hpDamageProjectionAllowsKnockOut(
    hpDamageProjection(combatant, damageAmount),
  );
}

function hpDamageProjectionAllowsKnockOut(
  projection: HpDamageProjection,
): boolean {
  return projection.currentHp > 0 && Number(projection.nextHp) === 0;
}

type CharacterBattleCreatureOrigin = Extract<
  BattleCreatureState["origin"],
  { readonly kind: "character" }
>;

export type ZeroHitPointReplacementCapability = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly resourcePoolRef: CharacterBattleUseCountResourceState["resourcePoolRef"];
};

export function zeroHitPointReplacementCapabilities(
  origin: CharacterBattleCreatureOrigin,
): readonly ZeroHitPointReplacementCapability[] {
  const capabilities: ZeroHitPointReplacementCapability[] = [];
  for (const binding of origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      procedure.kind !== "unitFeature" ||
      procedure.execution.kind !== "zeroHitPointReplacement" ||
      procedure.source.kind !== "resourcePool"
    ) {
      continue;
    }
    const resourcePoolRef = procedure.source.resourcePoolRef;
    if (
      availableZeroHitPointReplacementResource(origin, resourcePoolRef) === null
    ) {
      continue;
    }
    capabilities.push({
      procedureRef: binding.procedureRef,
      resourcePoolRef,
    });
  }
  return capabilities;
}

function availableZeroHitPointReplacementResource(
  origin: CharacterBattleCreatureOrigin,
  resourcePoolRef: CharacterBattleUseCountResourceState["resourcePoolRef"],
): CharacterBattleUseCountResourceState | null {
  const resource = origin.resources.find(
    (candidate) => candidate.resourcePoolRef === resourcePoolRef,
  );
  return resource !== undefined && resourceHasUsesRemaining(resource)
    ? resource
    : null;
}

function applyZeroHitPointReplacement(
  combatant: BattleCreatureState,
  projection: HpDamageProjection,
  origin: CharacterBattleCreatureOrigin,
  resource: CharacterBattleUseCountResourceState,
): BattleCreatureState {
  const nextCombatant = {
    ...battleCreatureStateWithoutKnockOut(
      combatant,
      Hp(1),
      combatant.conditions,
    ),
    tempHp: Hp(projection.currentTempHp - projection.tempHpAbsorbed),
  };
  return {
    ...nextCombatant,
    origin: {
      ...origin,
      resources: origin.resources.map((candidate) =>
        candidate === resource
          ? spendCharacterResourceUse(resource)
          : candidate,
      ),
    },
  };
}

function battleCreatureStateWithKnockedOutUnconsciousFields(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return {
    ...combatant,
    hp: knockedOutOneHp(),
    conditions: knockedOutConditionState(combatant.conditions),
    positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
  };
}

function applyKnockOut(combatant: BattleCreatureState): BattleCreatureState {
  return battleCreatureStateWithKnockedOutUnconsciousFields(
    withoutConcentration(combatant),
  );
}

export function applyHpHealing(
  combatant: BattleCreatureState,
  healingAmount: number,
): BattleCreatureState {
  const effectiveHealing = Math.max(0, Math.floor(healingAmount));
  if (
    effectiveHealing <= 0 ||
    zeroHpLifecycleIsTerminal(combatant) ||
    hitPointRegainPrevented(combatant)
  ) {
    return combatant;
  }

  const currentHp = Number(combatant.hp);
  const nextHp = Hp(
    Math.min(
      Number(effectiveHitPointMaximum(combatant)),
      currentHp + effectiveHealing,
    ),
  );
  const regainedHitPoints = Number(nextHp) > currentHp;
  return regainedHitPoints
    ? battleCreatureStateAfterHitPointIncrease(combatant, nextHp)
    : combatant;
}

function hitPointRegainPrevented(combatant: BattleCreatureState): boolean {
  return combatant.activeEffects.some(
    (effect) => effect.kind === "hitPointRegainPrevented",
  );
}

type BattleCreatureStateWithOrigin<
  Origin extends BattleCreatureState["origin"],
> = BattleCreatureState & { readonly origin: Origin };

export function applyInitialZeroHpLifecycle<
  Origin extends BattleCreatureState["origin"],
>(
  combatant: BattleCreatureStateWithOrigin<Origin>,
): BattleCreatureStateWithOrigin<Origin> {
  if (Number(combatant.hp) > 0) {
    return combatant;
  }

  const lifecycleState = Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () =>
      withoutConcentration(combatant),
    ),
    Match.when({ policy: "usesDeathSavingThrows" }, () => ({
      ...battleCreatureStateWithKnockOutPreservedConditions(
        combatant,
        applyCondition(combatant.conditions, "unconscious"),
      ),
    })),
    Match.exhaustive,
  );
  return { ...lifecycleState, origin: combatant.origin };
}

function applyDropToZeroHpLifecycle(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        combatant.conditions,
      ),
    })),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        applyCondition(combatant.conditions, "unconscious"),
      ),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: resetDeathSaveRuntimeState(),
      },
    })),
    Match.exhaustive,
  );
}

function applyDamageAtZeroHp(
  combatant: BattleCreatureState,
  context: BattleDamageContext,
): BattleCreatureState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        combatant.conditions,
      ),
    })),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        applyCondition(combatant.conditions, "unconscious"),
      ),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: addDeathFailures(
          lifecycle.deathSaves,
          context.deathFailuresAtZeroHp,
        ),
      },
    })),
    Match.exhaustive,
  );
}

export function startTurnDeathSavingThrowRequired(
  combatant: BattleCreatureState | undefined,
): combatant is BattleCreatureState & {
  readonly zeroHpLifecycle: Extract<
    ZeroHpLifecycle,
    { readonly policy: "usesDeathSavingThrows" }
  >;
} {
  return (
    combatant !== undefined &&
    Number(combatant.hp) === 0 &&
    combatant.zeroHpLifecycle.policy === "usesDeathSavingThrows" &&
    !combatant.zeroHpLifecycle.deathSaves.stable &&
    !combatant.zeroHpLifecycle.deathSaves.dead
  );
}

export function applyStartTurnDeathSavingThrow(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  roll: DieRollResult,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const combatant = combatants.get(actorId);
  if (!startTurnDeathSavingThrowRequired(combatant)) {
    return combatants;
  }

  const deathSaves = resolveDeathSavingThrow(
    combatant.zeroHpLifecycle.deathSaves,
    Number(roll),
  );
  const nextCombatant = {
    ...battleCreatureStateWithoutKnockOut(
      combatant,
      deathSaves.hpRegained ? Hp(1) : combatant.hp,
      deathSaves.hpRegained
        ? removeCondition(combatant.conditions, "unconscious")
        : combatant.conditions,
    ),
    zeroHpLifecycle: {
      ...combatant.zeroHpLifecycle,
      deathSaves,
    },
  };

  return new Map(combatants).set(actorId, nextCombatant);
}

export function deathSavingThrowHole(
  actorId: CombatantId,
): BattleDeathSavingThrowHole {
  return {
    kind: "deathSavingThrow",
    holeInstanceKey: DEATH_SAVING_THROW_HOLE_INSTANCE,
    holeId: DEATH_SAVING_THROW_HOLE_ID,
    label: "Death Saving Throw",
    combatantId: actorId,
  };
}

export function statBlockRechargeRollHole(
  combatant: BattleCreatureState | undefined,
): BattleStatBlockRechargeRollHole | null {
  if (combatant === undefined) return null;
  const wildShape = activeDruidWildShape(combatant);
  const execution =
    wildShape?.admission.execution ??
    (combatant.origin.kind === "statBlock"
      ? combatant.origin.execution
      : undefined);
  const rechargeTargets =
    execution === undefined
      ? []
      : unavailableStatBlockRechargePoolRefs(execution);
  if (rechargeTargets.length === 0) return null;
  return {
    kind: "statBlockRechargeRoll",
    holeInstanceKey: STAT_BLOCK_RECHARGE_ROLL_HOLE_INSTANCE,
    holeId: STAT_BLOCK_RECHARGE_ROLL_HOLE_ID,
    label: "Stat Block Recharge roll",
    combatantId: combatant.combatantId,
    rechargeTargets,
  };
}

export function processStatBlockRechargeRolls(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  rolls: readonly BattleStatBlockRechargeRollResult[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const combatant = combatants.get(actorId);
  if (combatant === undefined) return combatants;
  const wildShape = activeDruidWildShape(combatant);
  const execution =
    wildShape?.admission.execution ??
    (combatant.origin.kind === "statBlock"
      ? combatant.origin.execution
      : undefined);
  if (execution === undefined) return combatants;
  const nextExecution = applyStatBlockRechargeRolls(execution, rolls);
  if (wildShape === null) {
    if (combatant.origin.kind !== "statBlock") return combatants;
    return new Map(combatants).set(actorId, {
      ...combatant,
      origin: { ...combatant.origin, execution: nextExecution },
    });
  }
  return new Map(combatants).set(
    actorId,
    applyActiveDruidWildShapeRechargeRolls(combatant, rolls),
  );
}

export function concentrationSavingThrowHole(
  combatant: BattleCreatureState,
  damageAmount: number,
): BattleConcentrationSavingThrowHole | null {
  const effectiveDamage = Math.max(0, Math.floor(damageAmount));
  if (combatant.concentration === null || effectiveDamage <= 0) {
    return null;
  }
  const holeKey = `${CONCENTRATION_SAVING_THROW_HOLE_INSTANCE_PREFIX}:${combatant.combatantId}`;
  return {
    kind: "concentrationSavingThrow",
    damageOccurrence: { kind: "untrackedDamage" },
    holeInstanceKey: holeInstanceKey(holeKey),
    holeId: holeId(holeKey),
    label: "Concentration Constitution Saving Throw",
    combatantId: combatant.combatantId,
    dc: concentrationSavingThrowDc(effectiveDamage),
    damageAmount: toDamageAmount(effectiveDamage),
    targetFlatBonuses:
      linkedDefenseResistanceDamageShareSavingThrowFlatBonusProjectionsForTarget(
        combatant,
      ),
    ...(combatantHasEldritchMind(combatant) ||
    combatant.concentration.maintenanceSavingThrowRollMode === "advantage"
      ? { rollMode: "advantage" as const }
      : {}),
  };
}

function combatantHasEldritchMind(combatant: BattleCreatureState): boolean {
  return (
    combatant.origin.kind === "character" &&
    combatant.origin.invocationFeatures.some(
      (feature) => feature.tag === "eldritchMind",
    )
  );
}

function applyInstantDeath(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        combatant.conditions,
      ),
    })),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        applyCondition(combatant.conditions, "unconscious"),
      ),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: addDeathFailures(lifecycle.deathSaves, 3),
      },
    })),
    Match.exhaustive,
  );
}

function withoutConcentration(
  combatant: BattleCreatureState,
): BattleCreatureState {
  if (combatant.concentration === null) {
    return combatant;
  }
  const concentration = combatant.concentration;
  return {
    ...combatant,
    concentration: null,
    activeEffects: combatant.activeEffects.filter(
      (effect) =>
        !("expiresAt" in effect && effect.expiresAt.kind === "concentration") &&
        !nonConcentrationEffectFromBrokenSpellConcentration(
          effect,
          combatant.combatantId,
          concentration,
        ) &&
        (effect.kind !== "spellBaseArmorClass" ||
          !effect.earlyEnds.some(
            (earlyEnd) => earlyEnd.kind === "concentrationBroken",
          )),
    ),
  };
}

export function breakCombatantConcentration(
  state: BattleState,
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  combatantId: CombatantId,
  priorConcentration?: BattleConcentration,
): BreakCombatantConcentrationResult {
  const broken =
    combatants.get(combatantId)?.concentration ?? priorConcentration;
  if (broken === undefined) {
    return {
      value: combatants,
      flySpeedGrantEndFallCleanupFrames: [],
      spellEndTargetStatePromotionIds: [],
    };
  }
  const flySpeedGrantEndFallCleanupFrames: BattleFlySpeedGrantEndFallCleanupFrame[] =
    [];
  const spellEndTargetStatePromotionIds: CombatantId[] = [];
  const value = new Map(
    [...combatants].map(([id, combatant]) => {
      const expiring = combatant.activeEffects.filter((effect) =>
        concentrationBrokenEffectFrom(effect, combatantId, broken),
      );
      if (expiring.some(spellEndTargetStatePromotesIncapacitated)) {
        spellEndTargetStatePromotionIds.push(id);
      }
      flySpeedGrantEndFallCleanupFrames.push(
        ...flySpeedGrantEndFallCleanupFramesForExpiredEffects(id, expiring),
      );
      const activeEffects = combatant.activeEffects.filter(
        (effect) => !expiring.includes(effect),
      );
      const nextCombatantBase =
        combatant.positiveHpUnconscious === null
          ? {
              ...combatant,
              concentration:
                id === combatantId ? null : combatant.concentration,
              activeEffects,
              conditions: conditionsAfterExpiringSpellConditionEffects(
                combatant.conditions,
                activeEffects,
                expiring,
              ),
            }
          : {
              ...combatant,
              concentration:
                id === combatantId ? null : combatant.concentration,
              activeEffects,
            };
      const nextCombatantWithEndState =
        battleCreatureWithSpellEndTargetStatePromotions({
          state,
          combatant:
            battleCreatureWithSpellCreatedHeldObjectHandStateFromActiveEffects(
              nextCombatantBase,
            ),
          expiringEffects: expiring,
          timing: END_OF_NEXT_TURN_DURING_TURN,
        });
      const nextCombatant = applyHitPointMaximumIncreaseExpiration(
        nextCombatantWithEndState,
        expiring,
      );
      return [id, nextCombatant];
    }),
  );
  return {
    value,
    flySpeedGrantEndFallCleanupFrames,
    spellEndTargetStatePromotionIds,
  };
}

function concentrationBrokenEffectFrom(
  effect: BattleActiveEffect,
  combatantId: CombatantId,
  concentration: BattleConcentration | null,
): boolean {
  if (effect.sourceCombatantId !== combatantId) {
    return false;
  }
  if (
    concentration?.effectKind === "spellEffect" &&
    "sourceProcedureRef" in effect &&
    effect.sourceProcedureRef === concentration.sourceProcedureRef &&
    "expiresAt" in effect &&
    effect.expiresAt.kind === "concentration"
  ) {
    return true;
  }
  if (
    nonConcentrationEffectFromBrokenSpellConcentration(
      effect,
      combatantId,
      concentration,
    )
  ) {
    return true;
  }
  return (
    effect.kind === "spellBaseArmorClass" &&
    effect.earlyEnds.some((earlyEnd) => earlyEnd.kind === "concentrationBroken")
  );
}

function currentActorEffectsExpiringFromConcentrationBreak(
  state: BattleState,
  combatantId: CombatantId,
  concentration: BattleConcentration | null,
): readonly BattleActiveEffect[] {
  const currentActor = state.combatants.get(currentActorId(state));
  return currentActor === undefined
    ? []
    : currentActor.activeEffects.filter((effect) =>
        concentrationBrokenEffectFrom(effect, combatantId, concentration),
      );
}

function nonConcentrationEffectFromBrokenSpellConcentration(
  effect: BattleActiveEffect,
  combatantId: CombatantId,
  concentration: BattleConcentration | null,
): boolean {
  return (
    concentration?.effectKind === "spellEffect" &&
    (effect.kind === "selfAttackRollAndAbilityCheckRollMode" ||
      effect.kind === "nextAttackRollBySelf") &&
    effect.sourceCombatantId === combatantId &&
    "sourceProcedureRef" in effect &&
    effect.sourceProcedureRef === concentration.sourceProcedureRef
  );
}
