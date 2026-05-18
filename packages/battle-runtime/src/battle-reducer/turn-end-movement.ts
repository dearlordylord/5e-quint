// Turn-end, movement command, opportunity-attack, and readied-release resolution
// extracted from ../battle-reducer.ts. Mechanical move; no behavior change
// intended.

// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-flaming-sphere-hazard-ram
// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.invocation-grease-ground-hazard spell.invocation-jump-movement-replacement spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import { resetTurnActionEconomy } from "@dnd/shared-algebras/action-economy-algebra";

import {
  rolledDiceTotal,
  validateRolledDiceForDiceExpr,
} from "@dnd/shared-algebras/runtime-dice-algebra";

import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";

import {
  hasCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";

import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";

import {
  currentActing,
  nextInitiative,
} from "@dnd/shared-algebras/initiative-algebra";

import { ordinaryMovementCost } from "@dnd/shared-algebras/movement-cost-algebra";

import {
  DieRollResult,
  MovementFeet,
  movementFeet,
  type Round as RoundType,
} from "@dnd/shared/types";

import {
  type BattleMovementSpeedKind,
  type BattleSubject,
} from "../battle-subjects.ts";

import { type BattleReactionTrigger } from "../battle-reaction-triggers.ts";

import {
  battleObjectId,
  type BattleObjectId,
  CombatantId,
} from "../identity.ts";

import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";

import { attackActionOptionsForActor } from "./attack-damage-apply.ts";

import { currentActorId } from "./creature-state-leaves.ts";

import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-state.ts";

import {
  applyStartTurnDeathSavingThrow,
  applyHitPointMaximumIncreaseExpiration,
  applyTemporaryHitPoints,
  breakCombatantConcentration,
  concentrationSavingThrowHole,
  deathSavingThrowHole,
  processStatBlockRechargeRolls,
  startTurnDeathSavingThrowRequired,
  statBlockRechargeRollHole,
} from "./damage-apply.ts";

import { maybeOpenReactionWindow, snapshotBattle } from "./dispatcher.ts";

import {
  hideousLaughterDamageRepeatSaveFillCheck,
  hideousLaughterDamageRepeatSaveFillsForTarget,
  hideousLaughterRepeatSavingThrowOutcomeHole,
} from "./hideous-laughter-repeat-save.ts";

import { needsHolesResult } from "./hole-helpers.ts";
export { resolveOpportunityAttackCommand } from "./opportunity-attacks.ts";
export {
  applyBattleMovement,
  readiedSpellInitialHoles,
  readiedMovementInitialHoles,
  resolveReleaseReadiedMovementCommand,
  resolveReleaseReadiedSpellCommand,
} from "./readied-release.ts";
import { applyBattleMovement } from "./readied-release.ts";

import {
  battleMovementBudgetForActor,
  combatantCanMoveInState,
  combatantCanMoveWithBudget,
  effectiveMovementSpeed,
  effectiveWalkSpeed,
  opportunityAttackThreatsForMovement,
  representedMovementSpeedKinds,
} from "./movement-speed.ts";

import { invalidResult } from "./result-helpers.ts";

import {
  combatantsAfterHideousLaughterSpellEndedIfNoEffects,
  conditionsAfterApplyingSpellConditionEffects,
  conditionsAfterExpiringSpellConditionEffects,
  conditionHadNonSpellSourceBeforeSpellEffect,
} from "./spell-condition-effects-helpers.ts";

import { damageAmountAfterTargetAdjustments } from "./damage-helpers.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";

import {
  applyPreparedSlotSpellDamage,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import {
  applyCommandGrovelProneToTarget,
  applyGreaseProneToTarget,
  expireBattleLightEmitters,
  tickDurationBattleLightEmitters,
} from "./spells-active-effects.ts";

import {
  attackActionOptionName,
  attackTargetConstraint,
} from "./statblock-attacks.ts";

import {
  refreshStatBlockStartTurnResources,
  sameStatBlockPartKey,
} from "./statblock.ts";

import type {
  ActiveOngoingFeatureOccurrence,
  BattleActiveEffect,
  BattleActiveEffectExpiration,
  BattleAttackDamageDispositionHole,
  BattleCommandApproachMovementFact,
  BattleCommandFleeMovementFact,
  BattleCommandHaltTurnSuppression,
  BattleCreatureState,
  BattleDroppedObjectOutcome,
  BattleFill,
  BattleFlamingSphereDamageRollHole,
  BattleFlamingSphereRamMovementHole,
  BattleFlamingSphereRepositionMovementHole,
  BattleFlamingSphereSavingThrowOutcomeHole,
  BattleFlamingSphereTrigger,
  BattleGreaseGroundDifficultTerrainMovementFact,
  BattleGrappleLink,
  BattleGreaseGroundHazardSavingThrowOutcomeHole,
  BattleHideousLaughterRepeatSavingThrowOutcomeHole,
  BattleHeldObjectFactsHole,
  BattleHoleId,
  BattleJumpMovementReplacementFact,
  BattleMovementHole,
  BattleOpportunityAttackThreat,
  BattleResolutionInput,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleResolvedMovement,
  BattleSleepRepeatSavingThrowOutcomeHole,
  BattleSpellConditionEndTurnSavingThrowOutcomeHole,
  BattleSpellTurnStartDamageRollHole,
  BattleSpellTurnStartSavingThrowOutcomeHole,
  BattleStatBlockRechargeRollHole,
  BattleStatBlockRechargeRollResult,
  BattleState,
  BattleTurnResources,
  BattleSavingThrowOutcomeValue,
  SpellTurnStartDamage,
} from "../battle-reducer.ts";
import {
  DEATH_SAVING_THROW_HOLE_ID,
  MOVEMENT_HOLE_ID,
  MOVEMENT_HOLE_INSTANCE,
  STAT_BLOCK_RECHARGE_ROLL_HOLE_ID,
} from "../battle-reducer.ts";
export function resolveEndTurn(
  state: BattleState,
  deathSavingThrowRoll?: DieRollResult,
  statBlockRechargeRolls?: readonly BattleStatBlockRechargeRollResult[],
  sleepRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  hideousLaughterRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  spellConditionEndTurnSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  spellTurnStartDamageRolls: readonly Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >[] = [],
  spellTurnStartSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  spellTurnStartHideousLaughterDamageRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  concentrationSavingThrows: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[] = [],
  damageDispositions: readonly Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >[] = [],
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const initiative = nextInitiative(state.initiative);
  const nextActorId = currentActing(initiative);
  const combatants = new Map<CombatantId, BattleCreatureState>();
  for (const [id, combatant] of state.combatants) {
    combatants.set(
      id,
      id === nextActorId
        ? resetStartOfTurnCombatant(resetPerTurnCharacterResources(combatant))
        : combatant,
    );
  }
  const afterDeathSavingThrow =
    deathSavingThrowRoll === undefined
      ? combatants
      : applyStartTurnDeathSavingThrow(
          combatants,
          nextActorId,
          deathSavingThrowRoll,
        );
  const expiringReadiedSpellCasterIds = [...state.readiedSpells]
    .filter(
      ([, readiedSpell]) => readiedSpell.expiresAt.combatantId === nextActorId,
    )
    .map(([casterId]) => casterId);
  const readiedSpells = new Map(state.readiedSpells);
  for (const casterId of expiringReadiedSpellCasterIds) {
    readiedSpells.delete(casterId);
  }
  const readiedMovements = new Map(state.readiedMovements);
  for (const [actorId, readiedMovement] of state.readiedMovements) {
    if (readiedMovement.expiresAt.combatantId === nextActorId) {
      readiedMovements.delete(actorId);
    }
  }
  const helpAttacks = state.helpAttacks.filter(
    (help) => help.expiresAt.combatantId !== nextActorId,
  );
  let combatantsAfterExpiredReadiedSpells = afterDeathSavingThrow;
  for (const casterId of expiringReadiedSpellCasterIds) {
    combatantsAfterExpiredReadiedSpells = breakCombatantConcentration(
      combatantsAfterExpiredReadiedSpells,
      casterId,
    );
  }
  const combatantsAfterEndTurnOngoingFeatures = expireEndOfTurnOngoingFeatures(
    combatantsAfterExpiredReadiedSpells,
    currentActorId(state),
    state.initiative.round,
  );
  const combatantsAfterSleepRepeatSaves = applySleepRepeatSaveFills(
    combatantsAfterEndTurnOngoingFeatures,
    currentActorId(state),
    state.initiative.round,
    sleepRepeatSaves,
  );
  const combatantsAfterHideousLaughterRepeatSaves =
    applyHideousLaughterRepeatSaveFills(
      combatantsAfterSleepRepeatSaves,
      currentActorId(state),
      hideousLaughterRepeatSaves,
    );
  const combatantsAfterSpellConditionRepeatSaves =
    applySpellConditionEndTurnSaveFills(
      combatantsAfterHideousLaughterRepeatSaves,
      currentActorId(state),
      spellConditionEndTurnSaves,
    );
  const combatantsAfterEndEffects = expireEndOfTurnEffects(
    combatantsAfterSpellConditionRepeatSaves,
    currentActorId(state),
    state.initiative.round,
  );
  const lightEmittersAfterEndEffects = expireBattleLightEmitters(
    state.lightEmitters,
    (emitter) =>
      emitter.expiresAt.kind === "endOfTurn" &&
      emitter.expiresAt.combatantId === currentActorId(state) &&
      emitter.expiresAt.round === state.initiative.round,
  );
  const lightEmittersAfterDurationTick =
    Number(initiative.round) > Number(state.initiative.round)
      ? tickDurationBattleLightEmitters(lightEmittersAfterEndEffects)
      : lightEmittersAfterEndEffects;
  const combatantsAfterStartOngoingFeatures = expireStartOfTurnOngoingFeatures(
    combatantsAfterEndEffects,
    nextActorId,
  );
  const combatantsAfterStartEffects = expireStartOfTurnEffects(
    combatantsAfterStartOngoingFeatures,
    nextActorId,
  );
  const combatantsAfterStartTurnEffects = applyStartOfTurnActiveEffects(
    combatantsAfterStartEffects,
    nextActorId,
  );
  const combatantsAfterSpellTurnStartDamage = applyStartTurnSpellDamageFills(
    {
      ...state,
      initiative,
      combatants: combatantsAfterStartTurnEffects,
    },
    nextActorId,
    spellTurnStartDamageRolls,
    spellTurnStartSaves,
    concentrationSavingThrows,
    damageDispositions,
    spellTurnStartHideousLaughterDamageRepeatSaves,
  ).combatants;
  const combatantsAfterDurationTick =
    Number(initiative.round) > Number(state.initiative.round)
      ? tickDurationEffects(combatantsAfterSpellTurnStartDamage)
      : combatantsAfterSpellTurnStartDamage;
  const combatantsAfterRecharge =
    statBlockRechargeRolls === undefined
      ? combatantsAfterDurationTick
      : processStatBlockRechargeRolls(
          combatantsAfterDurationTick,
          nextActorId,
          statBlockRechargeRolls,
        );
  const combatantsAfterDamageReductionReset =
    resetSpellDamageReductionsForNewTurn(combatantsAfterRecharge);
  const resetTurnResources = resetBattleTurnResources(
    state.currentTurnResources,
  );
  const commandHalt = commandHaltTurnSuppressionForActor(
    combatantsAfterDamageReductionReset,
    nextActorId,
    initiative.round,
  );
  const currentTurnResources = commandHaltTurnResources(
    resetTurnResources,
    commandHalt,
  );
  const combatantsAfterCommandHalt =
    commandHalt === null
      ? combatantsAfterDamageReductionReset
      : combatantsWithCommandHaltMovementSpent(
          combatantsAfterDamageReductionReset,
          state.grapples,
          nextActorId,
        );
  const nextState = {
    ...state,
    initiative,
    combatants: combatantsAfterCommandHalt,
    lightEmitters: lightEmittersAfterDurationTick,
    currentTurnResources,
    readiedSpells,
    readiedMovements,
    helpAttacks,
    legendaryActionWindow: {
      afterTurnActorId: currentActorId(state),
      consumed: false,
    },
  };

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function commandHaltTurnSuppressionForActor(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  round: RoundType,
): BattleCommandHaltTurnSuppression | null {
  const actor = combatants.get(actorId);
  const halted =
    actor?.activeEffects.some(
      (effect) =>
        effect.kind === "commandPending" &&
        effect.option === "halt" &&
        effect.expiresAt.combatantId === actorId &&
        effect.expiresAt.round === round,
    ) ?? false;
  return halted ? { kind: "commandHalt" } : null;
}

function commandHaltTurnResources(
  resources: BattleTurnResources,
  commandHalt: BattleCommandHaltTurnSuppression | null,
): BattleTurnResources {
  return commandHalt === null
    ? resources
    : {
        ...resources,
        actionResources: [],
        currentHasBonusAction: false,
        commandHalt,
      };
}

function combatantsWithCommandHaltMovementSpent(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  grapples: readonly BattleGrappleLink[],
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  if (actor === undefined) {
    return combatants;
  }

  const isGrappled = grapples.some((grapple) => grapple.targetId === actorId);
  const spentFeet = Math.max(
    Number(actor.movementSpentFeet),
    ...representedMovementSpeedKinds(actor).map((kind) =>
      Number(effectiveMovementSpeed(actor, kind, isGrappled)),
    ),
  );

  return new Map(combatants).set(actorId, {
    ...actor,
    movementSpentFeet: movementFeet(spentFeet),
  });
}

export function resetSpellDamageReductionsForNewTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => {
      const activeEffects = combatant.activeEffects.map((effect) =>
        (effect.kind === "spellDamageReduction" ||
          effect.kind === "jumpMovementReplacement") &&
        effect.usedThisTurn
          ? { ...effect, usedThisTurn: false }
          : effect,
      );
      return activeEffects.some(
        (effect, index) => effect !== combatant.activeEffects[index],
      )
        ? [id, { ...combatant, activeEffects }]
        : [id, combatant];
    }),
  );
}

export function expireStartOfTurnEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return expireActiveEffects(
    combatants,
    (effect) =>
      "expiresAt" in effect &&
      effect.expiresAt.kind === "startOfTurn" &&
      effect.expiresAt.combatantId === actorId,
  );
}

export function applyStartOfTurnActiveEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  if (actor === undefined) {
    return combatants;
  }
  const temporaryHitPoints = actor.activeEffects
    .filter(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "turnStartTemporaryHitPoints" }
      > => effect.kind === "turnStartTemporaryHitPoints",
    )
    .reduce(
      (highest, effect) => Math.max(highest, effect.amount),
      Number(actor.tempHp),
    );
  if (temporaryHitPoints === Number(actor.tempHp)) {
    return combatants;
  }
  return new Map(combatants).set(
    actorId,
    applyTemporaryHitPoints(actor, temporaryHitPoints),
  );
}

export function spellTurnStartDamageEffects(
  combatant: BattleCreatureState | undefined,
): readonly SpellTurnStartDamageEffect[] {
  if (combatant === undefined) {
    return [];
  }
  return combatant.activeEffects.filter(
    (effect): effect is SpellTurnStartDamageEffect =>
      (effect.kind === "spellCondition" &&
        effect.turnStartDamage !== null &&
        hasCondition(combatant.conditions, effect.condition)) ||
      effect.kind === "spellTurnStartDamageAndSave",
  );
}

type SpellTurnStartDamageEffect =
  | (Extract<BattleActiveEffect, { readonly kind: "spellCondition" }> & {
      readonly turnStartDamage: SpellTurnStartDamage;
    })
  | Extract<
      BattleActiveEffect,
      { readonly kind: "spellTurnStartDamageAndSave" }
    >;

function spellTurnStartDamageForEffect(
  effect: SpellTurnStartDamageEffect,
): SpellTurnStartDamage {
  return effect.kind === "spellCondition"
    ? effect.turnStartDamage
    : effect.damage;
}

function spellTurnStartDamageTrigger(
  effect: SpellTurnStartDamageEffect,
): BattleSpellTurnStartDamageRollHole["spellTurnStartDamage"]["trigger"] {
  if (effect.kind === "spellCondition") {
    return { kind: "condition", condition: effect.condition };
  }
  return {
    kind: "saveToEnd",
    ability: effect.save.ability,
    dc: effect.save.dc,
  };
}

export function spellTurnStartDamageRollHole(
  targetId: CombatantId,
  effect: SpellTurnStartDamageEffect,
): BattleSpellTurnStartDamageRollHole {
  const damage = spellTurnStartDamageForEffect(effect);
  const expr = `${damage.expr.dice}d${damage.expr.dieSize}`;
  const key = `battle:spell-turn-start-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} turn-start damage (${expr})`,
    spellTurnStartDamage: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      trigger: spellTurnStartDamageTrigger(effect),
      damage,
    },
  };
}

function spellTurnStartDamageRollFor(
  fills: readonly BattleFill[],
  hole: BattleSpellTurnStartDamageRollHole,
): Extract<BattleFill, { readonly kind: "rolledDice" }> | undefined {
  return fills.find(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && fill.holeId === hole.holeId,
  );
}

function spellTurnStartDamageAmount(
  target: BattleCreatureState,
  effect: SpellTurnStartDamageEffect,
  roll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  const damage = spellTurnStartDamageForEffect(effect);
  return damageAmountAfterTargetAdjustments(
    target,
    rolledDiceTotal(roll.value) + (damage.expr.flat ?? 0),
    damage.damageType,
  );
}

function applySpellTurnStartDamage(
  state: BattleState,
  targetId: CombatantId,
  effect: SpellTurnStartDamageEffect,
  roll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  concentrationSavingThrow:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined,
  damageDisposition: ReturnType<typeof damageDispositionForTarget>,
  hideousLaughterDamageRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  return applyPreparedSlotSpellDamage(
    state,
    targetId,
    spellTurnStartDamageAmount(target, effect, roll),
    {
      concentrationSavingThrow,
      damageDisposition,
      hideousLaughterDamageRepeatSaves,
      damageSourceId: effect.sourceCombatantId,
    },
  );
}

function spellTurnStartSavingThrowOutcomeHole(
  targetId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellTurnStartDamageAndSave" }
  >,
): BattleSpellTurnStartSavingThrowOutcomeHole {
  const key = `battle:spell-turn-start-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} turn-start ${effect.save.ability.toUpperCase()} save`,
    spellTurnStartSave: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: [],
  };
}

function spellTurnStartSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleSpellTurnStartSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function validateSpellTurnStartSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  if ("area" in value) {
    return "Turn-start spell Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Turn-start spell Saving Throw outcome must match the starting-turn target.";
}

type SleepPendingRepeatSaveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "sleepPendingRepeatSave" }
>;
type SpellConditionEndTurnSaveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellConditionEndTurnSave" }
>;
type HideousLaughterEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "hideousLaughter" }
>;
type DurationActiveEffect = Extract<
  Exclude<
    BattleActiveEffect,
    | Extract<BattleActiveEffect, { readonly kind: "sleepPendingRepeatSave" }>
    | Extract<BattleActiveEffect, { readonly kind: "sleepUnconscious" }>
    | Extract<BattleActiveEffect, { readonly kind: "spellDashBonusAction" }>
    | Extract<BattleActiveEffect, { readonly kind: "commandPending" }>
  >,
  { readonly expiresAt: BattleActiveEffectExpiration }
> & {
  readonly expiresAt: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "duration" }
  >;
};

function sleepPendingRepeatSaveEffects(
  combatant: BattleCreatureState | undefined,
  actorId: CombatantId,
  round: RoundType,
): readonly SleepPendingRepeatSaveEffect[] {
  if (combatant === undefined) {
    return [];
  }
  return combatant.activeEffects.filter(
    (effect): effect is SleepPendingRepeatSaveEffect =>
      effect.kind === "sleepPendingRepeatSave" &&
      effect.repeatAt.combatantId === actorId &&
      effect.repeatAt.round === round,
  );
}

function sleepRepeatSavingThrowOutcomeHole(
  targetId: CombatantId,
  effect: SleepPendingRepeatSaveEffect,
): BattleSleepRepeatSavingThrowOutcomeHole {
  const key = `battle:sleep-repeat-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} repeat WIS save`,
    sleepRepeatSave: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: [],
  };
}

function sleepRepeatSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleSleepRepeatSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function spellConditionEndTurnSaveEffects(
  combatant: BattleCreatureState | undefined,
): readonly SpellConditionEndTurnSaveEffect[] {
  return combatant === undefined
    ? []
    : combatant.activeEffects.filter(
        (effect): effect is SpellConditionEndTurnSaveEffect =>
          effect.kind === "spellConditionEndTurnSave",
      );
}

function spellConditionEndTurnSavingThrowOutcomeHole(
  targetId: CombatantId,
  effect: SpellConditionEndTurnSaveEffect,
): BattleSpellConditionEndTurnSavingThrowOutcomeHole {
  const key = [
    "battle:spell-condition-end-turn-save",
    targetId,
    effect.sourceCombatantId,
    effect.sourceSpellId,
    effect.condition,
  ]
    .map(String)
    .join(":");
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} ${effect.condition} end-turn save`,
    spellConditionEndTurnSave: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      condition: effect.condition,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: [],
  };
}

function spellConditionEndTurnSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleSpellConditionEndTurnSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function hideousLaughterRepeatSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleHideousLaughterRepeatSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function validateSleepRepeatSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  if ("area" in value) {
    return "Sleep repeat Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Sleep repeat Saving Throw outcome must match the ending-turn target.";
}

function validateSpellConditionEndTurnSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  if ("area" in value) {
    return "Spell condition end-turn Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Spell condition end-turn Saving Throw outcome must match the ending-turn target.";
}

export type GreaseGroundHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "greaseGroundHazard" }
>;
export type FlamingSphereEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "flamingSphere" }
>;
export type CommandPendingEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "commandPending" }
>;

export function commandPendingEffectForSubject(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "commandGrovel"
        | "commandDrop"
        | "commandApproach"
        | "commandFlee";
    }
  >,
  option: CommandPendingEffect["option"],
): CommandPendingEffect | null {
  return (
    commandPendingEffectsForActor(state, subject.actorId).find(
      (effect) =>
        effect.option === option &&
        effect.sourceSpellId === subject.sourceSpellId &&
        effect.sourceCombatantId === subject.sourceCombatantId,
    ) ?? null
  );
}

export function commandPendingEffectsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly CommandPendingEffect[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }
  return actor.activeEffects.filter(
    (effect): effect is CommandPendingEffect =>
      effect.kind === "commandPending" &&
      effect.expiresAt.combatantId === actorId &&
      effect.expiresAt.round === state.initiative.round,
  );
}

const COMMAND_DROP_HELD_OBJECT_FACTS_HOLE_INSTANCE = holeInstanceKey(
  "battle:command-drop:held-object-facts",
);

export function commandDropHeldObjectFactsHole(
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "commandDrop";
    }
  >,
): BattleHeldObjectFactsHole {
  return {
    holeInstanceKey: COMMAND_DROP_HELD_OBJECT_FACTS_HOLE_INSTANCE,
    holeId: commandDropHeldObjectFactsHoleId(subject),
    kind: "heldObjectFacts",
    label: "Command Drop held-object facts",
    actorId: subject.actorId,
  };
}

function commandDropHeldObjectFactsHoleId(
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "commandDrop";
    }
  >,
): BattleHoleId {
  return holeId(
    `battle:command-drop:held-object-facts:${subject.actorId}:${subject.sourceCombatantId}:${subject.sourceSpellId}`,
  );
}

export function canonicalHeldObjectIdsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleObjectId[] | null {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return null;
  }
  const loadout = actor.origin.selectedLoadout;
  return [
    ...(loadout.weapon === undefined
      ? []
      : [battleObjectId(loadout.weapon.itemId)]),
    ...(loadout.offHandWeapon === undefined
      ? []
      : [battleObjectId(loadout.offHandWeapon.itemId)]),
    ...(loadout.shield === undefined ? [] : [battleObjectId(loadout.shield)]),
  ];
}

function stateWithoutCommandPendingEffect(
  state: BattleState,
  actorId: CombatantId,
  effect: CommandPendingEffect,
): BattleState {
  const target = state.combatants.get(actorId);
  return target === undefined
    ? state
    : {
        ...state,
        combatants: new Map(state.combatants).set(actorId, {
          ...target,
          activeEffects: target.activeEffects.filter(
            (candidate) => candidate !== effect,
          ),
        }),
      };
}

export function resolveCommandGrovelCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "commandGrovel";
      }
    >
  >,
): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "grovel",
  );
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Grovel is no longer pending for this actor.",
    );
  }
  const unsupportedFill = input.fills.find(
    (fill) => !endTurnFillKind(fill.kind),
  );
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Grovel only accepts End Turn fills.",
    );
  }
  const proned = applyCommandGrovelProneToTarget(
    input.state,
    input.subject.actorId,
    effect,
  );
  const endTurnResult = resolveEndTurnCommand({
    state: proned,
    subject: {
      tag: "runtimeCommand",
      actorId: input.subject.actorId,
      command: "endTurn",
    },
    fills: input.fills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, state: input.state, subject: input.subject }
    : endTurnResult;
}

export function resolveCommandDropCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "commandDrop";
      }
    >
  >,
): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "drop",
  );
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Drop is no longer pending for this actor.",
    );
  }
  const heldObjectFactFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "heldObjectFacts" }> =>
      fill.kind === "heldObjectFacts",
  );
  if (heldObjectFactFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop held-object facts were filled twice.",
    );
  }
  const unsupportedFill = input.fills.find(
    (fill) => fill.kind !== "heldObjectFacts" && !endTurnFillKind(fill.kind),
  );
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop only accepts held-object facts and End Turn fills.",
    );
  }

  const canonicalObjectIds = canonicalHeldObjectIdsForActor(
    input.state,
    input.subject.actorId,
  );
  if (canonicalObjectIds !== null && heldObjectFactFills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop uses canonical character loadout facts for this actor.",
    );
  }
  const heldObjectFactFill = heldObjectFactFills[0];
  if (canonicalObjectIds === null && heldObjectFactFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      commandDropHeldObjectFactsHole(input.subject),
    ]);
  }
  if (
    heldObjectFactFill !== undefined &&
    heldObjectFactFill.holeId !==
      commandDropHeldObjectFactsHoleId(input.subject)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop held-object facts must use the selected Command Drop hole.",
    );
  }
  const objectIds = canonicalObjectIds ?? heldObjectFactFill?.value.objectIds;
  if (objectIds === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop requires known held-object facts.",
    );
  }
  const uniqueObjectIds = new Set(objectIds);
  if (uniqueObjectIds.size !== objectIds.length) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop held-object facts must not duplicate objects.",
    );
  }

  const withoutPending = stateWithoutCommandPendingEffect(
    input.state,
    input.subject.actorId,
    effect,
  );
  const endTurnResult = resolveEndTurnCommand({
    state: withoutPending,
    subject: {
      tag: "runtimeCommand",
      actorId: input.subject.actorId,
      command: "endTurn",
    },
    fills: input.fills.filter((fill) => fill.kind !== "heldObjectFacts"),
  });
  const droppedObjects: readonly BattleDroppedObjectOutcome[] = objectIds.map(
    (objectId) => ({
      kind: "heldObjectDropped",
      actorId: input.subject.actorId,
      objectId,
      sourceCombatantId: input.subject.sourceCombatantId,
      sourceSpellId: input.subject.sourceSpellId,
    }),
  );
  if (endTurnResult.tag === "needsHoles") {
    return { ...endTurnResult, state: input.state, subject: input.subject };
  }
  if (endTurnResult.tag === "invalid") {
    return endTurnResult;
  }
  return { ...endTurnResult, droppedObjects };
}

export function resolveCommandApproachCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "commandApproach";
      }
    >
  >,
): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "approach",
  );
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Approach is no longer pending for this actor.",
    );
  }
  const movementFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "movement" }> =>
      fill.kind === "movement",
  );
  if (movementFills.length === 0) {
    if (!combatantCanMoveInState(input.state, input.subject.actorId)) {
      if (input.fills.length > 0) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Command Approach cannot apply fills when no movement is available.",
        );
      }
      const withoutPending = stateWithoutCommandPendingEffect(
        input.state,
        input.subject.actorId,
        effect,
      );
      return {
        tag: "resolved",
        state: withoutPending,
        snapshot: snapshotBattle(withoutPending),
      };
    }
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Approach accepts one Movement fill.",
    );
  }
  const unsupportedFill = input.fills.find(
    (fill) => fill.kind !== "movement" && !endTurnFillKind(fill.kind),
  );
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Approach only accepts Movement and End Turn fills.",
    );
  }
  const movementFill = movementFills[0]!;
  if (movementFill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested Command Approach hole.",
    );
  }
  const approachFact = movementFill.value.commandApproach;
  if (approachFact === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Approach requires caller-supplied shortest/direct route and proximity facts.",
    );
  }
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    movementFill,
    {
      commandApproach: approachFact,
    },
  );
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  const endTurnFills = input.fills.filter((fill) => fill.kind !== "movement");
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        threats,
        continuation: {
          kind: "commandApproachMovement",
          subject: input.subject,
          movement: movement.movement,
          movedWithinFiveFeetOfCaster: approachFact.movedWithinFiveFeetOfCaster,
          endTurnFills,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  return resolveCommandApproachAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: movement.movement,
    movedWithinFiveFeetOfCaster: approachFact.movedWithinFiveFeetOfCaster,
    endTurnFills,
  });
}

export function resolveCommandApproachAfterMovement(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "commandApproach" }
  >;
  readonly movement: BattleResolvedMovement;
  readonly movedWithinFiveFeetOfCaster: boolean;
  readonly endTurnFills: readonly BattleFill[];
}): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "approach",
  );
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Approach is no longer pending for this actor.",
    );
  }
  const withoutPending = stateWithoutCommandPendingEffect(
    input.state,
    input.subject.actorId,
    effect,
  );
  const moved = applyBattleMovement(withoutPending, input.movement);
  if (!input.movedWithinFiveFeetOfCaster) {
    if (input.endTurnFills.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Command Approach did not end the turn, so End Turn fills do not apply.",
      );
    }
    return {
      tag: "resolved",
      state: moved,
      snapshot: snapshotBattle(moved),
    };
  }
  const endTurnResult = resolveEndTurnCommand({
    state: moved,
    subject: {
      tag: "runtimeCommand",
      actorId: input.subject.actorId,
      command: "endTurn",
    },
    fills: input.endTurnFills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, state: input.state, subject: input.subject }
    : endTurnResult;
}

export function resolveCommandFleeCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "commandFlee";
      }
    >
  >,
): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "flee",
  );
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Flee is no longer pending for this actor.",
    );
  }
  const movementFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "movement" }> =>
      fill.kind === "movement",
  );
  const unsupportedFill = input.fills.find(
    (fill) => fill.kind !== "movement" && !endTurnFillKind(fill.kind),
  );
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee only accepts Movement and End Turn fills.",
    );
  }
  if (movementFills.length === 0) {
    if (!combatantCanMoveInState(input.state, input.subject.actorId)) {
      const withoutPending = stateWithoutCommandPendingEffect(
        input.state,
        input.subject.actorId,
        effect,
      );
      const endTurnResult = resolveEndTurnCommand({
        state: withoutPending,
        subject: {
          tag: "runtimeCommand",
          actorId: input.subject.actorId,
          command: "endTurn",
        },
        fills: input.fills,
      });
      return endTurnResult.tag === "needsHoles"
        ? { ...endTurnResult, state: input.state, subject: input.subject }
        : endTurnResult;
    }
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee accepts one Movement fill.",
    );
  }
  const movementFill = movementFills[0]!;
  if (movementFill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested Command Flee hole.",
    );
  }
  const fleeFact = movementFill.value.commandFlee;
  if (fleeFact === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee requires caller-supplied fastest-available moving-away route facts.",
    );
  }
  const movementBudgetFeet = battleMovementBudgetForActor(
    input.state,
    input.subject.actorId,
    movementFill.value.speedKind,
  ).remainingFeet;
  if (movementFill.value.movementCostFeet !== movementBudgetFeet) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee must spend the selected remaining Movement budget.",
    );
  }
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    movementFill,
    {
      commandFlee: fleeFact,
    },
  );
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  const endTurnFills = input.fills.filter((fill) => fill.kind !== "movement");
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        threats,
        continuation: {
          kind: "commandFleeMovement",
          subject: input.subject,
          movement: movement.movement,
          endTurnFills,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  return resolveCommandFleeAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: movement.movement,
    endTurnFills,
  });
}

export function resolveCommandFleeAfterMovement(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "commandFlee" }
  >;
  readonly movement: BattleResolvedMovement;
  readonly endTurnFills: readonly BattleFill[];
}): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "flee",
  );
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Flee is no longer pending for this actor.",
    );
  }
  const withoutPending = stateWithoutCommandPendingEffect(
    input.state,
    input.subject.actorId,
    effect,
  );
  const moved = applyBattleMovement(withoutPending, input.movement);
  const endTurnResult = resolveEndTurnCommand({
    state: moved,
    subject: {
      tag: "runtimeCommand",
      actorId: input.subject.actorId,
      command: "endTurn",
    },
    fills: input.endTurnFills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, state: input.state, subject: input.subject }
    : endTurnResult;
}

function greaseGroundHazardEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "greaseGroundHazardSave";
    }
  >,
): GreaseGroundHazardEffect | undefined {
  const source = state.combatants.get(subject.sourceCombatantId);
  return source?.activeEffects.find(
    (effect): effect is GreaseGroundHazardEffect =>
      effect.kind === "greaseGroundHazard" &&
      effect.sourceSpellId === subject.sourceSpellId &&
      effect.sourceCombatantId === subject.sourceCombatantId &&
      effect.areaId === subject.areaId,
  );
}

export function greaseGroundHazardSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: GreaseGroundHazardEffect,
  trigger: "entersArea" | "endsTurnInArea",
): BattleGreaseGroundHazardSavingThrowOutcomeHole {
  const key = `battle:grease-ground-hazard-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} ${trigger === "entersArea" ? "entry" : "end-turn"} DEX save`,
    greaseGroundHazard: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
  };
}

function greaseGroundHazardSavingThrowOutcomeFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleGreaseGroundHazardSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function validateGreaseGroundHazardSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  if ("area" in value) {
    return "Grease ground-hazard Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Grease ground-hazard Saving Throw outcome must match the triggering target.";
}

export function resolveGreaseGroundHazardSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "greaseGroundHazardSave";
      }
    >;
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
  if (input.subject.trigger === "endsTurnInArea") {
    return resolveGreaseGroundHazardEndTurnSaveCommand(input);
  }
  return resolveGreaseGroundHazardEntrySaveCommand(input);
}

function resolveGreaseGroundHazardEntrySaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "greaseGroundHazardSave";
      }
    >;
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
  if (
    input.fills.some((fill) => fill.kind !== "savingThrowOutcome") ||
    input.fills.length > 1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Grease ground-hazard save accepts exactly one Saving Throw outcome fill.",
    );
  }
  const effect = greaseGroundHazardEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    !input.state.combatants.has(input.subject.actorId)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Grease ground-hazard save is no longer available.",
    );
  }
  const hole = greaseGroundHazardSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const savingThrowFill = greaseGroundHazardSavingThrowOutcomeFor(
    input.fills.filter(
      (
        fill,
      ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
        fill.kind === "savingThrowOutcome",
    ),
    hole,
  );
  if (savingThrowFill === undefined) {
    return needsHolesResult(input.state, input.subject, [hole]);
  }
  const validation = validateGreaseGroundHazardSavingThrowOutcome(
    savingThrowFill.value,
    input.subject.actorId,
  );
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  const outcome = savingThrowFill.value.outcomes[0]!;
  if (!outcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceSpellId: effect.sourceSpellId,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const nextState = outcome.succeeded
    ? input.state
    : applyGreaseProneToTarget(input.state, input.subject.actorId);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveGreaseGroundHazardEndTurnSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "greaseGroundHazardSave";
      }
    >;
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
  const effect = greaseGroundHazardEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    !input.state.combatants.has(input.subject.actorId)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Grease ground-hazard save is no longer available.",
    );
  }
  const hole = greaseGroundHazardSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const matchingGreaseFills = input.fills.filter(
    (fill) => fill.holeId === hole.holeId,
  );
  if (matchingGreaseFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in Grease received duplicate Grease Saving Throw outcome fills.",
    );
  }
  const [matchingGreaseFill] = matchingGreaseFills;
  if (
    matchingGreaseFill !== undefined &&
    matchingGreaseFill.kind !== "savingThrowOutcome"
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn in Grease requires a Grease Saving Throw outcome fill.",
    );
  }
  const endTurnSubject = {
    tag: "runtimeCommand" as const,
    actorId: input.subject.actorId,
    command: "endTurn" as const,
  };
  const endTurnFills = input.fills.filter(
    (fill) => fill.holeId !== hole.holeId,
  );
  const endTurnProbe = resolveEndTurnCommand({
    state: input.state,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  if (matchingGreaseFill === undefined) {
    return endTurnProbe.tag === "needsHoles"
      ? needsHolesResult(input.state, input.subject, [
          hole,
          ...endTurnProbe.holes,
        ])
      : endTurnProbe.tag === "invalid"
        ? endTurnProbe
        : needsHolesResult(input.state, input.subject, [hole]);
  }
  const validation = validateGreaseGroundHazardSavingThrowOutcome(
    matchingGreaseFill.value,
    input.subject.actorId,
  );
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  if (endTurnProbe.tag === "needsHoles") {
    return { ...endTurnProbe, subject: input.subject };
  }
  if (endTurnProbe.tag === "invalid") {
    return endTurnProbe;
  }
  const outcome = matchingGreaseFill.value.outcomes[0]!;
  if (!outcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceSpellId: effect.sourceSpellId,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const nextState = outcome.succeeded
    ? input.state
    : applyGreaseProneToTarget(input.state, input.subject.actorId);
  const endTurnResult = resolveEndTurnCommand({
    state: nextState,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, subject: input.subject }
    : endTurnResult;
}

function flamingSphereEffectFor(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "flamingSphereSave"
        | "flamingSphereReposition"
        | "flamingSphereRam";
    }
  >,
): FlamingSphereEffect | undefined {
  const source = state.combatants.get(subject.sourceCombatantId);
  return source?.activeEffects.find(
    (effect): effect is FlamingSphereEffect =>
      effect.kind === "flamingSphere" &&
      effect.sourceSpellId === subject.sourceSpellId &&
      effect.sourceCombatantId === subject.sourceCombatantId &&
      effect.areaId === subject.areaId,
  );
}

function flamingSphereTriggerLabel(
  trigger: BattleFlamingSphereTrigger,
): "ram" | "end-within-5-feet" {
  if (trigger === "rammedBySphere") {
    return "ram";
  }
  if (trigger === "endsTurnWithinFiveFeetOfSphere") {
    return "end-within-5-feet";
  }
  const _: never = trigger;
  return _;
}

export function flamingSphereRamMovementHole(
  targetId: CombatantId,
  effect: FlamingSphereEffect,
): BattleFlamingSphereRamMovementHole {
  const key = `battle:flaming-sphere-ram-movement:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}`;
  return {
    kind: "flamingSphereRamMovement",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} ram movement`,
    flamingSphere: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      maxMoveFeet: effect.ramMaxMoveFeet,
    },
    requiresTableSpatialFact: true,
  };
}

export function flamingSphereRepositionMovementHole(
  effect: FlamingSphereEffect,
): BattleFlamingSphereRepositionMovementHole {
  const key = `battle:flaming-sphere-reposition-movement:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}`;
  return {
    kind: "flamingSphereRepositionMovement",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} reposition movement`,
    flamingSphere: {
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      maxMoveFeet: effect.ramMaxMoveFeet,
    },
    requiresTableSpatialFact: true,
  };
}

export function flamingSphereSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: FlamingSphereEffect,
  trigger: BattleFlamingSphereTrigger,
): BattleFlamingSphereSavingThrowOutcomeHole {
  const key = `battle:flaming-sphere-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} ${flamingSphereTriggerLabel(trigger)} DEX save`,
    flamingSphere: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
  };
}

function flamingSphereDamageRollHole(
  targetId: CombatantId,
  effect: FlamingSphereEffect,
  trigger: BattleFlamingSphereTrigger,
): BattleFlamingSphereDamageRollHole {
  const key = `battle:flaming-sphere-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceSpellId}:${effect.areaId}:${trigger}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${effect.sourceSpellId} ${flamingSphereTriggerLabel(trigger)} damage`,
    flamingSphere: {
      targetId,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}

function savingThrowOutcomeFillForHole(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: BattleFlamingSphereSavingThrowOutcomeHole,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function rolledDiceFillForHole(
  fills: readonly Extract<BattleFill, { readonly kind: "rolledDice" }>[],
  hole: BattleFlamingSphereDamageRollHole,
): Extract<BattleFill, { readonly kind: "rolledDice" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function everyFillUsesHoleId(
  fills: readonly { readonly holeId: BattleHoleId }[],
  expectedHoleId: BattleHoleId,
): boolean {
  return fills.every((fill) => fill.holeId === expectedHoleId);
}

function validateFlamingSphereSavingThrowOutcome(
  value: BattleSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  if ("area" in value) {
    return "Flaming Sphere Saving Throw outcome must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Flaming Sphere Saving Throw outcome must match the triggering target.";
}

function validateFlamingSphereDamageRoll(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  hole: BattleFlamingSphereDamageRollHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Flaming Sphere damage must use the selected sphere damage hole.";
  }
  const validation = validateRolledDiceForDiceExpr(
    fill.value,
    hole.flamingSphere.damage.expr,
  );
  return validation === null ? null : validation.reason;
}

function validateFlamingSphereRamMovement(
  fill: Extract<BattleFill, { readonly kind: "flamingSphereRamMovement" }>,
  hole: BattleFlamingSphereRamMovementHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Flaming Sphere ram movement must use the selected sphere movement hole.";
  }
  if (
    Number(fill.value.moveFeet) <= 0 ||
    !Number.isInteger(fill.value.moveFeet)
  ) {
    return "Flaming Sphere ram movement distance must be a positive integer.";
  }
  return Number(fill.value.moveFeet) <= Number(hole.flamingSphere.maxMoveFeet)
    ? null
    : "Flaming Sphere ram movement distance exceeds the spell's maximum.";
}

function validateFlamingSphereRepositionMovement(
  fill: Extract<
    BattleFill,
    { readonly kind: "flamingSphereRepositionMovement" }
  >,
  hole: BattleFlamingSphereRepositionMovementHole,
): string | null {
  if (fill.holeId !== hole.holeId) {
    return "Flaming Sphere reposition movement must use the selected sphere movement hole.";
  }
  if (
    Number(fill.value.moveFeet) <= 0 ||
    !Number.isInteger(fill.value.moveFeet)
  ) {
    return "Flaming Sphere reposition movement distance must be a positive integer.";
  }
  return Number(fill.value.moveFeet) <= Number(hole.flamingSphere.maxMoveFeet)
    ? null
    : "Flaming Sphere reposition movement distance exceeds the spell's maximum.";
}

function flamingSphereAdjustedDamage(input: {
  readonly target: BattleCreatureState;
  readonly effect: FlamingSphereEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
}): number {
  const rolledDamage =
    rolledDiceTotal(input.damageFill.value) +
    (input.effect.damage.expr.flat ?? 0);
  const saveAdjustedDamage = input.saveSucceeded
    ? Math.floor(rolledDamage / 2)
    : rolledDamage;
  return damageAmountAfterTargetAdjustments(
    input.target,
    saveAdjustedDamage,
    input.effect.damage.damageType,
  );
}

function applyFlamingSphereDamage(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly effect: FlamingSphereEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
  readonly concentrationSavingThrow?:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
}): BattleState {
  const target = input.state.combatants.get(input.targetId);
  if (target === undefined) {
    return input.state;
  }
  return applyPreparedSlotSpellDamage(
    input.state,
    input.targetId,
    flamingSphereAdjustedDamage({
      target,
      effect: input.effect,
      damageFill: input.damageFill,
      saveSucceeded: input.saveSucceeded,
    }),
    {
      damageSourceId: input.effect.sourceCombatantId,
      concentrationSavingThrow: input.concentrationSavingThrow,
    },
  );
}

export function resolveFlamingSphereSaveCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "flamingSphereSave";
      }
    >;
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
  const effect = flamingSphereEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.actorId);
  if (effect === undefined || target === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flaming Sphere save is no longer available.",
    );
  }
  const saveHole = flamingSphereSavingThrowOutcomeHole(
    input.state,
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const damageHole = flamingSphereDamageRollHole(
    input.subject.actorId,
    effect,
    input.subject.trigger,
  );
  const saveFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && fill.holeId === saveHole.holeId,
  );
  const damageFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && fill.holeId === damageHole.holeId,
  );
  if (saveFills.length > 1 || damageFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Flaming Sphere end-within-5-feet save received duplicate sphere fills.",
    );
  }
  const concentrationHoleId = concentrationSavingThrowHole(target, 1)?.holeId;
  const endTurnSubject = {
    tag: "runtimeCommand" as const,
    actorId: input.subject.actorId,
    command: "endTurn" as const,
  };
  const endTurnFills = input.fills.filter(
    (fill) =>
      fill.holeId !== saveHole.holeId &&
      fill.holeId !== damageHole.holeId &&
      fill.holeId !== concentrationHoleId,
  );
  const endTurnProbe = resolveEndTurnCommand({
    state: input.state,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return endTurnProbe.tag === "needsHoles"
      ? needsHolesResult(input.state, input.subject, [
          saveHole,
          ...endTurnProbe.holes,
        ])
      : endTurnProbe.tag === "invalid"
        ? endTurnProbe
        : needsHolesResult(input.state, input.subject, [saveHole]);
  }
  const saveValidation = validateFlamingSphereSavingThrowOutcome(
    saveFill.value,
    input.subject.actorId,
  );
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  const saveOutcome = saveFill.value.outcomes[0]!;
  if (!saveOutcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.actorId,
        sourceSpellId: effect.sourceSpellId,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    return endTurnProbe.tag === "needsHoles"
      ? needsHolesResult(input.state, input.subject, [
          damageHole,
          ...endTurnProbe.holes,
        ])
      : endTurnProbe.tag === "invalid"
        ? endTurnProbe
        : needsHolesResult(input.state, input.subject, [damageHole]);
  }
  const damageValidation = validateFlamingSphereDamageRoll(
    damageFill,
    damageHole,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const adjustedDamage = flamingSphereAdjustedDamage({
    target,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
  });
  const concentrationHole = concentrationSavingThrowHole(target, adjustedDamage);
  const concentrationFills =
    concentrationHole === null
      ? []
      : input.fills.filter(
          (
            fill,
          ): fill is Extract<
            BattleFill,
            { readonly kind: "concentrationSavingThrow" }
          > =>
            fill.kind === "concentrationSavingThrow" &&
            fill.holeId === concentrationHole.holeId,
        );
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Flaming Sphere end-within-5-feet save received duplicate sphere fills.",
    );
  }
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  if (concentrationHole !== null && concentrationFill === undefined) {
    return endTurnProbe.tag === "needsHoles"
      ? needsHolesResult(input.state, input.subject, [
          concentrationHole,
          ...endTurnProbe.holes,
        ])
      : endTurnProbe.tag === "invalid"
        ? endTurnProbe
        : needsHolesResult(input.state, input.subject, [concentrationHole]);
  }
  if (endTurnProbe.tag === "needsHoles") {
    return { ...endTurnProbe, subject: input.subject };
  }
  if (endTurnProbe.tag === "invalid") {
    return endTurnProbe;
  }
  const damaged = applyFlamingSphereDamage({
    state: input.state,
    targetId: input.subject.actorId,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
    concentrationSavingThrow: concentrationFill,
  });
  const endTurnResult = resolveEndTurnCommand({
    state: damaged,
    subject: endTurnSubject,
    fills: endTurnFills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, subject: input.subject }
    : endTurnResult;
}

export function resolveFlamingSphereRepositionCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "flamingSphereReposition";
      }
    >;
  },
): BattleResolutionResult {
  if (
    input.fills.some((fill) => fill.kind !== "flamingSphereRepositionMovement")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Flaming Sphere reposition accepts only movement fills.",
    );
  }
  const effect = flamingSphereEffectFor(input.state, input.subject);
  if (
    effect === undefined ||
    input.subject.actorId !== input.subject.sourceCombatantId ||
    input.subject.actorId !== currentActorId(input.state)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flaming Sphere reposition is no longer available.",
    );
  }
  if (!input.state.currentTurnResources.currentHasBonusAction) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flaming Sphere reposition requires an available Bonus Action.",
    );
  }
  const movementHole = flamingSphereRepositionMovementHole(effect);
  const movementFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "flamingSphereRepositionMovement" }
    > => fill.kind === "flamingSphereRepositionMovement",
  );
  if (!everyFillUsesHoleId(movementFills, movementHole.holeId)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Flaming Sphere reposition received a fill for an unrelated hole.",
    );
  }
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Flaming Sphere reposition received duplicate sphere fills.",
    );
  }
  const movementFill = movementFills[0];
  if (movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const movementValidation = validateFlamingSphereRepositionMovement(
    movementFill,
    movementHole,
  );
  if (movementValidation !== null) {
    return invalidResult(input.state, "invalidFill", movementValidation);
  }
  const nextState = {
    ...input.state,
    currentTurnResources: {
      ...input.state.currentTurnResources,
      currentHasBonusAction: false,
    },
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveFlamingSphereRamCommand(
  input: BattleResolutionInput & {
    readonly subject: Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "flamingSphereRam";
      }
    >;
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
  if (
    input.fills.some(
      (fill) =>
        fill.kind !== "savingThrowOutcome" &&
        fill.kind !== "rolledDice" &&
        fill.kind !== "flamingSphereRamMovement" &&
        fill.kind !== "concentrationSavingThrow",
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Flaming Sphere ram accepts only movement, save, damage, and Concentration fills.",
    );
  }
  const effect = flamingSphereEffectFor(input.state, input.subject);
  const target = input.state.combatants.get(input.subject.targetId);
  if (
    effect === undefined ||
    target === undefined ||
    input.subject.actorId !== input.subject.sourceCombatantId ||
    input.subject.actorId !== currentActorId(input.state)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flaming Sphere ram is no longer available.",
    );
  }
  if (!input.state.currentTurnResources.currentHasBonusAction) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flaming Sphere ram requires an available Bonus Action.",
    );
  }
  const saveHole = flamingSphereSavingThrowOutcomeHole(
    input.state,
    input.subject.targetId,
    effect,
    input.subject.trigger,
  );
  const movementHole = flamingSphereRamMovementHole(
    input.subject.targetId,
    effect,
  );
  const damageHole = flamingSphereDamageRollHole(
    input.subject.targetId,
    effect,
    input.subject.trigger,
  );
  const movementFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "flamingSphereRamMovement" }
    > => fill.kind === "flamingSphereRamMovement",
  );
  const saveFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome",
  );
  const damageFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice",
  );
  const concentrationFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    > => fill.kind === "concentrationSavingThrow",
  );
  if (
    !everyFillUsesHoleId(movementFills, movementHole.holeId) ||
    !everyFillUsesHoleId(saveFills, saveHole.holeId) ||
    !everyFillUsesHoleId(damageFills, damageHole.holeId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Flaming Sphere ram received a fill for an unrelated hole.",
    );
  }
  if (
    movementFills.length > 1 ||
    saveFills.length > 1 ||
    damageFills.length > 1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Flaming Sphere ram received duplicate sphere fills.",
    );
  }
  const movementFill = movementFills[0];
  if (movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const movementValidation = validateFlamingSphereRamMovement(
    movementFill,
    movementHole,
  );
  if (movementValidation !== null) {
    return invalidResult(input.state, "invalidFill", movementValidation);
  }
  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return needsHolesResult(input.state, input.subject, [saveHole]);
  }
  const saveValidation = validateFlamingSphereSavingThrowOutcome(
    saveFill.value,
    input.subject.targetId,
  );
  if (saveValidation !== null) {
    return invalidResult(input.state, "invalidFill", saveValidation);
  }
  const saveOutcome = saveFill.value.outcomes[0]!;
  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    if (concentrationFills.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Flaming Sphere ram received a fill for an unrelated hole.",
      );
    }
  } else {
    const damageValidation = validateFlamingSphereDamageRoll(
      damageFill,
      damageHole,
    );
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
  }
  const concentrationHole =
    damageFill === undefined
      ? null
      : concentrationSavingThrowHole(
          target,
          flamingSphereAdjustedDamage({
            target,
            effect,
            damageFill,
            saveSucceeded: saveOutcome.succeeded,
          }),
        );
  if (
    concentrationHole === null
      ? concentrationFills.length > 0
      : !everyFillUsesHoleId(concentrationFills, concentrationHole.holeId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Flaming Sphere ram received a fill for an unrelated hole.",
    );
  }
  if (concentrationFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Flaming Sphere ram received duplicate sphere fills.",
    );
  }
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  if (!saveOutcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "saveFailed",
        targetId: input.subject.targetId,
        sourceSpellId: effect.sourceSpellId,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  if (damageFill === undefined) {
    return needsHolesResult(input.state, input.subject, [damageHole]);
  }
  if (concentrationHole !== null && concentrationFill === undefined) {
    return needsHolesResult(input.state, input.subject, [concentrationHole]);
  }
  const damaged = applyFlamingSphereDamage({
    state: input.state,
    targetId: input.subject.targetId,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
    concentrationSavingThrow: concentrationFill,
  });
  const nextState = {
    ...damaged,
    currentTurnResources: {
      ...damaged.currentTurnResources,
      currentHasBonusAction: false,
    },
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function applySleepRepeatSaveFills(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  round: RoundType,
  saves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  const effects = sleepPendingRepeatSaveEffects(actor, actorId, round);
  if (actor === undefined || effects.length === 0) {
    return combatants;
  }
  return effects.reduce((nextCombatants, effect) => {
    const target = nextCombatants.get(actorId);
    if (target === undefined) {
      return nextCombatants;
    }
    const hole = sleepRepeatSavingThrowOutcomeHole(actorId, effect);
    const save = sleepRepeatSavingThrowOutcomeFor(saves, hole);
    if (save === undefined) {
      return nextCombatants;
    }
    const activeEffectsWithoutPending = target.activeEffects.filter(
      (candidate) => candidate !== effect,
    );
    const conditionsWithoutPending =
      conditionsAfterExpiringSpellConditionEffects(
        target.conditions,
        activeEffectsWithoutPending,
        [effect],
      );
    const succeeded = save.value.outcomes[0]?.succeeded === true;
    if (succeeded) {
      return new Map(nextCombatants).set(
        actorId,
        battleCreatureWithActiveEffectsAndConditions(
          target,
          activeEffectsWithoutPending,
          conditionsWithoutPending,
        ),
      );
    }
    const targetWithoutPending: BattleCreatureState =
      target.positiveHpUnconscious === null
        ? {
            ...target,
            activeEffects: activeEffectsWithoutPending,
            conditions: conditionsWithoutPending,
          }
        : {
            ...target,
            activeEffects: activeEffectsWithoutPending,
          };
    const unconsciousEffect: Extract<
      BattleActiveEffect,
      { readonly kind: "sleepUnconscious" }
    > = {
      kind: "sleepUnconscious" as const,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
        targetWithoutPending,
        "unconscious",
      ),
      expiresAt: {
        kind: "concentration" as const,
        combatantId: effect.sourceCombatantId,
      },
    };
    const activeEffects = [...activeEffectsWithoutPending, unconsciousEffect];
    return breakCombatantConcentration(
      new Map(nextCombatants).set(
        actorId,
        battleCreatureWithActiveEffectsAndConditions(
          target,
          activeEffects,
          conditionsAfterApplyingSpellConditionEffects(
            conditionsWithoutPending,
            activeEffects,
          ),
        ),
      ),
      actorId,
    );
  }, combatants);
}

function hideousLaughterEffects(
  combatant: BattleCreatureState | undefined,
): readonly HideousLaughterEffect[] {
  return combatant === undefined
    ? []
    : combatant.activeEffects.filter(
        (effect): effect is HideousLaughterEffect =>
          effect.kind === "hideousLaughter",
      );
}

function applyHideousLaughterRepeatSaveFills(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  saves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  const effects = hideousLaughterEffects(actor);
  if (actor === undefined || effects.length === 0) {
    return combatants;
  }
  return effects.reduce((nextCombatants, effect) => {
    const hole = hideousLaughterRepeatSavingThrowOutcomeHole(
      actorId,
      effect,
      "endTurn",
    );
    const save = hideousLaughterRepeatSavingThrowOutcomeFor(saves, hole);
    if (save?.value.outcomes[0]?.succeeded !== true) {
      return nextCombatants;
    }
    return removeHideousLaughterEffectFromCombatants(
      nextCombatants,
      actorId,
      effect,
    );
  }, combatants);
}

function applySpellConditionEndTurnSaveFills(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  saves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = combatants.get(actorId);
  const effects = spellConditionEndTurnSaveEffects(actor);
  if (actor === undefined || effects.length === 0) {
    return combatants;
  }
  return effects.reduce((nextCombatants, effect) => {
    const hole = spellConditionEndTurnSavingThrowOutcomeHole(actorId, effect);
    const save = spellConditionEndTurnSavingThrowOutcomeFor(saves, hole);
    if (save?.value.outcomes[0]?.succeeded !== true) {
      return nextCombatants;
    }
    return removeSpellConditionEffectFromCombatants(
      nextCombatants,
      actorId,
      effect,
    );
  }, combatants);
}

function removeSpellConditionEffectFromCombatants(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  targetId: CombatantId,
  expiringEffect: SpellConditionEndTurnSaveEffect,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const target = combatants.get(targetId);
  if (
    target === undefined ||
    !target.activeEffects.some((effect) => effect === expiringEffect)
  ) {
    return combatants;
  }
  const activeEffects = target.activeEffects.filter(
    (effect) => effect !== expiringEffect,
  );
  const nextCombatant: BattleCreatureState =
    target.positiveHpUnconscious === null
      ? {
          ...target,
          activeEffects,
          conditions: conditionsAfterExpiringSpellConditionEffects(
            target.conditions,
            activeEffects,
            [expiringEffect],
          ),
        }
      : { ...target, activeEffects };
  return new Map(combatants).set(targetId, nextCombatant);
}

function removeHideousLaughterEffectFromCombatants(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  targetId: CombatantId,
  expiringEffect: HideousLaughterEffect,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const target = combatants.get(targetId);
  if (
    target === undefined ||
    !target.activeEffects.some((effect) => effect === expiringEffect)
  ) {
    return combatants;
  }
  const activeEffects = target.activeEffects.filter(
    (effect) => effect !== expiringEffect,
  );
  const nextCombatant: BattleCreatureState =
    target.positiveHpUnconscious === null
      ? {
          ...target,
          activeEffects,
          conditions: conditionsAfterExpiringSpellConditionEffects(
            target.conditions,
            activeEffects,
            [expiringEffect],
          ),
        }
      : { ...target, activeEffects };
  return combatantsAfterHideousLaughterSpellEndedIfNoEffects(
    new Map(combatants).set(targetId, nextCombatant),
    expiringEffect,
  );
}

function battleCreatureWithActiveEffectsAndConditions(
  combatant: BattleCreatureState,
  activeEffects: readonly BattleActiveEffect[],
  conditions: BattleCreatureState["conditions"],
): BattleCreatureState {
  return combatant.positiveHpUnconscious === null
    ? { ...combatant, activeEffects, conditions }
    : { ...combatant, activeEffects };
}

function removeSpellTurnStartDamageAndSaveEffect(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellTurnStartDamageAndSave" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: target.activeEffects.filter(
        (candidate) => candidate !== effect,
      ),
    }),
  };
}

function applyStartTurnSpellDamageFills(
  state: BattleState,
  actorId: CombatantId,
  rolls: readonly Extract<BattleFill, { readonly kind: "rolledDice" }>[],
  saves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  concentrationSavingThrows: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[],
  damageDispositions: readonly Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >[],
  hideousLaughterDamageRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
): BattleState {
  const actor = state.combatants.get(actorId);
  const effects = spellTurnStartDamageEffects(actor);
  return effects.reduce((nextState, effect) => {
    const hole = spellTurnStartDamageRollHole(actorId, effect);
    const roll = spellTurnStartDamageRollFor(rolls, hole);
    const target = nextState.combatants.get(actorId);
    if (roll === undefined || target === undefined) {
      return nextState;
    }
    const damageAmount = spellTurnStartDamageAmount(target, effect, roll);
    const concentrationHole = concentrationSavingThrowHole(
      target,
      damageAmount,
    );
    const damaged = applySpellTurnStartDamage(
      nextState,
      actorId,
      effect,
      roll,
      concentrationHole === null
        ? undefined
        : concentrationSavingThrowFillFor(
            concentrationSavingThrows,
            concentrationHole,
          ),
      damageDispositionForTarget(
        startTurnDamageDispositionHoles(nextState, actorId, [{ effect, roll }]),
        damageDispositions,
        actorId,
      ),
      hideousLaughterDamageRepeatSaveFillsForTarget(
        target,
        hideousLaughterDamageRepeatSaves,
      ),
    );
    if (effect.kind !== "spellTurnStartDamageAndSave") {
      return damaged;
    }
    const saveHole = spellTurnStartSavingThrowOutcomeHole(actorId, effect);
    const save = spellTurnStartSavingThrowOutcomeFor(saves, saveHole);
    const succeeded = save?.value.outcomes[0]?.succeeded === true;
    return succeeded
      ? removeSpellTurnStartDamageAndSaveEffect(damaged, actorId, effect)
      : damaged;
  }, state);
}

function startTurnDamageDispositionHoles(
  state: BattleState,
  actorId: CombatantId,
  damageRolls: readonly {
    readonly effect: SpellTurnStartDamageEffect;
    readonly roll: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  }[],
): readonly BattleAttackDamageDispositionHole[] {
  return damageRolls.flatMap(({ effect, roll }) => {
    const target = state.combatants.get(actorId);
    if (target === undefined) {
      return [];
    }
    return (
      zeroHitPointReplacementDispositionHole({
        damageSourceId: effect.sourceCombatantId,
        target,
        damageAmount: spellTurnStartDamageAmount(target, effect, roll),
      }) ?? []
    );
  });
}

export function expireEndOfTurnEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  round: RoundType,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return expireActiveEffects(
    combatants,
    (effect) =>
      "expiresAt" in effect &&
      effect.expiresAt.kind === "endOfTurn" &&
      effect.expiresAt.combatantId === actorId &&
      effect.expiresAt.round === round,
  );
}

export function tickDurationEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const expiredConcentrationSources: ConcentrationEffectSource[] = [];
  const tickedCombatants = new Map(
    [...combatants].map(([id, combatant]) => {
      const expiring: BattleActiveEffect[] = [];
      const activeEffects: BattleActiveEffect[] = [];
      for (const effect of combatant.activeEffects) {
        if (!isTickingDurationActiveEffect(effect)) {
          activeEffects.push(effect);
          continue;
        }
        const remainingTicks = Number(effect.expiresAt.durationTicks) - 1;
        if (remainingTicks <= 0) {
          expiring.push(effect);
          if (
            "sourceSpellId" in effect &&
            "expiresAt" in effect &&
            effect.expiresAt.kind === "concentration"
          ) {
            expiredConcentrationSources.push({
              combatantId: effect.expiresAt.combatantId,
              sourceSpellId: effect.sourceSpellId,
            });
          }
          continue;
        }
        // `isTickingDurationActiveEffect` proves this is a BattleActiveEffect
        // whose expiration can be ticked. Replacing only the branded duration
        // count preserves the original discriminant and variant fields; TS
        // cannot re-correlate that nested update across the union, so this cast
        // restores the already-proven union type.
        const ticked = {
          ...effect,
          expiresAt: {
            ...effect.expiresAt,
            durationTicks: elapsedTimeTicks(remainingTicks),
          },
        } as BattleActiveEffect;
        activeEffects.push(ticked);
      }
      const nextCombatantBase: BattleCreatureState =
        combatant.positiveHpUnconscious === null
          ? {
              ...combatant,
              activeEffects,
              conditions: conditionsAfterExpiringSpellConditionEffects(
                combatant.conditions,
                activeEffects,
                expiring,
              ),
            }
          : { ...combatant, activeEffects };
      const nextCombatant = applyHitPointMaximumIncreaseExpiration(
        nextCombatantBase,
        expiring,
      );
      return [id, nextCombatant];
    }),
  );
  return expireConcentrationDurationSources(
    tickedCombatants,
    expiredConcentrationSources,
  );
}

type ConcentrationEffectSource = {
  readonly combatantId: CombatantId;
  readonly sourceSpellId: string;
};

function activeEffectDurationTicks(
  effect: BattleActiveEffect,
): DurationActiveEffect["expiresAt"]["durationTicks"] | null {
  if (
    effect.kind === "sleepPendingRepeatSave" ||
    effect.kind === "sleepUnconscious" ||
    !("expiresAt" in effect)
  ) {
    return null;
  }
  if (effect.expiresAt.kind === "duration") {
    return effect.expiresAt.durationTicks;
  }
  return effect.expiresAt.kind === "concentration" &&
    effect.expiresAt.durationTicks !== undefined
    ? effect.expiresAt.durationTicks
    : null;
}

type TickingDurationActiveEffect = BattleActiveEffect & {
  readonly expiresAt:
    | DurationActiveEffect["expiresAt"]
    | (Extract<
        BattleActiveEffectExpiration,
        { readonly kind: "concentration" }
      > & {
        readonly durationTicks: DurationActiveEffect["expiresAt"]["durationTicks"];
      });
};

function isTickingDurationActiveEffect(
  effect: BattleActiveEffect,
): effect is TickingDurationActiveEffect {
  return activeEffectDurationTicks(effect) !== null;
}

function expireConcentrationDurationSources(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  sources: readonly ConcentrationEffectSource[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const uniqueSources = [
    ...new Map(
      sources.map((source) => [
        `${source.combatantId}\u0000${source.sourceSpellId}`,
        source,
      ]),
    ).values(),
  ];
  return uniqueSources.reduce(
    (currentCombatants, source) =>
      expireConcentrationDurationSource(currentCombatants, source),
    combatants,
  );
}

function expireConcentrationDurationSource(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  source: ConcentrationEffectSource,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => {
      const expiring = combatant.activeEffects.filter(
        (effect) =>
          effect.sourceCombatantId === source.combatantId &&
          "sourceSpellId" in effect &&
          effect.sourceSpellId === source.sourceSpellId &&
          "expiresAt" in effect &&
          effect.expiresAt.kind === "concentration",
      );
      const activeEffects = combatant.activeEffects.filter(
        (effect) => !expiring.includes(effect),
      );
      const concentrationExpired =
        id === source.combatantId &&
        combatant.concentration?.effectKind === "spellEffect" &&
        combatant.concentration.sourceSpellId === source.sourceSpellId;
      const nextCombatantBase: BattleCreatureState =
        combatant.positiveHpUnconscious === null
          ? {
              ...combatant,
              concentration: concentrationExpired
                ? null
                : combatant.concentration,
              activeEffects,
              conditions: conditionsAfterExpiringSpellConditionEffects(
                combatant.conditions,
                activeEffects,
                expiring,
              ),
            }
          : {
              ...combatant,
              concentration: concentrationExpired
                ? null
                : combatant.concentration,
              activeEffects,
            };
      const nextCombatant = applyHitPointMaximumIncreaseExpiration(
        nextCombatantBase,
        expiring,
      );
      return [id, nextCombatant];
    }),
  );
}

export function expireActiveEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  shouldExpire: (effect: BattleActiveEffect) => boolean,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => {
      const expiring = combatant.activeEffects.filter(shouldExpire);
      const activeEffects = combatant.activeEffects.filter(
        (effect) => !shouldExpire(effect),
      );
      const nextCombatantBase: BattleCreatureState =
        combatant.positiveHpUnconscious === null
          ? {
              ...combatant,
              activeEffects,
              conditions: conditionsAfterExpiringSpellConditionEffects(
                combatant.conditions,
                activeEffects,
                expiring,
              ),
            }
          : { ...combatant, activeEffects };
      const nextCombatant = applyHitPointMaximumIncreaseExpiration(
        nextCombatantBase,
        expiring,
      );
      return [id, nextCombatant];
    }),
  );
}

export function expireStartOfTurnOngoingFeatures(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return expireOngoingFeatures(
    combatants,
    (ongoingFeature) =>
      ongoingFeature.expiresAt.kind === "startOfTurn" &&
      ongoingFeature.expiresAt.combatantId === actorId,
  );
}

export function expireEndOfTurnOngoingFeatures(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  round: RoundType,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return expireOngoingFeatures(
    combatants,
    (ongoingFeature) =>
      ongoingFeature.expiresAt.kind === "endOfTurn" &&
      ongoingFeature.expiresAt.combatantId === actorId &&
      ongoingFeature.expiresAt.round === round,
  );
}

export function expireOngoingFeatures(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  shouldExpire: (occurrence: ActiveOngoingFeatureOccurrence) => boolean,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => [
      id,
      {
        ...combatant,
        activeOngoingFeatureOccurrences: new Map(
          [...combatant.activeOngoingFeatureOccurrences].filter(
            ([, occurrence]) => !shouldExpire(occurrence),
          ),
        ),
      },
    ]),
  );
}

export function resetBattleTurnResources(
  resources: BattleTurnResources,
): BattleTurnResources {
  const { lightWeaponAttackMade: _lightWeaponAttackMade, ...base } =
    resetTurnActionEconomy(resources);
  return {
    ...base,
    commandHalt: null,
    spellSlotUsesThisTurn: [],
    attackRollMadeThisTurn: false,
    attackDamageRidersUsedThisTurn: [],
    weaponDamageDiceRollChoicesUsedThisTurn: [],
    dashMovementBonusFeet: movementFeet(0),
    disengaged: false,
  };
}

export function resolveEndTurnCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  const unsupportedFill = input.fills.find(
    (fill) => !endTurnFillKind(fill.kind),
  );
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn does not accept battle fills for unrelated subjects.",
    );
  }

  const initiative = nextInitiative(input.state.initiative);
  const nextActorId = currentActing(initiative);
  const nextActor = input.state.combatants.get(nextActorId);
  const actorId = currentActorId(input.state);
  const actor = input.state.combatants.get(actorId);
  const sleepRepeatSaveRequests = sleepPendingRepeatSaveEffects(
    actor,
    actorId,
    input.state.initiative.round,
  ).map((effect) => ({
    effect,
    hole: sleepRepeatSavingThrowOutcomeHole(actorId, effect),
  }));
  const sleepRepeatSaveHoles = sleepRepeatSaveRequests.map(
    (request) => request.hole,
  );
  const hideousLaughterRepeatSaveRequests = hideousLaughterEffects(actor).map(
    (effect) => ({
      effect,
      hole: hideousLaughterRepeatSavingThrowOutcomeHole(
        actorId,
        effect,
        "endTurn",
      ),
    }),
  );
  const hideousLaughterRepeatSaveHoles = hideousLaughterRepeatSaveRequests.map(
    (request) => request.hole,
  );
  const spellConditionEndTurnSaveRequests =
    spellConditionEndTurnSaveEffects(actor).map((effect) => ({
      effect,
      hole: spellConditionEndTurnSavingThrowOutcomeHole(actorId, effect),
    }));
  const spellConditionEndTurnSaveHoles =
    spellConditionEndTurnSaveRequests.map((request) => request.hole);
  const needsDeathSavingThrow = startTurnDeathSavingThrowRequired(nextActor);
  const rechargeHole = statBlockRechargeRollHole(nextActor);
  const startTurnDamageEffects = spellTurnStartDamageEffects(nextActor);
  const startTurnDamageRequests = startTurnDamageEffects.map((effect) => ({
    effect,
    hole: spellTurnStartDamageRollHole(nextActorId, effect),
  }));
  const startTurnDamageHoles = startTurnDamageRequests.map(
    (request) => request.hole,
  );
  const startTurnSaveRequests = startTurnDamageEffects.flatMap((effect) =>
    effect.kind === "spellTurnStartDamageAndSave"
      ? [
          {
            effect,
            hole: spellTurnStartSavingThrowOutcomeHole(nextActorId, effect),
          },
        ]
      : [],
  );
  const startTurnSaveHoles = startTurnSaveRequests.map(
    (request) => request.hole,
  );
  const initialHoles = [
    ...sleepRepeatSaveHoles,
    ...hideousLaughterRepeatSaveHoles,
    ...spellConditionEndTurnSaveHoles,
    ...(needsDeathSavingThrow ? [deathSavingThrowHole(nextActorId)] : []),
    ...(rechargeHole === null ? [] : [rechargeHole]),
    ...startTurnDamageHoles,
    ...startTurnSaveHoles,
  ];
  if (initialHoles.length > 0 && input.fills.length === 0) {
    return {
      tag: "needsHoles",
      state: input.state,
      subject: input.subject,
      holes: initialHoles,
      snapshot: snapshotBattle(input.state),
    };
  }

  const deathSavingThrowFill = input.fills.find(
    (fill) => fill.kind === "deathSavingThrow",
  );
  const rechargeRollFill = input.fills.find(
    (fill) => fill.kind === "statBlockRechargeRoll",
  );
  const concentrationSavingThrowFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    > => fill.kind === "concentrationSavingThrow",
  );
  const damageDispositionFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "attackDamageDisposition" }
    > => fill.kind === "attackDamageDisposition",
  );
  const savingThrowOutcomeFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome",
  );
  if (
    input.fills.filter((fill) => fill.kind === "deathSavingThrow").length > 1 ||
    input.fills.filter((fill) => fill.kind === "statBlockRechargeRoll").length >
      1
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received duplicate fills for a single requested hole.",
    );
  }
  const sleepRepeatSaves = sleepRepeatSaveRequests.flatMap((request) => {
    const fill = sleepRepeatSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    return fill === undefined ? [] : [fill];
  });
  const hideousLaughterRepeatSaves = hideousLaughterRepeatSaveRequests.flatMap(
    (request) => {
      const fill = hideousLaughterRepeatSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      );
      return fill === undefined ? [] : [fill];
    },
  );
  const spellConditionEndTurnSaves =
    spellConditionEndTurnSaveRequests.flatMap((request) => {
      const fill = spellConditionEndTurnSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      );
      return fill === undefined ? [] : [fill];
    });
  const missingSleepRepeatSaveHoles = sleepRepeatSaveRequests.flatMap(
    (request) =>
      sleepRepeatSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      ) === undefined
        ? [request.hole]
        : [],
  );
  if (missingSleepRepeatSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingSleepRepeatSaveHoles,
    ]);
  }
  const missingHideousLaughterRepeatSaveHoles =
    hideousLaughterRepeatSaveRequests.flatMap((request) =>
      hideousLaughterRepeatSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      ) === undefined
        ? [request.hole]
        : [],
    );
  if (missingHideousLaughterRepeatSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingHideousLaughterRepeatSaveHoles,
    ]);
  }
  const missingSpellConditionEndTurnSaveHoles =
    spellConditionEndTurnSaveRequests.flatMap((request) =>
      spellConditionEndTurnSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        request.hole,
      ) === undefined
        ? [request.hole]
        : [],
    );
  if (missingSpellConditionEndTurnSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingSpellConditionEndTurnSaveHoles,
    ]);
  }
  const startTurnDamageRolls = startTurnDamageRequests.flatMap((request) => {
    const fill = spellTurnStartDamageRollFor(input.fills, request.hole);
    return fill === undefined ? [] : [fill];
  });
  const startTurnDamageRollRequests = startTurnDamageRequests.flatMap(
    (request) => {
      const roll = spellTurnStartDamageRollFor(input.fills, request.hole);
      return roll === undefined ? [] : [{ ...request, roll }];
    },
  );
  const missingStartTurnDamageHoles = startTurnDamageRequests.flatMap(
    (request) =>
      spellTurnStartDamageRollFor(input.fills, request.hole) === undefined
        ? [request.hole]
        : [],
  );
  if (missingStartTurnDamageHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingStartTurnDamageHoles,
    ]);
  }
  const startTurnDamageHoleIds = new Set<BattleHoleId>(
    startTurnDamageHoles.map((hole) => hole.holeId),
  );
  if (
    input.fills.some(
      (fill) =>
        fill.kind === "rolledDice" && !startTurnDamageHoleIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn rolled dice fills must match a requested start-turn damage hole.",
    );
  }
  if (
    input.fills.filter((fill) => fill.kind === "rolledDice").length !==
    startTurnDamageRolls.length
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received duplicate rolled dice fills for start-turn damage.",
    );
  }
  const startTurnSaves = startTurnSaveRequests.flatMap((request) => {
    const fill = spellTurnStartSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    return fill === undefined ? [] : [fill];
  });
  const missingStartTurnSaveHoles = startTurnSaveRequests.flatMap((request) =>
    spellTurnStartSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    ) === undefined
      ? [request.hole]
      : [],
  );
  if (missingStartTurnSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingStartTurnSaveHoles,
    ]);
  }
  const startTurnHideousLaughterDamageRepeatSaveChecks =
    startTurnDamageRollRequests.map((request) =>
      nextActor === undefined
        ? { tag: "ok" as const, holes: [] }
        : hideousLaughterDamageRepeatSaveFillCheck({
            target: nextActor,
            damageAmount: spellTurnStartDamageAmount(
              nextActor,
              request.effect,
              request.roll,
            ),
            fills: hideousLaughterDamageRepeatSaveFillsForTarget(
              nextActor,
              savingThrowOutcomeFills,
            ),
          }),
    );
  const invalidStartTurnHideousLaughterDamageRepeatSaveCheck =
    startTurnHideousLaughterDamageRepeatSaveChecks.find(
      (check) => check.tag === "invalid",
    );
  if (invalidStartTurnHideousLaughterDamageRepeatSaveCheck?.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      invalidStartTurnHideousLaughterDamageRepeatSaveCheck.message,
    );
  }
  const startTurnHideousLaughterDamageRepeatSaveHoles =
    startTurnHideousLaughterDamageRepeatSaveChecks.flatMap((check) =>
      check.tag === "needsHoles" || check.tag === "ok" ? [...check.holes] : [],
    );
  const missingStartTurnHideousLaughterDamageRepeatSaveHoles =
    startTurnHideousLaughterDamageRepeatSaveChecks.flatMap((check) =>
      check.tag === "needsHoles" ? [...check.holes] : [],
    );
  if (missingStartTurnHideousLaughterDamageRepeatSaveHoles.length > 0) {
    return needsHolesResult(input.state, input.subject, [
      ...missingStartTurnHideousLaughterDamageRepeatSaveHoles,
    ]);
  }
  const startTurnHideousLaughterDamageRepeatSaves =
    startTurnHideousLaughterDamageRepeatSaveHoles.flatMap((hole) => {
      const fill = hideousLaughterRepeatSavingThrowOutcomeFor(
        savingThrowOutcomeFills,
        hole,
      );
      return fill === undefined ? [] : [fill];
    });
  const savingThrowOutcomeHoleIds = new Set<BattleHoleId>(
    [
      ...sleepRepeatSaveHoles,
      ...hideousLaughterRepeatSaveHoles,
      ...spellConditionEndTurnSaveHoles,
      ...startTurnSaveHoles,
      ...startTurnHideousLaughterDamageRepeatSaveHoles,
    ].map((hole) => hole.holeId),
  );
  if (
    input.fills.some(
      (fill) =>
        fill.kind === "savingThrowOutcome" &&
        !savingThrowOutcomeHoleIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn Saving Throw outcome fills must match a requested end-turn or turn-start spell save hole.",
    );
  }
  if (
    savingThrowOutcomeFills.length !==
    sleepRepeatSaves.length +
      hideousLaughterRepeatSaves.length +
      spellConditionEndTurnSaves.length +
      startTurnSaves.length +
      startTurnHideousLaughterDamageRepeatSaves.length
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received duplicate Saving Throw outcome fills.",
    );
  }
  for (const request of sleepRepeatSaveRequests) {
    const fill = sleepRepeatSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    if (fill === undefined) {
      continue;
    }
    const validation = validateSleepRepeatSavingThrowOutcome(
      fill.value,
      actorId,
    );
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
  }
  for (const request of hideousLaughterRepeatSaveRequests) {
    const fill = hideousLaughterRepeatSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    if (fill === undefined) {
      continue;
    }
    const validation = validateSleepRepeatSavingThrowOutcome(
      fill.value,
      actorId,
    );
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
  }
  for (const request of spellConditionEndTurnSaveRequests) {
    const fill = spellConditionEndTurnSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    if (fill === undefined) {
      continue;
    }
    const validation = validateSpellConditionEndTurnSavingThrowOutcome(
      fill.value,
      actorId,
    );
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
  }
  for (const fill of startTurnHideousLaughterDamageRepeatSaves) {
    const validation = validateSleepRepeatSavingThrowOutcome(
      fill.value,
      nextActorId,
    );
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
  }
  for (const request of startTurnSaveRequests) {
    const fill = spellTurnStartSavingThrowOutcomeFor(
      savingThrowOutcomeFills,
      request.hole,
    );
    if (fill === undefined) {
      continue;
    }
    const validation = validateSpellTurnStartSavingThrowOutcome(
      fill.value,
      nextActorId,
    );
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation);
    }
  }
  for (const request of startTurnDamageRollRequests) {
    const damage = spellTurnStartDamageForEffect(request.effect);
    const validation = validateRolledDiceForDiceExpr(
      request.roll.value,
      damage.expr,
    );
    if (validation !== null) {
      return invalidResult(input.state, "invalidFill", validation.reason);
    }
  }
  const startTurnConcentrationHoles = startTurnDamageRollRequests.flatMap(
    (request) => {
      const target = nextActor;
      if (target === undefined) {
        return [];
      }
      const hole = concentrationSavingThrowHole(
        target,
        spellTurnStartDamageAmount(target, request.effect, request.roll),
      );
      return hole === null ? [] : [hole];
    },
  );
  const missingConcentrationHoles = startTurnConcentrationHoles.filter(
    (hole) =>
      concentrationSavingThrowFillFor(concentrationSavingThrowFills, hole) ===
      undefined,
  );
  if (missingConcentrationHoles.length > 0) {
    return needsHolesResult(
      input.state,
      input.subject,
      missingConcentrationHoles,
    );
  }
  const concentrationHoleIds = new Set<BattleHoleId>(
    startTurnConcentrationHoles.map((hole) => hole.holeId),
  );
  if (
    input.fills.some(
      (fill) =>
        fill.kind === "concentrationSavingThrow" &&
        !concentrationHoleIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating start-turn damage target.",
    );
  }
  if (
    concentrationSavingThrowFills.length !== startTurnConcentrationHoles.length
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received duplicate Concentration Saving Throw fills for start-turn damage.",
    );
  }
  const damageDispositionHoles = startTurnDamageRollRequests.flatMap(
    (request) =>
      startTurnDamageDispositionHoles(input.state, nextActorId, [request]),
  );
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: damageDispositionFills,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  const missingDamageDispositionHoles = damageDispositionHoles.filter(
    (hole) =>
      damageDispositionFillFor(damageDispositionFills, hole) === undefined,
  );
  if (missingDamageDispositionHoles.length > 0) {
    return needsHolesResult(
      input.state,
      input.subject,
      missingDamageDispositionHoles,
    );
  }
  if (
    (needsDeathSavingThrow &&
      deathSavingThrowFill?.kind !== "deathSavingThrow") ||
    (!needsDeathSavingThrow && deathSavingThrowFill !== undefined)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      needsDeathSavingThrow
        ? "End Turn requires a Death Saving Throw fill for the next actor."
        : "End Turn does not accept battle fills.",
    );
  }
  if (
    (rechargeHole !== null &&
      rechargeRollFill?.kind !== "statBlockRechargeRoll") ||
    (rechargeHole === null && rechargeRollFill !== undefined)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      rechargeHole !== null
        ? "End Turn requires a Stat Block Recharge roll fill for the next actor."
        : "End Turn does not accept a Stat Block Recharge roll fill.",
    );
  }
  if (
    deathSavingThrowFill?.kind === "deathSavingThrow" &&
    deathSavingThrowFill.holeId !== DEATH_SAVING_THROW_HOLE_ID
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Death Saving Throw fill does not match the requested hole.",
    );
  }
  if (
    rechargeRollFill?.kind === "statBlockRechargeRoll" &&
    rechargeRollFill.holeId !== STAT_BLOCK_RECHARGE_ROLL_HOLE_ID
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stat Block Recharge roll fill does not match the requested hole.",
    );
  }
  if (
    rechargeRollFill?.kind === "statBlockRechargeRoll" &&
    !statBlockRechargeRollFillMatchesHole(rechargeRollFill.value, rechargeHole)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stat Block Recharge roll fill must provide one d6 result for each requested target.",
    );
  }

  return resolveEndTurn(
    input.state,
    deathSavingThrowFill?.kind === "deathSavingThrow"
      ? deathSavingThrowFill.value
      : undefined,
    rechargeRollFill?.kind === "statBlockRechargeRoll"
      ? rechargeRollFill.value
      : undefined,
    sleepRepeatSaves,
    hideousLaughterRepeatSaves,
    spellConditionEndTurnSaves,
    startTurnDamageRolls,
    startTurnSaves,
    startTurnHideousLaughterDamageRepeatSaves,
    concentrationSavingThrowFills,
    damageDispositionFills,
  );
}

const END_TURN_FILL_KINDS = [
  "attackDamageDisposition",
  "concentrationSavingThrow",
  "deathSavingThrow",
  "rolledDice",
  "savingThrowOutcome",
  "statBlockRechargeRoll",
] as const satisfies ReadonlyArray<BattleFill["kind"]>;
const END_TURN_FILL_KIND_SET: ReadonlySet<BattleFill["kind"]> = new Set(
  END_TURN_FILL_KINDS,
);

function endTurnFillKind(kind: BattleFill["kind"]): boolean {
  return END_TURN_FILL_KIND_SET.has(kind);
}

export function statBlockRechargeRollFillMatchesHole(
  value: readonly BattleStatBlockRechargeRollResult[],
  rechargeHole: BattleStatBlockRechargeRollHole | null,
): boolean {
  if (rechargeHole === null) return value.length === 0;
  if (value.length !== rechargeHole.rechargeTargets.length) return false;

  const matchedTargetIndexes = new Set<number>();
  for (const result of value) {
    if (result.roll < 1 || result.roll > 6) return false;
    const targetIndex = rechargeHole.rechargeTargets.findIndex(
      (target, index) =>
        !matchedTargetIndexes.has(index) &&
        sameStatBlockPartKey(target, result.target),
    );
    if (targetIndex === -1) return false;
    matchedTargetIndexes.add(targetIndex);
  }
  return true;
}

export function resolveMoveCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length === 0) {
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  if (input.fills.length > 1 || input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move requires exactly one Movement fill.",
    );
  }
  const fill = input.fills[0];
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested hole.",
    );
  }
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    fill,
  );
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        threats,
        continuation: {
          kind: "movement",
          subject: input.subject,
          movement: movement.movement,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  const nextState = applyBattleMovement(input.state, movement.movement);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

type JumpMovementReplacementEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "jumpMovementReplacement" }
>;

export function resolveJumpMovementReplacementCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "jumpMovementReplacement";
      }
    >
  >,
): BattleResolutionResult {
  const effect = jumpMovementReplacementEffectForSubject(
    input.state,
    input.subject,
  );
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Jump movement replacement is not available.",
    );
  }
  if (input.fills.length === 0) {
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  if (input.fills.length > 1 || input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Jump movement replacement requires exactly one Movement fill.",
    );
  }
  const fill = input.fills[0];
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested Jump movement replacement hole.",
    );
  }
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    fill,
    { jumpMovementReplacement: effect },
  );
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }

  const consumedState = markJumpMovementReplacementUsed(
    input.state,
    input.subject.actorId,
    effect,
  );
  const threats = opportunityAttackThreatsForMovement(
    consumedState,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenReactionWindow(
      consumedState,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        threats,
        continuation: {
          kind: "movement",
          subject: input.subject,
          movement: movement.movement,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  const nextState = applyBattleMovement(consumedState, movement.movement);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function jumpMovementReplacementEffectForSubject(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "jumpMovementReplacement";
    }
  >,
): JumpMovementReplacementEffect | null {
  const actor = state.combatants.get(subject.actorId);
  if (actor === undefined) {
    return null;
  }
  return (
    actor.activeEffects.find(
      (effect): effect is JumpMovementReplacementEffect =>
        effect.kind === "jumpMovementReplacement" &&
        effect.sourceCombatantId === subject.sourceCombatantId &&
        effect.sourceSpellId === subject.sourceSpellId &&
        !effect.usedThisTurn,
    ) ?? null
  );
}

function markJumpMovementReplacementUsed(
  state: BattleState,
  actorId: CombatantId,
  consumedEffect: JumpMovementReplacementEffect,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  const activeEffects = actor.activeEffects.map((effect) =>
    effect.kind === "jumpMovementReplacement" &&
    effect.sourceCombatantId === consumedEffect.sourceCombatantId &&
    effect.sourceSpellId === consumedEffect.sourceSpellId
      ? { ...effect, usedThisTurn: true }
      : effect,
  );
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      activeEffects,
    }),
  };
}

export function resolveStandFromProneCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stand from Prone accepts no fills.",
    );
  }
  const actor = input.state.combatants.get(input.subject.actorId);
  const cost = standFromProneCostFeet(input.state, input.subject.actorId);
  if (actor === undefined || cost === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Stand from Prone is no longer available.",
    );
  }
  const nextActor = {
    ...battleCreatureStateWithKnockOutPreservedConditions(
      actor,
      removeCondition(actor.conditions, "prone"),
    ),
    movementSpentFeet: movementFeet(Number(actor.movementSpentFeet) + cost),
  };
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      actor.combatantId,
      nextActor,
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function standFromProneCostFeet(
  state: BattleState,
  actorId: CombatantId,
): number | null {
  const actor = state.combatants.get(actorId);
  if (actor === undefined || !hasCondition(actor.conditions, "prone")) {
    return null;
  }
  if (hideousLaughterEffects(actor).length > 0) {
    return null;
  }
  const speed = effectiveWalkSpeed(
    actor,
    state.grapples.some((grapple) => grapple.targetId === actorId),
  );
  const cost = Math.floor(Number(speed) / 2);
  const remaining = battleMovementBudgetForActor(state, actorId).remainingFeet;
  if (cost <= 0 || Number(remaining) < cost) return null;
  return cost;
}

export function movementHole(
  state: BattleState,
  actorId: CombatantId,
): BattleMovementHole {
  const budget = battleMovementBudgetForActor(state, actorId);
  return movementHoleWithBudget(
    actorId,
    budget.remainingFeet,
    budget.speedKinds.map((speedKind) => ({
      kind: speedKind.kind,
      movementBudgetFeet: speedKind.remainingFeet,
    })),
  );
}

export function readiedMovementHole(
  state: BattleState,
  actorId: CombatantId,
): BattleMovementHole {
  const actor = state.combatants.get(actorId);
  const isGrappled = state.grapples.some(
    (grapple) => grapple.targetId === actorId,
  );
  const speedKinds =
    actor === undefined
      ? []
      : representedMovementSpeedKinds(actor).map((kind) => ({
          kind,
          movementBudgetFeet: effectiveMovementSpeed(actor, kind, isGrappled),
        }));
  return movementHoleWithBudget(
    actorId,
    readiedMovementBudgetForActor(state, actorId),
    speedKinds,
  );
}

export function movementHoleWithBudget(
  actorId: CombatantId,
  movementBudgetFeet: MovementFeet,
  speedKinds: readonly {
    readonly kind: BattleMovementSpeedKind;
    readonly movementBudgetFeet: MovementFeet;
  }[] = [{ kind: "walk", movementBudgetFeet }],
): BattleMovementHole {
  return {
    kind: "movement",
    holeInstanceKey: MOVEMENT_HOLE_INSTANCE,
    holeId: MOVEMENT_HOLE_ID,
    label: "Movement",
    actorId,
    movementBudgetFeet,
    speedKinds,
  };
}

export function readiedMovementBudgetForActor(
  state: BattleState,
  actorId: CombatantId,
  speedKind: BattleMovementSpeedKind = "walk",
): MovementFeet {
  const actor = state.combatants.get(actorId);
  return actor === undefined
    ? movementFeet(0)
    : effectiveMovementSpeed(
        actor,
        speedKind,
        state.grapples.some((grapple) => grapple.targetId === actorId),
      );
}

export function parseBattleMovement(
  state: BattleState,
  moverId: CombatantId,
  fill: Extract<BattleFill, { readonly kind: "movement" }>,
  options: {
    readonly movementBudgetFeet?: MovementFeet;
    readonly spendsTurnMovement?: boolean;
    readonly jumpMovementReplacement?: JumpMovementReplacementEffect;
    readonly commandApproach?: BattleCommandApproachMovementFact;
    readonly commandFlee?: BattleCommandFleeMovementFact;
  } = {},
):
  | { readonly tag: "ok"; readonly movement: BattleResolvedMovement }
  | { readonly tag: "invalid"; readonly message: string } {
  const movementBudgetFeet =
    options.movementBudgetFeet ??
    battleMovementBudgetForActor(state, moverId, fill.value.speedKind)
      .remainingFeet;
  const mover = state.combatants.get(moverId);
  if (
    mover === undefined ||
    !representedMovementSpeedKinds(mover).includes(fill.value.speedKind)
  ) {
    return {
      tag: "invalid",
      message: "Movement speed kind is not represented for this combatant.",
    };
  }
  if (!combatantCanMoveWithBudget(state, moverId, movementBudgetFeet)) {
    return { tag: "invalid", message: "Current combatant cannot move." };
  }
  if (
    fill.value.movementCostFeet <= 0 ||
    !Number.isInteger(fill.value.movementCostFeet)
  ) {
    return {
      tag: "invalid",
      message: "Movement cost must be a positive integer.",
    };
  }
  const greaseGroundDifficultTerrainValidation =
    validateGreaseGroundDifficultTerrainMovementFact(
      state,
      fill.value.greaseGroundDifficultTerrain,
      fill.value.movementCostFeet,
    );
  if (greaseGroundDifficultTerrainValidation !== null) {
    return {
      tag: "invalid",
      message: greaseGroundDifficultTerrainValidation,
    };
  }
  const jumpMovementValidation = validateJumpMovementReplacementFact(
    fill.value.jumpMovementReplacement,
    options.jumpMovementReplacement,
    fill.value.movementCostFeet,
  );
  if (jumpMovementValidation !== null) {
    return {
      tag: "invalid",
      message: jumpMovementValidation,
    };
  }
  const commandApproachValidation = validateCommandApproachMovementFact(
    fill.value.commandApproach,
    options.commandApproach,
  );
  if (commandApproachValidation !== null) {
    return {
      tag: "invalid",
      message: commandApproachValidation,
    };
  }
  const commandFleeValidation = validateCommandFleeMovementFact(
    fill.value.commandFlee,
    options.commandFlee,
  );
  if (commandFleeValidation !== null) {
    return {
      tag: "invalid",
      message: commandFleeValidation,
    };
  }
  const movementCost = ordinaryMovementCost(
    movementFeet(fill.value.movementCostFeet),
    fill.value.speedKind,
  );
  if (Number(movementCost.costFeet) > Number(movementBudgetFeet)) {
    return {
      tag: "invalid",
      message: "Movement cost exceeds the combatant's remaining Movement.",
    };
  }
  const seen = new Set<string>();
  const provokedOpportunityAttacks: BattleOpportunityAttackThreat[] = [];
  for (const threat of fill.value.provokedOpportunityAttacks) {
    const reactorId = threat.reactorId;
    if (reactorId === moverId) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat cannot name the mover as reactor.",
      };
    }
    if (!state.combatants.has(reactorId)) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat references an unknown combatant.",
      };
    }
    const attack = attackActionOptionsForActor(state, reactorId).find(
      (option) => attackActionOptionName(option) === threat.attackName,
    );
    if (attack === undefined) {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat references an unknown attack option.",
      };
    }
    if (attackTargetConstraint(attack).kind !== "meleeReach") {
      return {
        tag: "invalid",
        message:
          "Movement Opportunity Attack threat must name a melee attack option.",
      };
    }
    const threatKey = `${reactorId}\u0000${threat.attackName}`;
    if (seen.has(threatKey)) {
      return {
        tag: "invalid",
        message: "Movement Opportunity Attack threat repeats an attack option.",
      };
    }
    seen.add(threatKey);
    provokedOpportunityAttacks.push(threat);
  }
  return {
    tag: "ok",
    movement: {
      moverId,
      speedKind: fill.value.speedKind,
      movementCostFeet: movementCost.costFeet,
      provokedOpportunityAttacks,
      spendsTurnMovement: options.spendsTurnMovement ?? true,
      ...(fill.value.jumpMovementReplacement === undefined
        ? {}
        : { jumpMovementReplacement: fill.value.jumpMovementReplacement }),
    },
  };
}

function validateGreaseGroundDifficultTerrainMovementFact(
  state: BattleState,
  fact: BattleGreaseGroundDifficultTerrainMovementFact | undefined,
  movementCostFeet: MovementFeet,
): string | null {
  if (fact === undefined) {
    return null;
  }
  if (fact.kind !== "greaseGroundDifficultTerrain") {
    return "Grease Difficult Terrain movement fact has the wrong kind.";
  }
  if (
    !Number.isInteger(fact.totalDistanceFeet) ||
    fact.totalDistanceFeet <= 0
  ) {
    return "Grease Difficult Terrain total distance must be a positive integer.";
  }
  if (
    !Number.isInteger(fact.greaseDistanceFeet) ||
    fact.greaseDistanceFeet <= 0
  ) {
    return "Grease Difficult Terrain distance must be a positive integer.";
  }
  if (Number(fact.greaseDistanceFeet) > Number(fact.totalDistanceFeet)) {
    return "Grease Difficult Terrain distance cannot exceed total Movement distance.";
  }
  const source = state.combatants.get(fact.sourceCombatantId);
  const activeGrease = source?.activeEffects.some(
    (effect) =>
      effect.kind === "greaseGroundHazard" &&
      effect.sourceCombatantId === fact.sourceCombatantId &&
      effect.sourceSpellId === fact.sourceSpellId &&
      effect.areaId === fact.areaId,
  );
  if (activeGrease !== true) {
    return "Grease Difficult Terrain movement fact does not match an active Grease ground hazard.";
  }
  const expectedCostFeet = movementFeet(
    Number(fact.totalDistanceFeet) + Number(fact.greaseDistanceFeet),
  );
  return Number(movementCostFeet) === Number(expectedCostFeet)
    ? null
    : "Grease Difficult Terrain movement must spend total distance plus 1 extra foot for every foot moved through the area.";
}

function validateJumpMovementReplacementFact(
  fact: BattleJumpMovementReplacementFact | undefined,
  effect: JumpMovementReplacementEffect | undefined,
  movementCostFeet: MovementFeet,
): string | null {
  if (effect === undefined) {
    return fact === undefined
      ? null
      : "Jump movement replacement facts cannot be supplied for ordinary Movement.";
  }
  if (fact === undefined) {
    return "Jump movement replacement requires caller-supplied jump distance and landing facts.";
  }
  if (fact.kind !== "jumpMovementReplacement") {
    return "Jump movement replacement fact has the wrong kind.";
  }
  if (movementCostFeet !== effect.movementCostFeet) {
    return "Jump movement replacement must spend exactly the spell's Movement cost.";
  }
  if (!Number.isInteger(fact.distanceFeet) || fact.distanceFeet <= 0) {
    return "Jump movement replacement distance must be a positive integer.";
  }
  if (Number(fact.distanceFeet) > Number(effect.maxJumpDistanceFeet)) {
    return "Jump movement replacement distance exceeds the spell's maximum.";
  }
  if (
    fact.landing.kind !== "legalLanding" ||
    (fact.landing.difficultTerrainAcrobatics !== "notRequired" &&
      fact.landing.difficultTerrainAcrobatics !== "passed" &&
      fact.landing.difficultTerrainAcrobatics !== "failed")
  ) {
    return "Jump movement replacement requires caller-supplied legal landing facts.";
  }
  return null;
}

function validateCommandApproachMovementFact(
  fact: BattleCommandApproachMovementFact | undefined,
  expected: BattleCommandApproachMovementFact | undefined,
): string | null {
  if (expected === undefined) {
    return fact === undefined
      ? null
      : "Command Approach route facts cannot be supplied for ordinary Movement.";
  }
  if (fact === undefined) {
    return "Command Approach requires caller-supplied route facts.";
  }
  return fact.kind === "commandApproachShortestDirectRouteTowardCaster"
    ? null
    : "Command Approach route fact has the wrong kind.";
}

function validateCommandFleeMovementFact(
  fact: BattleCommandFleeMovementFact | undefined,
  expected: BattleCommandFleeMovementFact | undefined,
): string | null {
  if (expected === undefined) {
    return fact === undefined
      ? null
      : "Command Flee route facts cannot be supplied for ordinary Movement.";
  }
  if (fact === undefined) {
    return "Command Flee requires caller-supplied route facts.";
  }
  return fact.kind === "commandFleeFastestAvailableRouteAwayFromCaster"
    ? null
    : "Command Flee route fact has the wrong kind.";
}

export function resetStartOfTurnCombatant(
  combatant: BattleCreatureState,
): BattleCreatureState {
  const resetCombatant = {
    ...combatant,
    dodging: false,
    reactionAvailable: true,
    movementSpentFeet: movementFeet(0),
    attackRollMissToHitReplacementsUsedSinceTurnStart: [],
  };
  if (resetCombatant.origin.kind !== "statBlock") {
    return resetCombatant;
  }
  return {
    ...resetCombatant,
    origin: {
      ...resetCombatant.origin,
      resources: refreshStatBlockStartTurnResources(
        resetCombatant.origin.resources,
        resetCombatant.origin.statBlock.statBlock,
      ),
    },
  };
}

export function resetPerTurnCharacterResources(
  combatant: BattleCreatureState,
): BattleCreatureState {
  if (combatant.origin.kind !== "character") {
    return combatant;
  }

  return {
    ...combatant,
    origin: {
      ...combatant.origin,
      resources: combatant.origin.resources.map((resource) => ({
        ...resource,
        usedThisTurn: false,
      })),
    },
  };
}
