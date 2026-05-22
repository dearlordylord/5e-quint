// Battle act discovery extracted from ../battle-reducer.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-transformation-mode spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dragons-breath-granted-action
// Owns top-level act discovery and subject/action-resource discovery helpers.
// Mechanical move; no behavior change intended.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.martial-arts-attack-projection unit-feature.monk-focus-battle-options unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.invocation-flaming-sphere-hazard-ram spell.invocation-fog-cloud-obscurement spell.invocation-grease-ground-hazard spell.invocation-gust-of-wind-line spell.invocation-jump-movement-replacement spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
import type {
  ActionEconomyState,
  RuntimeActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";

import {
  actionResourceAllows,
  canSpendAction,
  canSpendUnarmedStrikeActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";

import { type StandardActionKind } from "@dnd/shared/game-facts";

import type {
  CreatureNamedMultiattack,
  StatBlockRecord,
} from "@dnd/surface/surface/types";

import { Match } from "effect";

import * as Either from "effect/Either";

import { BATTLE_REACTION_TRIGGERS } from "../battle-reaction-triggers.ts";

import {
  type BattleMovementSpeedKind,
  type BattleSubject,
} from "../battle-subjects.ts";

import { CombatantId, spellId } from "../identity.ts";
import { isPresentFindFamiliarCombatant } from "../find-familiar-state.ts";
import { combatantHasPactOfTheChainFindFamiliar } from "../find-familiar-pact-chain.ts";

import {
  attackActionOptionsForActor,
  martialArtsBonusUnarmedStrikeActionOptionForActor,
  offHandAttackActionOptionsForActor,
  offHandAttackPrerequisiteMet,
} from "./attack-damage-apply.ts";

import {
  helpAttackAllyChoices,
  helpAttackAllyHole,
} from "./attack-resolution.ts";

import { currentActorId, grappledBy } from "./creature-state-leaves.ts";
import { maxJumpMovementReplacementDistanceFeet } from "./jump-movement-replacement.ts";
import {
  activeLevitatedCreatureTargetsControlledBy,
  levitateAltitudeChangeHole,
} from "./levitate-creature.ts";

import {
  combatantCanTakeActions,
  combatantCanTakeReactions,
} from "./creature-state.ts";

import { reactionTriggerLabel } from "./dispatcher.ts";

import {
  attackTargetChoices,
  attackTargetHole,
  bonusActionStandardActionActs,
  canHideInCurrentCircumstances,
  escapeGrappleOutcomeHole,
  escapeSpellRestraintAbilityCheckHole,
  grappleTargetChoices,
  grappleTargetHole,
  hiddenSearchTargetChoices,
  hideAbilityCheckHole,
  searchTargetHole,
  shoveTargetChoices,
  shoveTargetHole,
  sleepShakeAwakeTargetHole,
} from "./hole-helpers.ts";

import {
  combatantCanMoveInState,
  movementHoleHasRemainingBudget,
  representedMovementSpeedKinds,
} from "./movement-speed.ts";

import {
  protectionRelevantEffectSavingThrowOutcomeHole,
  protectionRelevantEffectsForTarget,
  sleepShakeAwakeTargetChoices,
  spellRestraintEffectEntries,
} from "./spell-condition-effects-helpers.ts";

import { discoverSupportedSpellInvocations } from "./spells-discovery.ts";
import {
  activeSelfTransformationModeEffect,
  selfTransformationModeLabel,
  spellCreatedHeldObjectEffectsForActor,
} from "./spells-active-effects.ts";

import { attackActionOptionName } from "./statblock-attacks.ts";

import {
  attackActionOptionIsOrdinaryAttackAction,
  statBlockActionSectionAttackOptions,
  statBlockAttackResourceAvailable,
  statBlockLimitedUseForPart,
  statBlockPartLimitedUseAvailable,
  statBlockSubjectPart,
} from "./statblock.ts";

import {
  greaseGroundHazardSavingThrowOutcomeHole,
  webRestraintSavingThrowOutcomeHole,
  gustOfWindLineDirectionChoiceHole,
  gustOfWindLineSavingThrowOutcomeHole,
  flamingSphereRamMovementHole,
  flamingSphereRepositionMovementHole,
  flamingSphereSavingThrowOutcomeHole,
  moonbeamSavingThrowOutcomeHole,
  moonbeamRepositionMovementHole,
  canonicalHeldObjectIdsForActor,
  commandDropHeldObjectFactsHole,
  commandPendingEffectsForActor,
  movementHole,
  readiedSpellInitialHoles,
  standFromProneCostFeet,
  type GreaseGroundHazardEffect,
  type WebRestraintHazardEffect,
  type GustOfWindLineEffect,
  type FlamingSphereEffect,
  type MoonbeamEffect,
} from "./turn-end-movement.ts";

import { supportedUnitFeatureActs } from "./unit-features.ts";
import { monkFocusActs } from "./monk-focus.ts";
import {
  isWardingBondEffect,
  wardingBondSeparationFactsHole,
} from "./warding-bond.ts";

import type {
  AvailableBattleAct,
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
  SelfTransformationModeKind,
  ClassFeatureExtraAttackActionResource,
  StatBlockBattleCreatureState,
  StatBlockMultiattackActionResource,
  SupportedLiteralMultiattackDispatch,
  SupportedStatBlockBonusActionOption,
  SupportedStatBlockBonusActionStandardAction,
  SupportedStatBlockMultiattack,
} from "../battle-reducer.ts";

type FogCloudObscurementEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "fogCloudObscurement" }
>;
import {
  SELF_TRANSFORMATION_MODE_KINDS,
  SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS,
  discoverLegendaryActionActs,
} from "../battle-reducer.ts";
export function discoverBattleActs(
  state: BattleState,
): readonly AvailableBattleAct[] {
  const actorId = currentActorId(state);
  const hasOpenStatBlockMultiattackDispatch =
    currentActorHasOpenStatBlockMultiattackDispatch(state);
  const acts: AvailableBattleAct[] = hasOpenStatBlockMultiattackDispatch
    ? []
    : [...releaseGrappleActs(state)];
  if (!state.combatants.has(actorId)) {
    return acts;
  }
  const startTurnWebActs = webRestraintStartTurnSaveActs(state, actorId);
  const commandGrovelEffects = commandPendingEffectsForActor(
    state,
    actorId,
  ).filter((effect) => effect.option === "grovel");
  if (commandGrovelEffects.length > 0) {
    return [
      ...startTurnWebActs,
      ...commandGrovelEffects.map((effect) => ({
        subject: {
          tag: "runtimeCommand" as const,
          actorId,
          command: "commandGrovel" as const,
          sourceCombatantId: effect.sourceCombatantId,
          sourceSpellId: spellId(effect.sourceSpellId),
        },
        label: "Command: Grovel",
        summary: "Have the Prone condition and end the turn.",
        initialHoles: [],
      })),
    ];
  }
  const commandDropEffects = commandPendingEffectsForActor(
    state,
    actorId,
  ).filter((effect) => effect.option === "drop");
  if (commandDropEffects.length > 0) {
    return [
      ...startTurnWebActs,
      ...commandDropEffects.map((effect) => {
        const subject = {
          tag: "runtimeCommand" as const,
          actorId,
          command: "commandDrop" as const,
          sourceCombatantId: effect.sourceCombatantId,
          sourceSpellId: spellId(effect.sourceSpellId),
        };
        const canonicalObjectIds = canonicalHeldObjectIdsForActor(
          state,
          actorId,
        );
        return {
          subject,
          label: "Command: Drop",
          summary: "Drop held objects and end the turn.",
          initialHoles:
            canonicalObjectIds === null
              ? [commandDropHeldObjectFactsHole(subject)]
              : [],
        };
      }),
    ];
  }
  const commandApproachEffects = commandPendingEffectsForActor(
    state,
    actorId,
  ).filter((effect) => effect.option === "approach");
  if (commandApproachEffects.length > 0) {
    return [
      ...startTurnWebActs,
      ...commandApproachEffects.map((effect) => ({
        subject: {
          tag: "runtimeCommand" as const,
          actorId,
          command: "commandApproach" as const,
          sourceCombatantId: effect.sourceCombatantId,
          sourceSpellId: spellId(effect.sourceSpellId),
        },
        label: "Command: Approach",
        summary: "Move toward the caster by a supplied shortest/direct route.",
        initialHoles: combatantCanMoveInState(state, actorId)
          ? [movementHole(state, actorId)]
          : [],
      })),
    ];
  }
  const commandFleeEffects = commandPendingEffectsForActor(
    state,
    actorId,
  ).filter((effect) => effect.option === "flee");
  if (commandFleeEffects.length > 0) {
    return [
      ...startTurnWebActs,
      ...commandFleeEffects.map((effect) => ({
        subject: {
          tag: "runtimeCommand" as const,
          actorId,
          command: "commandFlee" as const,
          sourceCombatantId: effect.sourceCombatantId,
          sourceSpellId: spellId(effect.sourceSpellId),
        },
        label: "Command: Flee",
        summary:
          "Move away from the caster by supplied fastest-available means.",
        initialHoles: combatantCanMoveInState(state, actorId)
          ? [movementHole(state, actorId)]
          : [],
      })),
    ];
  }
  if (state.currentTurnResources.commandHalt !== null) {
    acts.push(...startTurnWebActs);
    acts.push(...greaseGroundHazardEndTurnActs(state, actorId));
    acts.push(...gustOfWindLineEndTurnSaveActs(state, actorId));
    acts.push(...flamingSphereEndTurnSaveActs(state, actorId));
    acts.push(...moonbeamEndTurnSaveActs(state, actorId));
    acts.push(...fogCloudStrongWindDispersalActs(state, actorId));
    acts.push(...webAreaRemovalActs(state, actorId));
    acts.push(...wardingBondSeparationActs(state, actorId));
    acts.push(endTurnAct(actorId));
    acts.push(...readiedSpellReleaseActs(state, actorId));
    acts.push(...discoverLegendaryActionActs(state));
    return acts;
  }
  acts.push(...startTurnWebActs);
  acts.push(...selfTransformationModeReplacementActs(state, actorId));
  acts.push(...levitateAltitudeControlActs(state, actorId));
  const attackActionOptions = attackActionOptionsForActor(
    state,
    actorId,
  ).filter(attackActionOptionIsOrdinaryAttackAction);
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "attack") &&
    attackActionOptions.some(
      (attack) => attackTargetChoices(state, actorId, attack).length > 0,
    )
  ) {
    acts.push(
      ...attackActionOptions.flatMap((attack) => {
        const targetHole = attackTargetHole(state, actorId, attack);
        return targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "action" as const,
                  actorId,
                  action: "attack" as const,
                  attackName: attackActionOptionName(attack),
                  ...statBlockSubjectPart(attack),
                },
                label: "Attack",
                summary: `Take the Attack action with ${attackActionOptionName(attack)}.`,
                initialHoles: [targetHole],
              },
            ];
      }),
    );
  }
  acts.push(...pactOfTheChainFamiliarAttackActs(state, actorId));
  if (hasOpenStatBlockMultiattackDispatch) {
    acts.push(...movementActs(state, actorId));
    acts.push(...greaseGroundHazardEndTurnActs(state, actorId));
    acts.push(...gustOfWindLineEndTurnSaveActs(state, actorId));
    acts.push(...flamingSphereEndTurnSaveActs(state, actorId));
    acts.push(...moonbeamEndTurnSaveActs(state, actorId));
    acts.push({
      subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
      label: "End Turn",
      summary:
        "End the current combatant's turn and close pending Multiattack dispatches.",
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
      label: "Disengage",
      summary: "Prevent Movement from provoking Opportunity Attacks this turn.",
      initialHoles: [],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "dodge")
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "dodge" },
      label: "Dodge",
      summary:
        "Impose Disadvantage on attacks against you until your next turn.",
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
      label: "Help",
      summary:
        "Help an ally's next attack roll against an enemy within 5 feet.",
      initialHoles: [helpAttackAllyHole(state, actorId)],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    hasTurnActionResource(state.currentTurnResources) &&
    sleepShakeAwakeTargetChoices(state, actorId).length > 0
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "shakeAwakeFromSleep" },
      label: "Shake Awake",
      summary: "Use an action to shake an adjacent creature out of Sleep.",
      initialHoles: [sleepShakeAwakeTargetHole(state, actorId)],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "ready")
  ) {
    acts.push(
      ...BATTLE_REACTION_TRIGGERS.map((trigger) => ({
        subject: {
          tag: "action" as const,
          actorId,
          action: "ready" as const,
          readyTrigger: trigger,
        },
        label: "Ready",
        summary: `Prepare a Reaction for ${reactionTriggerLabel(trigger)}.`,
        initialHoles: [],
      })),
    );
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "hide") &&
    canHideInCurrentCircumstances(state, actorId)
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "hide" },
      label: "Hide",
      summary: "Make a Dexterity (Stealth) check to become hidden.",
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
      label: "Search",
      summary: "Make a Wisdom (Perception) check to find a hidden creature.",
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
      label: "Unarmed Strike (Grapple)",
      summary: "Replace one attack with an Unarmed Strike Grapple.",
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
      label: "Unarmed Strike (Shove)",
      summary: "Replace one attack with an Unarmed Strike Shove.",
      initialHoles: [shoveTargetHole(state, actorId)],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    !actorHasStatBlockMultiattackActionResource(state, actorId) &&
    canSpendEscapeGrappleActionResource(state, actorId) &&
    grappledBy(state, actorId) !== undefined
  ) {
    const grapple = grappledBy(state, actorId);
    if (grapple !== undefined) {
      acts.push({
        subject: { tag: "action", actorId, action: "escapeGrapple" },
        label: "Escape Grapple",
        summary: "Use an action to attempt to end the Grappled condition.",
        initialHoles: [escapeGrappleOutcomeHole(grapple, actorId)],
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
          sourceSpellId: spellId(effect.sourceSpellId),
          sourceCombatantId: effect.sourceCombatantId,
        },
        label:
          actorId === targetId
            ? `Escape ${effect.sourceSpellId}`
            : `Help escape ${effect.sourceSpellId}`,
        summary:
          actorId === targetId
            ? "Use an action to attempt to end a spell-imposed Restrained condition."
            : "Use an action while within reach of the target to attempt to end a spell-imposed Restrained condition.",
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
      state.currentTurnResources.currentHasBonusAction &&
      offHandAttackPrerequisiteMet(state, actorId, offHand) &&
      attackTargetChoices(state, actorId, offHand).length > 0
    ) {
      acts.push({
        subject: {
          tag: "bonusAction",
          actorId,
          action: "offHandAttack",
          attackName: attackActionOptionName(offHand),
        },
        label: "Light Property Bonus Action Attack",
        summary: `Make the Light property Bonus Action attack with ${attackActionOptionName(offHand)}.`,
        initialHoles: [attackTargetHole(state, actorId, offHand)],
      });
    }
  }
  const martialArtsUnarmedStrike =
    martialArtsBonusUnarmedStrikeActionOptionForActor(state, actorId);
  if (
    martialArtsUnarmedStrike !== undefined &&
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    state.currentTurnResources.currentHasBonusAction &&
    attackTargetChoices(state, actorId, martialArtsUnarmedStrike).length > 0
  ) {
    acts.push({
      subject: {
        tag: "bonusAction",
        actorId,
        action: "martialArtsUnarmedStrike",
        attackName: attackActionOptionName(martialArtsUnarmedStrike),
      },
      label: "Martial Arts Bonus Unarmed Strike",
      summary: "Make an Unarmed Strike as a Bonus Action.",
      initialHoles: [
        attackTargetHole(state, actorId, martialArtsUnarmedStrike),
      ],
    });
  }
  acts.push(...bonusActionStandardActionActs(state, actorId));
  acts.push(...monkFocusActs(state, actorId));
  acts.push(...statBlockBonusActionOptionActs(state, actorId));
  acts.push(...supportedUnitFeatureActs(state, actorId));
  if (combatantCanTakeActions(state.combatants.get(actorId))) {
    acts.push(...discoverSupportedSpellInvocations(state, actorId));
  }
  acts.push(...spellCreatedHeldObjectReleaseActs(state, actorId));
  acts.push(...flamingSphereRepositionActs(state, actorId));
  acts.push(...flamingSphereRamActs(state, actorId));
  acts.push(...moonbeamRepositionActs(state, actorId));
  acts.push(...gustOfWindLineDirectionChangeActs(state, actorId));
  acts.push(...movementActs(state, actorId));
  acts.push(...greaseGroundHazardEntrySaveActs(state, actorId));
  acts.push(...webRestraintEntrySaveActs(state, actorId));
  acts.push(...webRestrainedNoLongerInAreaActs(state, actorId));
  acts.push(...protectionRelevantEffectSaveActs(state, actorId));
  if (standFromProneCostFeet(state, actorId) !== null) {
    acts.push({
      subject: { tag: "runtimeCommand", actorId, command: "standFromProne" },
      label: "Stand",
      summary: "Spend Movement equal to half Speed and end Prone.",
      initialHoles: [],
    });
  }
  acts.push(...greaseGroundHazardEndTurnActs(state, actorId));
  acts.push(...gustOfWindLineEndTurnSaveActs(state, actorId));
  acts.push(...flamingSphereEndTurnSaveActs(state, actorId));
  acts.push(...moonbeamEndTurnSaveActs(state, actorId));
  acts.push(...fogCloudStrongWindDispersalActs(state, actorId));
  acts.push(...webAreaRemovalActs(state, actorId));
  acts.push(...wardingBondSeparationActs(state, actorId));
  acts.push(endTurnAct(actorId));
  acts.push(...readiedSpellReleaseActs(state, actorId));
  acts.push(...discoverLegendaryActionActs(state));

  return acts;
}

function levitateAltitudeControlActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (
    !combatantCanTakeActions(actor) ||
    !canSpendAction(state.currentTurnResources, "magic")
  ) {
    return [];
  }
  return activeLevitatedCreatureTargetsControlledBy(state, actorId).map(
    ({ targetId, effect }) => ({
      subject: {
        tag: "runtimeCommand" as const,
        actorId,
        command: "levitateAltitudeControl" as const,
        sourceCombatantId: effect.sourceCombatantId,
        sourceSpellId: spellId(effect.sourceSpellId),
        targetId,
      },
      label: "Levitate altitude control",
      summary:
        "Use a Magic action to move the levitated target up or down while it remains within the spell's range.",
      initialHoles: [
        levitateAltitudeChangeHole({
          actorId,
          targetId,
          maxDistanceFeet: effect.maxAltitudeChangeFeet,
        }),
      ],
    }),
  );
}

function spellCreatedHeldObjectReleaseActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  return spellCreatedHeldObjectEffectsForActor(actor)
    .filter((effect) => effect.objectState.kind === "held")
    .map((effect) => ({
      subject: {
        tag: "runtimeCommand" as const,
        actorId,
        command: "releaseSpellCreatedHeldObject" as const,
        sourceCombatantId: effect.sourceCombatantId,
        sourceSpellId: spellId(effect.sourceSpellId),
      },
      label: "Release spell-created held object",
      summary: "Let go of the active spell-created held object.",
      initialHoles: [],
    }));
}

function selfTransformationModeReplacementActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  const activeEffect = activeSelfTransformationModeEffect(actor);
  if (
    activeEffect === undefined ||
    !combatantCanTakeActions(actor) ||
    !canSpendAction(state.currentTurnResources, "magic")
  ) {
    return [];
  }
  return SELF_TRANSFORMATION_MODE_KINDS.filter(
    (mode): mode is SelfTransformationModeKind => mode !== activeEffect.mode,
  ).flatMap((mode): readonly AvailableBattleAct[] => {
    const baseAct = {
      summary:
        "Replace the active self-transformation option with a Magic action.",
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
              sourceCombatantId: activeEffect.sourceCombatantId,
              sourceSpellId: spellId(activeEffect.sourceSpellId),
              mode,
              naturalWeaponDamageType,
            },
            label: `Self Transformation: ${selfTransformationModeLabel(mode)} (${naturalWeaponDamageType})`,
          }),
        )
      : [
          {
            ...baseAct,
            subject: {
              tag: "runtimeCommand" as const,
              actorId,
              command: "replaceSelfTransformationMode" as const,
              sourceCombatantId: activeEffect.sourceCombatantId,
              sourceSpellId: spellId(activeEffect.sourceSpellId),
              mode,
            },
            label: `Self Transformation: ${selfTransformationModeLabel(mode)}`,
          },
        ];
  });
}

function pactOfTheChainFamiliarAttackActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  if (
    !combatantCanTakeActions(state.combatants.get(actorId)) ||
    !canSpendAction(state.currentTurnResources, "attack") ||
    !combatantHasPactOfTheChainFindFamiliar(state, actorId)
  ) {
    return [];
  }
  const familiar = state.findFamiliars.get(actorId);
  if (familiar?.status !== "present") {
    return [];
  }
  const familiarCombatant = state.combatants.get(familiar.familiarId);
  if (
    familiarCombatant?.origin.kind !== "statBlock" ||
    !combatantCanTakeReactions(familiarCombatant)
  ) {
    return [];
  }
  return statBlockActionSectionAttackOptions(
    "actions",
    familiarCombatant.origin.statBlock.statBlock.actions,
  ).flatMap((attack) => {
    const targetHole = attackTargetHole(state, familiar.familiarId, attack);
    return targetHole.choices.length === 0
      ? []
      : [
          {
            subject: {
              tag: "pactOfTheChainFamiliarAttack" as const,
              actorId,
              familiarId: familiar.familiarId,
              attackName: attackActionOptionName(attack),
            },
            label: "Pact Familiar Attack",
            summary: `Forgo one Attack-action attack for the familiar to attack with ${attackActionOptionName(attack)}.`,
            initialHoles: [targetHole],
          },
        ];
  });
}

function endTurnAct(actorId: CombatantId): AvailableBattleAct {
  return {
    subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
    label: "End Turn",
    summary: "End the current combatant's turn.",
    initialHoles: [],
  };
}

function readiedSpellReleaseActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  return [...state.readiedSpells].map(([casterId, readiedSpell]) => ({
    subject: {
      tag: "runtimeCommand" as const,
      actorId,
      command: "releaseReadiedSpell" as const,
      readiedSpellCasterId: casterId,
    },
    label: `Release ${readiedSpell.invocation.spell.name}`,
    summary: `Release ${readiedSpell.invocation.spell.name} with a Reaction.`,
    initialHoles: readiedSpellInitialHoles(state, casterId, readiedSpell),
  }));
}

export function releaseGrappleActs(
  state: BattleState,
): readonly AvailableBattleAct[] {
  return state.grapples.map((grapple) => ({
    subject: {
      tag: "runtimeCommand" as const,
      actorId: grapple.grapplerId,
      command: "releaseGrapple" as const,
      targetId: grapple.targetId,
    },
    label: "Release Grapple",
    summary: "Release a grappled target without spending an action.",
    initialHoles: [],
  }));
}

function greaseGroundHazardEntrySaveActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  return [...state.combatants].flatMap(([, combatant]) =>
    combatant.activeEffects.flatMap((effect): readonly AvailableBattleAct[] => {
      if (effect.kind !== "greaseGroundHazard") {
        return [];
      }
      return [greaseGroundHazardSaveAct(state, actorId, effect, "entersArea")];
    }),
  );
}

function greaseGroundHazardEndTurnActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  return [...state.combatants].flatMap(([, combatant]) =>
    combatant.activeEffects.flatMap((effect): readonly AvailableBattleAct[] => {
      if (effect.kind !== "greaseGroundHazard") {
        return [];
      }
      return [
        greaseGroundHazardSaveAct(state, actorId, effect, "endsTurnInArea"),
      ];
    }),
  );
}

function greaseGroundHazardSaveAct(
  state: BattleState,
  actorId: CombatantId,
  effect: GreaseGroundHazardEffect,
  trigger: "entersArea" | "endsTurnInArea",
): AvailableBattleAct {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "greaseGroundHazardSave",
      sourceCombatantId: effect.sourceCombatantId,
      sourceSpellId: spellId(effect.sourceSpellId),
      areaId: effect.areaId,
      trigger,
    },
    label: trigger === "entersArea" ? "Enter Grease" : "End Turn in Grease",
    summary:
      trigger === "entersArea"
        ? "Resolve the table-supplied Grease area-entry Dexterity Saving Throw."
        : "Resolve the table-supplied Grease end-turn Dexterity Saving Throw.",
    initialHoles: [
      greaseGroundHazardSavingThrowOutcomeHole(state, actorId, effect, trigger),
    ],
  };
}

function activeWebRestraintHazards(
  state: BattleState,
): readonly WebRestraintHazardEffect[] {
  return [...state.combatants].flatMap(([, combatant]) =>
    combatant.activeEffects.filter(
      (effect): effect is WebRestraintHazardEffect =>
        effect.kind === "webRestraintHazard",
    ),
  );
}

function webRestraintEntrySaveActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  return activeWebRestraintHazards(state).flatMap((effect) =>
    effect.entrySavedThisTurn.includes(actorId)
      ? []
      : [webRestraintSaveAct(state, actorId, effect, "entersArea")],
  );
}

function webRestraintStartTurnSaveActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  return activeWebRestraintHazards(state).flatMap((effect) =>
    effect.startTurnSavedThisTurn.includes(actorId)
      ? []
      : [webRestraintSaveAct(state, actorId, effect, "startsTurnInArea")],
  );
}

function webRestraintSaveAct(
  state: BattleState,
  actorId: CombatantId,
  effect: WebRestraintHazardEffect,
  trigger: "entersArea" | "startsTurnInArea",
): AvailableBattleAct {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "webRestraintSave",
      sourceCombatantId: effect.sourceCombatantId,
      sourceSpellId: spellId(effect.sourceSpellId),
      areaId: effect.areaId,
      trigger,
    },
    label: trigger === "entersArea" ? "Enter Web" : "Start Turn in Web",
    summary:
      trigger === "entersArea"
        ? "Resolve the table-supplied first-entry Web Dexterity Saving Throw."
        : "Resolve the table-supplied start-turn Web Dexterity Saving Throw.",
    initialHoles: [
      webRestraintSavingThrowOutcomeHole(state, actorId, effect, trigger),
    ],
  };
}

function webRestrainedNoLongerInAreaActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }
  return actor.activeEffects.flatMap(
    (effect): readonly AvailableBattleAct[] => {
      if (
        effect.kind !== "spellCondition" ||
        effect.condition !== "restrained" ||
        effect.escape?.kind !== "abilityCheck"
      ) {
        return [];
      }
      return activeWebRestraintHazards(state)
        .filter(
          (web) =>
            web.sourceCombatantId === effect.sourceCombatantId &&
            web.sourceSpellId === effect.sourceSpellId,
        )
        .map((web) => ({
          subject: {
            tag: "runtimeCommand" as const,
            actorId,
            command: "webRestrainedNoLongerInArea" as const,
            sourceCombatantId: web.sourceCombatantId,
            sourceSpellId: spellId(web.sourceSpellId),
            areaId: web.areaId,
          },
          label: "Leave Web",
          summary:
            "Apply the table-supplied fact that the restrained target is no longer in the Web area.",
          initialHoles: [],
        }));
    },
  );
}

function webAreaRemovalActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  return activeWebRestraintHazards(state).map((effect) => ({
    subject: {
      tag: "runtimeCommand" as const,
      actorId,
      command: "webAreaRemoved" as const,
      sourceCombatantId: effect.sourceCombatantId,
      sourceSpellId: spellId(effect.sourceSpellId),
      areaId: effect.areaId,
    },
    label: "Remove Web Area",
    summary:
      "Apply a table-supplied Web collapse, burn-away, or removal fact and end the spell area.",
    initialHoles: [],
  }));
}

function activeGustOfWindLineEffects(
  state: BattleState,
): readonly GustOfWindLineEffect[] {
  return [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.filter(
      (effect): effect is GustOfWindLineEffect =>
        effect.kind === "gustOfWindLine",
    ),
  );
}

function gustOfWindLineEndTurnSaveActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  return activeGustOfWindLineEffects(state).map((effect) => ({
    subject: {
      tag: "runtimeCommand" as const,
      actorId,
      command: "gustOfWindLineSave" as const,
      sourceCombatantId: effect.sourceCombatantId,
      sourceSpellId: spellId(effect.sourceSpellId),
      areaId: effect.areaId,
      directionId: effect.directionId,
      trigger: "endsTurnInLine" as const,
    },
    label: "End Turn in Gust of Wind",
    summary:
      "Resolve the table-supplied Gust of Wind Line end-turn STR Saving Throw.",
    initialHoles: [
      gustOfWindLineSavingThrowOutcomeHole(
        state,
        actorId,
        effect,
        "endsTurnInLine",
      ),
    ],
  }));
}

function gustOfWindLineDirectionChangeActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  if (
    !state.currentTurnResources.currentHasBonusAction ||
    !combatantCanTakeActions(state.combatants.get(actorId))
  ) {
    return [];
  }
  return activeGustOfWindLineEffects(state).flatMap((effect) =>
    effect.sourceCombatantId === actorId &&
    gustOfWindLineDirectionChangeIsLaterTurn(state, effect)
      ? [
          {
            subject: {
              tag: "runtimeCommand" as const,
              actorId,
              command: "gustOfWindLineDirectionChange" as const,
              sourceCombatantId: effect.sourceCombatantId,
              sourceSpellId: spellId(effect.sourceSpellId),
              areaId: effect.areaId,
              directionId: effect.directionId,
            },
            label: "Change Gust of Wind Direction",
            summary:
              "Spend a Bonus Action using a table-supplied Gust of Wind Line direction.",
            initialHoles: [gustOfWindLineDirectionChoiceHole(effect)],
          },
        ]
      : [],
  );
}

function gustOfWindLineDirectionChangeIsLaterTurn(
  state: BattleState,
  effect: GustOfWindLineEffect,
): boolean {
  return (
    effect.castTurn.actorId !== currentActorId(state) ||
    effect.castTurn.round !== state.initiative.round
  );
}

function flamingSphereEndTurnSaveActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  return activeFlamingSphereEffects(state).map((effect) =>
    flamingSphereSaveAct(state, actorId, effect),
  );
}

function flamingSphereRamActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  if (
    !state.currentTurnResources.currentHasBonusAction ||
    !combatantCanTakeActions(state.combatants.get(actorId))
  ) {
    return [];
  }
  return activeFlamingSphereEffects(state).flatMap((effect) =>
    effect.sourceCombatantId === actorId
      ? [...state.combatants.keys()].map((targetId) =>
          flamingSphereRamAct(state, actorId, targetId, effect),
        )
      : [],
  );
}

function flamingSphereRepositionActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  if (
    !state.currentTurnResources.currentHasBonusAction ||
    !combatantCanTakeActions(state.combatants.get(actorId))
  ) {
    return [];
  }
  return activeFlamingSphereEffects(state).flatMap((effect) =>
    effect.sourceCombatantId === actorId
      ? [flamingSphereRepositionAct(actorId, effect)]
      : [],
  );
}

function activeFlamingSphereEffects(
  state: BattleState,
): readonly FlamingSphereEffect[] {
  return [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.filter(
      (effect): effect is FlamingSphereEffect =>
        effect.kind === "flamingSphere",
    ),
  );
}

function flamingSphereSaveAct(
  state: BattleState,
  actorId: CombatantId,
  effect: FlamingSphereEffect,
): AvailableBattleAct {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "movableZoneSave",
      sourceCombatantId: effect.sourceCombatantId,
      sourceSpellId: spellId(effect.sourceSpellId),
      areaId: effect.areaId,
      trigger: "endsTurnWithinFiveFeetOfSphere",
    },
    label: "End Turn within 5 feet of Flaming Sphere",
    summary:
      "Resolve the table-supplied Flaming Sphere end-within-5-feet Dexterity Saving Throw and damage.",
    initialHoles: [
      flamingSphereSavingThrowOutcomeHole(
        state,
        actorId,
        effect,
        "endsTurnWithinFiveFeetOfSphere",
      ),
    ],
  };
}

function flamingSphereRepositionAct(
  actorId: CombatantId,
  effect: FlamingSphereEffect,
): AvailableBattleAct {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "movableZoneReposition",
      sourceCombatantId: effect.sourceCombatantId,
      sourceSpellId: spellId(effect.sourceSpellId),
      areaId: effect.areaId,
    },
    label: "Move Flaming Sphere",
    summary:
      "Spend a Bonus Action using table-supplied Flaming Sphere movement that does not enter a creature's space.",
    initialHoles: [flamingSphereRepositionMovementHole(effect)],
  };
}

function flamingSphereRamAct(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  effect: FlamingSphereEffect,
): AvailableBattleAct {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "movableZoneRam",
      targetId,
      sourceCombatantId: effect.sourceCombatantId,
      sourceSpellId: spellId(effect.sourceSpellId),
      areaId: effect.areaId,
      trigger: "rammedBySphere",
    },
    label: "Ram with Flaming Sphere",
    summary:
      "Spend a Bonus Action using table-supplied Flaming Sphere movement into the target's space and resolve its save and damage.",
    initialHoles: [
      flamingSphereRamMovementHole(targetId, effect),
      flamingSphereSavingThrowOutcomeHole(
        state,
        targetId,
        effect,
        "rammedBySphere",
      ),
    ],
  };
}

function activeMoonbeamEffects(state: BattleState): readonly MoonbeamEffect[] {
  return [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.filter(
      (effect): effect is MoonbeamEffect => effect.kind === "moonbeam",
    ),
  );
}

function moonbeamEndTurnSaveActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  return activeMoonbeamEffects(state).map((effect) => ({
    subject: {
      tag: "runtimeCommand" as const,
      actorId,
      command: "movableZoneSave" as const,
      sourceCombatantId: effect.sourceCombatantId,
      sourceSpellId: spellId(effect.sourceSpellId),
      areaId: effect.areaId,
      trigger: "endsTurnInArea" as const,
    },
    label: `End Turn in Movable Zone`,
    summary:
      "Resolve the table-supplied Moonbeam end-turn CON Saving Throw and radiant damage.",
    initialHoles: [
      moonbeamSavingThrowOutcomeHole(state, actorId, effect, "endsTurnInArea"),
    ],
  }));
}

function moonbeamRepositionActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  if (
    !canSpendAction(state.currentTurnResources, "magic") ||
    !combatantCanTakeActions(state.combatants.get(actorId))
  ) {
    return [];
  }
  return activeMoonbeamEffects(state).flatMap((effect) =>
    effect.sourceCombatantId === actorId
      ? [
          {
            subject: {
              tag: "runtimeCommand" as const,
              actorId,
              command: "movableZoneReposition" as const,
              sourceCombatantId: effect.sourceCombatantId,
              sourceSpellId: spellId(effect.sourceSpellId),
              areaId: effect.areaId,
            },
            label: "Move Movable Zone",
            summary:
              "Spend a Magic Action using table-supplied Moonbeam movement that does not enter a creature's space.",
            initialHoles: [moonbeamRepositionMovementHole(effect)],
          },
        ]
      : [],
  );
}

function protectionRelevantEffectSaveActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
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
        sourceCombatantId: effect.sourceCombatantId,
        sourceSpellId: spellId(effect.sourceSpellId),
        relevantEffect,
      },
      label: `${effect.sourceSpellId} ${relevantEffect} save`,
      summary:
        "Resolve a new Saving Throw against an already-applied effect relevant to Protection from Evil and Good.",
      initialHoles: [hole],
    };
  });
}

function fogCloudStrongWindDispersalActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  return [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.flatMap((effect): readonly AvailableBattleAct[] =>
      effect.kind === "fogCloudObscurement"
        ? [fogCloudStrongWindDispersalAct(actorId, effect)]
        : [],
    ),
  );
}

function fogCloudStrongWindDispersalAct(
  actorId: CombatantId,
  effect: FogCloudObscurementEffect,
): AvailableBattleAct {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "disperseFogCloud",
      sourceCombatantId: effect.sourceCombatantId,
      sourceSpellId: spellId(effect.sourceSpellId),
      areaId: effect.areaId,
    },
    label: "Disperse Fog Cloud",
    summary: "End the table-supplied Fog Cloud area because of strong wind.",
    initialHoles: [],
  };
}

function wardingBondSeparationActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  return [...state.combatants].flatMap(([targetId, combatant]) =>
    combatant.activeEffects.flatMap((effect): readonly AvailableBattleAct[] =>
      isWardingBondEffect(effect)
        ? [wardingBondSeparationAct(actorId, targetId, effect)]
        : [],
    ),
  );
}

function wardingBondSeparationAct(
  actorId: CombatantId,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "wardingBond" }>,
): AvailableBattleAct {
  return {
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "wardingBondSeparation",
      sourceCombatantId: effect.sourceCombatantId,
      sourceSpellId: spellId(effect.sourceSpellId),
      targetId,
    },
    label: "End Warding Bond",
    summary:
      "End the Warding Bond because the connected creatures are more than 60 feet apart.",
    initialHoles: [
      wardingBondSeparationFactsHole({
        sourceCombatantId: effect.sourceCombatantId,
        sourceSpellId: effect.sourceSpellId,
        targetId,
      }),
    ],
  };
}

export function movementActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const movementHoleForActor = movementHole(state, actorId);
  if (
    !combatantCanMoveInState(state, actorId) ||
    state.combatants.size <= 1 ||
    !movementHoleHasRemainingBudget(movementHoleForActor)
  ) {
    return [];
  }

  return [
    {
      subject: { tag: "runtimeCommand", actorId, command: "move" },
      label: "Move",
      summary: "Spend Movement using table-supplied movement cost.",
      initialHoles: [movementHoleForActor],
    },
    ...jumpMovementReplacementActs(state, actorId, movementHoleForActor),
  ];
}

function jumpMovementReplacementActs(
  state: BattleState,
  actorId: CombatantId,
  movementHoleForActor: ReturnType<typeof movementHole>,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }
  return actor.activeEffects.flatMap(
    (effect): readonly AvailableBattleAct[] => {
      if (
        effect.kind !== "jumpMovementReplacement" ||
        effect.usedThisTurn ||
        Number(movementHoleForActor.movementBudgetFeet) <
          Number(effect.movementCostFeet)
      ) {
        return [];
      }
      return [
        {
          subject: {
            tag: "runtimeCommand" as const,
            actorId,
            command: "jumpMovementReplacement" as const,
            sourceCombatantId: effect.sourceCombatantId,
            sourceSpellId: spellId(effect.sourceSpellId),
          },
          label: "Jump",
          summary: `Spend ${effect.movementCostFeet} feet of Movement to jump up to ${maxJumpMovementReplacementDistanceFeet(state, actorId, effect)} feet using table-supplied landing facts.`,
          initialHoles: [movementHoleForActor],
        },
      ];
    },
  );
}

export function dashActsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) return [];
  const speedKinds = representedMovementSpeedKinds(actor);

  return speedKinds.map((speedKind) => ({
    subject: dashSubjectForSpeedKind(actorId, speedKind),
    label: "Dash",
    summary:
      "Gain extra Movement equal to the chosen Speed for the current turn.",
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
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (
    actor?.origin.kind !== "statBlock" ||
    !combatantCanTakeActions(actor) ||
    !hasTurnActionResource(state.currentTurnResources)
  ) {
    return [];
  }
  const origin = actor.origin;
  return supportedStatBlockMultiattacks(origin.statBlock).flatMap(
    (multiattack) => {
      if (
        !multiattack.dispatches.every((dispatch) =>
          statBlockAttackResourceAvailable(
            origin.statBlock.statBlock,
            origin.resources,
            dispatch,
          ),
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
            multiattackName: multiattack.multiattack.name,
          },
          label: multiattack.multiattack.name,
          summary: `Take the Attack action using ${multiattack.multiattack.name}.`,
          initialHoles: [],
        },
      ];
    },
  );
}

export function statBlockBonusActionOptionActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (
    actor?.origin.kind !== "statBlock" ||
    !combatantCanTakeActions(actor) ||
    !state.currentTurnResources.currentHasBonusAction
  ) {
    return [];
  }
  const origin = actor.origin;

  return supportedStatBlockBonusActionOptions(origin.statBlock).flatMap(
    (option) =>
      option.option.options.flatMap((standardAction) => {
        if (
          !statBlockPartLimitedUseAvailable(
            origin.statBlock.statBlock,
            origin.resources,
            option.part,
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
              optionName: option.option.name,
              standardAction,
            },
            label: option.option.name,
            summary: `Use ${option.option.name} to ${standardActionLabel(standardAction)} as a Bonus Action.`,
            initialHoles:
              standardAction === "hide"
                ? [hideAbilityCheckHole(state, actorId)]
                : [],
          },
        ];
      }),
  );
}

export function supportedStatBlockMultiattacks(
  statBlock: StatBlockRecord,
): readonly SupportedStatBlockMultiattack[] {
  const actionAttacks = statBlockActionSectionAttackOptions(
    "actions",
    statBlock.statBlock.actions,
  );
  return (
    statBlock.statBlock.actions?.multiattacks?.flatMap((multiattack) => {
      const literalDispatches =
        supportedLiteralMultiattackDispatches(multiattack);
      if (literalDispatches === null) return [];

      const dispatches = literalDispatches.flatMap((dispatch) => {
        const matchingAttacks = actionAttacks.filter(
          (candidate) => candidate.attack.name === dispatch.name,
        );
        const [attack] = matchingAttacks;
        if (attack === undefined || matchingAttacks.length !== 1) return [];
        if (
          dispatch.count.value > 1 &&
          statBlockLimitedUseForPart(statBlock.statBlock, attack.part) !==
            undefined
        ) {
          return [];
        }
        return Array.from({ length: dispatch.count.value }, () => attack);
      });
      const dispatchCount = literalDispatches.reduce(
        (count, dispatch) => count + dispatch.count.value,
        0,
      );
      return dispatches.length === dispatchCount
        ? [{ multiattack, dispatches }]
        : [];
    }) ?? []
  );
}

export function supportedLiteralMultiattackDispatches(
  multiattack: CreatureNamedMultiattack,
): readonly SupportedLiteralMultiattackDispatch[] | null {
  if (multiattack.dispatches.length === 0) return null;

  const dispatches = multiattack.dispatches.filter(
    isSupportedLiteralMultiattackDispatch,
  );
  return dispatches.length === multiattack.dispatches.length
    ? dispatches
    : null;
}

export function isSupportedLiteralMultiattackDispatch(
  dispatch: CreatureNamedMultiattack["dispatches"][number],
): dispatch is SupportedLiteralMultiattackDispatch {
  return (
    dispatch.count.kind === "literal" &&
    dispatch.count.value >= 1 &&
    Number.isInteger(dispatch.count.value)
  );
}

export function supportedStatBlockBonusActionOptions(
  statBlock: StatBlockRecord,
): readonly SupportedStatBlockBonusActionOption[] {
  return (
    statBlock.statBlock.bonusActions?.actionOptions?.flatMap((option) => {
      const supportedOptions = option.options.filter(
        (
          standardAction,
        ): standardAction is SupportedStatBlockBonusActionStandardAction =>
          supportedStatBlockBonusActionStandardAction(standardAction),
      );
      return supportedOptions.length === option.options.length
        ? [
            {
              option: { ...option, options: supportedOptions },
              part: { section: "bonusActions", name: option.name },
            },
          ]
        : [];
    }) ?? []
  );
}

export function supportedStatBlockBonusActionStandardAction(
  standardAction: StandardActionKind,
): standardAction is SupportedStatBlockBonusActionStandardAction {
  return SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS.some(
    (supported) => supported === standardAction,
  );
}

export function isStatBlockMultiattackActionResource(
  resource: RuntimeActionResource,
  actorId: CombatantId,
): resource is StatBlockMultiattackActionResource {
  return (
    resource.source === "statBlockMultiattack" &&
    resource.sourceOwnerId === actorId
  );
}

export function isClassFeatureExtraAttackActionResource(
  resource: RuntimeActionResource,
  actorId: CombatantId,
): resource is ClassFeatureExtraAttackActionResource {
  return (
    resource.source === "classFeatureExtraAttack" &&
    resource.sourceOwnerId === actorId
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

export function canSpendEscapeGrappleActionResource(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  return state.currentTurnResources.actionResources.some(
    (resource) =>
      !isClassFeatureExtraAttackActionResource(resource, actorId) &&
      actionResourceAllows(resource, "attack"),
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
      resource.attackPart.name === subject.attackName &&
      resource.attackPart.section === (subject.statBlockSection ?? "actions"),
  );
}

export function hasTurnActionResource(state: ActionEconomyState): boolean {
  return state.actionResources.some((resource) => resource.source === "turn");
}

export function spendTurnAction<T extends ActionEconomyState>(
  state: T,
): Either.Either<T, "no action resource available"> {
  const turnActionResourceIndex = state.actionResources.findIndex(
    (resource) => resource.source === "turn",
  );
  if (turnActionResourceIndex === -1) {
    return Either.left("no action resource available");
  }

  return Either.right({
    ...state,
    actionResources: state.actionResources.filter(
      (_, index) => index !== turnActionResourceIndex,
    ),
  });
}

export function isStatBlockBattleCreatureState(
  combatant: BattleCreatureState | undefined,
): combatant is StatBlockBattleCreatureState {
  return combatant?.origin.kind === "statBlock";
}

export function standardActionLabel(
  standardAction: SupportedStatBlockBonusActionStandardAction,
): string {
  return Match.value(standardAction).pipe(
    Match.when("disengage", () => "Disengage"),
    Match.when("hide", () => "Hide"),
    Match.exhaustive,
  );
}
