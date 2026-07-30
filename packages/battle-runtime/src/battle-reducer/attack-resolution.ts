// Owns attack pipelines, standard action resolvers, off-hand/statblock/grapple
// commands, attack fill validation, and attack action-resource spending.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// KERNEL-COVERAGE: runtime-owner BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY BATTLE.DAMAGE.ATTACK_BRANCHES BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
// KERNEL-COVERAGE: runtime-owner BATTLE.RELATIONSHIP_DISCOVERY
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.light-extra-attack-damage-ability-modifier
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
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
import {
  characterProcedureBinding,
  type CharacterUnitProcedureExecution,
} from "../character-execution-queries.ts";
import type {
  BattleProcedureExecutionRef,
  BattleResourcePoolExecutionRef,
} from "../identity.ts";

import * as Either from "effect/Either";

import type { SupportedAttackActionOption } from "../battle-action-options.ts";

import { type BattleSubject } from "../battle-subjects.ts";

import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
} from "../character-battle-resource-execution.ts";

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
  isCharacterBattleCreatureState,
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
  hypnoticPatternShakeAwakeTargetHole,
  searchAbilityCheckHole,
  searchTargetHole,
  shoveOutcomeHole,
  shoveTargetHole,
  sleepShakeAwakeTargetHole,
} from "./hole-helpers.ts";
import { needsHolesResult } from "./needs-holes-result.ts";

import {
  combatantProficiencyBonus,
  grappleLinkForTarget,
  representedMovementSpeedKinds,
  shoveForTarget,
} from "./movement-speed.ts";

import { invalidResult } from "./result-helpers.ts";
import { applyDashToActor, applyDisengage } from "./mobility-actions.ts";
import { spellSaveDcForCaster } from "./spell-save-dc.ts";
import { combatantHasSlowActivePenalties } from "./slow-active-penalties-runtime.ts";

import {
  hypnoticPatternShakeAwakeTargetChoices,
  removeHypnoticPatternControlEffectsFromTarget,
  removeSpellConditionEffect,
  removeSleepEffectsFromTarget,
  spellRestraintEffectFor,
  sleepShakeAwakeTargetChoices,
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
  updateStatBlockActorResources,
} from "./statblock.ts";
import {
  statBlockProcedureBinding,
  statBlockProcedureResourcesAvailable,
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
  HideBattleResolutionInput,
  MultiattackBattleResolutionInput,
  SearchBattleResolutionInput,
  ShoveBattleResolutionInput,
  SpellMarkedDamageRider,
  SpellAttackDamageComponent,
  StatBlockBattleCreatureState,
  StatBlockBonusActionOptionBattleResolutionInput,
  WeaponDamageDiceRollChoiceFill,
} from "../battle-state-execution.ts";
import type {
  GrappleFillSet,
  ShoveFillSet,
  StatBlockMultiattackActionResource,
} from "./battle-runtime-protocol.ts";
import {
  ATTACK_ONLY_ACTION_RESOURCE_EXCLUDED_ACTIONS,
  ESCAPE_GRAPPLE_OUTCOME_HOLE_ID,
  ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_ID,
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
  HYPNOTIC_PATTERN_SHAKE_AWAKE_TARGET_HOLE_ID,
  SLEEP_SHAKE_AWAKE_TARGET_HOLE_ID,
} from "./battle-runtime-protocol.ts";
import {
  actorHasClassFeatureExtraAttackActionResource,
  actorHasStatBlockMultiattackActionResource,
  isStatBlockBattleCreatureState,
  spendTurnAction,
  supportedStatBlockBonusActionStandardAction,
} from "./battle-discovery.ts";
import {
  isClassFeatureExtraAttackActionResource,
  isStatBlockMultiattackActionResource,
} from "./action-resource-kinds.ts";
import { spellDamageRerollUnsupportedIssue } from "./spell-reroll-issues.ts";
import {
  helpAttackAllyChoices,
  helpAttackAllyHole,
  helpAttackTargetChoices,
  helpAttackTargetHole,
} from "./help-attack.ts";
import { zeroHpLifecycleIsTerminal } from "./creature-state-leaves.ts";
export function needsAttackDamageConcentrationResult(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly attack: SupportedAttackActionOption;
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
  );
  return spent.tag === "invalid"
    ? spent
    : needsHolesResult(spent.state, input.subject, [input.concentrationSave]);
}

export function resolveDash(
  input: BattleResolutionInput,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", "Dash accepts no fills.");
  }
  /* v8 ignore stop */
  const actor = input.state.combatants.get(input.subject.actorId);
  /* v8 ignore start -- Defensive internal guard: the dispatcher's missing-combatant check rejects an absent actor before routing Dash here. */
  if (actor === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Dash actor is not in this battle.",
    );
  }
  /* v8 ignore stop */
  const speedKind =
    input.subject.tag === "action" && input.subject.action === "dash"
      ? input.subject.speedKind
      : "walk";
  if (!representedMovementSpeedKinds(actor).includes(speedKind)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Dash speed kind is not represented for this combatant.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "dash");
  /* v8 ignore start -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing Dash here. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dash is no longer available.",
    );
  }
  /* v8 ignore stop */
  const nextState = applyDashToActor(
    input.state,
    actor,
    speedKind,
    spent.right,
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Disengage accepts no fills.",
    );
  }
  /* v8 ignore stop */
  const spent = spendAction(input.state.currentTurnResources, "disengage");
  /* v8 ignore start -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing Disengage here. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Disengage is no longer available.",
    );
  }
  /* v8 ignore stop */
  const nextState = applyDisengage(input.state, spent.right);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function bonusActionStandardActionProcedure(
  actor: BattleCreatureState | undefined,
  subject: BonusActionStandardActionBattleResolutionInput["subject"],
):
  | { readonly kind: "spell" }
  | { readonly kind: "staleSpell" }
  | {
      readonly kind: "unit";
      readonly actor: CharacterBattleCreatureState;
      readonly procedure: CharacterUnitProcedureExecution;
    }
  | undefined {
  if (!isCharacterBattleCreatureState(actor)) return undefined;
  const binding = characterProcedureBinding(
    actor.origin.execution,
    subject.procedureRef,
  );
  if (
    binding?.procedure.kind === "spellInvocation" &&
    binding.procedure.execution.procedure === "expeditiousRetreatDash"
  ) {
    return "sourceEffectRef" in subject &&
      actor.activeEffects.some(
        (effect) =>
          effect.kind === "spellDashBonusAction" &&
          effect.effectRef === subject.sourceEffectRef &&
          effect.sourceProcedureRef === subject.procedureRef &&
          effect.sourceCombatantId === actor.combatantId,
      )
      ? { kind: "spell" }
      : { kind: "staleSpell" };
  }
  if (
    binding?.procedure.kind !== "unitFeature" &&
    binding?.procedure.kind !== "unitSupportProfile"
  ) {
    return undefined;
  }
  return { kind: "unit", actor, procedure: binding.procedure };
}

export function resolveBonusActionStandardAction(
  input: BonusActionStandardActionBattleResolutionInput,
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  const procedure = bonusActionStandardActionProcedure(actor, input.subject);
  if (procedure?.kind === "staleSpell") {
    return invalidResult(
      input.state,
      "staleSubject",
      "The spell effect that granted this Bonus Action is no longer active.",
    );
  }
  if (
    (procedure?.kind !== "unit" ||
      typeof procedure.procedure.execution !== "object" ||
      procedure.procedure.execution.kind !== "alternateActionCost" ||
      procedure.procedure.execution.to.kind !== "bonusAction" ||
      !procedure.procedure.execution.from.actions.includes(
        input.subject.action,
      )) &&
    (input.subject.action !== "dash" ||
      (procedure?.kind !== "spell" &&
        (procedure?.kind !== "unit" ||
          typeof procedure.procedure.execution !== "object" ||
          procedure.procedure.execution.kind !==
            "bonusActionDashTemporaryHitPoints")))
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action standard action requires an admitted alternate action cost feature.",
    );
  }

  return Match.value(input.subject).pipe(
    Match.when({ action: "dash" }, (subject) =>
      resolveBonusActionDash({ ...input, subject }),
    ),
    Match.when({ action: "disengage" }, (subject) =>
      resolveBonusActionDisengage({ ...input, subject }),
    ),
    Match.when({ action: "hide" }, (subject) =>
      resolveHide({ ...input, subject }),
    ),
    Match.exhaustive,
  );
}

export function resolveBonusActionDash(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "bonusActionStandardAction";
        readonly action: "dash";
      }
    >
  >,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", "Dash accepts no fills.");
  }
  /* v8 ignore stop */
  const actor = input.state.combatants.get(input.subject.actorId);
  /* v8 ignore start -- Defensive internal guard: the dispatcher's missing-combatant check rejects an absent actor before routing a Bonus Action Dash here. */
  if (actor === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Dash actor is not in this battle.",
    );
  }
  /* v8 ignore stop */
  const procedure = bonusActionStandardActionProcedure(actor, input.subject);
  const dashTemporaryHitPointsProcedure =
    procedure?.kind === "unit" &&
    typeof procedure.procedure.execution === "object" &&
    procedure.procedure.execution.kind === "bonusActionDashTemporaryHitPoints"
      ? procedure
      : null;
  const speedKind = input.subject.speedKind;
  if (!representedMovementSpeedKinds(actor).includes(speedKind)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Dash speed kind is not represented for this combatant.",
    );
  }
  const dashTemporaryHitPoints =
    dashTemporaryHitPointsProcedure === null ||
    dashTemporaryHitPointsProcedure.procedure.source.kind !== "resourcePool"
      ? null
      : {
          actor: dashTemporaryHitPointsProcedure.actor,
          resourcePoolRef:
            dashTemporaryHitPointsProcedure.procedure.source.resourcePoolRef,
        };
  if (
    dashTemporaryHitPointsProcedure !== null &&
    (dashTemporaryHitPoints === null ||
      !dashTemporaryHitPoints.actor.origin.resources.some(
        (resource) =>
          resource.resourcePoolRef === dashTemporaryHitPoints.resourcePoolRef &&
          resourceHasUsesRemaining(resource),
      ))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action Dash Temporary Hit Points is no longer available.",
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- Defensive internal guard: dispatcher Bonus Action resource admission rejects an exhausted Bonus Action before routing Dash here. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dash is no longer available.",
    );
  }
  /* v8 ignore stop */
  const nextState = applyDashToActor(
    input.state,
    actor,
    speedKind,
    spent.right,
  );
  if (dashTemporaryHitPoints !== null) {
    return resolveBonusActionDashTemporaryHitPoints(
      nextState,
      dashTemporaryHitPoints.actor,
      dashTemporaryHitPoints.resourcePoolRef,
    );
  }
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveBonusActionDashTemporaryHitPoints(
  dashedState: BattleState,
  actor: CharacterBattleCreatureState,
  resourcePoolRef: BattleResourcePoolExecutionRef,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const nextActor = applyTemporaryHitPoints(
    {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((candidate) =>
          candidate.resourcePoolRef === resourcePoolRef &&
          resourceHasUsesRemaining(candidate)
            ? spendCharacterResourceUse(candidate)
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
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "bonusActionStandardAction" }> & {
      readonly action: "disengage";
    }
  >,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Disengage accepts no fills.",
    );
  }
  /* v8 ignore stop */
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- Defensive internal guard: dispatcher Bonus Action resource admission rejects an exhausted Bonus Action before routing Disengage here. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Disengage is no longer available.",
    );
  }
  /* v8 ignore stop */
  const nextState = applyDisengage(input.state, spent.right);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveDodge(
  input: BattleResolutionInput,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", "Dodge accepts no fills.");
  }
  /* v8 ignore stop */
  const actor = input.state.combatants.get(input.subject.actorId);
  /* v8 ignore start -- Defensive internal guard: the dispatcher's missing-combatant check rejects an absent actor before routing Dodge here. */
  if (actor === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Dodge actor is not in this battle.",
    );
  }
  /* v8 ignore stop */
  const spent = spendAction(input.state.currentTurnResources, "dodge");
  /* v8 ignore start -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing Dodge here. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dodge is no longer available.",
    );
  }
  /* v8 ignore stop */
  const combatants = new Map(input.state.combatants).set(actor.combatantId, {
    ...actor,
    dodging: true,
  });
  const nextState = {
    ...input.state,
    combatants,
    currentTurnResources: spent.right,
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", "Ready accepts no fills.");
  }
  /* v8 ignore stop */
  const spent = spendAction(input.state.currentTurnResources, "ready");
  /* v8 ignore start -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing Ready here. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ready is no longer available.",
    );
  }
  /* v8 ignore stop */
  const nextState = {
    ...input.state,
    currentTurnResources: spent.right,
    readiedMovements: new Map(input.state.readiedMovements).set(
      input.subject.actorId,
      {
        trigger: input.subject.readyTrigger,
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    allyFill.kind !== "helpAttackAllyDecision" ||
    allyFill.holeId !== HELP_ATTACK_ALLY_HOLE_ID
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Help requires an ally target fill first.",
    );
  }
  /* v8 ignore stop */
  const allyId = allyFill.allyId;
  const ally = input.state.combatants.get(allyId);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    allyId === input.subject.actorId ||
    ally === undefined ||
    zeroHpLifecycleIsTerminal(ally) ||
    !helpAttackAllyChoices(input.state, input.subject.actorId).includes(allyId)
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Help ally must be another live combatant.",
    );
  }
  /* v8 ignore stop */
  if (targetFillValue === undefined) {
    return needsHolesResult(input.state, input.subject, [
      helpAttackTargetHole(input.state, input.subject.actorId, allyId),
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.length > 2 ||
    targetFillValue.kind !== "helpAttackEnemyDecision" ||
    targetFillValue.holeId !== HELP_ATTACK_TARGET_HOLE_ID
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Help requires one enemy target fill.",
    );
  }
  /* v8 ignore stop */
  const targetEnemyId = targetFillValue.targetEnemyId;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !targetFillValue.targetWithinFiveFeetOfHelper ||
    !helpAttackTargetChoices(
      input.state,
      input.subject.actorId,
      allyId,
    ).includes(targetEnemyId)
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Help target must be an enemy within 5 feet of the helper.",
    );
  }
  /* v8 ignore stop */
  const spent = spendAction(input.state.currentTurnResources, "help");
  /* v8 ignore start -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing Help here. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Help is no longer available.",
    );
  }
  /* v8 ignore stop */
  const nextState = {
    ...input.state,
    currentTurnResources: spent.right,
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

export function resolveShakeAwakeFromSleep(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "shakeAwakeFromSleep" }
    >
  >,
): BattleResolutionResult {
  const [targetFill] = input.fills;
  if (targetFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      sleepShakeAwakeTargetHole(input.state, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.length > 1 ||
    targetFill.kind !== "targetChoice" ||
    targetFill.holeId !== SLEEP_SHAKE_AWAKE_TARGET_HOLE_ID
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Sleep shake-awake requires one target fill.",
    );
  }
  /* v8 ignore stop */
  const targetId = targetFill.value;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !sleepShakeAwakeTargetChoices(input.state, input.subject.actorId).includes(
      targetId,
    ) ||
    !hasSleepShakeAwakeSpatialFact(
      targetFill.spatialFacts ?? [],
      input.subject.actorId,
      targetId,
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Sleep shake-awake target must be within 5 feet of the actor by table-supplied fact.",
    );
  }
  /* v8 ignore stop */
  const spent = spendTurnAction(input.state.currentTurnResources);
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sleep shake-awake is no longer available.",
    );
  }
  const nextState = removeSleepEffectsFromTarget(
    { ...input.state, currentTurnResources: spent.right },
    targetId,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveShakeAwakeFromHypnoticPattern(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "action";
        readonly action: "shakeAwakeFromHypnoticPattern";
      }
    >
  >,
): BattleResolutionResult {
  const [targetFill] = input.fills;
  if (targetFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      hypnoticPatternShakeAwakeTargetHole(input.state, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fills.length > 1 ||
    targetFill.kind !== "targetChoice" ||
    targetFill.holeId !== HYPNOTIC_PATTERN_SHAKE_AWAKE_TARGET_HOLE_ID
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Hypnotic Pattern shake-awake requires one target fill.",
    );
  }
  /* v8 ignore stop */
  const targetId = targetFill.value;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !hypnoticPatternShakeAwakeTargetChoices(
      input.state,
      input.subject.actorId,
    ).includes(targetId) ||
    !hasHypnoticPatternShakeAwakeSpatialFact(
      targetFill.spatialFacts ?? [],
      input.subject.actorId,
      targetId,
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Hypnotic Pattern shake-awake target must be within 5 feet of the actor by table-supplied fact.",
    );
  }
  /* v8 ignore stop */
  const spent = spendTurnAction(input.state.currentTurnResources);
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hypnotic Pattern shake-awake is no longer available.",
    );
  }
  const nextState = removeHypnoticPatternControlEffectsFromTarget(
    { ...input.state, currentTurnResources: spent.right },
    targetId,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveHide(
  input: HideBattleResolutionInput,
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  /* v8 ignore start -- Defensive internal guard: dispatcher combatant and action-eligibility admission rejects a missing or ineligible actor before routing Hide here. */
  if (actor === undefined || !combatantCanTakeActions(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hide is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop */
  const bonusActionProcedure =
    input.subject.tag === "bonusActionStandardAction"
      ? bonusActionStandardActionProcedure(actor, input.subject)
      : undefined;
  if (
    input.subject.tag === "bonusActionStandardAction" &&
    (bonusActionProcedure?.kind !== "unit" ||
      bonusActionProcedure.procedure.kind !== "unitSupportProfile" ||
      typeof bonusActionProcedure.procedure.execution !== "object" ||
      bonusActionProcedure.procedure.execution.kind !== "alternateActionCost" ||
      !bonusActionProcedure.procedure.execution.from.actions.includes(
        input.subject.action,
      ))
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action Hide requires an admitted alternate action cost feature.",
    );
  }
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (check.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", check.message);
  }
  /* v8 ignore stop */
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [checkHole]);
  }

  const spent =
    input.subject.tag === "bonusActionStandardAction"
      ? spendActivationResource(input.state.currentTurnResources, {
          kind: "bonusAction",
        })
      : spendAction(input.state.currentTurnResources, "hide");
  /* v8 ignore start -- Defensive internal guard: dispatcher standard- or Bonus Action resource admission rejects an exhausted resource before routing Hide here. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hide is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop */
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
    currentTurnResources: spent.right,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveMultiattack(
  input: MultiattackBattleResolutionInput,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Multiattack accepts no fills.",
    );
  }
  /* v8 ignore stop */
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !isStatBlockBattleCreatureState(actor) ||
    !combatantCanTakeActions(actor)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Multiattack requires an admitted Stat Block Multiattack.",
    );
  }
  const origin = actor.origin;
  const multiattackBinding = statBlockProcedureBinding(
    origin.execution,
    input.subject.procedureRef,
  );
  if (multiattackBinding?.procedure.kind !== "multiattack") {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Multiattack requires an admitted Stat Block Multiattack.",
    );
  }
  if (
    !multiattackBinding.procedure.dispatchProcedureRefs.every((procedureRef) =>
      statBlockProcedureResourcesAvailable(origin.execution, procedureRef),
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Multiattack Stat Block resources are no longer available.",
    );
  }
  const spent = spendTurnAction(input.state.currentTurnResources);
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }
  const [consumedDispatch, ...pendingDispatches] =
    multiattackBinding.procedure.dispatchProcedureRefs;
  const grantedPendingDispatches = combatantHasSlowActivePenalties(actor)
    ? []
    : pendingDispatches;
  const nextStateWithPendingDispatches = {
    ...input.state,
    currentTurnResources: {
      ...spent.right,
      actionResources: [
        ...spent.right.actionResources,
        ...grantedPendingDispatches.map((dispatch) => ({
          kind: "action" as const,
          source: "statBlockMultiattack" as const,
          sourceOwnerId: input.subject.actorId,
          attackProcedureRef: dispatch,
          restriction: {
            kind: "exclude" as const,
            actions: ATTACK_ONLY_ACTION_RESOURCE_EXCLUDED_ACTIONS,
          },
        })),
      ],
    },
  };
  const nextState =
    consumedDispatch === undefined
      ? nextStateWithPendingDispatches
      : updateStatBlockActorResources(
          nextStateWithPendingDispatches,
          actor,
          consumedDispatch,
        );
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetFill.holeId !== SEARCH_TARGET_HOLE_ID) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Search target fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetFill.relationshipFacts !== undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Search target relationship facts were not requested.",
    );
  }
  /* v8 ignore stop */
  const target = input.state.combatants.get(targetFill.value);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    target === undefined ||
    target.combatantId === input.subject.actorId ||
    target.hidden === null
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Search target must be a hidden combatant in this battle.",
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (check.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", check.message);
  }
  /* v8 ignore stop */
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [checkHole]);
  }
  const spent = spendAction(input.state.currentTurnResources, "search");
  /* v8 ignore start -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing Search here. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Search is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop */
  const found = check.value.value.total >= target.hidden.discoveryDc;
  const nextTarget = found ? { ...target, hidden: null } : target;
  const nextState = normalizeBattleGrapples({
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      target.combatantId,
      nextTarget,
    ),
    currentTurnResources: spent.right,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveStatBlockBonusActionOption(
  input: StatBlockBonusActionOptionBattleResolutionInput,
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !isStatBlockBattleCreatureState(actor) ||
    !combatantCanTakeActions(actor)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Stat Block Bonus Action requires an admitted Stat Block action option.",
    );
  }
  const statBlockActor = actor;
  const origin = statBlockActor.origin;
  const optionBinding = statBlockProcedureBinding(
    origin.execution,
    input.subject.procedureRef,
  );
  if (
    optionBinding?.procedure.kind !== "bonusActionOption" ||
    !optionBinding.procedure.standardActions.some(
      (standardAction) => standardAction === input.subject.standardAction,
    )
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Stat Block Bonus Action requires an admitted Stat Block action option.",
    );
  }
  if (
    !statBlockProcedureResourcesAvailable(
      origin.execution,
      optionBinding.procedureRef,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Stat Block Bonus Action resource is no longer available.",
    );
  }
  if (
    !supportedStatBlockBonusActionStandardAction(input.subject.standardAction)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Stat Block Bonus Action requires an admitted standard action option.",
    );
  }
  const standardAction = input.subject.standardAction;

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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Stat Block Bonus Action Disengage accepts no fills.",
    );
  }
  /* v8 ignore stop */
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- Defensive internal guard: dispatcher Bonus Action resource admission rejects an exhausted Bonus Action before routing the Stat Block option here. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop */
  const nextState = updateStatBlockActorResources(
    {
      ...input.state,
      currentTurnResources: { ...spent.right, disengaged: true },
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (check.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", check.message);
  }
  /* v8 ignore stop */
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [checkHole]);
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- Defensive internal guard: dispatcher Bonus Action resource admission rejects an exhausted Bonus Action before routing the Stat Block option here. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop */
  const hidden =
    check.value.value.total >= HIDE_DC
      ? { discoveryDc: difficultyClass(check.value.value.total) }
      : null;
  const nextState = updateStatBlockActorResources(
    normalizeBattleGrapples({
      ...input.state,
      currentTurnResources: spent.right,
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop */
  if (fillSet.targetId === undefined) {
    return needsHolesResult(input.state, input.subject, [
      grappleTargetHole(input.state, input.subject.actorId),
    ]);
  }
  const targetFill = input.fills.find((fill) => fill.kind === "targetChoice");
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetFill?.holeId !== GRAPPLE_TARGET_HOLE_ID) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Grapple target fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop */
  const link = grappleLinkForTarget(
    input.state,
    input.subject.actorId,
    fillSet.targetId,
    fillSet.targetSpatialFacts,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (link.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", link.message);
  }
  /* v8 ignore stop */
  if (fillSet.outcome === undefined) {
    return needsHolesResult(input.state, input.subject, [
      grappleOutcomeHole(input.state, link.link),
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.outcome.holeId !== GRAPPLE_OUTCOME_HOLE_ID) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Grapple outcome fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop */
  if (
    actorHasStatBlockMultiattackActionResource(
      input.state,
      input.subject.actorId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Grapple is not available during a Stat Block Multiattack dispatch.",
    );
  }
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipFacts === null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Grapple relationship facts must answer the saving-throw hole request.",
    );
  }
  /* v8 ignore stop */
  const spent = spendUnarmedStrikeActionResource(
    input.state.currentTurnResources,
  );
  /* v8 ignore start -- Defensive internal guard: dispatcher unarmed-strike resource admission rejects an exhausted compatible Action before routing Grapple here. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Grapple is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop */
  const nextState = applyGrappleSavingThrowOutcome({
    state: {
      ...input.state,
      currentTurnResources: spent.right,
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop */
  if (fillSet.targetId === undefined) {
    return needsHolesResult(input.state, input.subject, [
      shoveTargetHole(input.state, input.subject.actorId),
    ]);
  }
  const targetFill = input.fills.find((fill) => fill.kind === "targetChoice");
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetFill?.holeId !== SHOVE_TARGET_HOLE_ID) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Shove target fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop */
  const shove = shoveForTarget(
    input.state,
    input.subject.actorId,
    fillSet.targetId,
    fillSet.targetSpatialFacts,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (shove.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", shove.message);
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.outcome.holeId !== SHOVE_OUTCOME_HOLE_ID) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Shove outcome fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop */
  if (
    !fillSet.outcome.value.succeeded &&
    fillSet.outcome.value.failedEffect.kind === "pushAway"
  ) {
    const pushValidation = validateShovePushDisposition(
      fillSet.outcome.value.failedEffect.disposition,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (pushValidation !== null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", pushValidation);
    }
    /* v8 ignore stop */
  }
  if (
    actorHasStatBlockMultiattackActionResource(
      input.state,
      input.subject.actorId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Shove is not available during a Stat Block Multiattack dispatch.",
    );
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipFacts === null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Shove relationship facts must answer the saving-throw hole request.",
    );
  }
  /* v8 ignore stop */
  const spent = spendUnarmedStrikeActionResource(
    input.state.currentTurnResources,
  );
  /* v8 ignore start -- Defensive internal guard: dispatcher unarmed-strike resource admission rejects an exhausted compatible Action before routing Shove here. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Shove is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop */
  const savingThrowExtendedState = extendSavingThrowOngoingFeatures(
    input.state,
    input.subject.actorId,
    [fillSet.targetId],
    relationshipFacts,
  );
  const afterEffect = applyShoveOutcome({
    state: {
      ...savingThrowExtendedState,
      currentTurnResources: spent.right,
    },
    targetId: fillSet.targetId,
    outcome: fillSet.outcome.value,
  });
  return {
    tag: "resolved",
    state: afterEffect.state,
    snapshot: snapshotBattle(afterEffect.state),
    ...(afterEffect.shovePushes.length === 0
      ? {}
      : { shovePushes: afterEffect.shovePushes }),
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.targetId !== undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Escape Grapple does not use a target fill.",
    );
  }
  /* v8 ignore stop */
  if (fillSet.outcome === undefined) {
    return needsHolesResult(input.state, input.subject, [
      escapeGrappleOutcomeHole(input.state, grapple, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.outcome.holeId !== ESCAPE_GRAPPLE_OUTCOME_HOLE_ID) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Escape Grapple outcome fill does not match the requested hole.",
    );
  }
  /* v8 ignore stop */
  if (
    actorHasStatBlockMultiattackActionResource(
      input.state,
      input.subject.actorId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape Grapple is not available during a Stat Block Multiattack dispatch.",
    );
  }
  const spent = spendMatchingActionResource(
    input.state.currentTurnResources,
    "attack",
    (resource) =>
      !isClassFeatureExtraAttackActionResource(resource, input.subject.actorId),
  );
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape Grapple is no longer available for the current actor.",
    );
  }
  const nextState = normalizeBattleGrapples({
    ...input.state,
    currentTurnResources: spent.right,
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
  if (effect.escape?.kind !== "abilityCheck") {
    return invalidResult(
      input.state,
      "staleSubject",
      "Spell-imposed Restraint escape is no longer available.",
    );
  }
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
  if (
    actorHasStatBlockMultiattackActionResource(
      input.state,
      input.subject.actorId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape spell Restraint is not available during a Stat Block Multiattack dispatch.",
    );
  }
  const dc = spellSaveDcForCaster(input.state, effect.sourceCombatantId);
  if (dc === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Spell-imposed Restraint escape DC is no longer available.",
    );
  }
  const checkHole = escapeSpellRestraintAbilityCheckHole(input.state, effect, {
    actorId: input.subject.actorId,
    targetId: input.subject.targetId,
  });
  const check = abilityCheckFill(
    input.fills,
    ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_ID,
    "Escape spell Restraint",
    { rollMode: checkHole.rollMode },
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (check.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", check.message);
  }
  /* v8 ignore stop */
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [checkHole]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.subject.actorId !== input.subject.targetId &&
    effect.escape.allowedActor === "targetOrCreatureWithinReach" &&
    !spellRestraintEscapeActorWithinTargetReach(
      check.value.spatialFacts ?? [],
      input.subject.actorId,
      input.subject.targetId,
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Escape spell Restraint helper must be within reach of the restrained target by table-supplied fact.",
    );
  }
  /* v8 ignore stop */
  const spent = spendAction(input.state.currentTurnResources, "utilize");
  /* v8 ignore start -- Defensive internal guard: dispatcher standard-action resource admission rejects an exhausted Action before routing this Utilize action here. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape spell Restraint is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop */
  const nextState =
    check.value.value.total >= dc
      ? resolveSuccessfulEscapeSpellRestraint(
          {
            ...input.state,
            currentTurnResources: spent.right,
          },
          input.subject.targetId,
          effect,
        )
      : {
          ...input.state,
          currentTurnResources: spent.right,
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
  effect: Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>,
): BattleState {
  if (effect.escape?.kind !== "abilityCheck") {
    return removeSpellConditionEffect(state, targetId, effect);
  }
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

function hasSleepShakeAwakeSpatialFact(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "sleepShakeAwakeActorWithin5Feet" &&
      fact.actorId === actorId &&
      fact.targetId === targetId,
  );
}

function hasHypnoticPatternShakeAwakeSpatialFact(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "hypnoticPatternShakeAwakeActorWithin5Feet" &&
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Release Grapple does not use fills.",
    );
  }
  /* v8 ignore stop */
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
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (check !== undefined) {
        /* v8 ignore next -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
        return { tag: "invalid", message: `${label} check was filled twice.` };
      }
      /* v8 ignore stop */
      check = {
        ...fill,
        value: effectiveD20TestNaturalOneRerollAbilityCheckValue(
          fill.value,
          context,
        ),
      };
      continue;
    }
    /* v8 ignore next -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the ${label} replay holes.`,
    };
  }
  return { tag: "ok", value: check };
}

function validateShovePushDisposition(
  disposition: BattleShovePushOutcome["disposition"],
): string | null {
  if (Number(disposition.distanceFeet) !== 5) {
    return "Shove push disposition must use the action's 5-foot distance.";
  }
  if (disposition.provokesOpportunityAttacks !== false) {
    return "Shove push disposition must not provoke Opportunity Attacks.";
  }
  return null;
}

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
      if (target === undefined) {
        return { state: input.state, shovePushes: [] };
      }
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
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.relationshipFacts !== undefined) {
        /* v8 ignore next -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
        return {
          tag: "invalid",
          message:
            "Grapple target relationship facts do not match a requested target decision.",
        };
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (targetId !== undefined) {
        /* v8 ignore next -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
        return { tag: "invalid", message: "Grapple target was filled twice." };
      }
      /* v8 ignore stop */
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      continue;
    }
    if (fill.kind === "grappleOutcome") {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (outcome !== undefined) {
        /* v8 ignore next -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
        return {
          tag: "invalid",
          message: "Grapple outcome was filled twice.",
        };
      }
      /* v8 ignore stop */
      outcome = fill;
      continue;
    }
    /* v8 ignore next -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Grapple replay holes.`,
    };
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
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.relationshipFacts !== undefined) {
        /* v8 ignore next -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
        return {
          tag: "invalid",
          message:
            "Shove target relationship facts do not match a requested target decision.",
        };
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (targetId !== undefined) {
        /* v8 ignore next -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
        return { tag: "invalid", message: "Shove target was filled twice." };
      }
      /* v8 ignore stop */
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      continue;
    }
    if (fill.kind === "shoveOutcome") {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (outcome !== undefined) {
        /* v8 ignore next -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
        return {
          tag: "invalid",
          message: "Shove outcome was filled twice.",
        };
      }
      /* v8 ignore stop */
      outcome = fill;
      continue;
    }
    /* v8 ignore next -- Malformed attack replay fill set: this parser rejects duplicate fills or fills that do not match the admitted replay holes. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Shove replay holes.`,
    };
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
  if (groups.length !== components.length) {
    return "filled damage groups do not match current attack damage";
  }

  for (const [index, component] of components.entries()) {
    const group = groups[index];
    if (group === undefined) {
      return "filled damage groups do not match current attack damage";
    }
    const validation = validateRolledDiceForDiceExpr([group], component.expr);
    if (validation !== null) {
      return validation.reason;
    }
  }

  if (weaponDamageDiceRollChoice !== undefined) {
    const weaponDamage = weaponDamageComponent(attack, critical);
    if (weaponDamage === null) {
      return "Weapon damage dice roll choice requires weapon damage dice.";
    }
    const candidateValidation = validateRolledDiceForDiceExpr(
      weaponDamageDiceRollChoice.candidates,
      {
        dice: weaponDamage.expr.dice * 2,
        dieSize: weaponDamage.expr.dieSize,
      },
    );
    if (candidateValidation !== null) {
      return candidateValidation.reason;
    }
    const selectedCandidate =
      weaponDamageDiceRollChoice.selection === "first"
        ? weaponDamageDiceRollChoice.candidates[0]
        : weaponDamageDiceRollChoice.candidates[1];
    if (
      JSON.stringify(groups[0]?.results) !==
      JSON.stringify(selectedCandidate.results)
    ) {
      return "Selected weapon damage dice roll choice must match the base weapon damage group.";
    }
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
): Either.Either<
  { readonly state: T; readonly spentResource: RuntimeActionResource },
  "no action resource available"
> {
  if (!canSpendAction(state, "attack")) {
    return Either.left("no action resource available");
  }
  const actionResource = compatibleAttackActionResource(state.actionResources);
  if (actionResource === null) {
    return Either.left("no action resource available");
  }
  return Either.right({
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
    combatantHasSlowActivePenalties(input.state.combatants.get(input.actorId))
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
  attack: SupportedAttackActionOption,
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
    const nextState = spendStatBlockAttackResources({
      state,
      actorId,
      attack,
    });
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }

  const multiattackResources =
    attack.kind === "statBlockAttack" && statBlockAttackSection === "actions"
      ? state.currentTurnResources.actionResources.filter(
          (resource): resource is StatBlockMultiattackActionResource =>
            isStatBlockMultiattackActionResource(resource, actorId),
        )
      : [];
  let spentTurnResources: BattleTurnResources;
  let spentResource: RuntimeActionResource | null;
  if (
    multiattackResources.length > 0 &&
    attack.kind === "statBlockAttack" &&
    statBlockAttackSection === "actions"
  ) {
    const spent = spendMatchingActionResource(
      state.currentTurnResources,
      "attack",
      (resource) =>
        isStatBlockMultiattackActionResource(resource, actorId) &&
        attack.procedureRef !== undefined &&
        resource.attackProcedureRef === attack.procedureRef,
    );
    if (Either.isLeft(spent)) {
      return invalidResult(
        state,
        "staleSubject",
        "Attack is no longer available for the current actor.",
      );
    }
    spentTurnResources = spent.right;
    spentResource = null;
  } else {
    const spent = spendAttackActionResource(state.currentTurnResources);
    if (Either.isLeft(spent)) {
      return invalidResult(
        state,
        "staleSubject",
        "Attack is no longer available for the current actor.",
      );
    }
    spentTurnResources = spent.right.state;
    spentResource = spent.right.spentResource;
  }
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

  const nextState = spendStatBlockAttackResources({
    state: {
      ...state,
      currentTurnResources: nextTurnResourcesWithoutPendingReplacement,
    },
    actorId,
    attack,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}
