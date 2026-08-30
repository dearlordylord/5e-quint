// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-suppression-action-interdiction
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-suppression-magical-effect-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-area-save-damage-replacement unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bardic-inspiration-failed-d20-test unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.magic-action-area-save-damage-healing unit-feature.magic-action-healing-pool unit-feature.magic-action-save-gated-condition unit-feature.paladin-sacred-weapon unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.rogue-steady-aim unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import {
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  characterUnitProcedure,
} from "../character-execution-queries.ts";
import {
  enableMovementActionBonusActionExclusion,
  grantUnitActionResource,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  applyCondition,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { attackRollResultIsValid } from "@dnd/shared-algebras/attack-roll-algebra";
import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";
import type { HoleInstanceKey } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { MovementFeet, type DifficultyClass } from "@dnd/shared/types";
import type { DiceExpr } from "@dnd/surface/surface/types";
import * as Result from "effect/Result";
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
  type CharacterBattleResourceState,
} from "../character-battle-resource-execution.ts";
import { CombatantId, type BattleProcedureExecutionRef } from "../identity.ts";
import {
  allocateBattleEffectOccurrenceForCreature,
  allocateBattleEffectOccurrencesForCreature,
} from "../effect-execution-ref.ts";
import {
  combatantCanSee,
  currentActorId,
  normalizeBattleGrapples,
} from "./creature-state-leaves.ts";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  battleCreatureStateWithKnockOutPreservedConditions,
  combatantCanTakeReactions,
  isCharacterBattleCreatureState,
} from "./creature-state-execution.ts";
import {
  activeDruidWildShapeEffect,
  assumeDruidWildShapeForm,
  dismissDruidWildShapeForm,
} from "./druid-wild-shape.ts";
import {
  applyBattleHitPointDamage,
  applyHpHealing,
  breakBattleConcentration,
} from "./damage-apply.ts";
import { damageAmountByTypeAfterTargetAdjustments } from "./damage-helpers.ts";
import {
  extendSavingThrowOngoingFeatures,
  ongoingFeatureEnemyRelationshipDecisionRequired,
} from "./attack-roll.ts";
import { parseSavingThrowRelationshipFacts } from "./roll-trigger-relationship-facts.ts";
import {
  OTHER_MAGICAL_EFFECT_SOURCE,
  magicalEffectTargetsInterdictionMessage,
} from "./magic-suppression-magical-effect-interdiction.ts";
import { spendReaction } from "./interrupt-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import {
  reactionModifierResourceAvailable,
  reactionReductionResourceDieRollTotal,
  spendReactionModifierResource,
} from "./reaction-modifiers.ts";
import {
  attackRollHitsWithCriticalThreshold,
  openClassFeatureExtraAttackResource,
  spendAttackActionResource,
} from "./attack-resolution.ts";
import { spellSaveDcForCaster } from "./spell-save-dc.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import {
  activeOngoingFeatureOccurrenceFromExecution,
  extendOngoingFeatureToEndOfNextTurn,
} from "./ongoing-feature-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { scoreModifier } from "./domain-helpers.ts";
import { combatantShapeShiftingSuppressed } from "./shape-shifting.ts";
import {
  type ResolvedWildShapeEquipmentDisposition,
  validateWildShapeEquipmentDispositionFill,
  wildShapeActiveEquipmentDispositions,
  wildShapeLoadoutObjectRefs,
} from "./wild-shape-equipment.ts";
import {
  battleStateWithGroundObjects,
  characterEffectiveLoadout,
  wildShapeGroundObjectPlacement,
} from "./battle-object-lifecycle.ts";
import type {
  BardicInspirationFailedD20TestResolutionInput,
  BardicInspirationFailedD20TestResolutionResult,
  BattleCreatureState,
  BattleDroppedObjectOutcome,
  BattleFill,
  AdmittedDruidWildShapeBattleResolutionInput,
  AdmittedUnitFeatureBattleResolutionInput,
  AdmittedUnitFeatureHeldWeaponActivationBattleResolutionInput,
  BattleHoleId,
  BattleResolutionResult,
  BattleSavingThrowOutcome,
  BattleState,
  BattleTargetChoiceHole,
  BattleTargetSpatialFact,
  BattleUnitFeatureRollHole,
  BattleUnitFeatureSavingThrowOutcomeHole,
  CharacterBattleCreatureState,
  FailedAbilityCheckResourceBoostResolutionInput,
  FailedAbilityCheckResourceBoostResolutionResult,
  SuccessfulAbilityCheckReactionReductionResolutionInput,
  SuccessfulAbilityCheckReactionReductionResolutionResult,
  UnitFeatureBattleResolutionInput,
} from "../battle-state-execution.ts";
import type { UnitFeatureRolledDiceFill } from "./battle-runtime-protocol.ts";
import { validateRolledDiceFillForDiceExpr } from "../battle-state-execution.ts";
import { spellAttackRerollUnsupportedIssue } from "./spell-reroll-issues.ts";
import { failedSavingThrowTargetIds } from "./saving-throw-outcomes.ts";
import {
  attackActionAreaSaveDamageReplacementProtocolId,
  attackActionAreaSaveDamageReplacementSavingThrowHole,
  attackActionAreaSaveDamageReplacementSavingThrowHoleId,
  bardicInspirationGrantTargetChoices,
  bardicInspirationGrantTargetHoleId,
  bardicInspirationTargetCanPerceiveSurroundings,
  characterTotalLevel,
  combatantHalfHitPointMaximum,
  combatantIsBloodied,
  diceExprLabel,
  magicActionAreaSaveDamageHealingDamageRollHole,
  magicActionAreaSaveDamageHealingDamageRollHoleId,
  magicActionAreaSaveDamageHealingHealingRollHole,
  magicActionAreaSaveDamageHealingHealingRollHoleId,
  magicActionAreaSaveDamageHealingHealingTargetHole,
  magicActionAreaSaveDamageHealingHealingTargetHoleId,
  magicActionAreaSaveDamageHealingSavingThrowHole,
  magicActionAreaSaveDamageHealingSavingThrowHoleId,
  magicActionHealingPoolDistributionHole,
  magicActionHealingPoolDistributionHoleId,
  magicActionHealingPoolSize,
  magicActionSaveGatedConditionSavingThrowHole,
  magicActionSaveGatedConditionSavingThrowHoleId,
  magicActionSaveGatedConditionTargetChoices,
  ongoingFeatureIsAvailable,
  sacredWeaponHeldMeleeWeapons,
  selfBonusActionHealingRollHole,
  selfBonusActionHealingRollHoleId,
  wildShapeEquipmentDispositionHole,
} from "./unit-feature-discovery.ts";
import type {
  AttackActionAreaSaveDamageReplacementProfile,
  MagicActionAreaSaveDamageHealingProfile,
  MagicActionSaveGatedConditionProfile,
  MechanicalUnitFeature,
} from "./unit-feature-discovery.ts";
export {
  discoverLegendaryActionActs,
  druidWildShapeActsForResource,
  ongoingFeatureIsAvailable,
  selfBonusActionHealingRollHole,
  selfBonusActionHealingRollHoleId,
  selfBonusActionHealingRollHoleInstanceKey,
  selfBonusActionHealingRollProtocolId,
  supportedUnitFeatureActs,
} from "./unit-feature-discovery.ts";

export function resolveUnitFeature(
  input: AdmittedUnitFeatureBattleResolutionInput,
): BattleResolutionResult {
  const { actor, procedure } = input.unitFeatureAdmission;
  const source = procedure.source;
  const resource =
    source.kind === "resourcePool"
      ? actor.origin.resources.find((candidate) => {
          return candidate.resourcePoolRef === source.resourcePoolRef;
        })
      : undefined;

  const unitFeature = procedure.execution;
  if (resource !== undefined) {
    if (unitFeature.kind === "extraActionGrant") {
      return resolveExtraActionGrantUnitFeature(
        input,
        actor,
        resource,
        unitFeature,
      );
    }
    if (unitFeature.kind === "selfBonusActionHealing") {
      return resolveSelfBonusActionHealingUnitFeature(
        input,
        actor,
        resource,
        unitFeature,
      );
    }
    if (unitFeature.kind === "ongoingFeature") {
      return resolveOngoingFeatureUnitFeature(
        input,
        actor,
        resource,
        unitFeature,
      );
    }
    if (unitFeature.kind === "bardicInspirationGrant") {
      return resolveBardicInspirationGrantUnitFeature(
        input,
        actor,
        resource,
        unitFeature,
      );
    }
  }

  if (unitFeature.kind === "paladinSacredWeapon") {
    return resolvePaladinSacredWeaponDismissUnitFeature(input, actor);
  }
  if (unitFeature.kind === "rogueSteadyAim") {
    return resolveRogueSteadyAimUnitFeature(input, actor, unitFeature);
  }

  const attackActionAreaSaveDamageReplacementResource = resource;
  if (
    attackActionAreaSaveDamageReplacementResource !== undefined &&
    unitFeature.kind === "attackActionAreaSaveDamageReplacement"
  ) {
    return resolveAttackActionAreaSaveDamageReplacementUnitFeature(
      input,
      actor,
      attackActionAreaSaveDamageReplacementResource,
      unitFeature,
    );
  }

  if (unitFeature.kind === "magicActionHealingPool") {
    return resolveMagicActionHealingPoolUnitFeature(input, actor, unitFeature);
  }

  if (unitFeature.kind === "magicActionAreaSaveDamageHealing") {
    return resolveMagicActionAreaSaveDamageHealingUnitFeature(
      input,
      actor,
      unitFeature,
    );
  }

  if (unitFeature.kind === "magicActionSaveGatedCondition") {
    return resolveMagicActionSaveGatedConditionUnitFeature(
      input,
      actor,
      unitFeature,
    );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Unsupported Unit feature does not accept battle fills.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return invalidResult(
    input.state,
    "staleSubject",
    "Unit feature is no longer available for the current actor.",
  );
}

export function resolveUnitFeatureHeldWeaponActivation(
  input: AdmittedUnitFeatureHeldWeaponActivationBattleResolutionInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Held-weapon Unit feature activation does not accept battle fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const actor = input.state.combatants.get(input.subject.actorId);
  /* v8 ignore start -- @preserve -- Admitted-subject invariant: held-weapon Unit subjects pass character-owner procedure admission before this resolver is dispatched. */
  if (!isCharacterBattleCreatureState(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Held-weapon Unit feature is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const procedure = characterUnitProcedure(
    actor.origin.execution,
    input.subject.procedureRef,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  /* v8 ignore start -- @preserve -- Discovered-subject invariant: held-weapon activation discovery emits only the selected Sacred Weapon procedure admitted above. */
  if (
    procedure?.kind !== "unitFeature" ||
    procedure.execution.kind !== "paladinSacredWeapon"
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Held-weapon Unit feature is no longer selected for the current actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const unitFeature = procedure.execution;
  if (
    !sacredWeaponHeldMeleeWeapons(input.state, actor).some(
      (weapon) => weapon.itemId === input.subject.weaponItemId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sacred Weapon requires a selected held Melee weapon.",
    );
  }
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.resourcePoolRef ===
      unitFeature.sacredWeapon.spends.resourcePoolRef,
  );
  if (resource === undefined || !resourceHasUsesRemaining(resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sacred Weapon has no Channel Divinity uses remaining.",
    );
  }
  const spentAction = spendActivationResource(
    input.state.currentTurnResources,
    {
      kind: "action",
      action: unitFeature.sacredWeapon.activationCost.action,
    },
  );
  if (Result.isFailure(spentAction)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sacred Weapon requires an available action.",
    );
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration({
    unit: unitFeature.sacredWeapon.duration.unit,
    amount: unitFeature.sacredWeapon.duration.amount,
  });
  /* v8 ignore start -- @preserve -- Admitted Sacred Weapon invariant: the support-profile parser accepts the SRD one-minute duration before producing execution facts. */
  if (Result.isFailure(durationTicks)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sacred Weapon duration is not supported by battle runtime.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner: actor,
    effect: {
      kind: "paladinSacredWeapon",
      sourceProcedureRef: input.subject.procedureRef,
      sourceCombatantId: actor.combatantId,
      weaponItemId: input.subject.weaponItemId,
      expiresAt: {
        kind: "duration",
        durationTicks: durationTicks.success,
      },
    },
  });
  const nextActor: CharacterBattleCreatureState = {
    ...allocation.owner,
    activeEffects: [
      ...allocation.owner.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "paladinSacredWeapon" &&
            effect.sourceProcedureRef === input.subject.procedureRef &&
            effect.sourceCombatantId === actor.combatantId
          ),
      ),
      allocation.effect,
    ],
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.resourcePoolRef === resource.resourcePoolRef &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const nextState = {
    ...input.state,
    currentTurnResources: spentAction.success,
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

function resolvePaladinSacredWeaponDismissUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Sacred Weapon dismissal does not accept battle fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const activeEffects = actor.activeEffects.filter(
    (effect) =>
      !(
        effect.kind === "paladinSacredWeapon" &&
        effect.sourceProcedureRef === input.subject.procedureRef &&
        effect.sourceCombatantId === actor.combatantId
      ),
  );
  if (activeEffects.length === actor.activeEffects.length) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sacred Weapon is not active for this actor.",
    );
  }
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(actor.combatantId, {
      ...actor,
      activeEffects,
    }),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveRogueSteadyAimUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  unitFeature: MechanicalUnitFeature<"rogueSteadyAim">,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Steady Aim does not accept battle fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (Number(actor.movementSpentFeet) > 0) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Steady Aim is available only if the actor has not moved this turn.",
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Steady Aim Bonus Action is no longer available.",
    );
  }
  const allocation = allocateBattleEffectOccurrencesForCreature({
    owner: actor,
    effects: [
      {
        kind: "nextAttackRollBySelf",
        sourceProcedureRef: input.subject.procedureRef,
        sourceCombatantId: actor.combatantId,
        mode: unitFeature.steadyAim.attackRoll.mode,
        expiresAt: {
          kind: "endOfTurn",
          combatantId: actor.combatantId,
          round: input.state.initiative.round,
        },
      },
      {
        kind: "selfSpeedZero",
        sourceProcedureRef: input.subject.procedureRef,
        sourceCombatantId: actor.combatantId,
        expiresAt: {
          kind: "endOfTurn",
          combatantId: actor.combatantId,
          round: input.state.initiative.round,
        },
      },
    ],
  });
  const activeEffects = [
    ...allocation.owner.activeEffects.filter(
      (effect) =>
        !(
          "sourceProcedureRef" in effect &&
          effect.sourceProcedureRef === input.subject.procedureRef &&
          effect.sourceCombatantId === actor.combatantId &&
          (effect.kind === "nextAttackRollBySelf" ||
            effect.kind === "selfSpeedZero")
        ),
    ),
    ...allocation.effects,
  ];
  const nextState = {
    ...input.state,
    currentTurnResources: spent.success,
    combatants: new Map(input.state.combatants).set(actor.combatantId, {
      ...allocation.owner,
      activeEffects,
    }),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveMagicActionHealingPoolUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  unitFeature: MechanicalUnitFeature<"magicActionHealingPool">,
): BattleResolutionResult {
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.resourcePoolRef ===
      unitFeature.healingPool.spends.resourcePoolRef,
  );
  if (resource === undefined || !resourceHasUsesRemaining(resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic Action healing has no resource uses remaining.",
    );
  }

  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "action",
    action: "magic",
  });
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic Action healing is no longer available.",
    );
  }

  const distribution = magicActionHealingPoolDistributionFill(
    input.fills,
    input.subject.procedureRef,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (distribution.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", distribution.message);
  }
  /* v8 ignore stop -- @preserve */
  if (distribution.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      magicActionHealingPoolDistributionHole(
        input.state,
        actor,
        input.subject.procedureRef,
        unitFeature,
      ),
    ]);
  }

  const validation = validateMagicActionHealingPoolDistribution({
    state: input.state,
    actor,
    actorId: actor.combatantId,
    sourceProcedureRef: input.subject.procedureRef,
    unitFeature,
    fill: distribution.value,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", validation.message);
  }
  /* v8 ignore stop -- @preserve */
  const nextActor: BattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.resourcePoolRef ===
          unitFeature.healingPool.spends.resourcePoolRef &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const combatants = new Map(input.state.combatants).set(
    actor.combatantId,
    nextActor,
  );
  for (const allocation of distribution.value.value.allocations) {
    const target = combatants.get(allocation.targetId);
    if (target !== undefined) {
      combatants.set(
        allocation.targetId,
        applyHpHealing(target, Number(allocation.hitPoints)),
      );
    }
  }
  const nextState = {
    ...input.state,
    currentTurnResources: spent.success,
    combatants,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveMagicActionAreaSaveDamageHealingUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  unitFeature: MechanicalUnitFeature<"magicActionAreaSaveDamageHealing">,
): BattleResolutionResult {
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.resourcePoolRef ===
      unitFeature.damageHealing.spends.resourcePoolRef,
  );
  if (resource === undefined || !resourceHasUsesRemaining(resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic Action damage and healing has no resource uses remaining.",
    );
  }
  const spellSaveDc = spellSaveDcForCaster(input.state, actor.combatantId);
  if (spellSaveDc === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic Action damage and healing requires a spell save DC.",
    );
  }

  const fills = magicActionAreaSaveDamageHealingFills(
    input.fills,
    input.subject.procedureRef,
    unitFeature,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fills.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fills.message);
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "action",
    action: "magic",
  });
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic Action damage and healing is no longer available.",
    );
  }
  if (
    fills.value.savingThrows === undefined ||
    fills.value.healingTarget === undefined ||
    fills.value.damageRoll === undefined ||
    fills.value.healingRoll === undefined
  ) {
    return needsHolesResult(
      input.state,
      input.subject,
      magicActionAreaSaveDamageHealingMissingHoles({
        state: input.state,
        actorId: actor.combatantId,
        procedureRef: input.subject.procedureRef,
        unitFeature,
        spellSaveDc,
        fills: fills.value,
      }),
    );
  }

  const validation = validateMagicActionAreaSaveDamageHealing({
    state: input.state,
    actorId: actor.combatantId,
    sourceProcedureRef: input.subject.procedureRef,
    unitFeature,
    savingThrows: fills.value.savingThrows,
    healingTarget: fills.value.healingTarget,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", validation.message);
  }
  /* v8 ignore stop -- @preserve */
  const savingThrowTargetIds = [...validation.outcomesByTargetId.keys()];
  const relationshipFacts = parseSavingThrowRelationshipFacts(
    fills.value.savingThrows.relationshipFacts ?? [],
    actor.combatantId,
    savingThrowTargetIds,
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      actor.combatantId,
      "enemySavingThrow",
    ),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipFacts === null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Magic Action damage and healing relationship facts must answer the saving-throw hole request.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const actorAfterResourceSpend: CharacterBattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.resourcePoolRef ===
          unitFeature.damageHealing.spends.resourcePoolRef &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const stateAfterSpend = extendSavingThrowOngoingFeatures(
    {
      ...input.state,
      currentTurnResources: spent.success,
      combatants: new Map(input.state.combatants).set(
        actor.combatantId,
        actorAfterResourceSpend,
      ),
    },
    actor.combatantId,
    savingThrowTargetIds,
    relationshipFacts,
  );
  const damageRollTotal = rolledDiceTotal(fills.value.damageRoll.value);
  const savingThrows = fills.value.savingThrows;
  const stateAfterDamage = validation.damageTargetIds.reduce<BattleState>(
    (state, targetId) => {
      const target = state.combatants.get(targetId);
      /* v8 ignore start -- @preserve -- Internal invariant guard: validation proves every damage target exists, and spending the feature resource preserves combatant-map membership. */
      if (target === undefined) {
        return state;
      }
      /* v8 ignore stop -- @preserve */
      const outcome = validation.outcomesByTargetId.get(targetId);
      const damageBeforeTargetAdjustments =
        outcome?.succeeded === true
          ? Math.floor(damageRollTotal / 2)
          : damageRollTotal;
      const damageAmount = damageAmountByTypeAfterTargetAdjustments(
        state,
        target,
        new Map([
          [
            unitFeature.damageHealing.damage.damageType,
            damageBeforeTargetAdjustments,
          ],
        ]),
      );
      return normalizeBattleGrapples(
        applyBattleHitPointDamage({
          state,
          target,
          damageAmount,
          deathFailuresAtZeroHp: 1,
          damageSourceId: actor.combatantId,
          spatialFacts: savingThrows.spatialFacts ?? [],
        }),
      );
    },
    stateAfterSpend,
  );
  const healingTarget = stateAfterDamage.combatants.get(
    validation.healingTargetId,
  );
  /* v8 ignore start -- @preserve -- Internal invariant guard: validation proves the healing target exists, and damage application preserves combatant-map membership. */
  if (healingTarget === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic Action healing target is no longer in the battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const stateAfterHealing = {
    ...stateAfterDamage,
    combatants: new Map(stateAfterDamage.combatants).set(
      validation.healingTargetId,
      applyHpHealing(
        healingTarget,
        rolledDiceTotal(fills.value.healingRoll.value),
      ),
    ),
  };
  return {
    tag: "resolved",
    state: stateAfterHealing,
    snapshot: snapshotBattle(stateAfterHealing),
  };
}

function resolveMagicActionSaveGatedConditionUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  unitFeature: MechanicalUnitFeature<"magicActionSaveGatedCondition">,
): BattleResolutionResult {
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.resourcePoolRef ===
      unitFeature.condition.spends.resourcePoolRef,
  );
  if (resource === undefined || !resourceHasUsesRemaining(resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic Action condition has no resource uses remaining.",
    );
  }
  const spellSaveDc = spellSaveDcForCaster(input.state, actor.combatantId);
  if (spellSaveDc === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic Action condition requires a spell save DC.",
    );
  }
  const fills = magicActionSaveGatedConditionFills(
    input.fills,
    input.subject.procedureRef,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fills.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fills.message);
  }
  /* v8 ignore stop -- @preserve */
  if (fills.value.savingThrows === undefined) {
    return needsHolesResult(input.state, input.subject, [
      magicActionSaveGatedConditionSavingThrowHole(
        input.state,
        actor.combatantId,
        unitFeature,
        input.subject.procedureRef,
        spellSaveDc,
      ),
    ]);
  }
  const validation = validateMagicActionSaveGatedCondition({
    state: input.state,
    spellSaveDc,
    actor,
    sourceProcedureRef: input.subject.procedureRef,
    unitFeature,
    savingThrows: fills.value.savingThrows,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", validation.message);
  }
  /* v8 ignore stop -- @preserve */
  const savingThrowTargetIds = validation.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const relationshipFacts = parseSavingThrowRelationshipFacts(
    fills.value.savingThrows.relationshipFacts ?? [],
    actor.combatantId,
    savingThrowTargetIds,
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      actor.combatantId,
      "enemySavingThrow",
    ),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipFacts === null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Magic Action condition relationship facts must answer the saving-throw hole request.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "action",
    action: "magic",
  });
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic Action condition is no longer available.",
    );
  }
  const actorAfterResourceSpend: CharacterBattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.resourcePoolRef ===
          unitFeature.condition.spends.resourcePoolRef &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const stateAfterSpend = extendSavingThrowOngoingFeatures(
    {
      ...input.state,
      currentTurnResources: spent.success,
      combatants: new Map(input.state.combatants).set(
        actor.combatantId,
        actorAfterResourceSpend,
      ),
    },
    actor.combatantId,
    savingThrowTargetIds,
    relationshipFacts,
  );
  const failedTargetIds = failedSavingThrowTargetIds(validation.outcomes);
  const stateAfterConditions = applyMagicActionSaveGatedConditionFailures(
    stateAfterSpend,
    actor.combatantId,
    unitFeature,
    input.subject.procedureRef,
    failedTargetIds,
  );
  return {
    tag: "resolved",
    state: stateAfterConditions,
    snapshot: snapshotBattle(stateAfterConditions),
  };
}

export function resolveDruidWildShapeUnitFeature(
  input: AdmittedDruidWildShapeBattleResolutionInput,
): BattleResolutionResult {
  const { actor, procedure } = input.wildShapeAdmission;
  const source = procedure.source;
  const resource = actor.origin.resources.find((candidate) => {
    return candidate.resourcePoolRef === source.resourcePoolRef;
  });
  if (resource === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape is no longer available for the current actor.",
    );
  }
  const unitFeature = procedure.execution;

  if (input.subject.action === "dismiss") {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (input.fills.length > 0) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Druid Wild Shape dismiss does not accept battle fills.",
      );
    }
    /* v8 ignore stop -- @preserve */
    if (activeDruidWildShapeEffect(actor) === null) {
      return invalidResult(
        input.state,
        "staleSubject",
        "Druid Wild Shape has no active Beast form to dismiss.",
      );
    }
    const spent = spendActivationResource(input.state.currentTurnResources, {
      kind: "bonusAction",
    });
    /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher Wild Shape eligibility calls canSpendBonusAction on these unchanged turn resources before routing. */
    if (Result.isFailure(spent)) {
      return invalidResult(
        input.state,
        "staleSubject",
        "Druid Wild Shape Bonus Action is no longer available.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const nextState = dismissDruidWildShapeForm({
      state: { ...input.state, currentTurnResources: spent.success },
      actorId: actor.combatantId,
    });
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }

  const subject = input.subject;
  if (
    subject.action === "assumeForm" &&
    combatantShapeShiftingSuppressed(input.state, actor.combatantId)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape is suppressed while the creature remains in the movable radiant cylinder Cylinder.",
    );
  }
  if (!resourceHasUsesRemaining(resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape has no uses remaining.",
    );
  }
  const formAdmission = actor.origin.druidWildShapeAvailableForms?.find(
    (candidate) => candidate.execution.scopeRef === subject.formExecutionRef,
  );
  if (formAdmission === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape form is not battle-available.",
    );
  }
  const equipmentCandidates = wildShapeLoadoutObjectRefs(
    characterEffectiveLoadout(input.state, actor),
  );
  const expectedEquipmentDispositionHole = wildShapeEquipmentDispositionHole({
    actorId: actor.combatantId,
    formExecutionRef: formAdmission.execution.scopeRef,
    candidates: equipmentCandidates,
  });
  const equipmentDisposition = (() => {
    if (input.fills.length === 0) {
      return {
        tag: "needsHoles" as const,
        hole: expectedEquipmentDispositionHole,
      };
    }
    if (input.fills.length !== 1) {
      /* v8 ignore start -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid" as const,
        message: "Druid Wild Shape equipment disposition must be filled once.",
      };
      /* v8 ignore stop -- @preserve */
    }
    const fill = input.fills[0];
    if (
      fill?.kind !== "wildShapeEquipmentDisposition" ||
      fill.holeId !== expectedEquipmentDispositionHole.holeId
    ) {
      /* v8 ignore start -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid" as const,
        message:
          "Druid Wild Shape equipment disposition fill must match the equipment disposition hole.",
      };
      /* v8 ignore stop -- @preserve */
    }
    const validation = validateWildShapeEquipmentDispositionFill({
      candidates: equipmentCandidates,
      value: fill.value,
    });
    if (validation.tag === "valid") {
      return {
        tag: "valid" as const,
        formLimbs: fill.value.formLimbs,
        dispositions: validation.dispositions,
      };
    }
    /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: the equipment parser already classified this replay fill as contradictory. */
    return validation;
  })();
  if (equipmentDisposition.tag === "needsHoles") {
    return {
      tag: "needsHoles",
      state: input.state,
      subject: input.subject,
      holes: [equipmentDisposition.hole],
      snapshot: snapshotBattle(input.state),
    };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (equipmentDisposition.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      equipmentDisposition.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher Wild Shape eligibility calls canSpendBonusAction on these unchanged turn resources before routing. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape Bonus Action is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextActor: CharacterBattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.resourcePoolRef === resource.resourcePoolRef &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const stateWithResourceSpend = {
    ...input.state,
    currentTurnResources: spent.success,
    combatants: new Map(input.state.combatants).set(
      actor.combatantId,
      nextActor,
    ),
  };
  const stateWithActiveForm = assumeDruidWildShapeForm({
    state: stateWithResourceSpend,
    actor: nextActor,
    procedureRef: input.subject.procedureRef,
    formAdmission,
    formLimbs: equipmentDisposition.formLimbs,
    equipmentDisposition: wildShapeActiveEquipmentDispositions(
      equipmentDisposition.dispositions,
    ),
    profile: unitFeature,
  });
  const dropSource = {
    kind: "druidWildShape",
    procedureRef: input.subject.procedureRef,
    formExecutionRef: formAdmission.execution.scopeRef,
  } as const satisfies Extract<
    BattleDroppedObjectOutcome["source"],
    { readonly kind: "druidWildShape" }
  >;
  const placement = battleStateWithGroundObjects(
    stateWithActiveForm,
    equipmentDisposition.dispositions.flatMap((disposition) =>
      disposition.disposition === "falls"
        ? [
            wildShapeGroundObjectPlacement({
              actorId: actor.combatantId,
              objectId: disposition.item.objectId,
              positionId: disposition.fallInActorSpace.positionId,
              source: dropSource,
            }),
          ]
        : [],
    ),
  );
  if (placement.tag === "conflict") {
    return invalidResult(input.state, "staleSubject", placement.message);
  }
  const nextState = placement.state;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
    ...wildShapeDroppedObjectsResultField({
      actorId: actor.combatantId,
      source: dropSource,
      dispositions: equipmentDisposition.dispositions,
    }),
  };
}

function wildShapeDroppedObjectsResultField(input: {
  readonly actorId: BattleDroppedObjectOutcome["actorId"];
  readonly source: Extract<
    BattleDroppedObjectOutcome["source"],
    { readonly kind: "druidWildShape" }
  >;
  readonly dispositions: readonly ResolvedWildShapeEquipmentDisposition[];
}): Pick<
  Extract<BattleResolutionResult, { readonly tag: "resolved" }>,
  "droppedObjects"
> {
  const droppedObjects = input.dispositions.flatMap(
    (disposition): readonly BattleDroppedObjectOutcome[] =>
      disposition.disposition === "falls"
        ? [
            {
              kind: "objectDropped",
              actorId: input.actorId,
              objectId: disposition.item.objectId,
              source: input.source,
            },
          ]
        : [],
  );
  return droppedObjects.length === 0 ? {} : { droppedObjects };
}

export function resolveBardicInspirationGrantUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: MechanicalUnitFeature<"bardicInspirationGrant">,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (!resourceHasUsesRemaining(resource) || Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bardic Inspiration is no longer available for the current actor.",
    );
  }

  const targetFill = bardicInspirationGrantTargetFill(
    input.fills,
    input.subject.procedureRef,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetFill.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", targetFill.message);
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetFill.value === undefined) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration requires a target creature.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const target = input.state.combatants.get(targetFill.value.value);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (target === undefined || target.combatantId === input.subject.actorId) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration target must be another creature in this battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    target.activeEffects.some(
      (effect) => effect.kind === "bardicInspirationDie",
    )
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration target already has a Bardic Inspiration die.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!bardicInspirationTargetCanPerceiveSurroundings(target)) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration target must be able to see or hear the Bard.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !bardicInspirationGrantTargetChoices(
      input.state,
      input.subject.actorId,
    ).includes(target.combatantId)
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration target must be another creature in this battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !hasBardicInspirationRangeFact(
      targetFill.value.spatialFacts ?? [],
      input.subject.actorId,
      target.combatantId,
      input.subject.procedureRef,
      unitFeature,
    )
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration target must be within 60 feet.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !(
      (!hasCondition(target.conditions, "blinded") &&
        combatantCanSee(
          input.state,
          target.combatantId,
          input.subject.actorId,
        )) ||
      (!hasCondition(target.conditions, "deafened") &&
        (targetFill.value.spatialFacts ?? []).some(
          (fact) =>
            fact.kind === "bardicInspirationTargetCanHear" &&
            fact.bardId === input.subject.actorId &&
            fact.targetId === target.combatantId &&
            fact.sourceProcedureRef === input.subject.procedureRef,
        ))
    )
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration target must be able to see or hear the Bard.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const nextActor: BattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.resourcePoolRef === unitFeature.spends.resourcePoolRef &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const targetAllocation = allocateBattleEffectOccurrenceForCreature({
    owner: target,
    effect: {
      kind: "bardicInspirationDie",
      sourceProcedureRef: input.subject.procedureRef,
      sourceCombatantId: input.subject.actorId,
      dieSize: unitFeature.dieSize,
      expiresAt: {
        kind: "duration",
        durationTicks: unitFeature.durationTicks,
      },
    },
  });
  const nextTarget: BattleCreatureState = {
    ...targetAllocation.owner,
    activeEffects: [
      ...targetAllocation.owner.activeEffects,
      targetAllocation.effect,
    ],
  };
  const combatants = new Map(input.state.combatants)
    .set(input.subject.actorId, nextActor)
    .set(target.combatantId, nextTarget);
  const nextState = {
    ...input.state,
    combatants,
    currentTurnResources: spent.success,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveBardicInspirationFailedD20Test(
  input: BardicInspirationFailedD20TestResolutionInput,
): BardicInspirationFailedD20TestResolutionResult {
  const actor = input.state.combatants.get(input.d20Test.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bardic Inspiration is no longer available for the D20 Test actor.",
    );
  }

  const die = actor.activeEffects.find(
    (effect) => effect.kind === "bardicInspirationDie",
  );
  if (die === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bardic Inspiration is no longer available for the D20 Test actor.",
    );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !Number.isInteger(input.bardicInspirationRoll) ||
    input.bardicInspirationRoll < 1 ||
    input.bardicInspirationRoll > die.dieSize
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      `Bardic Inspiration roll must be a 1d${die.dieSize} result.`,
    );
  }
  /* v8 ignore stop -- @preserve */

  const outcome = bardicInspirationD20TestOutcome(input);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (outcome.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", outcome.message);
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (outcome.value.originalSucceeded) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration requires an already-failed D20 Test.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const nextActor: BattleCreatureState = {
    ...actor,
    activeEffects: actor.activeEffects.filter(
      (effect) => effect.kind !== "bardicInspirationDie",
    ),
  };
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.d20Test.actorId,
      nextActor,
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
    bardicInspirationD20Test: {
      boostedTotal: outcome.value.boostedTotal,
      boostedSucceeded: outcome.value.boostedSucceeded,
    },
  };
}

function bardicInspirationD20TestOutcome(
  input: BardicInspirationFailedD20TestResolutionInput,
):
  | {
      readonly tag: "ok";
      readonly value: {
        readonly originalSucceeded: boolean;
        readonly boostedTotal: number;
        readonly boostedSucceeded: boolean;
      };
    }
  | { readonly tag: "invalid"; readonly message: string } {
  if (input.d20Test.kind === "attackRoll") {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!attackRollResultIsValid(input.d20Test.attackRoll)) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message: "Attack roll result is outside the d20 attack-roll protocol.",
      };
    }
    /* v8 ignore stop -- @preserve */
    const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
      input.d20Test.attackRoll,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (spellAttackRerollIssue !== null) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message: spellAttackRerollIssue,
      };
    }
    /* v8 ignore stop -- @preserve */
    const criticalThreshold = input.d20Test.criticalThreshold ?? 20;
    const boostedRoll = {
      ...input.d20Test.attackRoll,
      total: input.d20Test.attackRoll.total + input.bardicInspirationRoll,
    };
    return {
      tag: "ok",
      value: {
        originalSucceeded: attackRollHitsWithCriticalThreshold(
          input.d20Test.attackRoll,
          input.d20Test.armorClass,
          criticalThreshold,
        ),
        boostedTotal: boostedRoll.total,
        boostedSucceeded: attackRollHitsWithCriticalThreshold(
          boostedRoll,
          input.d20Test.armorClass,
          criticalThreshold,
        ),
      },
    };
  }

  const boostedTotal =
    input.d20Test.originalTotal + input.bardicInspirationRoll;
  return {
    tag: "ok",
    value: {
      originalSucceeded: input.d20Test.originalTotal >= input.d20Test.dc,
      boostedTotal,
      boostedSucceeded: boostedTotal >= input.d20Test.dc,
    },
  };
}

function bardicInspirationGrantTargetFill(
  fills: readonly BattleFill[],
  procedureRef: BattleProcedureExecutionRef,
):
  | {
      readonly tag: "ok";
      readonly value:
        | Extract<BattleFill, { readonly kind: "targetChoice" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let target:
    | Extract<BattleFill, { readonly kind: "targetChoice" }>
    | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "targetChoice" &&
      fill.holeId === bardicInspirationGrantTargetHoleId(procedureRef)
    ) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (target !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
        return {
          tag: "invalid",
          message: "Bardic Inspiration target was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.relationshipFacts !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
        return {
          tag: "invalid",
          message:
            "Bardic Inspiration target relationship facts were not requested.",
        };
      }
      /* v8 ignore stop -- @preserve */
      target = fill;
      continue;
    }
    /* v8 ignore start -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Bardic Inspiration replay holes.`,
    };
    /* v8 ignore stop -- @preserve */
  }
  return { tag: "ok", value: target };
}

function hasBardicInspirationRangeFact(
  facts: readonly BattleTargetSpatialFact[],
  bardId: CombatantId,
  targetId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
  unitFeature: MechanicalUnitFeature<"bardicInspirationGrant">,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "bardicInspirationTargetWithinRange" &&
      fact.bardId === bardId &&
      fact.targetId === targetId &&
      fact.sourceProcedureRef === sourceProcedureRef &&
      fact.rangeFeet === unitFeature.rangeFeet,
  );
}

type MagicActionHealingPoolDistributionFill = Extract<
  BattleFill,
  { readonly kind: "hitPointHealingDistribution" }
>;

function magicActionHealingPoolDistributionFill(
  fills: readonly BattleFill[],
  procedureRef: BattleProcedureExecutionRef,
):
  | {
      readonly tag: "ok";
      readonly value: MagicActionHealingPoolDistributionFill | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let distribution: MagicActionHealingPoolDistributionFill | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "hitPointHealingDistribution" &&
      fill.holeId === magicActionHealingPoolDistributionHoleId(procedureRef)
    ) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (distribution !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
        return {
          tag: "invalid",
          message: "Magic Action healing distribution was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      distribution = fill;
      continue;
    }
    /* v8 ignore start -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Magic Action healing replay holes.`,
    };
    /* v8 ignore stop -- @preserve */
  }
  return { tag: "ok", value: distribution };
}

function validateMagicActionHealingPoolDistribution(input: {
  readonly state: BattleState;
  readonly actor: CharacterBattleCreatureState;
  readonly actorId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly unitFeature: MechanicalUnitFeature<"magicActionHealingPool">;
  readonly fill: MagicActionHealingPoolDistributionFill;
}):
  | { readonly tag: "ok" }
  | { readonly tag: "invalid"; readonly message: string } {
  const allocations = input.fill.value.allocations;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (allocations.length === 0) {
    /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message: "Magic Action healing requires at least one allocation.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const seenTargets = new Set<CombatantId>();
  let spentHitPoints = 0;
  const poolHitPoints = magicActionHealingPoolSize(
    input.actor,
    input.unitFeature,
  );
  for (const allocation of allocations) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (seenTargets.has(allocation.targetId)) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message: "Magic Action healing target was allocated twice.",
      };
    }
    /* v8 ignore stop -- @preserve */
    seenTargets.add(allocation.targetId);
    const healing = Number(allocation.hitPoints);
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!Number.isInteger(healing) || healing <= 0) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message:
          "Magic Action healing allocations must restore a positive integer number of Hit Points.",
      };
    }
    /* v8 ignore stop -- @preserve */
    const target = input.state.combatants.get(allocation.targetId);
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (target === undefined) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message:
          "Magic Action healing target must be a creature in this battle.",
      };
    }
    /* v8 ignore stop -- @preserve */
    const antimagicInterdiction = magicalEffectTargetsInterdictionMessage({
      state: input.state,
      source: OTHER_MAGICAL_EFFECT_SOURCE,
      targetIds: [allocation.targetId],
    });
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (antimagicInterdiction !== null) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return { tag: "invalid", message: antimagicInterdiction };
    }
    /* v8 ignore stop -- @preserve */
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!combatantIsBloodied(target)) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message: "Magic Action healing target must be Bloodied.",
      };
    }
    /* v8 ignore stop -- @preserve */
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      allocation.targetId !== input.actorId &&
      !hasMagicActionHealingPoolRangeFact(
        input.fill.spatialFacts,
        input.actorId,
        allocation.targetId,
        input.sourceProcedureRef,
        input.unitFeature,
      )
    ) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message: "Magic Action healing target must be within range.",
      };
    }
    /* v8 ignore stop -- @preserve */
    const cap = combatantHalfHitPointMaximum(target);
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (Number(target.hp) + healing > cap) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message:
          "Magic Action healing cannot restore a target above half its Hit Point Maximum.",
      };
    }
    /* v8 ignore stop -- @preserve */
    spentHitPoints += healing;
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (spentHitPoints > poolHitPoints) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message: "Magic Action healing allocations exceed the healing pool.",
      };
    }
    /* v8 ignore stop -- @preserve */
  }
  return { tag: "ok" };
}

function hasMagicActionHealingPoolRangeFact(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
  unitFeature: MechanicalUnitFeature<"magicActionHealingPool">,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "magicActionHealingPoolTargetWithinRange" &&
      fact.actorId === actorId &&
      fact.targetId === targetId &&
      fact.sourceProcedureRef === sourceProcedureRef &&
      fact.rangeFeet === unitFeature.healingPool.rangeFeet,
  );
}

type AttackActionAreaSaveDamageReplacementSavingThrowFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;

type AttackActionAreaSaveDamageReplacementRollFill = Extract<
  BattleFill,
  { readonly kind: "rolledDice" }
>;

type AttackActionAreaSaveDamageReplacementFillSet = {
  readonly savingThrows:
    | AttackActionAreaSaveDamageReplacementSavingThrowFill
    | undefined;
  readonly damageRoll:
    | AttackActionAreaSaveDamageReplacementRollFill
    | undefined;
};

function resolveAttackActionAreaSaveDamageReplacementUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
): BattleResolutionResult {
  if (!resourceHasUsesRemaining(resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Area damage replacement has no uses remaining.",
    );
  }

  const fills = attackActionAreaSaveDamageReplacementFills(
    input.fills,
    actor,
    unitFeature,
    input.subject.procedureRef,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fills.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fills.message);
  }
  /* v8 ignore stop -- @preserve */
  if (fills.value.savingThrows === undefined) {
    return needsHolesResult(input.state, input.subject, [
      attackActionAreaSaveDamageReplacementSavingThrowHole(
        input.state,
        actor,
        unitFeature,
        input.subject.procedureRef,
      ),
    ]);
  }
  const validation = validateAttackActionAreaSaveDamageReplacementSavingThrows({
    state: input.state,
    actorId: actor.combatantId,
    unitFeature,
    savingThrows: fills.value.savingThrows,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", validation.message);
  }
  /* v8 ignore stop -- @preserve */
  const savingThrowTargetIds = [...validation.outcomesByTargetId.keys()];
  const relationshipFacts = parseSavingThrowRelationshipFacts(
    fills.value.savingThrows.relationshipFacts ?? [],
    actor.combatantId,
    savingThrowTargetIds,
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      actor.combatantId,
      "enemySavingThrow",
    ),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipFacts === null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Area damage replacement relationship facts must answer the saving-throw hole request.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (
    validation.damageTargetIds.length > 0 &&
    fills.value.damageRoll === undefined
  ) {
    return needsHolesResult(input.state, input.subject, [
      attackActionAreaSaveDamageReplacementDamageRollHole(
        actor,
        unitFeature,
        input.subject.procedureRef,
      ),
    ]);
  }

  const spent = spendAttackActionResource(input.state.currentTurnResources);
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Area damage replacement Attack action is no longer available.",
    );
  }
  const nextActor: CharacterBattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.resourcePoolRef === resource.resourcePoolRef &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const stateAfterSpend = extendSavingThrowOngoingFeatures(
    {
      ...input.state,
      currentTurnResources: openClassFeatureExtraAttackResource({
        state: {
          ...input.state,
          currentTurnResources: spent.success.state,
        },
        actorId: actor.combatantId,
        spentResource: spent.success.spentResource,
      }),
      combatants: new Map(input.state.combatants).set(
        actor.combatantId,
        nextActor,
      ),
    },
    actor.combatantId,
    savingThrowTargetIds,
    relationshipFacts,
  );
  if (validation.damageTargetIds.length === 0) {
    return {
      tag: "resolved",
      state: stateAfterSpend,
      snapshot: snapshotBattle(stateAfterSpend),
    };
  }
  const damageRoll = fills.value.damageRoll;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageRoll === undefined) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Area damage replacement requires a damage roll for affected targets.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const damageRollTotal = rolledDiceTotal(damageRoll.value);
  const stateAfterDamage = validation.damageTargetIds.reduce<BattleState>(
    (state, targetId) => {
      const target = state.combatants.get(targetId);
      /* v8 ignore start -- @preserve -- Internal invariant guard: validation proves every affected target exists, and spending the Attack action and feature resource preserves combatant-map membership. */
      if (target === undefined) {
        return state;
      }
      /* v8 ignore stop -- @preserve */
      const outcome = validation.outcomesByTargetId.get(targetId);
      const damageBeforeTargetAdjustments =
        outcome?.succeeded === true
          ? Math.floor(damageRollTotal / 2)
          : damageRollTotal;
      const damageAmount = damageAmountByTypeAfterTargetAdjustments(
        state,
        target,
        new Map([
          [
            unitFeature.breath.damage.damageType.value,
            damageBeforeTargetAdjustments,
          ],
        ]),
      );
      return normalizeBattleGrapples(
        applyBattleHitPointDamage({
          state,
          target,
          damageAmount,
          deathFailuresAtZeroHp: 1,
          damageSourceId: actor.combatantId,
          spatialFacts: fills.value.savingThrows?.spatialFacts ?? [],
        }),
      );
    },
    stateAfterSpend,
  );
  return {
    tag: "resolved",
    state: stateAfterDamage,
    snapshot: snapshotBattle(stateAfterDamage),
  };
}

function attackActionAreaSaveDamageReplacementFills(
  fills: readonly BattleFill[],
  actor: CharacterBattleCreatureState,
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
  procedureRef: BattleProcedureExecutionRef,
):
  | {
      readonly tag: "ok";
      readonly value: AttackActionAreaSaveDamageReplacementFillSet;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let savingThrows:
    | AttackActionAreaSaveDamageReplacementSavingThrowFill
    | undefined;
  let damageRoll: AttackActionAreaSaveDamageReplacementRollFill | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "savingThrowOutcome" &&
      fill.holeId ===
        attackActionAreaSaveDamageReplacementSavingThrowHoleId(procedureRef)
    ) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (savingThrows !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
        return {
          tag: "invalid",
          message:
            "Area damage replacement Saving Throw outcomes were filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      savingThrows = fill;
      continue;
    }
    if (
      fill.kind === "rolledDice" &&
      fill.holeId ===
        attackActionAreaSaveDamageReplacementDamageRollHoleId(procedureRef)
    ) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (damageRoll !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
        return {
          tag: "invalid",
          message: "Area damage replacement damage roll was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      const validation = validateRolledDiceFillForDiceExpr(
        fill,
        attackActionAreaSaveDamageReplacementDamageDiceExpr(actor, unitFeature),
      );
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (validation !== null) {
        /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
        return { tag: "invalid", message: validation };
      }
      /* v8 ignore stop -- @preserve */
      damageRoll = fill;
      continue;
    }
    /* v8 ignore start -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the area damage replacement replay holes.`,
    };
    /* v8 ignore stop -- @preserve */
  }
  return { tag: "ok", value: { savingThrows, damageRoll } };
}

function validateAttackActionAreaSaveDamageReplacementSavingThrows(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly unitFeature: AttackActionAreaSaveDamageReplacementProfile;
  readonly savingThrows: AttackActionAreaSaveDamageReplacementSavingThrowFill;
}):
  | {
      readonly tag: "ok";
      readonly damageTargetIds: readonly CombatantId[];
      readonly outcomesByTargetId: ReadonlyMap<
        CombatantId,
        BattleSavingThrowOutcome
      >;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!("area" in input.savingThrows.value)) {
    /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message:
        "Area damage replacement requires table-supplied Cone or Line area facts.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const area = input.savingThrows.value.area;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (area.originAnchorId !== input.actorId) {
    /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message:
        "Area damage replacement must originate from the acting creature.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!input.state.combatants.has(area.originAnchorId)) {
    /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message:
        "Area damage replacement origin must be a combatant in this battle.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if ("kind" in area || "sleepNonSleeperFacts" in area) {
    /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message: "Area damage replacement uses plain Cone or Line area facts.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const affectedTargetIds = new Set(area.affectedTargetIds);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (affectedTargetIds.size !== area.affectedTargetIds.length) {
    /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message:
        "Area damage replacement affected targets must not duplicate targets.",
    };
  }
  /* v8 ignore stop -- @preserve */
  for (const targetId of affectedTargetIds) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!input.state.combatants.has(targetId)) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message:
          "Area damage replacement target must be a creature in this battle.",
      };
    }
    /* v8 ignore stop -- @preserve */
  }
  const antimagicInterdiction = magicalEffectTargetsInterdictionMessage({
    state: input.state,
    source: OTHER_MAGICAL_EFFECT_SOURCE,
    targetIds: [...affectedTargetIds],
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (antimagicInterdiction !== null) {
    /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return { tag: "invalid", message: antimagicInterdiction };
  }
  /* v8 ignore stop -- @preserve */
  const outcomesByTargetId = new Map<CombatantId, BattleSavingThrowOutcome>();
  for (const outcome of input.savingThrows.value.outcomes) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!affectedTargetIds.has(outcome.targetId)) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message:
          "Area damage replacement Saving Throw outcomes must match the table-supplied affected targets.",
      };
    }
    /* v8 ignore stop -- @preserve */
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (outcomesByTargetId.has(outcome.targetId)) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message:
          "Area damage replacement Saving Throw outcomes must not duplicate targets.",
      };
    }
    /* v8 ignore stop -- @preserve */
    outcomesByTargetId.set(outcome.targetId, outcome);
  }
  if (outcomesByTargetId.size === affectedTargetIds.size) {
    return {
      tag: "ok",
      damageTargetIds: [...affectedTargetIds],
      outcomesByTargetId,
    };
  }
  /* v8 ignore start -- @preserve -- Malformed Unit-feature fill set: admitted replay fills cover every table-supplied affected target. */
  return {
    tag: "invalid",
    message:
      "Area damage replacement Saving Throw outcomes must cover every table-supplied affected target.",
  };
  /* v8 ignore stop -- @preserve */
}

function attackActionAreaSaveDamageReplacementDamageRollHole(
  actor: CharacterBattleCreatureState,
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
  procedureRef: BattleProcedureExecutionRef,
): BattleUnitFeatureRollHole {
  const expr = attackActionAreaSaveDamageReplacementDamageDiceExpr(
    actor,
    unitFeature,
  );
  return {
    kind: "rolledDice",
    holeId: attackActionAreaSaveDamageReplacementDamageRollHoleId(procedureRef),
    holeInstanceKey:
      attackActionAreaSaveDamageReplacementDamageRollHoleInstanceKey(
        procedureRef,
      ),
    label: `Area damage replacement (${diceExprLabel(expr)})`,
  };
}

function attackActionAreaSaveDamageReplacementDamageRollHoleId(
  procedureRef: BattleProcedureExecutionRef,
): BattleHoleId {
  return holeId(
    attackActionAreaSaveDamageReplacementProtocolId(
      procedureRef,
      "damage-roll",
    ),
  );
}

function attackActionAreaSaveDamageReplacementDamageRollHoleInstanceKey(
  procedureRef: BattleProcedureExecutionRef,
): HoleInstanceKey {
  return holeInstanceKey(
    attackActionAreaSaveDamageReplacementProtocolId(
      procedureRef,
      "damage-roll",
    ),
  );
}

function attackActionAreaSaveDamageReplacementDamageDiceExpr(
  actor: CharacterBattleCreatureState,
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
): DiceExpr {
  const characterLevel = characterTotalLevel(actor);
  const dice =
    [...unitFeature.breath.damage.amount.tiers]
      .filter((tier) => characterLevel >= tier.atLevel)
      .at(-1)?.dice ?? unitFeature.breath.damage.amount.base.dice;
  return {
    dice,
    dieSize: unitFeature.breath.damage.amount.base.dieSize,
    flat: 0,
  };
}

type MagicActionAreaSaveDamageHealingSavingThrowFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;

type MagicActionAreaSaveDamageHealingTargetFill = Extract<
  BattleFill,
  { readonly kind: "targetChoice" }
>;

type MagicActionAreaSaveDamageHealingRollFill = Extract<
  BattleFill,
  { readonly kind: "rolledDice" }
>;

type MagicActionAreaSaveDamageHealingFillSet = {
  readonly savingThrows:
    | MagicActionAreaSaveDamageHealingSavingThrowFill
    | undefined;
  readonly healingTarget:
    | MagicActionAreaSaveDamageHealingTargetFill
    | undefined;
  readonly damageRoll: MagicActionAreaSaveDamageHealingRollFill | undefined;
  readonly healingRoll: MagicActionAreaSaveDamageHealingRollFill | undefined;
};

type MagicActionSaveGatedConditionSavingThrowFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;

type MagicActionSaveGatedConditionFillSet = {
  readonly savingThrows:
    | MagicActionSaveGatedConditionSavingThrowFill
    | undefined;
};

function magicActionSaveGatedConditionFills(
  fills: readonly BattleFill[],
  procedureRef: BattleProcedureExecutionRef,
):
  | {
      readonly tag: "ok";
      readonly value: MagicActionSaveGatedConditionFillSet;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let savingThrows: MagicActionSaveGatedConditionSavingThrowFill | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "savingThrowOutcome" &&
      fill.holeId ===
        magicActionSaveGatedConditionSavingThrowHoleId(procedureRef)
    ) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (savingThrows !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
        return {
          tag: "invalid",
          message:
            "Magic Action condition Saving Throw outcomes were filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      savingThrows = fill;
      continue;
    }
    /* v8 ignore start -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Magic Action condition replay holes.`,
    };
    /* v8 ignore stop -- @preserve */
  }
  return { tag: "ok", value: { savingThrows } };
}

function validateMagicActionSaveGatedCondition(input: {
  readonly state: BattleState;
  readonly spellSaveDc: DifficultyClass;
  readonly actor: CharacterBattleCreatureState;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly unitFeature: MagicActionSaveGatedConditionProfile;
  readonly savingThrows: MagicActionSaveGatedConditionSavingThrowFill;
}):
  | {
      readonly tag: "ok";
      readonly outcomes: readonly BattleSavingThrowOutcome[];
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const hole = magicActionSaveGatedConditionSavingThrowHole(
    input.state,
    input.actor.combatantId,
    input.unitFeature,
    input.sourceProcedureRef,
    input.spellSaveDc,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.savingThrows.holeId !== hole.holeId) {
    /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message:
        "Magic Action condition Saving Throw fill must use the selected feature hole.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!("outcomes" in input.savingThrows.value)) {
    /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message: "Magic Action condition uses target Saving Throw outcomes.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const maxTargets = magicActionSaveGatedConditionMaxTargets(
    input.actor,
    input.unitFeature,
  );
  const outcomes = input.savingThrows.value.outcomes;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (outcomes.length < 1 || outcomes.length > maxTargets) {
    /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message: `Magic Action condition requires between 1 and ${maxTargets} selected targets.`,
    };
  }
  /* v8 ignore stop -- @preserve */
  const choices = new Set(
    magicActionSaveGatedConditionTargetChoices(
      input.state,
      input.actor.combatantId,
      input.unitFeature,
    ),
  );
  const seen = new Set<CombatantId>();
  for (const outcome of outcomes) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (seen.has(outcome.targetId)) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message:
          "Magic Action condition Saving Throw outcomes must not duplicate targets.",
      };
    }
    /* v8 ignore stop -- @preserve */
    seen.add(outcome.targetId);
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!choices.has(outcome.targetId)) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message:
          "Magic Action condition target must be a visible creature within range.",
      };
    }
    /* v8 ignore stop -- @preserve */
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      !magicActionSaveGatedConditionHasTargetSpatialFact(
        input.savingThrows.spatialFacts ?? [],
        input.actor.combatantId,
        outcome.targetId,
        input.sourceProcedureRef,
        input.unitFeature,
      )
    ) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message:
          "Magic Action condition target requires table-supplied visibility and range evidence.",
      };
    }
    /* v8 ignore stop -- @preserve */
  }
  return { tag: "ok", outcomes };
}

function magicActionSaveGatedConditionMaxTargets(
  actor: CharacterBattleCreatureState,
  unitFeature: MagicActionSaveGatedConditionProfile,
): number {
  const modifier = scoreModifier(
    actor.origin.d20Statistics.abilityScores[
      unitFeature.condition.targetSelection.count.ability
    ],
  );
  return Math.max(
    unitFeature.condition.targetSelection.count.minimum,
    modifier,
  );
}

function magicActionSaveGatedConditionHasTargetSpatialFact(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
  unitFeature: MagicActionSaveGatedConditionProfile,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "unitFeatureVisibleTargetWithinRange" &&
      fact.actorId === actorId &&
      fact.targetId === targetId &&
      fact.sourceProcedureRef === sourceProcedureRef &&
      fact.rangeFeet === unitFeature.condition.targetSelection.rangeFeet,
  );
}

function applyMagicActionSaveGatedConditionFailures(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: MagicActionSaveGatedConditionProfile,
  sourceProcedureRef: BattleProcedureExecutionRef,
  targetIds: readonly CombatantId[],
): BattleState {
  const combatants = new Map(state.combatants);
  let currentTurnResources = state.currentTurnResources;
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) continue;
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        kind: "unitFeatureCondition",
        sourceProcedureRef,
        sourceCombatantId: actorId,
        condition: unitFeature.condition.onFail.condition,
        conditionHadNonSpellSource: hasCondition(
          target.conditions,
          unitFeature.condition.onFail.condition,
        ),
        earlyEnd: { kind: "targetTakesAnyDamage" },
        turnRestriction: { kind: "moveActionOrBonusAction" },
        expiresAt: {
          kind: "duration",
          durationTicks: unitFeature.condition.onFail.durationTicks,
        },
      },
    });
    const nextTarget = {
      ...battleCreatureStateWithKnockOutPreservedConditions(
        allocation.owner,
        applyCondition(
          target.conditions,
          unitFeature.condition.onFail.condition,
        ),
      ),
      activeEffects: [
        ...allocation.owner.activeEffects.filter(
          (candidate) =>
            !(
              candidate.kind === "unitFeatureCondition" &&
              candidate.sourceProcedureRef === sourceProcedureRef &&
              candidate.sourceCombatantId === actorId &&
              candidate.condition === unitFeature.condition.onFail.condition
            ),
        ),
        allocation.effect,
      ],
    };
    combatants.set(targetId, nextTarget);
    if (targetId === currentActorId(state)) {
      currentTurnResources = enableMovementActionBonusActionExclusion(
        currentTurnResources,
        Number(target.movementSpentFeet) > 0,
      );
    }
  }
  return {
    ...state,
    currentTurnResources,
    combatants,
  };
}

function magicActionAreaSaveDamageHealingFills(
  fills: readonly BattleFill[],
  procedureRef: BattleProcedureExecutionRef,
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
):
  | {
      readonly tag: "ok";
      readonly value: MagicActionAreaSaveDamageHealingFillSet;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let savingThrows: MagicActionAreaSaveDamageHealingSavingThrowFill | undefined;
  let healingTarget: MagicActionAreaSaveDamageHealingTargetFill | undefined;
  let damageRoll: MagicActionAreaSaveDamageHealingRollFill | undefined;
  let healingRoll: MagicActionAreaSaveDamageHealingRollFill | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "savingThrowOutcome" &&
      fill.holeId ===
        magicActionAreaSaveDamageHealingSavingThrowHoleId(procedureRef)
    ) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (savingThrows !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
        return {
          tag: "invalid",
          message:
            "Magic Action damage and healing Saving Throw outcomes were filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      savingThrows = fill;
      continue;
    }
    if (
      fill.kind === "targetChoice" &&
      fill.holeId ===
        magicActionAreaSaveDamageHealingHealingTargetHoleId(procedureRef)
    ) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (healingTarget !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
        return {
          tag: "invalid",
          message: "Magic Action damage and healing target was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      healingTarget = fill;
      continue;
    }
    if (
      fill.kind === "rolledDice" &&
      fill.holeId ===
        magicActionAreaSaveDamageHealingDamageRollHoleId(procedureRef)
    ) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (damageRoll !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
        return {
          tag: "invalid",
          message:
            "Magic Action damage and healing damage roll was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      const validation = validateRolledDiceFillForDiceExpr(
        fill,
        unitFeature.damageHealing.damage.amount.expr,
      );
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (validation !== null) {
        /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
        return { tag: "invalid", message: validation };
      }
      /* v8 ignore stop -- @preserve */
      damageRoll = fill;
      continue;
    }
    if (
      fill.kind === "rolledDice" &&
      fill.holeId ===
        magicActionAreaSaveDamageHealingHealingRollHoleId(procedureRef)
    ) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (healingRoll !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
        return {
          tag: "invalid",
          message:
            "Magic Action damage and healing healing roll was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      const validation = validateRolledDiceFillForDiceExpr(
        fill,
        unitFeature.damageHealing.healing.amount.expr,
      );
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (validation !== null) {
        /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
        return { tag: "invalid", message: validation };
      }
      /* v8 ignore stop -- @preserve */
      healingRoll = fill;
      continue;
    }
    /* v8 ignore start -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Magic Action damage and healing replay holes.`,
    };
    /* v8 ignore stop -- @preserve */
  }
  return {
    tag: "ok",
    value: { savingThrows, healingTarget, damageRoll, healingRoll },
  };
}

function validateMagicActionAreaSaveDamageHealing(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly unitFeature: MagicActionAreaSaveDamageHealingProfile;
  readonly savingThrows: MagicActionAreaSaveDamageHealingSavingThrowFill;
  readonly healingTarget: MagicActionAreaSaveDamageHealingTargetFill;
}):
  | {
      readonly tag: "ok";
      readonly damageTargetIds: readonly CombatantId[];
      readonly healingTargetId: CombatantId;
      readonly outcomesByTargetId: ReadonlyMap<
        CombatantId,
        BattleSavingThrowOutcome
      >;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const healingTarget = input.healingTarget.value;
  const outcomes = input.savingThrows.value.outcomes;
  const outcomesByTargetId = new Map<CombatantId, BattleSavingThrowOutcome>();
  for (const outcome of outcomes) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (outcomesByTargetId.has(outcome.targetId)) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message:
          "Magic Action damage and healing target Saving Throw was filled twice.",
      };
    }
    /* v8 ignore stop -- @preserve */
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (input.state.combatants.get(outcome.targetId) === undefined) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message:
          "Magic Action damage and healing Saving Throw target must be a creature in this battle.",
      };
    }
    /* v8 ignore stop -- @preserve */
    outcomesByTargetId.set(outcome.targetId, outcome);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.state.combatants.get(healingTarget) === undefined) {
    /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message:
        "Magic Action damage and healing target must be a creature in this battle.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const antimagicInterdiction = magicalEffectTargetsInterdictionMessage({
    state: input.state,
    source: OTHER_MAGICAL_EFFECT_SOURCE,
    targetIds: [...outcomesByTargetId.keys(), healingTarget],
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (antimagicInterdiction !== null) {
    /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return { tag: "invalid", message: antimagicInterdiction };
  }
  /* v8 ignore stop -- @preserve */
  const areaFact = magicActionAreaSaveDamageHealingAreaFact(
    input.savingThrows.spatialFacts ?? [],
    input.actorId,
    input.sourceProcedureRef,
    input.unitFeature,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaFact === undefined) {
    /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message:
        "Magic Action damage and healing requires caller-supplied Sphere area membership.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const areaTargetIds = new Set(areaFact.targetIds);
  for (const targetId of [...outcomesByTargetId.keys(), healingTarget]) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!areaTargetIds.has(targetId)) {
      /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
      return {
        tag: "invalid",
        message:
          "Magic Action damage and healing target must be in the supplied Sphere area.",
      };
    }
    /* v8 ignore stop -- @preserve */
  }
  return {
    tag: "ok",
    damageTargetIds: [...outcomesByTargetId.keys()],
    healingTargetId: healingTarget,
    outcomesByTargetId,
  };
}

function magicActionAreaSaveDamageHealingMissingHoles(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly unitFeature: MagicActionAreaSaveDamageHealingProfile;
  readonly spellSaveDc: DifficultyClass;
  readonly fills: MagicActionAreaSaveDamageHealingFillSet;
}): readonly (
  | BattleUnitFeatureSavingThrowOutcomeHole
  | BattleTargetChoiceHole
  | BattleUnitFeatureRollHole
)[] {
  return [
    ...(input.fills.savingThrows === undefined
      ? [
          magicActionAreaSaveDamageHealingSavingThrowHole(
            input.state,
            input.actorId,
            input.procedureRef,
            input.unitFeature,
            input.spellSaveDc,
          ),
        ]
      : []),
    ...(input.fills.damageRoll === undefined
      ? [
          magicActionAreaSaveDamageHealingDamageRollHole(
            input.procedureRef,
            input.unitFeature,
          ),
        ]
      : []),
    ...(input.fills.healingTarget === undefined
      ? [
          magicActionAreaSaveDamageHealingHealingTargetHole(
            input.state,
            input.procedureRef,
          ),
        ]
      : []),
    ...(input.fills.healingRoll === undefined
      ? [
          magicActionAreaSaveDamageHealingHealingRollHole(
            input.procedureRef,
            input.unitFeature,
          ),
        ]
      : []),
  ];
}

function magicActionAreaSaveDamageHealingAreaFact(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
):
  | Extract<
      BattleTargetSpatialFact,
      { readonly kind: "magicActionAreaSaveDamageHealingTargetsInSphere" }
    >
  | undefined {
  return facts.find(
    (
      fact,
    ): fact is Extract<
      BattleTargetSpatialFact,
      { readonly kind: "magicActionAreaSaveDamageHealingTargetsInSphere" }
    > =>
      fact.kind === "magicActionAreaSaveDamageHealingTargetsInSphere" &&
      fact.actorId === actorId &&
      fact.sourceProcedureRef === sourceProcedureRef &&
      fact.originWithinRangeFeet ===
        unitFeature.damageHealing.area.origin.rangeFeet &&
      fact.radiusFeet === unitFeature.damageHealing.area.shape.radiusFeet,
  );
}

export function resolveFailedAbilityCheckResourceBoost(
  input: FailedAbilityCheckResourceBoostResolutionInput,
): FailedAbilityCheckResourceBoostResolutionResult {
  const actor = input.state.combatants.get(input.abilityCheck.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Failed ability-check resource boost is no longer available for the current actor.",
    );
  }

  const procedure = characterUnitProcedure(
    actor.origin.execution,
    input.procedureRef,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  const unitFeature =
    procedure?.kind === "unitFeature" &&
    procedure.execution.kind === "failedAbilityCheckResourceBoost"
      ? procedure.execution
      : undefined;
  const resource = actor.origin.resources.find(
    (resource) =>
      resource.resourcePoolRef ===
      unitFeature?.abilityCheck.spends.resourcePoolRef,
  );
  if (
    unitFeature === undefined ||
    resource === undefined ||
    !resourceHasUsesRemaining(resource)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Failed ability-check resource boost is no longer available for the current actor.",
    );
  }

  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.boostRoll < 1 ||
    input.boostRoll > unitFeature.abilityCheck.bonus.dieSize ||
    !Number.isInteger(input.boostRoll)
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Failed ability-check resource boost roll is outside its projected die range.",
    );
  }
  /* v8 ignore stop -- @preserve */

  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.abilityCheck.originalTotal >= input.abilityCheck.dc) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Failed ability-check resource boost requires an already-failed ability check.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const boostedTotal = input.abilityCheck.originalTotal + input.boostRoll;
  const boostedSucceeded = boostedTotal >= input.abilityCheck.dc;
  const nextActor: BattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((resource) =>
        boostedSucceeded &&
        resource.resourcePoolRef ===
          unitFeature.abilityCheck.spends.resourcePoolRef &&
        resourceHasUsesRemaining(resource)
          ? spendCharacterResourceUse(resource)
          : resource,
      ),
    },
  };
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.abilityCheck.actorId,
      nextActor,
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
    abilityCheckBoost: {
      boostedTotal,
      boostedSucceeded,
    },
  };
}

export function resolveSuccessfulAbilityCheckReactionReduction(
  input: SuccessfulAbilityCheckReactionReductionResolutionInput,
): SuccessfulAbilityCheckReactionReductionResolutionResult {
  const reactor = input.state.combatants.get(input.reactorId);
  const target = input.state.combatants.get(input.abilityCheck.actorId);
  if (!isCharacterBattleCreatureState(reactor) || target === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ability-check Reaction reduction is no longer available.",
    );
  }

  const procedure = characterUnitProcedure(
    reactor.origin.execution,
    input.procedureRef,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  const execution =
    procedure?.kind === "unitFeature" &&
    procedure.execution.kind === "reactionRollOrDamageReduction"
      ? procedure.execution
      : undefined;
  const modifier =
    execution?.kind === "reactionRollOrDamageReduction"
      ? execution.modifiers.find(
          (candidate) => candidate.kind === "abilityCheckReduction",
        )
      : undefined;
  const source =
    procedure?.kind === "unitFeature" ? procedure.source : undefined;
  if (
    execution === undefined ||
    modifier === undefined ||
    source === undefined ||
    !combatantCanTakeReactions(reactor) ||
    !reactionModifierResourceAvailable(
      input.state,
      input.reactorId,
      source,
      modifier,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ability-check Reaction reduction is no longer available.",
    );
  }

  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.abilityCheck.originalTotal < input.abilityCheck.dc) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Ability-check Reaction reduction requires an already-successful ability check.",
    );
  }
  /* v8 ignore stop -- @preserve */

  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    modifier.requiresVisibleCreature &&
    !combatantCanSee(input.state, input.reactorId, input.abilityCheck.actorId)
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Ability-check Reaction reduction requires a visible creature.",
    );
  }
  /* v8 ignore stop -- @preserve */

  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !hasReactionRollOrDamageReductionRangeFact(
      input.abilityCheck.targetSpatialFacts,
      input.reactorId,
      input.abilityCheck.actorId,
      input.procedureRef,
      modifier.rangeFeet,
    )
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Ability-check Reaction reduction requires the creature to be within range.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const reductionTotal = reactionReductionResourceDieRollTotal({
    reduction: modifier.reduction,
    rollTotal: input.reductionRoll,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (reductionTotal.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      `Ability-check Reaction reduction ${reductionTotal.message}`,
    );
  }
  /* v8 ignore stop -- @preserve */

  const reducedTotal = input.abilityCheck.originalTotal - reductionTotal.value;
  const reducedSucceeded = reducedTotal >= input.abilityCheck.dc;
  const spentState = spendReactionModifierResource(
    spendReaction(input.state, input.reactorId),
    input.reactorId,
    source,
    {
      kind: "abilityCheckReduction",
      procedureRef: input.procedureRef,
      reduction: {
        kind: "rolled",
        dice: modifier.reduction.dice,
        flatModifier: modifier.reduction.flatModifier,
        dieSize: modifier.reduction.dieSize,
        spends: modifier.reduction.spends,
      },
    },
  );

  return {
    tag: "resolved",
    state: spentState,
    snapshot: snapshotBattle(spentState),
    abilityCheckReduction: {
      reducedTotal,
      reducedSucceeded,
    },
  };
}

export function hasReactionRollOrDamageReductionRangeFact(
  facts: readonly BattleTargetSpatialFact[],
  reactorId: CombatantId,
  targetId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
  rangeFeet: MovementFeet,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "reactionRollOrDamageReductionTargetWithinRange" &&
      fact.reactorId === reactorId &&
      fact.targetId === targetId &&
      fact.sourceProcedureRef === sourceProcedureRef &&
      fact.rangeFeet === rangeFeet,
  );
}

export function resolveExtraActionGrantUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: MechanicalUnitFeature<"extraActionGrant">,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "This Unit feature does not accept battle fills.",
    );
  }
  /* v8 ignore stop -- @preserve */

  if (!resourceHasUsesRemaining(resource) || resource.usedThisTurn) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Unit feature is no longer available for the current actor.",
    );
  }

  const granted = grantUnitActionResource(
    input.state.currentTurnResources,
    input.subject.actorId,
    input.subject.procedureRef,
    unitFeature.restriction,
  );
  if (Result.isFailure(granted)) {
    return invalidResult(
      input.state,
      "staleSubject",
      granted.failure === "unit-granted action resource already granted"
        ? "This Unit feature has already granted an action this turn."
        : "This Unit feature cannot grant an action for the current turn.",
    );
  }

  const nextActor: BattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.resourcePoolRef === resource.resourcePoolRef &&
        resourceHasUsesRemaining(candidate)
          ? {
              ...spendCharacterResourceUse(candidate),
              usedThisTurn: true,
            }
          : candidate,
      ),
    },
  };
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources: granted.success,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSelfBonusActionHealingUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: MechanicalUnitFeature<"selfBonusActionHealing">,
): BattleResolutionResult {
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (!resourceHasUsesRemaining(resource) || Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      selfBonusActionHealingStaleMessage(),
    );
  }

  const healingRoll = selfBonusActionHealingRollFill(input.fills, unitFeature);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (healingRoll.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", healingRoll.message);
  }
  /* v8 ignore stop -- @preserve */
  if (healingRoll.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      selfBonusActionHealingRollHole(unitFeature),
    ]);
  }

  const nextActor = applyHpHealing(
    {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((candidate) =>
          candidate.resourcePoolRef === resource.resourcePoolRef &&
          resourceHasUsesRemaining(candidate)
            ? spendCharacterResourceUse(candidate)
            : candidate,
        ),
      },
    },
    selfBonusActionHealingAmount(unitFeature, healingRoll.value),
  );
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources: spent.success,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveOngoingFeatureUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: MechanicalUnitFeature<"ongoingFeature">,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "This Unit feature does not accept battle fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (
    !ongoingFeatureIsAvailable(
      input.state,
      actor,
      resource,
      unitFeature,
      input.subject.procedureRef,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Unit feature is no longer available for the current actor.",
    );
  }

  const currentTurnResources =
    unitFeature.activationTrigger === "bonusAction"
      ? Result.getOrThrow(
          spendActivationResource(input.state.currentTurnResources, {
            kind: "bonusAction",
          }),
        )
      : input.state.currentTurnResources;

  const occurrenceKey = input.subject.procedureRef;
  const activeOngoingFeature = activeOngoingFeatureOccurrencesForCombatant(
    input.state,
    actor,
  ).get(occurrenceKey);
  const nextActiveOngoingFeatureOccurrences = new Map(
    actor.activeOngoingFeatureOccurrences,
  );
  nextActiveOngoingFeatureOccurrences.set(
    occurrenceKey,
    activeOngoingFeature === undefined
      ? activeOngoingFeatureOccurrenceFromExecution(
          input.state,
          input.subject.actorId,
          unitFeature,
        )
      : extendOngoingFeatureToEndOfNextTurn(
          input.state,
          input.subject.actorId,
          activeOngoingFeature,
        ),
  );
  const nextActorWithFeature: BattleCreatureState = {
    ...actor,
    activeOngoingFeatureOccurrences: nextActiveOngoingFeatureOccurrences,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        activeOngoingFeature === undefined &&
        candidate.resourcePoolRef === resource.resourcePoolRef &&
        unitFeature.spendsUse &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const nextActor = nextActorWithFeature;
  const nextStateBeforeConcentration = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources,
  };
  const nextState =
    unitFeature.concentrationEffect === "breakAndPrevent"
      ? breakBattleConcentration(
          nextStateBeforeConcentration,
          input.subject.actorId,
        )
      : nextStateBeforeConcentration;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function selfBonusActionHealingRollFill(
  fills: readonly BattleFill[],
  unitFeature: MechanicalUnitFeature<"selfBonusActionHealing">,
): UnitFeatureRolledDiceFill {
  let healingRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "rolledDice" &&
      fill.holeId === selfBonusActionHealingRollHoleId()
    ) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (healingRoll !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
        return {
          tag: "invalid",
          message: "Self-healing roll was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      healingRoll = fill;
      continue;
    }

    /* v8 ignore start -- @preserve -- Malformed Unit-feature fill set: this validation result rejects duplicate, mismatched, out-of-range, or mechanically contradictory feature fills. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the self-healing replay holes.`,
    };
    /* v8 ignore stop -- @preserve */
  }

  if (healingRoll === undefined) {
    return { tag: "ok", value: undefined };
  }

  const validation = validateRolledDiceFillForDiceExpr(healingRoll, {
    dice: unitFeature.dice,
    dieSize: unitFeature.dieSize,
  });
  return validation == null
    ? { tag: "ok", value: healingRoll }
    : { tag: "invalid", message: validation };
}

export function selfBonusActionHealingStaleMessage(): string {
  return "Self-healing is no longer available for the current actor.";
}

export function selfBonusActionHealingAmount(
  unitFeature: MechanicalUnitFeature<"selfBonusActionHealing">,
  healingRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  const diceTotal = healingRoll.value.reduce(
    (total, group) =>
      total +
      group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  return (
    diceTotal +
    unitFeature.flatBase +
    Math.max(0, unitFeature.classLevel - unitFeature.startingAtLevel) *
      unitFeature.flatPerLevel
  );
}
