// Turn-end, movement command, opportunity-attack, and readied-release resolution
// extracted from ../battle-reducer.ts. Mechanical move; no behavior change
// intended.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

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

import { type BattleMovementSpeedKind } from "../battle-subjects.ts";

import { CombatantId } from "../identity.ts";

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
  applyTemporaryHitPoints,
  breakCombatantConcentration,
  concentrationSavingThrowHole,
  deathSavingThrowHole,
  processStatBlockRechargeRolls,
  startTurnDeathSavingThrowRequired,
  statBlockRechargeRollHole,
} from "./damage-apply.ts";

import { maybeOpenReactionWindow, snapshotBattle } from "./dispatcher.ts";

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
  combatantCanMoveWithBudget,
  effectiveMovementSpeed,
  effectiveWalkSpeed,
  opportunityAttackThreatsForMovement,
  representedMovementSpeedKinds,
} from "./movement-speed.ts";

import { invalidResult } from "./result-helpers.ts";

import {
  conditionsAfterApplyingSpellConditionEffects,
  conditionsAfterExpiringSpellConditionEffects,
  conditionHadNonSpellSourceBeforeSpellEffect,
} from "./spell-condition-effects-helpers.ts";

import { damageAmountAfterTargetAdjustments } from "./damage-helpers.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";

import { applyPreparedSlotSpellDamage } from "./spells-damage-fills.ts";

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
  BattleCreatureState,
  BattleFill,
  BattleHoleId,
  BattleMovementHole,
  BattleOpportunityAttackThreat,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleResolvedMovement,
  BattleSleepRepeatSavingThrowOutcomeHole,
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
  spellTurnStartDamageRolls: readonly Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >[] = [],
  spellTurnStartSaves: readonly Extract<
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
  const combatantsAfterEndEffects = expireEndOfTurnEffects(
    combatantsAfterSleepRepeatSaves,
    currentActorId(state),
    state.initiative.round,
  );
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
  const nextState = {
    ...state,
    initiative,
    combatants: combatantsAfterDamageReductionReset,
    currentTurnResources: resetBattleTurnResources(state.currentTurnResources),
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

export function resetSpellDamageReductionsForNewTurn(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => {
      const activeEffects = combatant.activeEffects.map((effect) =>
        effect.kind === "spellDamageReduction" && effect.usedThisTurn
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
type DurationActiveEffect = Extract<
  Exclude<
    BattleActiveEffect,
    Extract<BattleActiveEffect, { readonly kind: "sleepPendingRepeatSave" }>
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
      { readonly kind: "spellCondition" }
    > = {
      kind: "spellCondition" as const,
      sourceSpellId: effect.sourceSpellId,
      sourceCombatantId: effect.sourceCombatantId,
      condition: "unconscious" as const,
      conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
        targetWithoutPending,
        "unconscious",
      ),
      escape: null,
      turnStartDamage: null,
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
  return new Map(
    [...combatants].map(([id, combatant]) => {
      const expiring: BattleActiveEffect[] = [];
      const activeEffects = combatant.activeEffects.flatMap((effect) => {
        if (!isDurationActiveEffect(effect)) {
          return [effect];
        }
        const remainingTicks = Number(effect.expiresAt.durationTicks) - 1;
        if (remainingTicks <= 0) {
          expiring.push(effect);
          return [];
        }
        return [
          {
            ...effect,
            expiresAt: {
              ...effect.expiresAt,
              durationTicks: elapsedTimeTicks(remainingTicks),
            },
          },
        ];
      });
      const nextCombatant: BattleCreatureState =
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
      return [id, nextCombatant];
    }),
  );
}

function isDurationActiveEffect(
  effect: BattleActiveEffect,
): effect is DurationActiveEffect {
  return (
    effect.kind !== "sleepPendingRepeatSave" &&
    "expiresAt" in effect &&
    effect.expiresAt.kind === "duration"
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
      const nextCombatant: BattleCreatureState =
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
    spellSlotExpendedThisTurn: false,
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
  const savingThrowOutcomeHoleIds = new Set<BattleHoleId>(
    [...sleepRepeatSaveHoles, ...startTurnSaveHoles].map((hole) => hole.holeId),
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
    sleepRepeatSaves.length + startTurnSaves.length
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
    startTurnDamageRolls,
    startTurnSaves,
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
    },
  };
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
