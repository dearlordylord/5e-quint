// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-transformation-mode spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard spell.invocation-sleet-storm-area-hazard spell.invocation-spike-growth-movement-hazard spell.invocation-cloudkill-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dragons-breath-granted-action
// Owns top-level act discovery and subject/action-resource discovery helpers.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GLYPH_STORED_CONCENTRATION_FULL_DURATION

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.martial-arts-attack-projection unit-feature.monk-focus-battle-options unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.invocation-flaming-sphere-hazard-ram spell.invocation-fog-cloud-obscurement spell.invocation-grease-ground-hazard spell.invocation-gust-of-wind-line spell.invocation-jump-movement-replacement spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING CHARACTER.LIFECYCLE.LAYER_PROJECTION BATTLE.COMPOSITION.REDUCER_SPINE_CONTRACT BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.OBJECT_DAMAGE_TRANSITION
import { optionalProperty } from "../optional-property.ts";
import type { ActionEconomyState } from "@dnd/shared-algebras/action-economy-algebra";
import {
  canSpendAction,
  canSpendBonusAction,
  canSpendMovement,
  canSpendUnarmedStrikeActionResource,
  spendActionResourceAtIndex,
} from "@dnd/shared-algebras/action-economy-algebra";
import { spellActiveEffectExecutionRef } from "../effect-execution-ref.ts";
import { Result } from "effect";
import type {
  BattleMovementSpeedKind,
  BattleSubject,
  CharacterProcedureBattleSubject,
} from "../battle-subjects.ts";
import { CombatantId } from "../identity.ts";
import {
  findFamiliarCompanionEntryForOwner,
  isPresentFindFamiliarCombatant,
} from "../spawned-companion-state.ts";
import { combatantHasPactOfTheChainFindFamiliar } from "../companion-reaction-feature-facts.ts";
import { ammunitionForAttackIsAvailable } from "../battle-ammunition.ts";
import {
  companionHeldObjectFactsHole,
  companionReappearanceInitiativeHole,
  companionReappearancePlacementHole,
  spawnedCompanionConnectionHole,
  spawnedCompanionTouchDeliveryTargetHoles,
} from "../companion-subjects.ts";
import {
  attackActionOptionsForActor,
  martialArtsBonusUnarmedStrikeActionOptionForActor,
  offHandAttackActionOptionsForActor,
  offHandAttackPrerequisiteMet,
} from "./attack-damage-apply.ts";
import { readyDeclarationHole, readyResponseChoices } from "./ready.ts";
import { attackExecutionSelectionForOption } from "../battle-action-options.ts";
import { helpAttackAllyChoices, helpAttackAllyHole } from "./help-attack.ts";
import { currentActorId, grappledBy } from "./creature-state-leaves.ts";
import {
  activeControlledVerticalSuspensionTargetsControlledBy,
  controlledVerticalSuspensionAltitudeChangeHole,
} from "./controlled-vertical-suspension.ts";
import { grantedAreaSaveDamageActionActs } from "./granted-area-save-damage-discovery.ts";
import {
  combatantCanTakeActions,
  combatantCanTakeReactions,
} from "./creature-state-execution.ts";
import {
  attackTargetChoices,
  attackTargetHole,
  ordinaryAttackTargetHole,
  ordinaryObjectAttackOptionIsSupported,
  bonusActionStandardActionActs,
  canHideInCurrentCircumstances,
  escapeGrappleOutcomeHole,
  escapeSpellRestraintAbilityCheckHole,
  grappleTargetChoices,
  grappleTargetHole,
  hiddenSearchTargetChoices,
  hideAbilityCheckHole,
  saveGatedAreaControlShakeAwakeTargetHole,
  searchTargetHole,
  shoveTargetChoices,
  shoveTargetHole,
  hitPointBudgetConditionShakeAwakeTargetHole,
} from "./hole-helpers.ts";
import {
  combatantCanMoveInState,
  movementHoleHasRemainingBudget,
  representedMovementSpeedKinds,
} from "./movement-speed.ts";
import {
  saveGatedAreaControlShakeAwakeTargetChoices,
  protectionRelevantEffectSavingThrowOutcomeHole,
  protectionRelevantEffectsForTarget,
  hitPointBudgetConditionShakeAwakeTargetChoices,
  spellRestraintEffectEntries,
} from "./spell-condition-effects-helpers.ts";
import { discoverSupportedSpellInvocations } from "./spells-discovery.ts";
import type { SpellProcedureExecutionRegistry } from "./spell-procedure-profiles/execution-registry.ts";
import { spellInvocationIsSpellcasting } from "./spell-turn-resources.ts";
import { supportedSpellActs } from "./supported-spell-acts.ts";
import { combatantInsideActiveAntimagicFieldAura } from "./magic-suppression-action-interdiction.ts";
import {
  statBlockBonusActionOptionBindings,
  statBlockMultiattackBindings,
  statBlockProcedureResourcesAvailable,
  statBlockAttackActionOptions,
} from "../stat-block-execution-state.ts";
import {
  persistentAreaSaveConditionSavingThrowOutcomeHole,
  persistentAreaSaveConditionEscapeSavingThrowOutcomeHole,
  directionalPersistentAreaDirectionChoiceHole,
  directionalPersistentAreaSavingThrowOutcomeHole,
  ramMovablePersistentAreaRamMovementHole,
  ramMovablePersistentAreaRepositionMovementHole,
  ramMovablePersistentAreaSavingThrowOutcomeHole,
  movablePersistentAreaSavingThrowOutcomeHole,
  movablePersistentAreaRepositionMovementHole,
  type PersistentAreaSaveConditionEffect,
  type PersistentAreaSaveConditionEscapeEffect,
  type DirectionalPersistentAreaEffect,
  type RamMovablePersistentAreaEffect,
  type MovablePersistentAreaEffect,
} from "./persistent-spatial-spell-discovery.ts";
import { boundPersistentAreaSaveDamageEffect } from "./persistent-area-save-damage-binding.ts";
import { spellProcedureBoundToActiveEffect } from "./spell-active-effect-binding.ts";
import {
  boundDirectionalPersistentAreaEffect,
  boundPersistentAreaSaveConditionEffect,
  boundPersistentAreaSaveConditionEscapeEffect,
} from "./persistent-spell-area-binding.ts";
import { boundFixedCostMovementReplacementEffect } from "./spell-modifier-binding.ts";
import {
  canonicalHeldObjectIdsForActor,
  executeCompelledDropHeldObjectFactsHole,
  compelledNextTurnBehaviorEffectsForActor,
  type CompelledNextTurnBehaviorEffect,
} from "./compelled-behavior-discovery.ts";
import { standFromProneCostFeet } from "./stand-from-prone-policy.ts";
import { movementHole } from "./movement-holes.ts";
import { readiedSpellInitialHoles } from "./readied-initial-holes.ts";
import { characterSpellProcedure } from "../character-execution-queries.ts";
import {
  canSpendEscapeGrappleActionResource,
  isClassFeatureExtraAttackActionResource,
  isStatBlockMultiattackActionResource,
} from "./action-resource-kinds.ts";
import { supportedUnitFeatureActs } from "./unit-feature-discovery.ts";
import { monkFocusActs } from "./monk-focus-discovery.ts";
import {
  isLinkedDefenseResistanceDamageShareEffect,
  linkedDefenseResistanceDamageShareSeparationFactsHole,
} from "./linked-defense-damage-share.ts";
import { SELF_TRANSFORMATION_MODE_KINDS } from "./domain-constants.ts";
import { areaWindStrengthHole } from "./area-wind-strength.ts";
import { discoverLegendaryActionActs } from "./unit-feature-discovery.ts";
import {
  activeSelfTransformationModeEffect,
  spellCreatedHeldObjectEffectsForActor,
} from "./spells-active-effects.ts";
import {
  attackActionOptionIsOrdinaryAttackAction,
  attackSubjectPart,
  statBlockAttackProcedureSection,
} from "./statblock.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleActiveEffect,
  BattleCreatureState,
  BattleExecutableSpellInvocation,
  BattleState,
  StatBlockBattleCreatureState,
} from "../battle-state-execution.ts";
import type { SelfTransformationModeKind } from "./domain-constants.ts";

type EnvironmentEndedPersistentAreaTraitEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "persistentAreaTrait" }
>;
type EnvironmentEndedPersistentAreaSaveDamageEffect = Extract<
  BattleActiveEffect,
  {
    readonly kind: "persistentAreaSaveDamage";
    readonly lifecycle: { readonly kind: "sourceTurnTranslation" };
  }
>;
export function discoverBattleActCandidatesWithExecutionRegistry(
  state: BattleState,
  executionRegistry: SpellProcedureExecutionRegistry,
): readonly BattleActDiscoveryCandidate[] {
  return discoverBattleActCandidatesInternal(state, executionRegistry, true);
}

export function discoverBattleActCandidatesWithoutSpellProcedures(
  state: BattleState,
): readonly BattleActDiscoveryCandidate[] {
  return discoverBattleActCandidatesInternal(state, null, true);
}

export function discoverBattleActCandidatesWithoutReady(
  state: BattleState,
): readonly BattleActDiscoveryCandidate[] {
  return discoverBattleActCandidatesInternal(state, null, false);
}

function discoverBattleActCandidatesInternal(
  state: BattleState,
  executionRegistry: SpellProcedureExecutionRegistry | null,
  includeReady: boolean,
): readonly BattleActDiscoveryCandidate[] {
  return discoverBattleActsWithoutRouteEvents(
    state,
    executionRegistry,
    includeReady,
  );
}

function compelledBehaviorPendingActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly tableEventActs: readonly BattleActDiscoveryCandidate[];
  readonly startTurnAreaControlActs: readonly BattleActDiscoveryCandidate[];
}): readonly BattleActDiscoveryCandidate[] | null {
  const pendingEffects = compelledNextTurnBehaviorEffectsForActor(
    input.state,
    input.actorId,
  );
  const compelledBehaviorEffects = (
    option: Extract<
      (typeof pendingEffects)[number]["option"],
      "grovel" | "drop" | "approach" | "flee"
    >,
  ) => pendingEffects.filter((effect) => effect.option === option);
  const grovelEffects = compelledBehaviorEffects("grovel");
  if (grovelEffects.length > 0) {
    return [
      ...input.tableEventActs,
      ...input.startTurnAreaControlActs,
      ...grovelEffects.map((effect) => ({
        subject: {
          tag: "runtimeCommand" as const,
          actorId: input.actorId,
          command: "executeCompelledGrovel" as const,
          effectRef: spellActiveEffectExecutionRef(effect),
        },
        initialHoles: [],
      })),
    ];
  }
  const dropEffects = compelledBehaviorEffects("drop");
  if (dropEffects.length > 0) {
    return [
      ...input.tableEventActs,
      ...input.startTurnAreaControlActs,
      ...dropEffects.map((effect) => {
        const subject = {
          tag: "runtimeCommand" as const,
          actorId: input.actorId,
          command: "executeCompelledDrop" as const,
          effectRef: spellActiveEffectExecutionRef(effect),
        };
        const canonicalObjectIds = canonicalHeldObjectIdsForActor(
          input.state,
          input.actorId,
        );
        return {
          subject,
          initialHoles:
            canonicalObjectIds === null
              ? [executeCompelledDropHeldObjectFactsHole(subject)]
              : [],
        };
      }),
    ];
  }
  const approachEffects = compelledBehaviorEffects("approach");
  if (approachEffects.length > 0) {
    return compelledMovementActs(input, approachEffects, "approach");
  }
  const fleeEffects = compelledBehaviorEffects("flee");
  return fleeEffects.length > 0
    ? compelledMovementActs(input, fleeEffects, "flee")
    : null;
}

function compelledMovementActs(
  input: {
    readonly state: BattleState;
    readonly actorId: CombatantId;
    readonly tableEventActs: readonly BattleActDiscoveryCandidate[];
    readonly startTurnAreaControlActs: readonly BattleActDiscoveryCandidate[];
  },
  effects: readonly CompelledNextTurnBehaviorEffect[],
  option: "approach" | "flee",
): readonly BattleActDiscoveryCandidate[] {
  return [
    ...input.tableEventActs,
    ...input.startTurnAreaControlActs,
    ...effects.map((effect) => ({
      subject: {
        tag: "runtimeCommand" as const,
        actorId: input.actorId,
        command:
          option === "approach"
            ? ("executeCompelledApproach" as const)
            : ("executeCompelledFlee" as const),
        effectRef: spellActiveEffectExecutionRef(effect),
      },
      initialHoles: combatantCanMoveInState(input.state, input.actorId)
        ? [movementHole(input.state, input.actorId)]
        : [],
    })),
  ];
}

function compelledHaltActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly acts: BattleActDiscoveryCandidate[];
  readonly startTurnAreaControlActs: readonly BattleActDiscoveryCandidate[];
}): readonly BattleActDiscoveryCandidate[] | null {
  if (input.state.currentTurnResources.compelledHalt === null) return null;
  input.acts.push(...input.startTurnAreaControlActs);
  input.acts.push(
    ...persistentAreaSaveConditionEndTurnActs(input.state, input.actorId),
  );
  input.acts.push(
    ...directionalPersistentAreaEndTurnSaveActs(input.state, input.actorId),
  );
  input.acts.push(
    ...ramMovablePersistentAreaEndTurnSaveActs(input.state, input.actorId),
  );
  input.acts.push(
    ...movablePersistentAreaEndTurnSaveActs(input.state, input.actorId),
  );
  input.acts.push(
    ...environmentEndedPersistentAreaTraitActs(input.state, input.actorId),
  );
  input.acts.push(
    ...environmentEndedPersistentAreaSaveDamageActs(input.state, input.actorId),
  );
  input.acts.push(
    ...persistentAreaSaveConditionEscapeAreaRemovalActs(
      input.state,
      input.actorId,
    ),
  );
  input.acts.push(
    ...linkedDefenseResistanceDamageShareSeparationActs(
      input.state,
      input.actorId,
    ),
  );
  input.acts.push(endTurnAct(input.actorId));
  input.acts.push(...readiedSpellReleaseActs(input.state, input.actorId));
  input.acts.push(...discoverLegendaryActionActs(input.state));
  return input.acts;
}

function appendOrdinaryAttackActs(
  state: BattleState,
  actorId: CombatantId,
  acts: BattleActDiscoveryCandidate[],
): void {
  const attackActionOptions = attackActionOptionsForActor(
    state,
    actorId,
  ).filter((attack) =>
    attackActionOptionIsOrdinaryAttackAction(state, actorId, attack),
  );
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "attack") &&
    attackActionOptions.some(
      (attack) =>
        attackTargetChoices(state, actorId, attack).length > 0 ||
        ordinaryObjectAttackOptionIsSupported(state, actorId, attack),
    )
  ) {
    acts.push(
      ...attackActionOptions.flatMap((attack) => {
        const targetHole = ordinaryAttackTargetHole(state, actorId, attack);
        return targetHole.choices.length === 0 &&
          targetHole.attack?.acceptsObjectTarget !== true
          ? []
          : [
              {
                subject: {
                  tag: "action" as const,
                  actorId,
                  action: "attack" as const,
                  ...attackSubjectPart(attack),
                },
                initialHoles: [targetHole],
              },
            ];
      }),
    );
  }
}

function discoverBattleActsWithoutRouteEvents(
  state: BattleState,
  executionRegistry: SpellProcedureExecutionRegistry | null,
  includeReady: boolean,
): readonly BattleActDiscoveryCandidate[] {
  const actorId = currentActorId(state);
  const hasOpenStatBlockMultiattackDispatch =
    currentActorHasOpenStatBlockMultiattackDispatch(state);
  const tableEventActs = reportReadyTriggerActs(state, actorId);
  if (state.interruptStack.length > 0) return tableEventActs;
  if (state.subjectResolutionPhase.kind === "subjectContinuation") {
    return tableEventActs;
  }
  const acts: BattleActDiscoveryCandidate[] =
    hasOpenStatBlockMultiattackDispatch
      ? [...tableEventActs]
      : [...releaseGrappleActs(state), ...tableEventActs];
  if (!state.combatants.has(actorId)) {
    return acts;
  }
  const startTurnAreaControlActs =
    persistentAreaSaveConditionEscapeStartTurnSaveActs(state, actorId);
  const compelledActs = compelledBehaviorPendingActs({
    state,
    actorId,
    tableEventActs,
    startTurnAreaControlActs,
  });
  if (compelledActs !== null) return compelledActs;
  const haltedActs = compelledHaltActs({
    state,
    actorId,
    acts,
    startTurnAreaControlActs,
  });
  if (haltedActs !== null) return haltedActs;
  acts.push(...startTurnAreaControlActs);
  acts.push(...selfTransformationModeReplacementActs(state, actorId));
  acts.push(...controlledVerticalSuspensionAltitudeControlActs(state, actorId));
  if (!combatantInsideActiveAntimagicFieldAura(state, actorId)) {
    acts.push(...grantedAreaSaveDamageActionActs(state, actorId));
  }
  appendOrdinaryAttackActs(state, actorId, acts);
  acts.push(...companionAttackActs(state, actorId));
  if (hasOpenStatBlockMultiattackDispatch) {
    acts.push(...movementActs(state, actorId));
    acts.push(...persistentAreaSaveConditionEndTurnActs(state, actorId));
    acts.push(...directionalPersistentAreaEndTurnSaveActs(state, actorId));
    acts.push(...ramMovablePersistentAreaEndTurnSaveActs(state, actorId));
    acts.push(...movablePersistentAreaEndTurnSaveActs(state, actorId));
    acts.push({
      subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
      initialHoles: [],
    });
    return acts;
  }
  acts.push(...statBlockMultiattackActs(state, actorId));
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "dash")
  ) {
    acts.push(...dashActsForActor(state, actorId));
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "disengage")
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "disengage" },
      initialHoles: [],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "dodge")
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "dodge" },
      initialHoles: [],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "help") &&
    helpAttackAllyChoices(state, actorId).length > 0
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "helpAttack" },
      initialHoles: [helpAttackAllyHole(state, actorId)],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    hasTurnActionResource(state.currentTurnResources) &&
    hitPointBudgetConditionShakeAwakeTargetChoices(state, actorId).length > 0
  ) {
    acts.push({
      subject: {
        tag: "action",
        actorId,
        action: "shakeAwakeFromStagedCondition",
      },
      initialHoles: [
        hitPointBudgetConditionShakeAwakeTargetHole(state, actorId),
      ],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    hasTurnActionResource(state.currentTurnResources) &&
    saveGatedAreaControlShakeAwakeTargetChoices(state, actorId).length > 0
  ) {
    acts.push({
      subject: {
        tag: "action",
        actorId,
        action: "shakeAwakeFromAreaControl",
      },
      initialHoles: [saveGatedAreaControlShakeAwakeTargetHole(state, actorId)],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "hide") &&
    canHideInCurrentCircumstances(state, actorId)
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "hide" },
      initialHoles: [hideAbilityCheckHole(state, actorId)],
    });
  }
  const hiddenTargets = hiddenSearchTargetChoices(state, actorId);
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "search") &&
    hiddenTargets.length > 0
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "search" },
      initialHoles: [searchTargetHole(state, actorId)],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    !isPresentFindFamiliarCombatant(state, actorId) &&
    !actorHasStatBlockMultiattackActionResource(state, actorId) &&
    canSpendUnarmedStrikeActionResource(state.currentTurnResources) &&
    grappleTargetChoices(state, actorId).length > 0
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "grapple" },
      initialHoles: [grappleTargetHole(state, actorId)],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    !isPresentFindFamiliarCombatant(state, actorId) &&
    !actorHasStatBlockMultiattackActionResource(state, actorId) &&
    canSpendUnarmedStrikeActionResource(state.currentTurnResources) &&
    shoveTargetChoices(state, actorId).length > 0
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "shove" },
      initialHoles: [shoveTargetHole(state, actorId)],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    !actorHasStatBlockMultiattackActionResource(state, actorId) &&
    canSpendEscapeGrappleActionResource(state.currentTurnResources, actorId) &&
    grappledBy(state, actorId) !== undefined
  ) {
    const grapple = grappledBy(state, actorId);
    if (grapple !== undefined) {
      acts.push({
        subject: { tag: "action", actorId, action: "escapeGrapple" },
        initialHoles: [escapeGrappleOutcomeHole(state, grapple, actorId)],
      });
    }
  }
  for (const { targetId, effect } of spellRestraintEffectEntries(state)) {
    if (
      effect.escape?.kind === "abilityCheck" &&
      effect.escape.allowedActor === "target" &&
      actorId !== targetId
    ) {
      continue;
    }
    if (
      combatantCanTakeActions(state.combatants.get(actorId)) &&
      !actorHasStatBlockMultiattackActionResource(state, actorId) &&
      canSpendAction(state.currentTurnResources, "utilize")
    ) {
      acts.push({
        subject: {
          tag: "action",
          actorId,
          action: "escapeSpellRestraint",
          targetId,
          effectRef: spellActiveEffectExecutionRef(effect),
        },
        initialHoles: [
          escapeSpellRestraintAbilityCheckHole(state, effect, {
            actorId,
            targetId,
          }),
        ],
      });
    }
  }
  for (const offHand of offHandAttackActionOptionsForActor(state, actorId)) {
    if (
      combatantCanTakeActions(state.combatants.get(actorId)) &&
      canSpendBonusAction(state.currentTurnResources) &&
      offHandAttackPrerequisiteMet(state, actorId, offHand) &&
      attackTargetChoices(state, actorId, offHand).length > 0
    ) {
      acts.push({
        subject: {
          tag: "bonusAction",
          actorId,
          action: "offHandAttack",
          ...attackExecutionSelectionForOption(offHand),
        },
        initialHoles: [attackTargetHole(state, actorId, offHand)],
      });
    }
  }
  const martialArtsUnarmedStrike =
    martialArtsBonusUnarmedStrikeActionOptionForActor(state, actorId);
  if (
    martialArtsUnarmedStrike !== undefined &&
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendBonusAction(state.currentTurnResources) &&
    attackTargetChoices(state, actorId, martialArtsUnarmedStrike).length > 0
  ) {
    acts.push({
      subject: {
        tag: "bonusAction",
        actorId,
        action: "martialArtsUnarmedStrike",
        ...attackExecutionSelectionForOption(martialArtsUnarmedStrike),
      },
      initialHoles: [
        attackTargetHole(state, actorId, martialArtsUnarmedStrike),
      ],
    });
  }
  acts.push(...bonusActionStandardActionActs(state, actorId));
  acts.push(...monkFocusActs(state, actorId));
  acts.push(...statBlockBonusActionOptionActs(state, actorId));
  acts.push(...supportedUnitFeatureActs(state, actorId));
  const spellActs =
    executionRegistry !== null &&
    combatantCanTakeActions(state.combatants.get(actorId))
      ? discoverSupportedSpellInvocations(state, actorId, executionRegistry)
      : [];
  acts.push(...companionProtocolActs(state, actorId, spellActs));
  acts.push(...spellActs);
  acts.push(...spellCreatedHeldObjectReleaseActs(state, actorId));
  acts.push(...ramMovablePersistentAreaRepositionActs(state, actorId));
  acts.push(...ramMovablePersistentAreaRamActs(state, actorId));
  acts.push(...movablePersistentAreaRepositionActs(state, actorId));
  acts.push(...directionalPersistentAreaDirectionChangeActs(state, actorId));
  acts.push(...movementActs(state, actorId));
  acts.push(...persistentAreaSaveConditionEntrySaveActs(state, actorId));
  acts.push(...persistentAreaSaveConditionEscapeEntrySaveActs(state, actorId));
  acts.push(...persistentAreaSaveConditionEscapeDepartureActs(state, actorId));
  acts.push(...movablePersistentAreaExitActs(state, actorId));
  acts.push(...protectionRelevantEffectSaveActs(state, actorId));
  if (standFromProneCostFeet(state, actorId) !== null) {
    acts.push({
      subject: { tag: "runtimeCommand", actorId, command: "standFromProne" },
      initialHoles: [],
    });
  }
  acts.push(...persistentAreaSaveConditionEndTurnActs(state, actorId));
  acts.push(...directionalPersistentAreaEndTurnSaveActs(state, actorId));
  acts.push(...ramMovablePersistentAreaEndTurnSaveActs(state, actorId));
  acts.push(...movablePersistentAreaEndTurnSaveActs(state, actorId));
  acts.push(...environmentEndedPersistentAreaTraitActs(state, actorId));
  acts.push(...environmentEndedPersistentAreaSaveDamageActs(state, actorId));
  acts.push(
    ...persistentAreaSaveConditionEscapeAreaRemovalActs(state, actorId),
  );
  acts.push(
    ...linkedDefenseResistanceDamageShareSeparationActs(state, actorId),
  );
  acts.push(...endConcentrationActs(state, actorId));
  const readyResponses = readyResponseChoices(state, actorId, acts);
  if (
    includeReady &&
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "ready") &&
    readyResponses.length > 0
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "ready" },
      initialHoles: [readyDeclarationHole(actorId, readyResponses)],
    });
  }
  acts.push(endTurnAct(actorId));
  acts.push(...readiedSpellReleaseActs(state, actorId));
  acts.push(...discoverLegendaryActionActs(state));

  return acts;
}

function companionProtocolActs(
  state: BattleState,
  actorId: CombatantId,
  spellActs: readonly BattleActDiscoveryCandidate[],
): readonly BattleActDiscoveryCandidate[] {
  const familiarEntry = findFamiliarCompanionEntryForOwner(state, actorId);
  if (familiarEntry === null) {
    return [];
  }
  const familiar = familiarEntry.companion;
  if (familiar.status === "dismissedForever") {
    // A permanently dismissed familiar is a settlement tombstone, not a live
    // companion: it offers no lifecycle acts.
    return [];
  }
  const actor = state.combatants.get(actorId);
  const actorCanAct = combatantCanTakeActions(actor);
  if (familiar.status !== "present") {
    if (!actorCanAct || !canSpendAction(state.currentTurnResources, "magic")) {
      return [];
    }
    const permanentlyDismiss: BattleActDiscoveryCandidate = {
      subject: {
        tag: "companionLifecycle",
        actorId,
        action: "permanentlyDismiss",
      },
      initialHoles: [],
    };
    if (familiar.status === "temporarilyDismissed") {
      return [
        {
          subject: {
            tag: "companionLifecycle",
            actorId,
            action: "reappear",
          },
          initialHoles: [
            companionReappearancePlacementHole({ ownerId: actorId }),
            companionReappearanceInitiativeHole({ ownerId: actorId }),
          ],
        },
        permanentlyDismiss,
      ];
    }
    return [permanentlyDismiss];
  }
  const familiarId = familiar.combatantId;
  const familiarCombatant = state.combatants.get(familiarId);
  if (familiarCombatant === undefined) {
    return [];
  }
  const acts: BattleActDiscoveryCandidate[] = [];
  if (actorCanAct && canSpendAction(state.currentTurnResources, "magic")) {
    acts.push(
      {
        subject: {
          tag: "companionLifecycle",
          actorId,
          action: "temporarilyDismiss",
        },
        initialHoles: [
          companionHeldObjectFactsHole({ companionId: familiarId }),
        ],
      },
      {
        subject: {
          tag: "companionLifecycle",
          actorId,
          action: "permanentlyDismiss",
        },
        initialHoles: [],
      },
    );
  }
  if (actorCanAct && canSpendBonusAction(state.currentTurnResources)) {
    acts.push({
      subject: {
        tag: "spawnedCompanionSharedSenses",
        actorId,
        familiarId,
      },
      initialHoles: [
        spawnedCompanionConnectionHole({
          ownerId: actorId,
          companionId: familiarId,
        }),
      ],
    });
  }
  if (combatantCanTakeReactions(familiarCombatant)) {
    acts.push(
      ...spawnedCompanionTouchSpellProxyActs({
        state,
        actorId,
        companionId: familiarId,
        spellActs,
      }),
    );
  }
  return acts;
}

function spawnedCompanionTouchSpellProxyActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly companionId: CombatantId;
  readonly spellActs: readonly BattleActDiscoveryCandidate[];
}): readonly BattleActDiscoveryCandidate[] {
  const actor = input.state.combatants.get(input.actorId);
  if (actor?.origin.kind !== "character") {
    return [];
  }
  const invocations = supportedSpellActs(input.state, actor);
  return input.spellActs.flatMap(
    (act): readonly BattleActDiscoveryCandidate[] => {
      const subject = act.subject;
      if (
        (subject.tag !== "actionSpell" && subject.tag !== "bonusActionSpell") ||
        subject.mode.tag !== "cast" ||
        subject.procedureRef === undefined
      ) {
        return [];
      }
      const invocation = touchSpellDeliveryInvocation(invocations, subject);
      if (invocation === null) {
        return [];
      }
      const targetChoiceHoles = act.initialHoles.filter(
        (hole) => hole.kind === "targetChoice",
      );
      if (targetChoiceHoles.length !== 1) {
        return [];
      }
      return [
        {
          subject: {
            tag: "spawnedCompanionTouchSpellProxy",
            actorId: input.actorId,
            procedureRef: subject.procedureRef,
            companionId: input.companionId,
            spellAction:
              subject.tag === "actionSpell" ? "action" : "bonusAction",
            mode: subject.mode,
            ...optionalProperty("metamagic", subject.metamagic),
          },
          initialHoles: [
            spawnedCompanionConnectionHole({
              ownerId: input.actorId,
              companionId: input.companionId,
            }),
            ...spawnedCompanionTouchDeliveryTargetHoles(act.initialHoles),
          ],
        },
      ];
    },
  );
}

function touchSpellDeliveryInvocation(
  invocations: readonly BattleExecutableSpellInvocation[],
  subject: Extract<
    CharacterProcedureBattleSubject,
    { readonly tag: "actionSpell" | "bonusActionSpell" }
  >,
): BattleExecutableSpellInvocation | null {
  const invocation = invocations.find(
    (candidate) => candidate.sourceProcedureRef === subject.procedureRef,
  );
  return invocation !== undefined &&
    spellInvocationIsSpellcasting(invocation) &&
    invocation.spellRuleFacts.range.kind === "touch"
    ? invocation
    : null;
}

function controlledVerticalSuspensionAltitudeControlActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (
    !combatantCanTakeActions(actor) ||
    !canSpendAction(state.currentTurnResources, "magic") ||
    combatantInsideActiveAntimagicFieldAura(state, actorId)
  ) {
    return [];
  }
  return activeControlledVerticalSuspensionTargetsControlledBy(
    state,
    actorId,
  ).flatMap(({ targetId, effect }) => {
    const sourceProcedure = spellProcedureBoundToActiveEffect(state, effect);
    return sourceProcedure?.procedure === "controlledVerticalSuspension"
      ? [
          {
            subject: {
              tag: "runtimeCommand" as const,
              actorId,
              command: "controlledVerticalSuspensionAltitudeControl" as const,
              effectRef: spellActiveEffectExecutionRef(effect),
              targetId,
            },
            initialHoles: [
              controlledVerticalSuspensionAltitudeChangeHole({
                actorId,
                targetId,
                effectRef: effect.effectRef,
                maxDistanceFeet: sourceProcedure.maxAltitudeChangeFeet,
              }),
            ],
          },
        ]
      : [];
  });
}

function spellCreatedHeldObjectReleaseActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  return spellCreatedHeldObjectEffectsForActor(actor)
    .filter((effect) => effect.objectState.kind === "held")
    .map((effect) => ({
      subject: {
        tag: "runtimeCommand" as const,
        actorId,
        command: "releaseSpellCreatedHeldObject" as const,
        effectRef: spellActiveEffectExecutionRef(effect),
      },
      initialHoles: [],
    }));
}

function selfTransformationModeReplacementActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  const activeEffect = activeSelfTransformationModeEffect(actor);
  if (
    activeEffect === undefined ||
    activeEffect.sourceCombatantId !== actorId ||
    !combatantCanTakeActions(actor) ||
    !canSpendAction(state.currentTurnResources, "magic") ||
    combatantInsideActiveAntimagicFieldAura(state, actorId)
  ) {
    return [];
  }
  return SELF_TRANSFORMATION_MODE_KINDS.filter(
    (mode): mode is SelfTransformationModeKind => mode !== activeEffect.mode,
  ).flatMap((mode): readonly BattleActDiscoveryCandidate[] => {
    const baseAct = {
      initialHoles: [],
    };
    return mode === "naturalWeapons"
      ? activeEffect.naturalWeaponFacts.damage.damageTypeChoices.map(
          (naturalWeaponDamageType) => ({
            ...baseAct,
            subject: {
              tag: "runtimeCommand" as const,
              actorId,
              command: "replaceSelfTransformationMode" as const,
              effectRef: spellActiveEffectExecutionRef(activeEffect),
              mode,
              naturalWeaponDamageType,
            },
          }),
        )
      : [
          {
            ...baseAct,
            subject: {
              tag: "runtimeCommand" as const,
              actorId,
              command: "replaceSelfTransformationMode" as const,
              effectRef: spellActiveEffectExecutionRef(activeEffect),
              mode,
            },
          },
        ];
  });
}

function companionAttackActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  if (
    !combatantCanTakeActions(state.combatants.get(actorId)) ||
    !canSpendAction(state.currentTurnResources, "attack") ||
    !combatantHasPactOfTheChainFindFamiliar(state, actorId)
  ) {
    return [];
  }
  const familiarEntry = findFamiliarCompanionEntryForOwner(state, actorId);
  if (familiarEntry?.companion.status !== "present") {
    return [];
  }
  const familiarId = familiarEntry.companion.combatantId;
  const familiarCombatant = state.combatants.get(familiarId);
  if (
    familiarCombatant?.origin.kind !== "statBlock" ||
    !combatantCanTakeReactions(familiarCombatant)
  ) {
    return [];
  }
  return statBlockAttackActionOptions(
    familiarCombatant.origin.execution,
  ).flatMap((attack) => {
    if (
      !ammunitionForAttackIsAvailable(familiarCombatant, attack) ||
      statBlockAttackProcedureSection(
        state,
        familiarId,
        attack.procedureRef,
      ) !== "actions"
    ) {
      return [];
    }
    const targetHole = attackTargetHole(state, familiarId, attack);
    return targetHole.choices.length === 0
      ? []
      : [
          {
            subject: {
              tag: "companionAttack" as const,
              actorId,
              familiarId,
              procedureRef: attack.procedureRef,
              ...(attack.damageNotation === "static"
                ? { statBlockDamageNotation: "static" as const }
                : {}),
            },
            initialHoles: [targetHole],
          },
        ];
  });
}

function endTurnAct(actorId: CombatantId): BattleActDiscoveryCandidate {
  return {
    subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
    initialHoles: [],
  };
}

function reportReadyTriggerActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return [...state.readiedResponses.keys()].flatMap((readiedActorId) => {
    const readiedActor = state.combatants.get(readiedActorId);
    return readiedActor !== undefined && combatantCanTakeReactions(readiedActor)
      ? [
          {
            subject: {
              tag: "runtimeCommand" as const,
              actorId,
              command: "reportReadyTrigger" as const,
              readiedActorId,
            },
            initialHoles: [],
          },
        ]
      : [];
  });
}

function readiedSpellReleaseActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return [...state.readiedSpells].flatMap(([casterId, readiedSpell]) => {
    const caster = state.combatants.get(casterId);
    const invocation =
      caster?.origin.kind === "character"
        ? characterSpellProcedure(
            caster.origin.execution,
            readiedSpell.procedureRef,
            caster,
          )
        : undefined;
    return invocation === undefined
      ? []
      : [
          {
            subject: {
              tag: "runtimeCommand" as const,
              actorId,
              command: "releaseReadiedSpell" as const,
              readiedSpellCasterId: casterId,
              procedureRef: readiedSpell.procedureRef,
            },
            initialHoles: readiedSpellInitialHoles(
              state,
              casterId,
              readiedSpell,
            ),
          },
        ];
  });
}

function endConcentrationActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined || actor.concentration === null) {
    return [];
  }
  return [
    {
      subject: { tag: "runtimeCommand", actorId, command: "endConcentration" },
      initialHoles: [],
    },
  ];
}

export function releaseGrappleActs(
  state: BattleState,
): readonly BattleActDiscoveryCandidate[] {
  return state.grapples.map((grapple) => ({
    subject: {
      tag: "runtimeCommand" as const,
      actorId: grapple.grapplerId,
      command: "releaseGrapple" as const,
      targetId: grapple.targetId,
    },
    initialHoles: [],
  }));
}

function persistentAreaSaveConditionEntrySaveActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return [...state.combatants].flatMap(([, combatant]) =>
    combatant.activeEffects.flatMap(
      (effect): readonly BattleActDiscoveryCandidate[] => {
        if (effect.kind !== "persistentAreaSaveCondition") {
          return [];
        }
        const boundEffect = boundPersistentAreaSaveConditionEffect(
          state,
          effect,
        );
        if (boundEffect === undefined) {
          return [];
        }
        return [
          persistentAreaSaveConditionSaveAct(
            state,
            actorId,
            boundEffect,
            "entersArea",
          ),
        ];
      },
    ),
  );
}

function persistentAreaSaveConditionEndTurnActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return [...state.combatants].flatMap(([, combatant]) =>
    combatant.activeEffects.flatMap(
      (effect): readonly BattleActDiscoveryCandidate[] => {
        if (effect.kind !== "persistentAreaSaveCondition") {
          return [];
        }
        const boundEffect = boundPersistentAreaSaveConditionEffect(
          state,
          effect,
        );
        if (boundEffect === undefined) {
          return [];
        }
        return [
          persistentAreaSaveConditionSaveAct(
            state,
            actorId,
            boundEffect,
            "endsTurnInArea",
          ),
        ];
      },
    ),
  );
}

function persistentAreaSaveConditionSaveAct(
  state: BattleState,
  actorId: CombatantId,
  effect: PersistentAreaSaveConditionEffect,
  trigger: "entersArea" | "endsTurnInArea",
): BattleActDiscoveryCandidate {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "persistentAreaSaveConditionSave",
      areaId: effect.areaId,
      effectRef: effect.effectRef,
      trigger,
    },
    initialHoles: [
      persistentAreaSaveConditionSavingThrowOutcomeHole(
        state,
        actorId,
        effect,
        trigger,
      ),
    ],
  };
}

function activePersistentAreaSaveConditionEscapeEffects(
  state: BattleState,
): readonly PersistentAreaSaveConditionEscapeEffect[] {
  return [...state.combatants].flatMap(([, combatant]) =>
    combatant.activeEffects.flatMap((effect) => {
      if (effect.kind !== "persistentAreaSaveConditionEscape") {
        return [];
      }
      const boundEffect = boundPersistentAreaSaveConditionEscapeEffect(
        state,
        effect,
      );
      return boundEffect === undefined ? [] : [boundEffect];
    }),
  );
}

function persistentAreaSaveConditionEscapeEntrySaveActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return activePersistentAreaSaveConditionEscapeEffects(state).flatMap(
    (effect) =>
      effect.entrySavedThisTurn.includes(actorId)
        ? []
        : [
            persistentAreaSaveConditionEscapeSaveAct(
              state,
              actorId,
              effect,
              "entersArea",
            ),
          ],
  );
}

function persistentAreaSaveConditionEscapeStartTurnSaveActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return activePersistentAreaSaveConditionEscapeEffects(state).flatMap(
    (effect) =>
      effect.startTurnSavedThisTurn.includes(actorId)
        ? []
        : [
            persistentAreaSaveConditionEscapeSaveAct(
              state,
              actorId,
              effect,
              "startsTurnInArea",
            ),
          ],
  );
}

function persistentAreaSaveConditionEscapeSaveAct(
  state: BattleState,
  actorId: CombatantId,
  effect: PersistentAreaSaveConditionEscapeEffect,
  trigger: "entersArea" | "startsTurnInArea",
): BattleActDiscoveryCandidate {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "persistentAreaSaveConditionEscapeSave",
      areaId: effect.areaId,
      effectRef: effect.effectRef,
      trigger,
    },
    initialHoles: [
      persistentAreaSaveConditionEscapeSavingThrowOutcomeHole(
        state,
        actorId,
        effect,
        trigger,
      ),
    ],
  };
}

function persistentAreaSaveConditionEscapeDepartureActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }
  return actor.activeEffects.flatMap(
    (effect): readonly BattleActDiscoveryCandidate[] => {
      if (
        effect.kind !== "spellCondition" ||
        effect.condition !== "restrained" ||
        effect.escape?.kind !== "abilityCheck"
      ) {
        return [];
      }
      return activePersistentAreaSaveConditionEscapeEffects(state)
        .filter(
          (areaEffect) =>
            areaEffect.sourceCombatantId === effect.sourceCombatantId &&
            areaEffect.sourceProcedureRef === effect.sourceProcedureRef,
        )
        .map((areaEffect) => ({
          subject: {
            tag: "runtimeCommand" as const,
            actorId,
            command:
              "endPersistentAreaSaveConditionEscapeForDeparture" as const,
            areaId: areaEffect.areaId,
            effectRef: areaEffect.effectRef,
          },
          initialHoles: [],
        }));
    },
  );
}

function persistentAreaSaveConditionEscapeAreaRemovalActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return activePersistentAreaSaveConditionEscapeEffects(state).map(
    (effect) => ({
      subject: {
        tag: "runtimeCommand" as const,
        actorId,
        command: "endPersistentAreaSaveConditionEscapeForAreaRemoval" as const,
        areaId: effect.areaId,
        effectRef: effect.effectRef,
      },
      initialHoles: [],
    }),
  );
}

function activeDirectionalPersistentAreaEffects(
  state: BattleState,
): readonly DirectionalPersistentAreaEffect[] {
  return [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.flatMap((effect) => {
      if (effect.kind !== "directionalPersistentArea") {
        return [];
      }
      const boundEffect = boundDirectionalPersistentAreaEffect(state, effect);
      return boundEffect === undefined ? [] : [boundEffect];
    }),
  );
}

function directionalPersistentAreaEndTurnSaveActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return activeDirectionalPersistentAreaEffects(state).map((effect) => ({
    subject: {
      tag: "runtimeCommand" as const,
      actorId,
      command: "directionalPersistentAreaSave" as const,
      areaId: effect.areaId,
      effectRef: effect.effectRef,
      directionId: effect.directionId,
      trigger: "endsTurnInLine" as const,
    },
    initialHoles: [
      directionalPersistentAreaSavingThrowOutcomeHole(
        state,
        actorId,
        effect,
        "endsTurnInLine",
      ),
    ],
  }));
}

function directionalPersistentAreaDirectionChangeActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  if (
    !canSpendBonusAction(state.currentTurnResources) ||
    !combatantCanTakeActions(state.combatants.get(actorId))
  ) {
    return [];
  }
  return activeDirectionalPersistentAreaEffects(state).flatMap((effect) =>
    effect.sourceCombatantId === actorId &&
    directionalPersistentAreaDirectionChangeIsLaterTurn(state, effect)
      ? [
          {
            subject: {
              tag: "runtimeCommand" as const,
              actorId,
              command: "directionalPersistentAreaDirectionChange" as const,
              areaId: effect.areaId,
              effectRef: effect.effectRef,
              directionId: effect.directionId,
            },
            initialHoles: [
              directionalPersistentAreaDirectionChoiceHole(effect),
            ],
          },
        ]
      : [],
  );
}

function directionalPersistentAreaDirectionChangeIsLaterTurn(
  state: BattleState,
  effect: DirectionalPersistentAreaEffect,
): boolean {
  return (
    effect.castTurn.actorId !== currentActorId(state) ||
    effect.castTurn.round !== state.initiative.round
  );
}

function ramMovablePersistentAreaEndTurnSaveActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return activeRamMovablePersistentAreaEffects(state).map((effect) =>
    ramMovablePersistentAreaSaveAct(state, actorId, effect),
  );
}

function ramMovablePersistentAreaRamActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  if (
    !canSpendBonusAction(state.currentTurnResources) ||
    !combatantCanTakeActions(state.combatants.get(actorId))
  ) {
    return [];
  }
  return activeRamMovablePersistentAreaEffects(state).flatMap((effect) =>
    effect.sourceCombatantId === actorId
      ? [...state.combatants.keys()].map((targetId) =>
          ramMovablePersistentAreaRamAct(state, actorId, targetId, effect),
        )
      : [],
  );
}

function ramMovablePersistentAreaRepositionActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  if (
    !canSpendBonusAction(state.currentTurnResources) ||
    !combatantCanTakeActions(state.combatants.get(actorId))
  ) {
    return [];
  }
  return activeRamMovablePersistentAreaEffects(state).flatMap((effect) =>
    effect.sourceCombatantId === actorId
      ? [ramMovablePersistentAreaRepositionAct(actorId, effect)]
      : [],
  );
}

function activeRamMovablePersistentAreaEffects(
  state: BattleState,
): readonly RamMovablePersistentAreaEffect[] {
  return [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.flatMap((effect) => {
      if (effect.kind !== "persistentAreaSaveDamage") return [];
      const bound = boundPersistentAreaSaveDamageEffect(combatant, effect);
      return bound?.kind === "collisionReposition"
        ? [
            {
              ...bound.effect,
              lifecycle: bound.facts.lifecycle,
              save: { ability: bound.facts.ability, dc: bound.facts.dc },
              ramMaxMoveFeet: bound.facts.ramMaxMoveFeet,
              damage: bound.facts.damage,
            },
          ]
        : [];
    }),
  );
}

function ramMovablePersistentAreaSaveAct(
  state: BattleState,
  actorId: CombatantId,
  effect: RamMovablePersistentAreaEffect,
): BattleActDiscoveryCandidate {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "movableZoneSave",
      areaId: effect.areaId,
      effectRef: effect.effectRef,
      trigger: "endsTurnWithinFiveFeetOfSphere",
    },
    initialHoles: [
      ramMovablePersistentAreaSavingThrowOutcomeHole(
        state,
        actorId,
        effect,
        "endsTurnWithinFiveFeetOfSphere",
      ),
    ],
  };
}

function ramMovablePersistentAreaRepositionAct(
  actorId: CombatantId,
  effect: RamMovablePersistentAreaEffect,
): BattleActDiscoveryCandidate {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "movableZoneReposition",
      areaId: effect.areaId,
      effectRef: effect.effectRef,
    },
    initialHoles: [ramMovablePersistentAreaRepositionMovementHole(effect)],
  };
}

function ramMovablePersistentAreaRamAct(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  effect: RamMovablePersistentAreaEffect,
): BattleActDiscoveryCandidate {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "movableZoneRam",
      targetId,
      areaId: effect.areaId,
      effectRef: effect.effectRef,
      trigger: "rammedBySphere",
    },
    initialHoles: [
      ramMovablePersistentAreaRamMovementHole(targetId, effect),
      ramMovablePersistentAreaSavingThrowOutcomeHole(
        state,
        targetId,
        effect,
        "rammedBySphere",
      ),
    ],
  };
}

function activeMovablePersistentAreaEffects(
  state: BattleState,
): readonly MovablePersistentAreaEffect[] {
  return [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.flatMap((effect) => {
      if (effect.kind !== "persistentAreaSaveDamage") return [];
      const bound = boundPersistentAreaSaveDamageEffect(combatant, effect);
      return bound?.kind === "directedReposition"
        ? [
            {
              ...bound.effect,
              lifecycle: bound.facts.lifecycle,
              save: { ability: bound.facts.ability, dc: bound.facts.dc },
              repositionMaxMoveFeet: bound.facts.repositionMaxMoveFeet,
              damage: bound.facts.damage,
            },
          ]
        : [];
    }),
  );
}

function movablePersistentAreaEndTurnSaveActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return activeMovablePersistentAreaEffects(state).map((effect) => ({
    subject: {
      tag: "runtimeCommand" as const,
      actorId,
      command: "movableZoneSave" as const,
      areaId: effect.areaId,
      effectRef: effect.effectRef,
      trigger: "endsTurnInArea" as const,
    },
    initialHoles: [
      movablePersistentAreaSavingThrowOutcomeHole(
        state,
        actorId,
        effect,
        "endsTurnInArea",
      ),
    ],
  }));
}

function movablePersistentAreaExitActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return activeMovablePersistentAreaEffects(state)
    .filter((effect) => effect.shapeShiftSuppressed.includes(actorId))
    .map((effect) => ({
      subject: {
        tag: "runtimeCommand" as const,
        actorId,
        command: "persistentAreaSaveDamageExit" as const,
        areaId: effect.areaId,
        effectRef: effect.effectRef,
      },
      initialHoles: [],
    }));
}

function movablePersistentAreaRepositionActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  if (
    !canSpendAction(state.currentTurnResources, "magic") ||
    !combatantCanTakeActions(state.combatants.get(actorId)) ||
    combatantInsideActiveAntimagicFieldAura(state, actorId)
  ) {
    return [];
  }
  return activeMovablePersistentAreaEffects(state).flatMap((effect) =>
    effect.sourceCombatantId === actorId
      ? [
          {
            subject: {
              tag: "runtimeCommand" as const,
              actorId,
              command: "movableZoneReposition" as const,
              areaId: effect.areaId,
              effectRef: effect.effectRef,
            },
            initialHoles: [movablePersistentAreaRepositionMovementHole(effect)],
          },
        ]
      : [],
  );
}

function protectionRelevantEffectSaveActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return protectionRelevantEffectsForTarget(state, actorId).map((effect) => {
    const hole = protectionRelevantEffectSavingThrowOutcomeHole(
      state,
      actorId,
      effect,
    );
    const relevantEffect = hole.protectionRelevantEffectSave.relevantEffect;
    return {
      subject: {
        tag: "runtimeCommand" as const,
        actorId,
        command: "protectionRelevantEffectSave" as const,
        effectRef: spellActiveEffectExecutionRef(effect),
        relevantEffect,
      },
      initialHoles: [hole],
    };
  });
}

function environmentEndedPersistentAreaTraitActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.flatMap(
      (effect): readonly BattleActDiscoveryCandidate[] =>
        effect.kind === "persistentAreaTrait"
          ? [environmentEndedPersistentAreaTraitAct(actorId, effect)]
          : [],
    ),
  );
}

function environmentEndedPersistentAreaTraitAct(
  actorId: CombatantId,
  effect: EnvironmentEndedPersistentAreaTraitEffect,
): BattleActDiscoveryCandidate {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "endPersistentAreaTraitForEnvironment",
      areaId: effect.areaId,
    },
    initialHoles: [],
  };
}

function environmentEndedPersistentAreaSaveDamageActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return [...state.combatants].flatMap(([effectOwnerId, combatant]) =>
    combatant.activeEffects.flatMap(
      (effect): readonly BattleActDiscoveryCandidate[] => {
        if (effect.kind !== "persistentAreaSaveDamage") {
          return [];
        }
        const bound = boundPersistentAreaSaveDamageEffect(combatant, effect);
        if (bound?.kind !== "sourceTurnTranslation") return [];
        return [
          environmentEndedPersistentAreaSaveDamageAct(
            actorId,
            effectOwnerId,
            bound.effect,
          ),
        ];
      },
    ),
  );
}

function environmentEndedPersistentAreaSaveDamageAct(
  actorId: CombatantId,
  effectOwnerId: CombatantId,
  effect: EnvironmentEndedPersistentAreaSaveDamageEffect,
): BattleActDiscoveryCandidate {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "endPersistentAreaSaveDamageForEnvironment",
      effectOwnerId,
      effectRef: spellActiveEffectExecutionRef(effect),
    },
    initialHoles: [
      areaWindStrengthHole(
        effect.areaId,
        spellActiveEffectExecutionRef(effect),
      ),
    ],
  };
}

function linkedDefenseResistanceDamageShareSeparationActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  return [...state.combatants].flatMap(([targetId, combatant]) =>
    combatant.activeEffects.flatMap(
      (effect): readonly BattleActDiscoveryCandidate[] =>
        isLinkedDefenseResistanceDamageShareEffect(effect)
          ? [
              linkedDefenseResistanceDamageShareSeparationAct(
                actorId,
                targetId,
                effect,
              ),
            ]
          : [],
    ),
  );
}

function linkedDefenseResistanceDamageShareSeparationAct(
  actorId: CombatantId,
  targetId: CombatantId,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "linkedDefenseResistanceDamageShare" }
  >,
): BattleActDiscoveryCandidate {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "linkedDefenseResistanceDamageShareSeparation",
      effectRef: spellActiveEffectExecutionRef(effect),
      targetId,
    },
    initialHoles: [
      linkedDefenseResistanceDamageShareSeparationFactsHole({
        sourceCombatantId: effect.sourceCombatantId,
        sourceProcedureRef: effect.sourceProcedureRef,
        targetId,
      }),
    ],
  };
}

export function movementActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  const movementHoleForActor = movementHole(state, actorId);
  if (
    !combatantCanMoveInState(state, actorId) ||
    state.combatants.size <= 1 ||
    !canSpendMovement(state.currentTurnResources) ||
    !movementHoleHasRemainingBudget(movementHoleForActor)
  ) {
    return [];
  }

  return [
    {
      subject: { tag: "runtimeCommand", actorId, command: "move" },
      initialHoles: [movementHoleForActor],
    },
    ...fixedCostMovementReplacementActs(state, actorId, movementHoleForActor),
  ];
}

function fixedCostMovementReplacementActs(
  state: BattleState,
  actorId: CombatantId,
  movementHoleForActor: ReturnType<typeof movementHole>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }
  return actor.activeEffects.flatMap(
    (effect): readonly BattleActDiscoveryCandidate[] => {
      if (
        effect.kind !== "fixedCostMovementReplacement" ||
        effect.usedThisTurn
      ) {
        return [];
      }
      const boundEffect = boundFixedCostMovementReplacementEffect(
        state,
        effect,
      );
      if (
        boundEffect === undefined ||
        Number(movementHoleForActor.movementBudgetFeet) <
          Number(boundEffect.movementCostFeet)
      ) {
        return [];
      }
      return [
        {
          subject: {
            tag: "runtimeCommand" as const,
            actorId,
            command: "fixedCostMovementReplacement" as const,
            effectRef: spellActiveEffectExecutionRef(effect),
          },
          initialHoles: [movementHoleForActor],
        },
      ];
    },
  );
}

export function dashActsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) return [];
  const speedKinds = representedMovementSpeedKinds(actor);

  return speedKinds.map((speedKind) => ({
    subject: dashSubjectForSpeedKind(actorId, speedKind),
    initialHoles: [],
  }));
}

export function dashSubjectForSpeedKind(
  actorId: CombatantId,
  speedKind: BattleMovementSpeedKind,
): Extract<BattleSubject, { readonly tag: "action"; readonly action: "dash" }> {
  return { tag: "action", actorId, action: "dash", speedKind };
}

export function statBlockMultiattackActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (
    actor?.origin.kind !== "statBlock" ||
    !combatantCanTakeActions(actor) ||
    !hasTurnActionResource(state.currentTurnResources)
  ) {
    return [];
  }
  const origin = actor.origin;
  return statBlockMultiattackBindings(origin.execution).flatMap((binding) => {
    if (
      !binding.procedure.dispatchProcedureRefs.every((procedureRef) =>
        statBlockProcedureResourcesAvailable(origin.execution, procedureRef),
      )
    ) {
      return [];
    }
    return [
      {
        subject: {
          tag: "action" as const,
          actorId,
          action: "multiattack" as const,
          procedureRef: binding.procedureRef,
        },
        initialHoles: [],
      },
    ];
  });
}

export function statBlockBonusActionOptionActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (
    actor?.origin.kind !== "statBlock" ||
    !combatantCanTakeActions(actor) ||
    !canSpendBonusAction(state.currentTurnResources)
  ) {
    return [];
  }
  const origin = actor.origin;
  return statBlockBonusActionOptionBindings(origin.execution).flatMap(
    (binding) =>
      binding.procedure.standardActions.flatMap((standardAction) => {
        if (
          !statBlockProcedureResourcesAvailable(
            origin.execution,
            binding.procedureRef,
          )
        ) {
          return [];
        }
        if (
          standardAction === "hide" &&
          !canHideInCurrentCircumstances(state, actorId)
        ) {
          return [];
        }
        return [
          {
            subject: {
              tag: "bonusAction" as const,
              actorId,
              action: "statBlockActionOption" as const,
              procedureRef: binding.procedureRef,
              standardAction,
            },
            initialHoles:
              standardAction === "hide"
                ? [hideAbilityCheckHole(state, actorId)]
                : [],
          },
        ];
      }),
  );
}

export function actorHasStatBlockMultiattackActionResource(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  return state.currentTurnResources.actionResources.some((resource) =>
    isStatBlockMultiattackActionResource(resource, actorId),
  );
}

export function currentActorHasOpenStatBlockMultiattackDispatch(
  state: BattleState,
): boolean {
  return actorHasStatBlockMultiattackActionResource(
    state,
    currentActorId(state),
  );
}

export function actorHasClassFeatureExtraAttackActionResource(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  return state.currentTurnResources.actionResources.some((resource) =>
    isClassFeatureExtraAttackActionResource(resource, actorId),
  );
}

export function subjectAllowedDuringStatBlockMultiattackDispatch(
  state: BattleState,
  subject: BattleSubject,
): boolean {
  const actorId = currentActorId(state);
  if (
    subject.tag === "runtimeCommand" &&
    subject.actorId === actorId &&
    (subject.command === "endTurn" || subject.command === "move")
  ) {
    return true;
  }
  if (
    subject.tag !== "action" ||
    subject.actorId !== actorId ||
    subject.action !== "attack"
  ) {
    return false;
  }
  return state.currentTurnResources.actionResources.some(
    (resource): boolean =>
      isStatBlockMultiattackActionResource(resource, actorId) &&
      subject.procedureRef !== undefined &&
      resource.attackProcedureRef === subject.procedureRef,
  );
}

export function hasTurnActionResource(state: ActionEconomyState): boolean {
  return (
    canSpendAction(state, "attack") &&
    state.actionResources.some((resource) => resource.source === "turn")
  );
}

export function spendTurnAction<T extends ActionEconomyState>(
  state: T,
): Result.Result<T, "no action resource available"> {
  const turnActionResourceIndex = state.actionResources.findIndex(
    (resource) => resource.source === "turn",
  );
  if (turnActionResourceIndex === -1 || !canSpendAction(state, "attack")) {
    return Result.fail("no action resource available");
  }

  return Result.succeed(
    spendActionResourceAtIndex(state, turnActionResourceIndex),
  );
}

export function isStatBlockBattleCreatureState(
  combatant: BattleCreatureState | undefined,
): combatant is StatBlockBattleCreatureState {
  return combatant?.origin.kind === "statBlock";
}

// KERNEL-COVERAGE: runtime-owner BATTLE.RELATIONSHIP_DISCOVERY
