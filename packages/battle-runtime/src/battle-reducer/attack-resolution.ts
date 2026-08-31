// Owns attack pipelines, standard action resolvers, off-hand/statblock/grapple
// commands, attack fill validation, and attack action-resource spending.
// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-ACTION-LIFECYCLE-001 RAW-STAT-BLOCK-BONUS-ACTION-LIFECYCLE-001 RAW-STAT-BLOCK-ATTACK-PROCEDURE-001 RAW-STAT-BLOCK-MULTIATTACK-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.action-lifecycle stat-block.bonus-action-lifecycle stat-block.attack-procedure stat-block.multiattack
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_MULTIATTACK_ATTACK_CAP BATTLE.STAT_BLOCK.ACTION_LIFECYCLE BATTLE.STAT_BLOCK.BONUS_ACTION_LIFECYCLE BATTLE.STAT_BLOCK.ATTACK_PROCEDURE BATTLE.STAT_BLOCK.MULTIATTACK

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// KERNEL-COVERAGE: runtime-owner BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY BATTLE.DAMAGE.ATTACK_BRANCHES BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
// KERNEL-COVERAGE: runtime-owner BATTLE.RELATIONSHIP_DISCOVERY
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.light-extra-attack-damage-ability-modifier
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
import { nonEmptyArrayProperty } from "../optional-property.ts";
import type {
  ActionEconomyState,
  RuntimeActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";

import {
  actionResourceAllowsAdditionalAttacks,
  actionResourceAllows,
  canSpendAction,
  spendActionResourceAtIndex,
  spendAction,
  spendActivationResource,
  spendMatchingActionResource,
  spendUnarmedStrikeActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";

import { validateRolledDiceForDiceExpr } from "@dnd/shared-algebras/runtime-dice-algebra";

import {
  type AttackRollResult,
  type AttackRollMode,
  type RolledDiceGroup,
} from "@dnd/shared-algebras/runtime-hole-algebra";

import { difficultyClass } from "@dnd/shared/types";

import { Match } from "effect";
import type { BattleProcedureExecutionRef } from "../identity.ts";

import * as Result from "effect/Result";

import type {
  BoundSupportedAttackActionOption,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";
import { spendAmmunitionForAcceptedAttack } from "../battle-ammunition.ts";

import {
  type ActionHideSubject,
  type BattleSubject,
  type BonusActionStandardActionSubject,
} from "../battle-subjects.ts";

import { spendCharacterResourceUse } from "../character-battle-resource-execution.ts";

import { CombatantId } from "../identity.ts";

import {
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  type BattleAttackActionAdditionalAttacks,
} from "../unit-feature-execution-constants.ts";

import {
  attackDamageHoleId,
  heldWeaponItemIdForAttack,
  isLightMeleeWeapon,
} from "./attack-damage-apply.ts";
import { selectedAttackDamageAbilityModifierChoice } from "./attack-damage-ability-modifier-choice.ts";

import {
  extendSavingThrowOngoingFeatures,
  ongoingFeatureEnemyRelationshipDecisionRequired,
} from "./attack-roll.ts";

import {
  grappledBy,
  normalizeBattleGrapples,
} from "./creature-state-leaves.ts";
import { parseSavingThrowRelationshipFacts } from "./roll-trigger-relationship-facts.ts";

import {
  battleCreatureStateWithKnockOutPreservedConditions,
  combatantCanTakeActions,
} from "./creature-state-execution.ts";

import {
  applyTemporaryHitPoints,
  breakBattleConcentration,
} from "./damage-apply.ts";
import {
  attackDamageRidersAfterCunningStrikeCost,
  selectedCunningStrikeContext,
  validateCunningStrikeDamageRollSelection,
  type CunningStrikeContext,
} from "./cunning-strike.ts";
import { effectiveD20TestNaturalOneRerollAbilityCheckValue } from "./d20-test-natural-one-reroll.ts";

import { attackDamageContinuationConcentrationFrame } from "./interrupt-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";

import {
  canHideInCurrentCircumstances,
  escapeGrappleOutcomeHole,
  escapeSpellRestraintAbilityCheckHole,
  grappleOutcomeHole,
  grappleTargetHole,
  hideAbilityCheckHole,
  saveGatedAreaControlShakeAwakeTargetHole,
  searchAbilityCheckHole,
  searchTargetHole,
  shoveOutcomeHole,
  shoveTargetHole,
  hitPointBudgetConditionShakeAwakeTargetHole,
} from "./hole-helpers.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { DURABLE_CONTINUATION_CHECKPOINT_BOUNDARY } from "../battle-state-execution.ts";

import {
  combatantProficiencyBonus,
  grappleLinkForTarget,
  representedMovementSpeedKinds,
  shoveForTarget,
} from "./movement-speed.ts";

import { invalidResult } from "./result-helpers.ts";
import {
  readyDeclarationHole,
  readyDeclarationFill,
  readyResponseChoices,
  readyResponseIsOffered,
} from "./ready.ts";
import { discoverBattleActCandidatesWithoutReady } from "./battle-discovery.ts";
import { applyDashToActor, applyDisengage } from "./mobility-actions.ts";
import { spellSaveDcForCaster } from "./spell-save-dc.ts";
import { combatantHasSaveGatedTurnConstraintBundle } from "./save-gated-turn-constraint-runtime.ts";

import {
  saveGatedAreaControlShakeAwakeTargetChoices,
  removeSaveGatedAreaControlEffectsFromTarget,
  removeSpellConditionEffect,
  removeHitPointBudgetConditionEffectsFromTarget,
  spellRestraintEffectFor,
  hitPointBudgetConditionShakeAwakeTargetChoices,
} from "./spell-condition-effects-helpers.ts";

import {
  attackDamageComponents,
  clearPendingAttackRollMissToHitReplacementSelection,
  selectedAttackDamageRiders,
  selectedAttackDamageDieFloorChoice,
  selectedWeaponDamageDiceRollChoice,
  weaponDamageComponent,
} from "./statblock-attacks.ts";

import {
  spendStatBlockAttackResources,
  statBlockAttackProcedureSection,
  statBlockMultiattackDispatchResourceDemandForActor,
  updateStatBlockActorResources,
} from "./statblock.ts";
import {
  spendStatBlockMultiattackActivationResources,
  statBlockMultiattackResourcesAvailable,
} from "../stat-block-execution-state.ts";
import type {
  StatBlockBonusActionOptionProcedure,
  StatBlockMultiattackProcedure,
  StatBlockProcedureBindingFor,
} from "../stat-block-execution-state.ts";

import type {
  AttackDamageRider,
  BattleActiveEffect,
  BattleAttackDamageContinuationWithoutConcentration,
  BattleAttackHostSubject,
  BattleConcentrationSavingThrowHole,
  BattleCreatureState,
  BattleFill,
  BattleGrappleLink,
  BattleHoleId,
  BattleSavingThrowRelationshipFact,
  BattleResolutionInput,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleRolledDiceFill,
  BattleShovePushOutcome,
  BattleState,
  BattleTargetSpatialFact,
  BattleTurnResources,
  BonusActionStandardActionBattleResolutionInput,
  CharacterBattleCreatureState,
  CriticalHitThreshold,
  EscapeGrappleBattleResolutionInput,
  EscapeSpellRestraintBattleResolutionInput,
  GrappleBattleResolutionInput,
  MultiattackBattleResolutionInput,
  SearchBattleResolutionInput,
  ShoveBattleResolutionInput,
  SpellMarkedDamageRider,
  SpellAttackDamageComponent,
  StatBlockBattleCreatureState,
  StatBlockBonusActionOptionBattleResolutionInput,
  WeaponDamageDiceRollChoiceFill,
} from "../battle-state-execution.ts";
import type { CharacterBattleUseCountResourceState } from "../character-battle-resource-execution.ts";
import type {
  GrappleFillSet,
  ShoveFillSet,
  StatBlockMultiattackActionResource,
  SupportedStatBlockBonusActionStandardAction,
} from "./battle-runtime-protocol.ts";
import {
  ATTACK_ONLY_ACTION_RESOURCE_EXCLUDED_ACTIONS,
  ESCAPE_GRAPPLE_OUTCOME_HOLE_ID,
  GRAPPLE_OUTCOME_HOLE_ID,
  GRAPPLE_TARGET_HOLE_ID,
  HELP_ATTACK_ALLY_HOLE_ID,
  HELP_ATTACK_TARGET_HOLE_ID,
  HIDE_ABILITY_CHECK_HOLE_ID,
  HIDE_DC,
  SEARCH_ABILITY_CHECK_HOLE_ID,
  SEARCH_TARGET_HOLE_ID,
  SHOVE_OUTCOME_HOLE_ID,
  SHOVE_TARGET_HOLE_ID,
  SAVE_GATED_AREA_CONTROL_SHAKE_AWAKE_TARGET_HOLE_ID,
  HIT_POINT_BUDGET_CONDITION_SHAKE_AWAKE_TARGET_HOLE_ID,
} from "./battle-runtime-protocol.ts";
import {
  actorHasClassFeatureExtraAttackActionResource,
  spendTurnAction,
} from "./battle-discovery.ts";
import {
  hasStatBlockMultiattackContinuationResource,
  spendEscapeGrappleActionResource,
  statBlockMultiattackActionResourceMatchesProcedure,
} from "./action-resource-kinds.ts";
import { spellDamageRerollUnsupportedIssue } from "./spell-reroll-issues.ts";
import { SHOVE_PUSH_DISTANCE_FEET } from "./domain-constants.ts";
import {
  helpAttackAllyChoices,
  helpAttackAllyHole,
  helpAttackTargetChoices,
  helpAttackTargetHole,
} from "./help-attack.ts";
import { zeroHpLifecycleIsTerminal } from "./creature-state-leaves.ts";

type BonusActionStandardActionResolverInputBase =
  BonusActionStandardActionBattleResolutionInput & {
    readonly actor: CharacterBattleCreatureState;
  };

type BonusActionStandardActionDashResolverInput =
  BonusActionStandardActionResolverInputBase & {
    readonly subject: BonusActionStandardActionSubject & {
      readonly action: "dash";
    };
    readonly dashTemporaryHitPoints:
      | { readonly kind: "notGranted" }
      | {
          readonly kind: "available";
          readonly resource: CharacterBattleUseCountResourceState;
        }
      | { readonly kind: "unavailable" };
  };

type BonusActionStandardActionDisengageResolverInput =
  BonusActionStandardActionResolverInputBase & {
    readonly subject: BonusActionStandardActionSubject & {
      readonly action: "disengage";
    };
  };

type BonusActionStandardActionHideResolverInput =
  BonusActionStandardActionResolverInputBase & {
    readonly subject: BonusActionStandardActionSubject & {
      readonly action: "hide";
    };
  };

type MultiattackResolverInput = Omit<
  MultiattackBattleResolutionInput,
  "fills"
> & {
  readonly fills: readonly [];
  readonly actor: StatBlockBattleCreatureState;
  readonly multiattackBinding: StatBlockProcedureBindingFor<StatBlockMultiattackProcedure>;
};

type StatBlockBonusActionOptionResolverInput =
  StatBlockBonusActionOptionBattleResolutionInput & {
    readonly actor: StatBlockBattleCreatureState;
    readonly optionBinding: StatBlockProcedureBindingFor<StatBlockBonusActionOptionProcedure>;
    readonly standardAction: SupportedStatBlockBonusActionStandardAction;
  };
export function needsAttackDamageConcentrationResult(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly attack: BoundSupportedAttackActionOption;
  readonly continuation: BattleAttackDamageContinuationWithoutConcentration;
  readonly concentrationSave: BattleConcentrationSavingThrowHole;
}): BattleResolutionResult {
  const pendingState = {
    ...input.state,
    interruptStack: [
      ...input.state.interruptStack,
      attackDamageContinuationConcentrationFrame(
        input.continuation,
        "attackDamage",
      ),
    ],
  };
  const spent = spendAttackAction(
    pendingState,
    input.subject.actorId,
    input.attack,
    { kind: "acceptedAttack" },
  );
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher admission proves the Attack resource exists, and the pre-concentration damage path preserves it; reaction-window paths spend and return before calling this helper. */
  if (spent.tag === "invalid") {
    return spent;
  }
  /* v8 ignore stop -- @preserve */
  return needsHolesResult(
    spent.state,
    input.subject,
    [input.concentrationSave],
    DURABLE_CONTINUATION_CHECKPOINT_BOUNDARY,
  );
}

export function resolveDash(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "action"; readonly action: "dash" }>
  >,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", "Dash accepts no fills.");
  }
  /* v8 ignore stop -- @preserve */
  const actor = input.state.combatants.get(input.subject.actorId);
  /* v8 ignore start -- @preserve -- Defensive internal guard: the dispatcher derives the current actor from the combatant map, so its current-actor gate rejects an absent Dash actor before routing here. */
  if (actor === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Dash actor is not in this battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const speedKind = input.subject.speedKind;
  if (!representedMovementSpeedKinds(actor).includes(speedKind)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Dash speed kind is not represented for this combatant.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "dash");
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing Dash here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dash is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = applyDashToActor(
    input.state,
    actor,
    speedKind,
    spent.success,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveDisengage(
  input: BattleResolutionInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Disengage accepts no fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendAction(input.state.currentTurnResources, "disengage");
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing Disengage here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Disengage is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = applyDisengage(input.state, spent.success);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveBonusActionDash(
  input: BonusActionStandardActionDashResolverInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", "Dash accepts no fills.");
  }
  /* v8 ignore stop -- @preserve */
  const actor = input.actor;
  const speedKind = input.subject.speedKind;
  if (!representedMovementSpeedKinds(actor).includes(speedKind)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Dash speed kind is not represented for this combatant.",
    );
  }
  return Match.value(input.dashTemporaryHitPoints).pipe(
    Match.when({ kind: "unavailable" }, () =>
      invalidResult(
        input.state,
        "staleSubject",
        "Bonus Action Dash Temporary Hit Points is no longer available.",
      ),
    ),
    Match.when({ kind: "notGranted" }, () =>
      resolveAdmittedBonusActionDash(input, null),
    ),
    Match.when({ kind: "available" }, ({ resource }) =>
      resolveAdmittedBonusActionDash(input, resource),
    ),
    Match.exhaustive,
  );
}

function resolveAdmittedBonusActionDash(
  input: BonusActionStandardActionDashResolverInput,
  temporaryHitPointsResource: CharacterBattleUseCountResourceState | null,
): BattleResolutionResult {
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher Bonus Action resource admission rejects an exhausted Bonus Action before routing Dash here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dash is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = applyDashToActor(
    input.state,
    input.actor,
    input.subject.speedKind,
    spent.success,
  );
  if (temporaryHitPointsResource !== null) {
    return resolveBonusActionDashTemporaryHitPoints(
      nextState,
      input.actor,
      temporaryHitPointsResource,
    );
  }
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveBonusActionDashTemporaryHitPoints(
  dashedState: BattleState,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleUseCountResourceState,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const nextActor = applyTemporaryHitPoints(
    {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((candidate) =>
          candidate.resourcePoolRef === resource.resourcePoolRef
            ? spendCharacterResourceUse(resource)
            : candidate,
        ),
      },
    },
    combatantProficiencyBonus(actor),
  );
  const nextState = {
    ...dashedState,
    combatants: new Map(dashedState.combatants).set(
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

export function resolveBonusActionDisengage(
  input: BonusActionStandardActionDisengageResolverInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Disengage accepts no fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher Bonus Action resource admission rejects an exhausted Bonus Action before routing Disengage here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Disengage is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = applyDisengage(input.state, spent.success);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveDodge(
  input: BattleResolutionInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", "Dodge accepts no fills.");
  }
  /* v8 ignore stop -- @preserve */
  const actor = input.state.combatants.get(input.subject.actorId);
  /* v8 ignore start -- @preserve -- Defensive internal guard: the dispatcher derives the current actor from the combatant map, so its current-actor gate rejects an absent Dodge actor before routing here. */
  if (actor === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Dodge actor is not in this battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendAction(input.state.currentTurnResources, "dodge");
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing Dodge here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dodge is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const combatants = new Map(input.state.combatants).set(actor.combatantId, {
    ...actor,
    dodging: true,
  });
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

export function resolveReady(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "action"; readonly action: "ready" }>
  >,
): BattleResolutionResult {
  const responseChoices = readyResponseChoices(
    input.state,
    input.subject.actorId,
    discoverBattleActCandidatesWithoutReady(input.state),
  );
  if (input.fills.length === 0) {
    return needsHolesResult(input.state, input.subject, [
      readyDeclarationHole(input.subject.actorId, responseChoices),
    ]);
  }
  const declaration = readyDeclarationFill(input.fills);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    declaration === null ||
    !readyResponseIsOffered(responseChoices, declaration.value.response)
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Ready requires one offered trigger-and-response declaration.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendAction(input.state.currentTurnResources, "ready");
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing Ready here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ready is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = {
    ...input.state,
    currentTurnResources: spent.success,
    readiedResponses: new Map(input.state.readiedResponses).set(
      input.subject.actorId,
      {
        trigger: declaration.value.trigger,
        response: declaration.value.response,
        expiresAt: {
          kind: "startOfTurn" as const,
          combatantId: input.subject.actorId,
        },
      },
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveHelpAttack(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "helpAttack" }
    >
  >,
): BattleResolutionResult {
  const [allyFill, targetFillValue] = input.fills;
  if (allyFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      helpAttackAllyHole(input.state, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    allyFill.kind !== "helpAttackAllyDecision" ||
    allyFill.holeId !== HELP_ATTACK_ALLY_HOLE_ID
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Help requires an ally target fill first.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const allyId = allyFill.allyId;
  const ally = input.state.combatants.get(allyId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    allyId === input.subject.actorId ||
    ally === undefined ||
    zeroHpLifecycleIsTerminal(ally) ||
    !helpAttackAllyChoices(input.state, input.subject.actorId).includes(allyId)
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Help ally must be another live combatant.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (targetFillValue === undefined) {
    return needsHolesResult(input.state, input.subject, [
      helpAttackTargetHole(input.state, input.subject.actorId, allyId),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.length > 2 ||
    targetFillValue.kind !== "helpAttackEnemyDecision" ||
    targetFillValue.holeId !== HELP_ATTACK_TARGET_HOLE_ID
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Help requires one enemy target fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const targetEnemyId = targetFillValue.targetEnemyId;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !targetFillValue.targetWithinFiveFeetOfHelper ||
    !helpAttackTargetChoices(
      input.state,
      input.subject.actorId,
      allyId,
    ).includes(targetEnemyId)
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Help target must be an enemy within 5 feet of the helper.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendAction(input.state.currentTurnResources, "help");
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing Help here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Help is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = {
    ...input.state,
    currentTurnResources: spent.success,
    helpAttacks: [
      ...input.state.helpAttacks,
      {
        helperId: input.subject.actorId,
        allyId,
        targetEnemyId,
        expiresAt: {
          kind: "startOfTurn" as const,
          combatantId: input.subject.actorId,
        },
      },
    ],
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveShakeAwakeFromHitPointBudgetCondition(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "action";
        readonly action: "shakeAwakeFromStagedCondition";
      }
    >
  >,
): BattleResolutionResult {
  const [targetFill] = input.fills;
  if (targetFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      hitPointBudgetConditionShakeAwakeTargetHole(
        input.state,
        input.subject.actorId,
      ),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.length > 1 ||
    targetFill.kind !== "targetChoice" ||
    targetFill.holeId !== HIT_POINT_BUDGET_CONDITION_SHAKE_AWAKE_TARGET_HOLE_ID
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Hit-point-budget condition shake-awake requires one target fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const targetId = targetFill.value;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !hitPointBudgetConditionShakeAwakeTargetChoices(
      input.state,
      input.subject.actorId,
    ).includes(targetId) ||
    !hasHitPointBudgetConditionShakeAwakeSpatialFact(
      targetFill.spatialFacts ?? [],
      input.subject.actorId,
      targetId,
    )
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Hit-point-budget condition shake-awake target must be within 5 feet of the actor by table-supplied fact.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendTurnAction(input.state.currentTurnResources);
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hit-point-budget condition shake-awake is no longer available.",
    );
  }
  const nextState = removeHitPointBudgetConditionEffectsFromTarget(
    { ...input.state, currentTurnResources: spent.success },
    targetId,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveShakeAwakeFromSaveGatedAreaControl(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "action";
        readonly action: "shakeAwakeFromAreaControl";
      }
    >
  >,
): BattleResolutionResult {
  const [targetFill] = input.fills;
  if (targetFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      saveGatedAreaControlShakeAwakeTargetHole(
        input.state,
        input.subject.actorId,
      ),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.length > 1 ||
    targetFill.kind !== "targetChoice" ||
    targetFill.holeId !== SAVE_GATED_AREA_CONTROL_SHAKE_AWAKE_TARGET_HOLE_ID
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Save-gated area-control condition shake-awake requires one target fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const targetId = targetFill.value;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !saveGatedAreaControlShakeAwakeTargetChoices(
      input.state,
      input.subject.actorId,
    ).includes(targetId) ||
    !hasSaveGatedAreaControlShakeAwakePhysicalReachability(
      targetFill.spatialFacts ?? [],
      input.subject.actorId,
      targetId,
    )
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Save-gated area-control condition shake-awake requires table-supplied physical reachability for the exact actor and target.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendTurnAction(input.state.currentTurnResources);
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Save-gated area-control condition shake-awake is no longer available.",
    );
  }
  const nextState = removeSaveGatedAreaControlEffectsFromTarget(
    { ...input.state, currentTurnResources: spent.success },
    targetId,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveHide(
  input:
    | BattleResolutionInputForSubject<ActionHideSubject>
    | BonusActionStandardActionHideResolverInput,
): BattleResolutionResult {
  const actor =
    "actor" in input
      ? input.actor
      : input.state.combatants.get(input.subject.actorId);
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher combatant and action-eligibility admission rejects a missing or ineligible actor before routing Hide here. */
  if (actor === undefined || !combatantCanTakeActions(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hide is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (!canHideInCurrentCircumstances(input.state, input.subject.actorId)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Hide requires Heavily Obscured, sufficient cover, or an admitted creature-obscurement permission while out of enemy line of sight.",
    );
  }
  const checkHole = hideAbilityCheckHole(input.state, input.subject.actorId);
  const check = abilityCheckFill(
    input.fills,
    HIDE_ABILITY_CHECK_HOLE_ID,
    "Hide",
    {
      rollMode: checkHole.rollMode,
    },
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (check.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", check.message);
  }
  /* v8 ignore stop -- @preserve */
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [checkHole]);
  }

  const spent =
    input.subject.tag === "bonusActionStandardAction"
      ? spendActivationResource(input.state.currentTurnResources, {
          kind: "bonusAction",
        })
      : spendAction(input.state.currentTurnResources, "hide");
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher standard- or Bonus Action resource admission rejects an exhausted resource before routing Hide here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hide is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const hidden =
    check.value.value.total >= HIDE_DC
      ? { discoveryDc: difficultyClass(check.value.value.total) }
      : null;
  const nextActor = { ...actor, hidden };
  const nextState = normalizeBattleGrapples({
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources: spent.success,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveMultiattack(
  input: MultiattackResolverInput,
): BattleResolutionResult {
  const actor = input.actor;
  const origin = actor.origin;
  const multiattackBinding = input.multiattackBinding;
  const dispatchResourceDemand =
    statBlockMultiattackDispatchResourceDemandForActor(
      input.state,
      actor,
      multiattackBinding,
    );
  if (
    !statBlockMultiattackResourcesAvailable(
      origin.execution,
      multiattackBinding,
      dispatchResourceDemand,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Multiattack Stat Block resources are no longer available.",
    );
  }
  const spent = spendTurnAction(input.state.currentTurnResources);
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }
  const multiattackDispatchResources = Match.value(dispatchResourceDemand).pipe(
    Match.when({ kind: "allListedDispatches" }, ({ procedureRefs }) =>
      procedureRefs.map(
        (attackProcedureRef): StatBlockMultiattackActionResource => ({
          kind: "action",
          source: "statBlockMultiattack",
          sourceOwnerId: input.subject.actorId,
          sourceProcedureRef: multiattackBinding.procedureRef,
          dispatch: { kind: "listedOccurrence", attackProcedureRef },
        }),
      ),
    ),
    Match.when(
      { kind: "oneListedDispatch" },
      ({ procedureRefs }): readonly StatBlockMultiattackActionResource[] => [
        {
          kind: "action",
          source: "statBlockMultiattack",
          sourceOwnerId: input.subject.actorId,
          sourceProcedureRef: multiattackBinding.procedureRef,
          dispatch: {
            kind: "oneListedChoice",
            attackProcedureRefs: procedureRefs,
          },
        },
      ],
    ),
    Match.exhaustive,
  );
  const nextStateWithPendingDispatches = {
    ...input.state,
    currentTurnResources: {
      ...spent.success,
      actionResources: [
        ...spent.success.actionResources,
        ...multiattackDispatchResources,
      ],
    },
  };
  const nextExecution = spendStatBlockMultiattackActivationResources(
    origin.execution,
    multiattackBinding,
  );
  const nextState = {
    ...nextStateWithPendingDispatches,
    combatants: new Map(nextStateWithPendingDispatches.combatants).set(
      actor.combatantId,
      {
        ...actor,
        origin: { ...actor.origin, execution: nextExecution },
      },
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSearch(
  input: SearchBattleResolutionInput,
): BattleResolutionResult {
  const targetFill = input.fills.find((fill) => fill.kind === "targetChoice");
  if (targetFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      searchTargetHole(input.state, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetFill.holeId !== SEARCH_TARGET_HOLE_ID) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Search target fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetFill.relationshipFacts !== undefined) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Search target relationship facts were not requested.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const target = input.state.combatants.get(targetFill.value);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    target === undefined ||
    target.combatantId === input.subject.actorId ||
    target.hidden === null
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Search target must be a hidden combatant in this battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const checkHole = searchAbilityCheckHole(
    target.hidden.discoveryDc,
    input.state,
    input.subject.actorId,
    target.combatantId,
  );
  const check = abilityCheckFill(
    input.fills.filter((fill) => fill.kind !== "targetChoice"),
    SEARCH_ABILITY_CHECK_HOLE_ID,
    "Search",
    { rollMode: checkHole.rollMode },
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (check.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", check.message);
  }
  /* v8 ignore stop -- @preserve */
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [checkHole]);
  }
  const spent = spendAction(input.state.currentTurnResources, "search");
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing Search here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Search is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const found = check.value.value.total >= target.hidden.discoveryDc;
  const nextTarget = found ? { ...target, hidden: null } : target;
  const nextState = normalizeBattleGrapples({
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      target.combatantId,
      nextTarget,
    ),
    currentTurnResources: spent.success,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveStatBlockBonusActionOption(
  input: StatBlockBonusActionOptionResolverInput,
): BattleResolutionResult {
  const statBlockActor = input.actor;
  const optionBinding = input.optionBinding;
  const standardAction = input.standardAction;

  return Match.value(standardAction).pipe(
    Match.when("disengage", () =>
      resolveStatBlockBonusActionDisengage(
        input,
        statBlockActor,
        optionBinding.procedureRef,
      ),
    ),
    Match.when("hide", () =>
      resolveStatBlockBonusActionHide(
        input,
        statBlockActor,
        optionBinding.procedureRef,
      ),
    ),
    Match.exhaustive,
  );
}

export function resolveStatBlockBonusActionDisengage(
  input: StatBlockBonusActionOptionBattleResolutionInput,
  actor: StatBlockBattleCreatureState,
  procedureRef: import("../identity.ts").BattleStatBlockProcedureExecutionRef,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Stat Block Bonus Action Disengage accepts no fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher Bonus Action resource admission rejects an exhausted Bonus Action before routing the Stat Block option here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = updateStatBlockActorResources(
    {
      ...input.state,
      currentTurnResources: { ...spent.success, disengaged: true },
    },
    actor,
    procedureRef,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveStatBlockBonusActionHide(
  input: StatBlockBonusActionOptionBattleResolutionInput,
  actor: StatBlockBattleCreatureState,
  procedureRef: import("../identity.ts").BattleStatBlockProcedureExecutionRef,
): BattleResolutionResult {
  if (!canHideInCurrentCircumstances(input.state, input.subject.actorId)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Hide requires Heavily Obscured, sufficient cover, or an admitted creature-obscurement permission while out of enemy line of sight.",
    );
  }
  const checkHole = hideAbilityCheckHole(input.state, input.subject.actorId);
  const check = abilityCheckFill(
    input.fills,
    HIDE_ABILITY_CHECK_HOLE_ID,
    "Hide",
    {
      rollMode: checkHole.rollMode,
    },
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (check.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", check.message);
  }
  /* v8 ignore stop -- @preserve */
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [checkHole]);
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher Bonus Action resource admission rejects an exhausted Bonus Action before routing the Stat Block option here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const hidden =
    check.value.value.total >= HIDE_DC
      ? { discoveryDc: difficultyClass(check.value.value.total) }
      : null;
  const nextState = updateStatBlockActorResources(
    normalizeBattleGrapples({
      ...input.state,
      currentTurnResources: spent.success,
      combatants: new Map(input.state.combatants).set(actor.combatantId, {
        ...actor,
        hidden,
      }),
    }),
    actor,
    procedureRef,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveGrapple(
  input: GrappleBattleResolutionInput,
): BattleResolutionResult {
  const fillSet = grappleFillSet(input.fills);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop -- @preserve */
  if (fillSet.targetId === undefined) {
    return needsHolesResult(input.state, input.subject, [
      grappleTargetHole(input.state, input.subject.actorId),
    ]);
  }
  const targetFill = input.fills.find((fill) => fill.kind === "targetChoice");
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetFill?.holeId !== GRAPPLE_TARGET_HOLE_ID) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Grapple target fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const link = grappleLinkForTarget(
    input.state,
    input.subject.actorId,
    fillSet.targetId,
    fillSet.targetSpatialFacts,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (link.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", link.message);
  }
  /* v8 ignore stop -- @preserve */
  if (fillSet.outcome === undefined) {
    return needsHolesResult(input.state, input.subject, [
      grappleOutcomeHole(input.state, link.link),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.outcome.holeId !== GRAPPLE_OUTCOME_HOLE_ID) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Grapple outcome fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const relationshipFacts = parseSavingThrowRelationshipFacts(
    fillSet.outcome.relationshipFacts ?? [],
    link.link.grapplerId,
    [link.link.targetId],
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      link.link.grapplerId,
      "enemySavingThrow",
    ),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipFacts === null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Grapple relationship facts must answer the saving-throw hole request.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendUnarmedStrikeActionResource(
    input.state.currentTurnResources,
  );
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher unarmed-strike resource admission rejects an exhausted compatible Action before routing Grapple here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Grapple is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = applyGrappleSavingThrowOutcome({
    state: {
      ...input.state,
      currentTurnResources: spent.success,
    },
    link: link.link,
    relationshipFacts,
    outcome: fillSet.outcome.value,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function applyGrappleSavingThrowOutcome(input: {
  readonly state: BattleState;
  readonly link: BattleGrappleLink;
  readonly relationshipFacts: readonly BattleSavingThrowRelationshipFact[];
  readonly outcome: Extract<
    BattleFill,
    { readonly kind: "grappleOutcome" }
  >["value"];
}): BattleState {
  const savingThrowExtendedState = extendSavingThrowOngoingFeatures(
    input.state,
    input.link.grapplerId,
    [input.link.targetId],
    input.relationshipFacts,
  );
  return normalizeBattleGrapples({
    ...savingThrowExtendedState,
    grapples: input.outcome.succeeded
      ? savingThrowExtendedState.grapples
      : [...savingThrowExtendedState.grapples, input.link],
  });
}

export function resolveShove(
  input: ShoveBattleResolutionInput,
): BattleResolutionResult {
  const fillSet = shoveFillSet(input.fills);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop -- @preserve */
  if (fillSet.targetId === undefined) {
    return needsHolesResult(input.state, input.subject, [
      shoveTargetHole(input.state, input.subject.actorId),
    ]);
  }
  const targetFill = input.fills.find((fill) => fill.kind === "targetChoice");
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetFill?.holeId !== SHOVE_TARGET_HOLE_ID) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Shove target fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const shove = shoveForTarget(
    input.state,
    input.subject.actorId,
    fillSet.targetId,
    fillSet.targetSpatialFacts,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (shove.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", shove.message);
  }
  /* v8 ignore stop -- @preserve */
  if (fillSet.outcome === undefined) {
    return needsHolesResult(input.state, input.subject, [
      shoveOutcomeHole({
        state: input.state,
        actorId: input.subject.actorId,
        targetId: fillSet.targetId,
        dc: shove.dc,
      }),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.outcome.holeId !== SHOVE_OUTCOME_HOLE_ID) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Shove outcome fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (
    !fillSet.outcome.value.succeeded &&
    fillSet.outcome.value.failedEffect.kind === "pushAway"
  ) {
    const pushValidation = validateShovePushDisposition(
      fillSet.outcome.value.failedEffect.disposition,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (pushValidation !== null) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", pushValidation);
    }
    /* v8 ignore stop -- @preserve */
  }
  const relationshipFacts = parseSavingThrowRelationshipFacts(
    fillSet.outcome.relationshipFacts ?? [],
    input.subject.actorId,
    [fillSet.targetId],
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      input.subject.actorId,
      "enemySavingThrow",
    ),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipFacts === null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Shove relationship facts must answer the saving-throw hole request.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendUnarmedStrikeActionResource(
    input.state.currentTurnResources,
  );
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher unarmed-strike resource admission rejects an exhausted compatible Action before routing Shove here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Shove is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const savingThrowExtendedState = extendSavingThrowOngoingFeatures(
    input.state,
    input.subject.actorId,
    [fillSet.targetId],
    relationshipFacts,
  );
  const afterEffect = applyShoveOutcome({
    state: {
      ...savingThrowExtendedState,
      currentTurnResources: spent.success,
    },
    targetId: fillSet.targetId,
    outcome: fillSet.outcome.value,
  });
  return {
    tag: "resolved",
    state: afterEffect.state,
    snapshot: snapshotBattle(afterEffect.state),
    ...nonEmptyArrayProperty("shovePushes", afterEffect.shovePushes),
  };
}

export function resolveEscapeGrapple(
  input: EscapeGrappleBattleResolutionInput,
): BattleResolutionResult {
  const grapple = grappledBy(input.state, input.subject.actorId);
  if (grapple === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No Grapple is available to escape.",
    );
  }
  const fillSet = grappleFillSet(input.fills);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.targetId !== undefined) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Escape Grapple does not use a target fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (fillSet.outcome === undefined) {
    return needsHolesResult(input.state, input.subject, [
      escapeGrappleOutcomeHole(input.state, grapple, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.outcome.holeId !== ESCAPE_GRAPPLE_OUTCOME_HOLE_ID) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Escape Grapple outcome fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendEscapeGrappleActionResource(
    input.state.currentTurnResources,
    input.subject.actorId,
  );
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher Escape Grapple admission rejects turn resources that cannot pay the action cost before routing here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape Grapple is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = normalizeBattleGrapples({
    ...input.state,
    currentTurnResources: spent.success,
    grapples: fillSet.outcome.value.succeeded
      ? input.state.grapples.filter((candidate) => candidate !== grapple)
      : input.state.grapples,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveEscapeSpellRestraint(
  input: EscapeSpellRestraintBattleResolutionInput,
): BattleResolutionResult {
  const effect = spellRestraintEffectFor(
    input.state,
    input.subject.targetId,
    input.subject.effectRef,
  );
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No spell-imposed Restraint is available to escape.",
    );
  }
  /* v8 ignore start -- @preserve -- Discovered-subject invariant: the effect reference comes from a restraint effect whose immutable escape procedure is an Ability Check. */
  if (!isAbilityCheckSpellConditionEffect(effect)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Spell-imposed Restraint escape is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Discovered-subject invariant: target-only escape discovery emits the restrained target as actor; the effect's allowed-actor rule cannot change in place. */
  if (
    effect.escape.allowedActor === "target" &&
    input.subject.actorId !== input.subject.targetId
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This spell-imposed Restraint can only be escaped by the restrained target.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const dc = spellSaveDcForCaster(input.state, effect.sourceCombatantId);
  /* v8 ignore start -- @preserve -- BattleState lifecycle invariant: removing a spell source also removes its sourced active effects, so a surviving restraint retains its caster DC. */
  if (dc === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Spell-imposed Restraint escape DC is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const checkHole = escapeSpellRestraintAbilityCheckHole(input.state, effect, {
    actorId: input.subject.actorId,
    targetId: input.subject.targetId,
  });
  const check = abilityCheckFill(
    input.fills,
    checkHole.holeId,
    "Escape spell Restraint",
    { rollMode: checkHole.rollMode },
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (check.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", check.message);
  }
  /* v8 ignore stop -- @preserve */
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [checkHole]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.subject.actorId !== input.subject.targetId &&
    effect.escape.allowedActor === "targetOrCreatureWithinReach" &&
    !spellRestraintEscapeActorWithinTargetReach(
      check.value.spatialFacts ?? [],
      input.subject.actorId,
      input.subject.targetId,
    )
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Escape spell Restraint helper must be within reach of the restrained target by table-supplied fact.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendAction(input.state.currentTurnResources, "utilize");
  /* v8 ignore start -- @preserve -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing this Utilize action here. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape spell Restraint is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState =
    check.value.value.total >= dc
      ? resolveSuccessfulEscapeSpellRestraint(
          {
            ...input.state,
            currentTurnResources: spent.success,
          },
          input.subject.targetId,
          effect,
        )
      : {
          ...input.state,
          currentTurnResources: spent.success,
        };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveSuccessfulEscapeSpellRestraint(
  state: BattleState,
  targetId: CombatantId,
  effect: AbilityCheckSpellConditionEffect,
): BattleState {
  return Match.value(effect.escape.successEnds).pipe(
    Match.when("condition", () =>
      removeSpellConditionEffect(state, targetId, effect),
    ),
    Match.when("spell", () =>
      breakBattleConcentration(state, effect.sourceCombatantId),
    ),
    Match.exhaustive,
  );
}

type AbilityCheckSpellConditionEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellCondition" }
> & {
  readonly escape: Extract<
    Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>["escape"],
    { readonly kind: "abilityCheck" }
  >;
};

function isAbilityCheckSpellConditionEffect(
  effect: Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>,
): effect is AbilityCheckSpellConditionEffect {
  return effect.escape?.kind === "abilityCheck";
}

function spellRestraintEscapeActorWithinTargetReach(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "spellRestraintEscapeActorWithinTargetReach" &&
      fact.actorId === actorId &&
      fact.targetId === targetId,
  );
}

function hasHitPointBudgetConditionShakeAwakeSpatialFact(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "stagedConditionShakeAwakeActorWithin5Feet" &&
      fact.actorId === actorId &&
      fact.targetId === targetId,
  );
}

function hasSaveGatedAreaControlShakeAwakePhysicalReachability(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "areaControlShakeAwakePhysicalReachability" &&
      fact.actorId === actorId &&
      fact.targetId === targetId,
  );
}

export function resolveReleaseGrappleCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "releaseGrapple" }
    >
  >,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Release Grapple does not use fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = normalizeBattleGrapples({
    ...input.state,
    grapples: input.state.grapples.filter(
      (grapple) =>
        !(
          grapple.grapplerId === input.subject.actorId &&
          grapple.targetId === input.subject.targetId
        ),
    ),
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function abilityCheckFill(
  fills: readonly BattleFill[],
  holeId: BattleHoleId,
  label: string,
  context?: { readonly rollMode?: AttackRollMode | undefined },
):
  | {
      readonly tag: "ok";
      readonly value:
        | Extract<BattleFill, { readonly kind: "abilityCheck" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let check: Extract<BattleFill, { readonly kind: "abilityCheck" }> | undefined;
  for (const fill of fills) {
    if (fill.kind === "abilityCheck" && fill.holeId === holeId) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (check !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
        return { tag: "invalid", message: `${label} check was filled twice.` };
      }
      /* v8 ignore stop -- @preserve */
      check = {
        ...fill,
        value: effectiveD20TestNaturalOneRerollAbilityCheckValue(
          fill.value,
          context,
        ),
      };
      continue;
    }
    /* v8 ignore start -- @preserve -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the ${label} replay holes.`,
    };
    /* v8 ignore stop -- @preserve */
  }
  return { tag: "ok", value: check };
}

/* v8 ignore start -- @preserve -- Malformed Shove disposition: the discovered push outcome fixes the SRD 5-foot distance and non-provoking forced-movement fact. */
function validateShovePushDisposition(
  disposition: BattleShovePushOutcome["disposition"],
): string | null {
  if (Number(disposition.distanceFeet) !== Number(SHOVE_PUSH_DISTANCE_FEET)) {
    return `Shove push disposition must use the action's ${SHOVE_PUSH_DISTANCE_FEET}-foot distance.`;
  }
  if (disposition.provokesOpportunityAttacks !== false) {
    return "Shove push disposition must not provoke Opportunity Attacks.";
  }
  return null;
}
/* v8 ignore stop -- @preserve */

function applyShoveOutcome(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly outcome: Extract<
    BattleFill,
    { readonly kind: "shoveOutcome" }
  >["value"];
}): {
  readonly state: BattleState;
  readonly shovePushes: readonly BattleShovePushOutcome[];
} {
  if (input.outcome.succeeded) {
    return { state: input.state, shovePushes: [] };
  }
  return Match.value(input.outcome.failedEffect).pipe(
    Match.when({ kind: "prone" }, () => {
      const target = input.state.combatants.get(input.targetId);
      /* v8 ignore start -- @preserve -- Defensive internal guard: Shove target admission and outcome validation preserve the selected combatant through effect application. */
      if (target === undefined) {
        return { state: input.state, shovePushes: [] };
      }
      /* v8 ignore stop -- @preserve */
      const state = {
        ...input.state,
        combatants: new Map(input.state.combatants).set(
          input.targetId,
          battleCreatureStateWithKnockOutPreservedConditions(
            target,
            applyCondition(target.conditions, "prone"),
          ),
        ),
      };
      return { state, shovePushes: [] };
    }),
    Match.when({ kind: "pushAway" }, (effect) => ({
      state: input.state,
      shovePushes: [
        {
          targetId: input.targetId,
          disposition: effect.disposition,
        },
      ],
    })),
    Match.exhaustive,
  );
}

export function grappleFillSet(fills: readonly BattleFill[]): GrappleFillSet {
  let targetId: CombatantId | undefined;
  let targetSpatialFacts: readonly BattleTargetSpatialFact[] = [];
  let outcome:
    | Extract<BattleFill, { readonly kind: "grappleOutcome" }>
    | undefined;
  for (const fill of fills) {
    if (fill.kind === "targetChoice") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.relationshipFacts !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
        return {
          tag: "invalid",
          message:
            "Grapple target relationship facts do not match a requested target decision.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (targetId !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
        return { tag: "invalid", message: "Grapple target was filled twice." };
      }
      /* v8 ignore stop -- @preserve */
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      continue;
    }
    if (fill.kind === "grappleOutcome") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (outcome !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
        return {
          tag: "invalid",
          message: "Grapple outcome was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      outcome = fill;
      continue;
    }
    /* v8 ignore start -- @preserve -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Grapple replay holes.`,
    };
    /* v8 ignore stop -- @preserve */
  }
  return { tag: "ok", targetId, targetSpatialFacts, outcome };
}

export function shoveFillSet(fills: readonly BattleFill[]): ShoveFillSet {
  let targetId: CombatantId | undefined;
  let targetSpatialFacts: readonly BattleTargetSpatialFact[] = [];
  let outcome:
    | Extract<BattleFill, { readonly kind: "shoveOutcome" }>
    | undefined;
  for (const fill of fills) {
    if (fill.kind === "targetChoice") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.relationshipFacts !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
        return {
          tag: "invalid",
          message:
            "Shove target relationship facts do not match a requested target decision.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (targetId !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
        return { tag: "invalid", message: "Shove target was filled twice." };
      }
      /* v8 ignore stop -- @preserve */
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      continue;
    }
    if (fill.kind === "shoveOutcome") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (outcome !== undefined) {
        /* v8 ignore next -- @preserve -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
        return {
          tag: "invalid",
          message: "Shove outcome was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      outcome = fill;
      continue;
    }
    /* v8 ignore start -- @preserve -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Shove replay holes.`,
    };
    /* v8 ignore stop -- @preserve */
  }
  return { tag: "ok", targetId, targetSpatialFacts, outcome };
}

export function validateAttackDamageFill(
  fill: BattleRolledDiceFill,
  attack: SupportedAttackActionOption,
  critical: boolean,
  attackRoll: AttackRollResult,
  eligibleAttackDamageRiders: readonly AttackDamageRider[],
  spellWeaponDamageRiders: readonly SpellAttackDamageComponent[] = [],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
  ongoingDamageModifier = 0,
  eligibleWeaponDamageDiceRollChoiceProcedureRefs: readonly BattleProcedureExecutionRef[] = [],
  eligibleAttackDamageDieFloorChoiceProcedureRefs: readonly BattleProcedureExecutionRef[] = [],
  eligibleCunningStrikeContexts: readonly CunningStrikeContext[] = [],
): string | null {
  const selectedRiders = selectedAttackDamageRiders(
    eligibleAttackDamageRiders,
    fill.selectedAttackDamageRiderProcedureRefs,
  );
  if (selectedRiders === null) {
    return "Selected attack damage rider is not eligible for this attack.";
  }
  const cunningStrikeIssue = validateCunningStrikeDamageRollSelection({
    fill,
    selectedAttackDamageRiders: selectedRiders,
    contexts: eligibleCunningStrikeContexts,
  });
  if (cunningStrikeIssue !== null) {
    return cunningStrikeIssue;
  }
  const selectedCunningStrike = selectedCunningStrikeContext(
    eligibleCunningStrikeContexts,
    fill.cunningStrikeOption,
  );
  const selectedRidersAfterCunningStrikeCost =
    attackDamageRidersAfterCunningStrikeCost(
      selectedRiders,
      selectedCunningStrike,
    );
  if (
    fill.holeId !==
    attackDamageHoleId(
      attack,
      critical,
      attackRoll,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
      ongoingDamageModifier,
    )
  ) {
    return critical
      ? "Critical hit damage must use the critical damage hole."
      : "Attack damage must use the normal hit damage hole.";
  }
  const spellDamageRerollIssue = spellDamageRerollUnsupportedIssue(fill);
  if (spellDamageRerollIssue !== null) {
    return spellDamageRerollIssue;
  }

  const weaponDamageDiceRollChoice = selectedWeaponDamageDiceRollChoice(
    eligibleWeaponDamageDiceRollChoiceProcedureRefs,
    fill.weaponDamageDiceRollChoice,
  );
  if (
    fill.weaponDamageDiceRollChoice !== undefined &&
    weaponDamageDiceRollChoice === null
  ) {
    return "Weapon damage dice roll choice is not eligible for this attack.";
  }
  const attackDamageDieFloorChoiceIssue = validateAttackDamageDieFloorChoice(
    fill,
    eligibleAttackDamageDieFloorChoiceProcedureRefs,
  );
  if (attackDamageDieFloorChoiceIssue !== null) {
    return attackDamageDieFloorChoiceIssue;
  }
  const attackDamageAbilityModifierChoiceIssue =
    validateAttackDamageAbilityModifierChoice(fill, attack);
  if (attackDamageAbilityModifierChoiceIssue !== null) {
    return attackDamageAbilityModifierChoiceIssue;
  }

  return validateRolledDiceForWeaponAttack(
    fill.value,
    attack,
    critical,
    attackRoll,
    selectedRidersAfterCunningStrikeCost,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
    weaponDamageDiceRollChoice ?? undefined,
  );
}

export function validateAttackDamageAbilityModifierChoice(
  fill: BattleRolledDiceFill,
  attack: SupportedAttackActionOption,
): string | null {
  const offeredChoice =
    attack.kind === "weapon"
      ? attack.attackDamageAbilityModifierChoice
      : undefined;
  const selectedChoice = selectedAttackDamageAbilityModifierChoice(
    offeredChoice,
    fill.attackDamageAbilityModifierChoice,
  );
  if (
    fill.attackDamageAbilityModifierChoice !== undefined &&
    selectedChoice === null
  ) {
    return "Attack damage ability modifier choice is not eligible for this attack.";
  }
  if (
    offeredChoice !== undefined &&
    fill.attackDamageAbilityModifierChoice === undefined
  ) {
    return "Attack damage ability modifier choice is required for this attack.";
  }
  return null;
}

export function validateAttackDamageDieFloorChoice(
  fill: BattleRolledDiceFill,
  eligibleProcedureRefs: readonly BattleProcedureExecutionRef[],
): string | null {
  const selectedChoice = selectedAttackDamageDieFloorChoice(
    eligibleProcedureRefs,
    fill.attackDamageDieFloorChoice,
  );
  if (
    fill.attackDamageDieFloorChoice !== undefined &&
    selectedChoice === null
  ) {
    return "Attack damage die floor choice is not eligible for this attack.";
  }
  if (
    eligibleProcedureRefs.length > 0 &&
    fill.attackDamageDieFloorChoice === undefined
  ) {
    return "Attack damage die floor choice is required for this attack.";
  }
  return null;
}

export function validateRolledDiceForWeaponAttack(
  groups: ReadonlyArray<RolledDiceGroup>,
  attack: SupportedAttackActionOption,
  critical: boolean,
  attackRoll: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[],
  spellWeaponDamageRiders: readonly SpellAttackDamageComponent[],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[],
  weaponDamageDiceRollChoice?: WeaponDamageDiceRollChoiceFill,
): string | null {
  const components = attackDamageComponents(
    attack,
    critical,
    attackRoll,
    attackDamageRiders,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
  );
  /* v8 ignore start -- @preserve -- Malformed weapon-damage fill: attack discovery publishes exactly one rolled-dice group for every computed damage component. */
  if (groups.length !== components.length) {
    return "filled damage groups do not match current attack damage";
  }
  /* v8 ignore stop -- @preserve */

  for (const [index, component] of components.entries()) {
    const group = groups[index];
    /* v8 ignore start -- @preserve -- Malformed sparse raw fill: JSON-authored rolled-dice groups are dense, and the preceding cardinality check fixes the index range. */
    if (group === undefined) {
      return "filled damage groups do not match current attack damage";
    }
    /* v8 ignore stop -- @preserve */
    const validation = validateRolledDiceForDiceExpr([group], component.expr);
    /* v8 ignore start -- @preserve -- Malformed weapon-damage roll: each discovered component fixes the count and size of its submitted dice. */
    if (validation !== null) {
      return validation.reason;
    }
    /* v8 ignore stop -- @preserve */
  }

  if (weaponDamageDiceRollChoice !== undefined) {
    const weaponDamage = weaponDamageComponent(attack, critical);
    /* v8 ignore start -- @preserve -- Contradictory damage choice: discovery offers a weapon-dice choice only when the attack has a weapon damage component. */
    if (weaponDamage === null) {
      return "Weapon damage dice roll choice requires weapon damage dice.";
    }
    /* v8 ignore stop -- @preserve */
    const candidateValidation = validateRolledDiceForDiceExpr(
      weaponDamageDiceRollChoice.candidates,
      {
        dice: weaponDamage.expr.dice * 2,
        dieSize: weaponDamage.expr.dieSize,
      },
    );
    /* v8 ignore start -- @preserve -- Malformed damage-choice candidates: discovery fixes two complete candidate rolls using the weapon component's count and die size. */
    if (candidateValidation !== null) {
      return candidateValidation.reason;
    }
    /* v8 ignore stop -- @preserve */
    const selectedCandidate =
      weaponDamageDiceRollChoice.selection === "first"
        ? weaponDamageDiceRollChoice.candidates[0]
        : weaponDamageDiceRollChoice.candidates[1];
    /* v8 ignore start -- @preserve -- Malformed damage-choice selection: the submitted base weapon group must equal the candidate selected at discovery. */
    if (
      JSON.stringify(groups[0]?.results) !==
      JSON.stringify(selectedCandidate.results)
    ) {
      return "Selected weapon damage dice roll choice must match the base weapon damage group.";
    }
    /* v8 ignore stop -- @preserve */
  }

  return null;
}

export function attackRollHitsWithCriticalThreshold(
  roll: AttackRollResult,
  armorClass: number,
  criticalThreshold: CriticalHitThreshold,
): boolean {
  if (Number(roll.naturalD20) === 1) {
    return false;
  }

  if (attackRollIsCriticalHit(roll, criticalThreshold)) {
    return true;
  }

  return roll.total >= armorClass;
}

export function attackRollIsCriticalHit(
  roll: AttackRollResult,
  criticalThreshold: CriticalHitThreshold = 20,
): boolean {
  return Number(roll.naturalD20) >= criticalThreshold;
}

export function criticalThresholdForAttack(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
): CriticalHitThreshold {
  if (
    !attackUsesWeaponOrUnarmedStrikeCriticalRange(attack) ||
    attacker?.origin.kind !== "character"
  ) {
    return 20;
  }

  return attacker.origin.execution.procedureBindings.some(
    (binding) =>
      (binding.procedure.kind === "unitFeature" ||
        binding.procedure.kind === "unitSupportProfile") &&
      binding.procedure.execution === "weaponOrUnarmedCriticalRange19",
  )
    ? 19
    : 20;
}

export function attackUsesWeaponOrUnarmedStrikeCriticalRange(
  attack: SupportedAttackActionOption,
): boolean {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, () => true),
    Match.when({ kind: "unarmedStrike" }, () => true),
    Match.when({ kind: "statBlockAttack" }, () => false),
    Match.exhaustive,
  );
}

export function compatibleAttackActionResource(
  resources: readonly RuntimeActionResource[],
): { readonly resource: RuntimeActionResource; readonly index: number } | null {
  const compatible = resources
    .map((resource, index) => ({ resource, index }))
    .filter(({ resource }) => actionResourceAllows(resource, "attack"));
  const extraAttack = compatible.find(
    ({ resource }) => resource.source === "classFeatureExtraAttack",
  );
  if (extraAttack !== undefined) return extraAttack;
  const restricted = compatible.find(
    ({ resource }) => resource.source !== "turn",
  );
  return restricted ?? compatible[0] ?? null;
}

export function spendAttackActionResource<T extends ActionEconomyState>(
  state: T,
): Result.Result<
  { readonly state: T; readonly spentResource: RuntimeActionResource },
  "no action resource available"
> {
  if (!canSpendAction(state, "attack")) {
    return Result.fail("no action resource available");
  }
  const actionResource = compatibleAttackActionResource(state.actionResources);
  if (actionResource === null) {
    return Result.fail("no action resource available");
  }
  return Result.succeed({
    state: spendActionResourceAtIndex(state, actionResource.index),
    spentResource: actionResource.resource,
  });
}

export function classFeatureExtraAttackForActor(
  actor: BattleCreatureState | undefined,
): {
  readonly additionalAttacks: BattleAttackActionAdditionalAttacks;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
} | null {
  if (actor?.origin.kind !== "character") return null;
  let strongest: {
    readonly additionalAttacks: BattleAttackActionAdditionalAttacks;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
  } | null = null;
  for (const binding of actor.origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      (procedure.kind !== "unitFeature" &&
        procedure.kind !== "unitSupportProfile") ||
      typeof procedure.execution !== "object" ||
      procedure.execution.kind !==
        ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE
    ) {
      continue;
    }
    const additionalAttacks = procedure.execution.additionalAttacks;
    if (strongest === null || additionalAttacks > strongest.additionalAttacks) {
      strongest = {
        additionalAttacks,
        sourceProcedureRef: binding.procedureRef,
      };
    }
  }
  return strongest;
}

export function openClassFeatureExtraAttackResource(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly spentResource: RuntimeActionResource;
}): BattleTurnResources {
  if (
    input.spentResource.source === "classFeatureExtraAttack" ||
    !actionResourceAllowsAdditionalAttacks(input.spentResource) ||
    actorHasClassFeatureExtraAttackActionResource(input.state, input.actorId) ||
    combatantHasSaveGatedTurnConstraintBundle(
      input.state,
      input.state.combatants.get(input.actorId),
    )
  ) {
    return input.state.currentTurnResources;
  }
  const extraAttack = classFeatureExtraAttackForActor(
    input.state.combatants.get(input.actorId),
  );
  if (extraAttack === null) {
    return input.state.currentTurnResources;
  }
  return {
    ...input.state.currentTurnResources,
    actionResources: [
      ...input.state.currentTurnResources.actionResources,
      ...Array.from({ length: extraAttack.additionalAttacks }, () => ({
        kind: "action" as const,
        source: "classFeatureExtraAttack" as const,
        sourceOwnerId: input.actorId,
        sourceProcedureRef: extraAttack.sourceProcedureRef,
        restriction: {
          kind: "exclude" as const,
          actions: ATTACK_ONLY_ACTION_RESOURCE_EXCLUDED_ACTIONS,
        },
      })),
    ],
  };
}

export function spendAttackAction(
  state: BattleState,
  actorId: CombatantId,
  attack: BoundSupportedAttackActionOption,
  timing: { readonly kind: "acceptedAttack" | "attackPreventedBeforeRoll" },
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const statBlockAttackSection =
    attack.kind === "statBlockAttack"
      ? statBlockAttackProcedureSection(state, actorId, attack.procedureRef)
      : null;
  if (attack.kind === "statBlockAttack" && statBlockAttackSection === null) {
    return invalidResult(
      state,
      "staleSubject",
      "Stat Block attack procedure is no longer admitted for the actor.",
    );
  }
  if (statBlockAttackSection === "legendaryActions") {
    const resourcesSpent = spendStatBlockAttackResources({
      state,
      actorId,
      attack,
    });
    const nextState =
      timing.kind === "acceptedAttack"
        ? spendAmmunitionForAcceptedAttack({
            state: resourcesSpent,
            actorId,
            attack,
          })
        : resourcesSpent;
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }

  const spent = spendAttackTurnResources(
    state,
    actorId,
    attack,
    statBlockAttackSection,
  );
  if (Result.isFailure(spent)) {
    return invalidResult(state, "staleSubject", spent.failure);
  }
  const { spentTurnResources, spentResource } = spent.success;
  const afterExtraAttackResource =
    spentResource === null
      ? spentTurnResources
      : openClassFeatureExtraAttackResource({
          state: {
            ...state,
            currentTurnResources: spentTurnResources,
          },
          actorId,
          spentResource,
        });
  const nextTurnResources =
    attack.kind === "weapon" && isLightMeleeWeapon(attack.weapon)
      ? {
          ...afterExtraAttackResource,
          lightWeaponAttackMade: {
            weaponItemId: heldWeaponItemIdForAttack(state, actorId, attack),
          },
        }
      : afterExtraAttackResource;
  const nextTurnResourcesWithoutPendingReplacement =
    clearPendingAttackRollMissToHitReplacementSelection(
      nextTurnResources,
      actorId,
    );

  const resourcesSpentState = spendStatBlockAttackResources({
    state: {
      ...state,
      currentTurnResources: nextTurnResourcesWithoutPendingReplacement,
    },
    actorId,
    attack,
  });
  const nextState =
    timing.kind === "acceptedAttack"
      ? spendAmmunitionForAcceptedAttack({
          state: resourcesSpentState,
          actorId,
          attack,
        })
      : resourcesSpentState;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function spendAttackTurnResources(
  state: BattleState,
  actorId: CombatantId,
  attack: BoundSupportedAttackActionOption,
  statBlockAttackSection: ReturnType<typeof statBlockAttackProcedureSection>,
): Result.Result<
  {
    readonly spentTurnResources: BattleTurnResources;
    readonly spentResource: RuntimeActionResource | null;
  },
  string
> {
  const actor = state.combatants.get(actorId);
  const statBlockExecution =
    actor?.origin.kind === "statBlock" ? actor.origin.execution : null;
  const hasMultiattackContinuation =
    statBlockExecution !== null &&
    hasStatBlockMultiattackContinuationResource(
      state.currentTurnResources.actionResources,
      actorId,
      statBlockExecution,
    );
  if (
    hasMultiattackContinuation &&
    statBlockExecution !== null &&
    attack.kind === "statBlockAttack" &&
    statBlockAttackSection === "actions"
  ) {
    const spent = spendMatchingActionResource(
      state.currentTurnResources,
      "attack",
      (resource) =>
        attack.procedureRef !== undefined &&
        statBlockMultiattackActionResourceMatchesProcedure(
          resource,
          actorId,
          statBlockExecution,
          attack.procedureRef,
        ),
    );
    return Result.isFailure(spent)
      ? Result.fail("Attack is no longer available for the current actor.")
      : Result.succeed({
          spentTurnResources: spent.success,
          spentResource: null,
        });
  }
  const spent = spendAttackActionResource(state.currentTurnResources);
  return Result.isFailure(spent)
    ? Result.fail("Attack is no longer available for the current actor.")
    : Result.succeed({
        spentTurnResources: spent.success.state,
        spentResource: spent.success.spentResource,
      });
}
