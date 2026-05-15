// Public battle lifecycle API extracted from ../battle-reducer.ts.
// Mechanical move; no behavior change intended.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import {
  createScoredInitiativeStack,
  insertAtOrderIndex,
  removeFromInitiative,
} from "@dnd/shared-algebras/initiative-algebra";

import { isNonEmptyReadonlyArray } from "effect/Array";

import * as Either from "effect/Either";

import * as Option from "effect/Option";

import type { BattleCreatureInit } from "../battle-init.ts";

import { BattleId, CombatantId } from "../identity.ts";

import {
  currentActorId,
  normalizeBattleGrapples,
} from "./creature-state-leaves.ts";

import {
  battleCreatureStateFromInit,
  combatantInitiativeInsertionIndex,
  characterResourceInitIssue,
  characterSpellcastingInitIssue,
  hidePrerequisitesReferenceCombatantsIssue,
  positiveHpUnconsciousInitIssue,
} from "./creature-state.ts";

import { battleStateInitIssue } from "./domain-helpers.ts";

import { resetBattleTurnResources } from "./turn-end-movement.ts";

import type {
  BattleCreatureState,
  BattleHidePrerequisite,
  BattleState,
  BattleStateInitIssue,
} from "../battle-reducer.ts";
import { INITIAL_ROUND, INITIAL_TURN_RESOURCES } from "../battle-reducer.ts";
export function startBattle(input: {
  readonly battleId: BattleId;
  readonly combatants: readonly BattleCreatureInit[];
  readonly hidePrerequisites?: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
}): Either.Either<BattleState, BattleStateInitIssue> {
  if (input.combatants.length === 0) {
    return battleStateInitIssue("startBattle requires at least one combatant.");
  }

  const combatants = new Map<CombatantId, BattleCreatureState>();
  for (const combatant of input.combatants) {
    if (combatants.has(combatant.combatantId)) {
      return battleStateInitIssue(
        `Duplicate combatant id: ${combatant.combatantId}`,
      );
    }
    const positiveHpUnconsciousIssue =
      positiveHpUnconsciousInitIssue(combatant);
    if (positiveHpUnconsciousIssue !== null) {
      return positiveHpUnconsciousIssue;
    }
    const characterResourceIssue = characterResourceInitIssue(combatant);
    if (characterResourceIssue !== null) {
      return characterResourceIssue;
    }
    const characterSpellcastingIssue =
      characterSpellcastingInitIssue(combatant);
    if (characterSpellcastingIssue !== null) {
      return characterSpellcastingIssue;
    }
    combatants.set(
      combatant.combatantId,
      battleCreatureStateFromInit(combatant),
    );
  }
  const hidePrerequisiteIssue = hidePrerequisitesReferenceCombatantsIssue(
    input.hidePrerequisites ?? new Map(),
    combatants,
  );
  if (hidePrerequisiteIssue !== null) return hidePrerequisiteIssue;

  const orderedEntries = input.combatants
    .map((combatant, callerOrder) => ({ combatant, callerOrder }))
    .sort(
      (left, right) =>
        right.combatant.initiative - left.combatant.initiative ||
        left.callerOrder - right.callerOrder,
    )
    .map(({ combatant }) => ({
      creature: combatant.combatantId,
      initiative: combatant.initiative,
    }));
  if (!isNonEmptyReadonlyArray(orderedEntries)) {
    return battleStateInitIssue("startBattle requires at least one combatant.");
  }

  const initiative = createScoredInitiativeStack<CombatantId>(
    orderedEntries,
    INITIAL_ROUND,
  );
  if (Either.isLeft(initiative)) {
    return battleStateInitIssue(initiative.left);
  }
  return Either.right({
    battleId: input.battleId,
    initiative: initiative.right,
    combatants,
    findFamiliars: new Map(),
    objectOutlines: [],
    lightEmitters: [],
    hidePrerequisites: new Map(input.hidePrerequisites ?? []),
    currentTurnResources: INITIAL_TURN_RESOURCES,
    readiedSpells: new Map(),
    readiedMovements: new Map(),
    helpAttacks: [],
    grapples: [],
    interruptStack: [],
    legendaryActionWindow: null,
  });
}

export function addBattleCombatant(input: {
  readonly state: BattleState;
  readonly combatant: BattleCreatureInit;
  readonly tieOrderIndex?: number;
}): Either.Either<BattleState, BattleStateInitIssue> {
  if (input.state.combatants.has(input.combatant.combatantId)) {
    return battleStateInitIssue(
      `Duplicate combatant id: ${input.combatant.combatantId}`,
    );
  }
  const positiveHpUnconsciousIssue = positiveHpUnconsciousInitIssue(
    input.combatant,
  );
  if (positiveHpUnconsciousIssue !== null) {
    return positiveHpUnconsciousIssue;
  }
  const characterResourceIssue = characterResourceInitIssue(input.combatant);
  if (characterResourceIssue !== null) {
    return characterResourceIssue;
  }
  const characterSpellcastingIssue = characterSpellcastingInitIssue(
    input.combatant,
  );
  if (characterSpellcastingIssue !== null) {
    return characterSpellcastingIssue;
  }
  const nextCombatants = new Map(input.state.combatants).set(
    input.combatant.combatantId,
    battleCreatureStateFromInit(input.combatant),
  );
  const insertionIndex = combatantInitiativeInsertionIndex(
    input.state,
    input.combatant.initiative,
    input.tieOrderIndex,
  );
  const initiative = insertAtOrderIndex(
    input.state.initiative,
    insertionIndex,
    {
      creature: input.combatant.combatantId,
      initiative: input.combatant.initiative,
    },
  );

  return Either.right({
    ...input.state,
    initiative,
    combatants: nextCombatants,
  });
}

export function removeBattleCombatants(input: {
  readonly state: BattleState;
  readonly combatantIds: readonly CombatantId[];
}): Either.Either<BattleState, BattleStateInitIssue> {
  const removeIds = new Set(input.combatantIds);
  if (removeIds.size === 0) return Either.right(input.state);
  for (const id of removeIds) {
    if (!input.state.combatants.has(id)) {
      return battleStateInitIssue(
        "Cannot remove a combatant that is not in this battle.",
      );
    }
  }
  if (removeIds.size >= input.state.combatants.size) {
    return battleStateInitIssue("Cannot remove every combatant from a battle.");
  }
  const currentRemoved = removeIds.has(currentActorId(input.state));
  const initiativeOption = removeFromInitiative(input.state.initiative, (id) =>
    removeIds.has(id),
  );
  if (Option.isNone(initiativeOption)) {
    return battleStateInitIssue(
      "Cannot remove every combatant from Initiative.",
    );
  }
  const combatants = new Map(
    [...input.state.combatants]
      .filter(([id]) => !removeIds.has(id))
      .map(([id, combatant]) => [
        id,
        {
          ...combatant,
          activeEffects: combatant.activeEffects.filter(
            (effect) => !removeIds.has(effect.sourceCombatantId),
          ),
        },
      ]),
  );
  const findFamiliars = new Map(
    [...input.state.findFamiliars].filter(
      ([ownerId]) => !removeIds.has(ownerId),
    ),
  );
  return Either.right(
    normalizeBattleGrapples({
      ...input.state,
      initiative: initiativeOption.value,
      combatants,
      findFamiliars,
      objectOutlines: input.state.objectOutlines.filter(
        (outline) =>
          !removeIds.has(outline.sourceCombatantId) &&
          !removeIds.has(outline.expiresAt.combatantId),
      ),
      lightEmitters: input.state.lightEmitters.filter(
        (emitter) =>
          !removeIds.has(emitter.sourceCombatantId) &&
          !(
            emitter.kind === "spellLightEmitter" &&
            emitter.attachment.kind === "combatant" &&
            removeIds.has(emitter.attachment.combatantId)
          ),
      ),
      currentTurnResources: currentRemoved
        ? resetBattleTurnResources(input.state.currentTurnResources)
        : input.state.currentTurnResources,
      hidePrerequisites: new Map(
        [...input.state.hidePrerequisites].filter(([id]) => !removeIds.has(id)),
      ),
      readiedSpells: new Map(
        [...input.state.readiedSpells].filter(([id]) => !removeIds.has(id)),
      ),
      readiedMovements: new Map(
        [...input.state.readiedMovements].filter(([id]) => !removeIds.has(id)),
      ),
      helpAttacks: input.state.helpAttacks.filter(
        (help) =>
          !removeIds.has(help.helperId) &&
          !removeIds.has(help.allyId) &&
          !removeIds.has(help.targetEnemyId),
      ),
      grapples: input.state.grapples.filter(
        (grapple) =>
          !removeIds.has(grapple.grapplerId) &&
          !removeIds.has(grapple.targetId),
      ),
      interruptStack: [],
      legendaryActionWindow:
        input.state.legendaryActionWindow === null ||
        removeIds.has(input.state.legendaryActionWindow.afterTurnActorId)
          ? null
          : input.state.legendaryActionWindow,
    }),
  );
}
