// Public battle lifecycle API and Initial Initiative setup workflow.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.initiative-proficiency-and-swap unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.remarkable-athlete unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import {
  createScoredInitiativeStack,
  insertAtOrderIndex,
  removeFromInitiative,
  swapInitialInitiativeScores,
} from "@dnd/shared-algebras/initiative-algebra";
import { isIncapacitated } from "@dnd/shared-algebras/conditions-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";

import { isNonEmptyReadonlyArray } from "effect/Array";

import * as Either from "effect/Either";

import * as Option from "effect/Option";

import type { BattleCreatureInit } from "../battle-init.ts";

import { BattleId, CombatantId } from "../identity.ts";
import { battleCompanionEntries } from "../find-familiar-state.ts";

import {
  currentActorId,
  normalizeBattleGrapples,
} from "./creature-state-leaves.ts";

import {
  battleCreatureStateFromInit,
  combatantInitiativeInsertionIndex,
  characterDruidWildShapeKnownFormsInitIssue,
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
import { INITIATIVE_PROFICIENCY_AND_SWAP_SUPPORT_PROFILE } from "../unit-feature-support.ts";

const InitialInitiativeSetupBrand: unique symbol = Symbol(
  "InitialInitiativeSetup",
);

class InitialInitiativeSetupWorkflow {
  readonly [InitialInitiativeSetupBrand] = true;
  #state: BattleState;
  #setupOpen = true;
  readonly #consumedInitiativeSwapSources = new Set<CombatantId>();

  constructor(state: BattleState) {
    this.#state = state;
  }

  get state(): BattleState {
    return this.#state;
  }

  get setupOpen(): boolean {
    return this.#setupOpen;
  }

  hasConsumedInitiativeSwapSource(sourceId: CombatantId): boolean {
    return this.#consumedInitiativeSwapSources.has(sourceId);
  }

  consumeInitiativeSwap(sourceId: CombatantId, state: BattleState): void {
    this.#consumedInitiativeSwapSources.add(sourceId);
    this.#state = state;
  }

  finish(): BattleState {
    this.#setupOpen = false;
    return this.#state;
  }
}

export type InitialInitiativeSetup = InitialInitiativeSetupWorkflow;

type StartBattleInput = {
  readonly battleId: BattleId;
  readonly combatants: readonly BattleCreatureInit[];
  readonly hidePrerequisites?: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
};

export function startBattleWithInitialInitiativeSetup(
  input: StartBattleInput,
): Either.Either<InitialInitiativeSetup, BattleStateInitIssue> {
  const state = startBattle(input);
  return Either.isLeft(state)
    ? Either.left(state.left)
    : Either.right(initialInitiativeSetupState(state.right));
}

export function finishInitialInitiativeSetup(
  setup: InitialInitiativeSetup,
): BattleState {
  return setup.finish();
}

function initialInitiativeSetupState(
  state: BattleState,
): InitialInitiativeSetup {
  return new InitialInitiativeSetupWorkflow(state);
}

export function requiredInitiativeRollModeForCombatant(
  state: BattleState,
  combatantId: CombatantId,
): AttackRollMode | undefined {
  const combatant = state.combatants.get(combatantId);
  if (combatant?.origin.kind !== "character") {
    return undefined;
  }
  const hasRemarkableAthleteAdvantage = [
    ...combatant.origin.remarkableAthleteProfiles.values(),
  ].some(
    (profile) =>
      profile.remarkableAthlete.initiative.kind === "rollAdvantage" &&
      profile.remarkableAthlete.initiative.roll === "initiative",
  );
  return hasRemarkableAthleteAdvantage ? "advantage" : undefined;
}

export function startBattle(
  input: StartBattleInput,
): Either.Either<BattleState, BattleStateInitIssue> {
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
    const druidWildShapeKnownFormsIssue =
      characterDruidWildShapeKnownFormsInitIssue(combatant);
    if (druidWildShapeKnownFormsIssue !== null) {
      return druidWildShapeKnownFormsIssue;
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

  const initiative = createInitialInitiativeForCombatants({
    combatants: input.combatants,
    emptyRosterMessage: "startBattle requires at least one combatant.",
  });
  if (Either.isLeft(initiative)) return Either.left(initiative.left);
  return Either.right({
    battleId: input.battleId,
    initiative: initiative.right,
    combatants,
    companions: new Map(),
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

type InitialInitiativeCombatant = Pick<
  BattleCreatureState,
  "combatantId" | "initiative"
>;

export function createInitialInitiativeForCombatants(input: {
  readonly combatants: readonly InitialInitiativeCombatant[];
  readonly initialCombatantOrder?: ReadonlyMap<CombatantId, number>;
  readonly emptyRosterMessage: string;
}): Either.Either<BattleState["initiative"], BattleStateInitIssue> {
  if (input.initialCombatantOrder !== undefined) {
    for (const combatant of input.combatants) {
      if (!input.initialCombatantOrder.has(combatant.combatantId)) {
        return battleStateInitIssue(
          "Initial combatant order must include every combatant.",
        );
      }
    }
  }
  const orderedEntries = input.combatants
    .map((combatant, insertionOrder) => ({
      combatant,
      callerOrder:
        input.initialCombatantOrder?.get(combatant.combatantId) ??
        insertionOrder,
    }))
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
    return battleStateInitIssue(input.emptyRosterMessage);
  }

  const initiative = createScoredInitiativeStack<CombatantId>(
    orderedEntries,
    INITIAL_ROUND,
  );
  return Either.isLeft(initiative)
    ? battleStateInitIssue(initiative.left)
    : Either.right(initiative.right);
}

export function applyInitiativeSwap(input: {
  readonly setup: InitialInitiativeSetup;
  readonly sourceId: CombatantId;
  readonly allyId: CombatantId;
  readonly allyWilling: boolean;
}): Either.Either<InitialInitiativeSetup, BattleStateInitIssue> {
  const state = input.setup.state;
  if (!input.setup.setupOpen) {
    return battleStateInitIssue(
      "Initial Initiative setup is already complete.",
    );
  }
  if (input.sourceId === input.allyId) {
    return battleStateInitIssue(
      "Initiative Swap requires a distinct willing ally.",
    );
  }
  if (input.setup.hasConsumedInitiativeSwapSource(input.sourceId)) {
    return battleStateInitIssue(
      "Initiative Swap source has already used its post-roll swap opportunity.",
    );
  }
  if (state.initiative.alreadyActed.length > 0) {
    return battleStateInitIssue(
      "Initiative Swap is only available immediately after rolling Initiative.",
    );
  }
  const source = state.combatants.get(input.sourceId);
  if (source === undefined) {
    return battleStateInitIssue(
      "Initiative Swap source must be a combatant in this battle.",
    );
  }
  const ally = state.combatants.get(input.allyId);
  if (ally === undefined) {
    return battleStateInitIssue(
      "Initiative Swap ally must be a combatant in this battle.",
    );
  }
  if (!combatantHasInitiativeProficiencyAndSwap(source)) {
    return battleStateInitIssue(
      "Initiative Swap source lacks an admitted Initiative swap support profile.",
    );
  }
  if (source.side !== ally.side) {
    return battleStateInitIssue(
      "Initiative Swap requires an ally in the same combat.",
    );
  }
  if (!input.allyWilling) {
    return battleStateInitIssue("Initiative Swap requires a willing ally.");
  }
  if (isIncapacitated(source.conditions) || isIncapacitated(ally.conditions)) {
    return battleStateInitIssue(
      "Initiative Swap is blocked while either combatant is Incapacitated.",
    );
  }

  const initiative = swapInitialInitiativeScores(
    state.initiative,
    input.sourceId,
    input.allyId,
  );
  if (Option.isNone(initiative)) {
    return battleStateInitIssue("Initiative Swap could not update Initiative.");
  }

  const combatants = new Map(state.combatants);
  combatants.set(input.sourceId, {
    ...source,
    initiative: ally.initiative,
  });
  combatants.set(input.allyId, {
    ...ally,
    initiative: source.initiative,
  });
  input.setup.consumeInitiativeSwap(input.sourceId, {
    ...state,
    combatants,
    initiative: initiative.value,
  });
  return Either.right(input.setup);
}

function combatantHasInitiativeProficiencyAndSwap(
  combatant: BattleCreatureState,
): boolean {
  return (
    combatant.origin.kind === "character" &&
    combatant.origin.characterUnitRefs.some((unitRef) =>
      unitRef.supportProfiles.some(
        (profile) =>
          typeof profile !== "string" &&
          profile.kind === INITIATIVE_PROFICIENCY_AND_SWAP_SUPPORT_PROFILE,
      ),
    )
  );
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
  const druidWildShapeKnownFormsIssue =
    characterDruidWildShapeKnownFormsInitIssue(input.combatant);
  if (druidWildShapeKnownFormsIssue !== null) {
    return druidWildShapeKnownFormsIssue;
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
  const removeIds = combatantIdsWithPresentFindFamiliarDependents(
    input.state,
    input.combatantIds,
  );
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
          activeEffects: combatant.activeEffects.flatMap((effect) =>
            removeIds.has(effect.sourceCombatantId)
              ? []
              : [
                  effect.kind === "antimagicFieldOngoingSpellSuppression"
                    ? {
                        ...effect,
                        auraMembership: {
                          ...effect.auraMembership,
                          nonOriginCombatantIds:
                            effect.auraMembership.nonOriginCombatantIds.filter(
                              (id) => !removeIds.has(id),
                            ),
                        },
                      }
                    : effect,
                ],
          ),
        },
      ]),
  );
  const companions = companionsAfterCombatantRemoval(input.state, removeIds);
  return Either.right(
    normalizeBattleGrapples({
      ...input.state,
      initiative: initiativeOption.value,
      combatants,
      companions,
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

function combatantIdsWithPresentFindFamiliarDependents(
  state: BattleState,
  combatantIds: readonly CombatantId[],
): ReadonlySet<CombatantId> {
  const removeIds = new Set(combatantIds);
  for (const { companionId, companion } of battleCompanionEntries(state)) {
    if (companion.status === "present" && removeIds.has(companion.ownerId)) {
      removeIds.add(companionId);
    }
  }
  return removeIds;
}

function companionsAfterCombatantRemoval(
  state: BattleState,
  removeIds: ReadonlySet<CombatantId>,
): BattleState["companions"] {
  return new Map(
    battleCompanionEntries(state)
      .filter(
        ({ companionId, companion }) =>
          !removeIds.has(companion.ownerId) && !removeIds.has(companionId),
      )
      .map(({ companionId, companion }) => [companionId, companion]),
  );
}
