// Unit feature discovery and resolution extracted from ../battle-reducer.ts.
// Owns unit-feature act discovery, feature command resolution, ongoing feature
// activation, failed/successful ability-check feature reactions, and self-heal
// feature holes. Mechanical move; no behavior change intended.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import {
grantUnitActionResource,
spendActivationResource
} from "@dnd/shared-algebras/action-economy-algebra";







import {
validateRolledDiceForDiceExpr
} from "@dnd/shared-algebras/runtime-dice-algebra";

import type {
HoleInstanceKey
} from "@dnd/shared-algebras/runtime-hole-algebra";

import {
holeId,
holeInstanceKey
} from "@dnd/shared-algebras/runtime-hole-algebra";


import {
MovementFeet
} from "@dnd/shared/types";


import type {
UnitRecord
} from "@dnd/surface/surface/types";




import * as Either from "effect/Either";






import {
resourceHasUsesRemaining,
spendCharacterResourceUse,
type CharacterBattleResourceState
} from "../character-battle-resources.ts";

import type { CharacterBattleClassLevel } from "../character-class-level.ts";


import {
CombatantId
} from "../identity.ts";

import {
parseSupportedUnitFeatureProfile,
type SupportedUnitFeatureProfile
} from "../unit-feature-support.ts";





import {
combatantCanSee,
combatantWearingArmorCategory
} from "./creature-state-leaves.ts";

import {
activeOngoingFeatureOccurrencesForCombatant,
combatantCanTakeActions,
combatantCanTakeReactions,
isCharacterBattleCreatureState,
ongoingFeatureSourceKeyForUnit,
statBlockLegendaryActionWindowIsOpen
} from "./creature-state.ts";

import {
applyHpHealing,
breakBattleConcentration
} from "./damage-apply.ts";


import { snapshotBattle,spendReaction } from "./dispatcher.ts";
import {
reactionModifierResourceAvailable,
reactionReductionResourceDieRollTotal,
spendReactionModifierResource
} from "./reaction-modifiers.ts";



import {
attackActionOptionsForActor
} from "./attack-damage-apply.ts";

import {
needsHolesResult
} from "./hole-helpers.ts";


import {
activeOngoingFeatureOccurrenceFromProfile,
extendOngoingFeatureToEndOfNextTurn,
ongoingFeatureLifecycleHasExtensionTrigger,
} from "./ongoing-feature-helpers.ts";

import { invalidResult } from "./result-helpers.ts";

import {
attackActionOptionName
} from "./statblock-attacks.ts";

import {
attackTargetHole
} from "./hole-helpers.ts";








import type {
AvailableBattleAct,
BattleCreatureState,
BattleFill,
BattleHoleId,
BattleResolutionResult,
BattleState,
BattleTargetSpatialFact,
BattleUnitFeatureRollHole,
CharacterBattleCreatureState,
FailedAbilityCheckResourceBoostResolutionInput,
FailedAbilityCheckResourceBoostResolutionResult,
SuccessfulAbilityCheckReactionReductionResolutionInput,
SuccessfulAbilityCheckReactionReductionResolutionResult,
UnitFeatureBattleResolutionInput,
UnitFeatureRolledDiceFill,
} from "../battle-reducer.ts";
export function supportedUnitFeatureActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (
    !isCharacterBattleCreatureState(actor) ||
    !combatantCanTakeActions(actor)
  ) {
    return [];
  }

  const classLevels = actor.origin.classLevels;
  return actor.origin.resources.flatMap((resource) => {
    const unitFeature = supportedUnitFeatureProfileForResource(
      actor,
      resource,
      classLevels,
    );
    if (
      unitFeature?.kind === "extraActionGrant" &&
      resourceHasUsesRemaining(resource) &&
      !resource.usedThisTurn
    ) {
      return [
        {
          subject: {
            tag: "unitFeature" as const,
            actorId,
            unitId: unitFeature.unit.id,
          },
          label: unitFeature.unit.name,
          summary: "Grant one additional non-Magic action this turn.",
          initialHoles: [],
        },
      ];
    }

    if (
      unitFeature?.kind === "ongoingFeature" &&
      unitFeature.activationTrigger === "bonusAction" &&
      ongoingFeatureIsAvailable(state, actor, resource, unitFeature)
    ) {
      return [
        {
          subject: {
            tag: "unitFeature" as const,
            actorId,
            unitId: unitFeature.unit.id,
          },
          label: unitFeature.unit.name,
          summary: "Activate an ongoing feature occurrence.",
          initialHoles: [],
        },
      ];
    }

    return unitFeature?.kind === "selfBonusActionHealing" &&
      resourceHasUsesRemaining(resource) &&
      state.currentTurnResources.currentHasBonusAction
      ? [
          {
            subject: {
              tag: "unitFeature" as const,
              actorId,
              unitId: unitFeature.unit.id,
            },
            label: unitFeature.unit.name,
            summary: "Spend a Bonus Action and one use to regain Hit Points.",
            initialHoles: [selfBonusActionHealingRollHole(unitFeature)],
          },
        ]
      : [];
  });
}




export function supportedUnitFeatureProfileForResource(
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  classLevels: readonly CharacterBattleClassLevel[],
): SupportedUnitFeatureProfile | null {
  return (
    actor.origin.ongoingFeatureProfiles.get(
      ongoingFeatureSourceKeyForUnit(resource.unit.id),
    ) ?? parseSupportedUnitFeatureProfile(resource.unit, classLevels)
  );
}

export 

function resolveUnitFeature(
  input: UnitFeatureBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  if (isCharacterBattleCreatureState(actor)) {
    const resource = actor.origin.resources.find(
      (candidate) => candidate.unit.id === subject.unitId,
    );

    if (resource !== undefined) {
      const unitFeature = supportedUnitFeatureProfileForResource(
        actor,
        resource,
        actor.origin.classLevels,
      );
      if (unitFeature?.kind === "extraActionGrant") {
        return resolveExtraActionGrantUnitFeature(
          input,
          actor,
          resource,
          unitFeature,
        );
      }
      if (unitFeature?.kind === "selfBonusActionHealing") {
        return resolveSelfBonusActionHealingUnitFeature(
          input,
          actor,
          resource,
          unitFeature,
        );
      }
      if (unitFeature?.kind === "ongoingFeature") {
        return resolveOngoingFeatureUnitFeature(
          input,
          actor,
          resource,
          unitFeature,
        );
      }
    }
  }

  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Unsupported Unit feature does not accept battle fills.",
    );
  }

  return invalidResult(
    input.state,
    "staleSubject",
    "Unit feature is no longer available for the current actor.",
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

  const profile = actor.origin.failedAbilityCheckResourceBoostProfiles.get(
    input.unitId,
  );
  const resource = actor.origin.resources.find(
    (resource) =>
      resource.unit.id === profile?.abilityCheck.spends.resourceUnitId,
  );
  if (
    profile === undefined ||
    resource === undefined ||
    !resourceHasUsesRemaining(resource)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Failed ability-check resource boost is no longer available for the current actor.",
    );
  }

  if (
    input.boostRoll < 1 ||
    input.boostRoll > profile.abilityCheck.bonus.dieSize ||
    !Number.isInteger(input.boostRoll)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} boost roll must be a 1d10 result.`,
    );
  }

  if (input.abilityCheck.originalTotal >= input.abilityCheck.dc) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} requires an already-failed ability check.`,
    );
  }

  const boostedTotal = input.abilityCheck.originalTotal + input.boostRoll;
  const boostedSucceeded = boostedTotal >= input.abilityCheck.dc;
  const nextActor: BattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((resource) =>
        boostedSucceeded &&
        resource.unit.id === profile.abilityCheck.spends.resourceUnitId
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

  const profile = reactor.origin.reactionRollOrDamageReductionProfiles.get(
    input.unitId,
  );
  const modifier = profile?.modifiers.find(
    (candidate) => candidate.kind === "abilityCheckReduction",
  );
  if (
    profile === undefined ||
    modifier === undefined ||
    !combatantCanTakeReactions(reactor) ||
    !reactionModifierResourceAvailable(
      input.state,
      input.reactorId,
      profile,
      modifier,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ability-check Reaction reduction is no longer available.",
    );
  }

  if (input.abilityCheck.originalTotal < input.abilityCheck.dc) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} requires an already-successful ability check.`,
    );
  }

  if (
    modifier.requiresVisibleCreature &&
    !combatantCanSee(input.state, input.reactorId, input.abilityCheck.actorId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} requires a visible creature.`,
    );
  }

  if (
    !hasReactionRollOrDamageReductionRangeFact(
      input.abilityCheck.targetSpatialFacts,
      input.reactorId,
      input.abilityCheck.actorId,
      input.unitId,
      modifier.rangeFeet,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} requires the creature to be within range.`,
    );
  }

  const reductionTotal = reactionReductionResourceDieRollTotal({
    reduction: modifier.reduction,
    rollTotal: input.reductionRoll,
  });
  if (reductionTotal.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} ${reductionTotal.message}`,
    );
  }

  const reducedTotal = input.abilityCheck.originalTotal - reductionTotal.value;
  const reducedSucceeded = reducedTotal >= input.abilityCheck.dc;
  const spentState = spendReactionModifierResource(
    spendReaction(input.state, input.reactorId),
    input.reactorId,
    {
      kind: "abilityCheckReduction",
      unitId: profile.unit.id,
      label: profile.unit.name,
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
  unitId: UnitRecord["id"],
  rangeFeet: MovementFeet,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "reactionRollOrDamageReductionTargetWithinRange" &&
      fact.reactorId === reactorId &&
      fact.targetId === targetId &&
      fact.unitId === unitId &&
      fact.rangeFeet === rangeFeet,
  );
}



export function resolveExtraActionGrantUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "extraActionGrant" }
  >,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "This Unit feature does not accept battle fills.",
    );
  }

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
    input.subject.unitId,
    unitFeature.restriction,
  );
  if (Either.isLeft(granted)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This Unit feature has already granted an action this turn.",
    );
  }

  const nextActor: BattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.unit.id === input.subject.unitId
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
    currentTurnResources: granted.right,
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
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): BattleResolutionResult {
  if (
    !resourceHasUsesRemaining(resource) ||
    !input.state.currentTurnResources.currentHasBonusAction
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      selfBonusActionHealingStaleMessage(unitFeature),
    );
  }

  const healingRoll = selfBonusActionHealingRollFill(input.fills, unitFeature);
  if (healingRoll.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", healingRoll.message);
  }
  if (healingRoll.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      selfBonusActionHealingRollHole(unitFeature),
    ]);
  }

  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      selfBonusActionHealingStaleMessage(unitFeature),
    );
  }

  const nextActor = applyHpHealing(
    {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((candidate) =>
          candidate.unit.id === input.subject.unitId
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
    currentTurnResources: spent.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}



export function ongoingFeatureIsAvailable(
  state: BattleState,
  actor: BattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  >,
): boolean {
  if (unitFeature.activationTrigger === "firstAttackRoll") {
    return false;
  }
  const occurrenceKey = ongoingFeatureSourceKeyForUnit(unitFeature.unit.id);
  const activeOngoingFeature =
    activeOngoingFeatureOccurrencesForCombatant(actor).get(occurrenceKey);
  if (activeOngoingFeature !== undefined) {
    return (
      state.currentTurnResources.currentHasBonusAction &&
      ongoingFeatureLifecycleHasExtensionTrigger(
        unitFeature.lifecycle,
        "bonusAction",
      )
    );
  }
  if (unitFeature.spendsUse && !resourceHasUsesRemaining(resource)) {
    return false;
  }
  if (!state.currentTurnResources.currentHasBonusAction) {
    return false;
  }
  return !unitFeature.lifecycle.earlyEndArmorCategories.some((category) =>
    combatantWearingArmorCategory(actor, category),
  );
}



export function resolveOngoingFeatureUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  >,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "This Unit feature does not accept battle fills.",
    );
  }
  if (!ongoingFeatureIsAvailable(input.state, actor, resource, unitFeature)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Unit feature is no longer available for the current actor.",
    );
  }

  const spent =
    unitFeature.activationTrigger === "bonusAction"
      ? spendActivationResource(input.state.currentTurnResources, {
          kind: "bonusAction",
        })
      : Either.right(input.state.currentTurnResources);
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Unit feature is no longer available for the current actor.",
    );
  }

  const occurrenceKey = ongoingFeatureSourceKeyForUnit(input.subject.unitId);
  const activeOngoingFeature =
    activeOngoingFeatureOccurrencesForCombatant(actor).get(occurrenceKey);
  const nextActiveOngoingFeatureOccurrences = new Map(
    actor.activeOngoingFeatureOccurrences,
  );
  nextActiveOngoingFeatureOccurrences.set(
    occurrenceKey,
    activeOngoingFeature === undefined
      ? activeOngoingFeatureOccurrenceFromProfile(
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
        candidate.unit.id === input.subject.unitId &&
        unitFeature.spendsUse
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
    currentTurnResources: spent.right,
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
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): UnitFeatureRolledDiceFill {
  let healingRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "rolledDice" &&
      fill.holeId === selfBonusActionHealingRollHoleId(unitFeature)
    ) {
      if (healingRoll !== undefined) {
        return {
          tag: "invalid",
          message: `${unitFeature.unit.name} healing roll was filled twice.`,
        };
      }
      healingRoll = fill;
      continue;
    }

    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the ${unitFeature.unit.name} replay holes.`,
    };
  }

  if (healingRoll === undefined) {
    return { tag: "ok", value: undefined };
  }

  const validation = validateRolledDiceForDiceExpr(healingRoll.value, {
    dice: unitFeature.dice,
    dieSize: unitFeature.dieSize,
  });
  return validation == null
    ? { tag: "ok", value: healingRoll }
    : { tag: "invalid", message: validation.reason };
}



export function selfBonusActionHealingRollHole(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): BattleUnitFeatureRollHole {
  return {
    kind: "rolledDice",
    holeId: selfBonusActionHealingRollHoleId(unitFeature),
    holeInstanceKey: selfBonusActionHealingRollHoleInstanceKey(unitFeature),
    label: `${unitFeature.unit.name} healing (${unitFeature.dice}d${unitFeature.dieSize})`,
    unitFeature,
  };
}



export function selfBonusActionHealingStaleMessage(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): string {
  return `${unitFeature.unit.name} is no longer available for the current actor.`;
}



export function selfBonusActionHealingRollProtocolId(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): string {
  return `battle:unit-feature:${unitFeature.unit.id}:healing-roll`;
}



export function selfBonusActionHealingRollHoleId(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): BattleHoleId {
  return holeId(selfBonusActionHealingRollProtocolId(unitFeature));
}



export function selfBonusActionHealingRollHoleInstanceKey(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): HoleInstanceKey {
  return holeInstanceKey(selfBonusActionHealingRollProtocolId(unitFeature));
}



export function selfBonusActionHealingAmount(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
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


export function discoverLegendaryActionActs(
  state: BattleState,
): readonly AvailableBattleAct[] {
  return [...state.combatants].flatMap(([actorId, actor]) => {
    if (
      !statBlockLegendaryActionWindowIsOpen(state, actorId) ||
      actor.origin.kind !== "statBlock" ||
      !combatantCanTakeActions(actor) ||
      actor.origin.resources.legendaryActionUsesRemaining <= 0
    ) {
      return [];
    }
    return attackActionOptionsForActor(state, actorId)
      .filter(
        (attack) =>
          attack.kind === "statBlockAttack" &&
          attack.part.section === "legendaryActions",
      )
      .flatMap((attack) => {
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
                  statBlockSection: "legendaryActions" as const,
                },
                label: "Legendary Action",
                summary: `Take the Legendary Action ${attackActionOptionName(
                  attack,
                )}.`,
                initialHoles: [targetHole],
              },
            ];
      });
  });
}
