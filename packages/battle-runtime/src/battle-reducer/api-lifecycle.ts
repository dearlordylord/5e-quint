// Public battle lifecycle API and Initial Initiative setup workflow.
// KERNEL-COVERAGE: runtime-owner CHARACTER.LIFECYCLE.LAYER_PROJECTION BATTLE.COMPOSITION.REDUCER_SPINE_CONTRACT BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

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

import { Match } from "effect";

import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { BattleCreatureInit } from "../battle-init.ts";
import {
  battleRuntimeContextFromCharacterAdmission,
  battleRuntimeSessionFromAdmittedContext,
  characterWeaponPresentationSource,
  type BattleRuntimeContext,
  type BattleRuntimeSession,
  type CharacterBattleRuntimeContext,
} from "../battle-runtime-context.ts";

import {
  BattleId,
  CombatantId,
  battleAttackExecutionScopeRefForProcedureRef,
  battleExecutionScopeCursor,
  battleExecutionScopeInitialOrNextOrdinal,
  battleExecutionScopeOrdinal,
} from "../identity.ts";
import type { BattleCompanionState } from "../companion-state.ts";
import type { BattleUnitSupportProfileIssue } from "../unit-feature-support.ts";

import {
  characterUnitProcedureBindings,
  characterExecutionWithSpellInvocations,
  bindAuthoredSelectedSpellInvocation,
  characterSpellProcedureExecution,
  spellInvocationMatchesExecution,
} from "../character-execution-admission.ts";
import { battleCompanionEntries } from "../find-familiar-state.ts";

import {
  currentActorId,
  normalizeBattleGrapples,
} from "./creature-state-leaves.ts";

import {
  battleCreatureStateAdmissionFromInit,
  combatantInitiativeInsertionIndex,
  hidePrerequisitesReferenceCombatantsIssue,
  hidePrerequisiteReferencedCombatantIds,
  isCharacterBattleCreatureState,
  positiveHpUnconsciousInitIssue,
} from "./creature-state.ts";
import { admittedSpellActs } from "./spells-profiles.ts";

import {
  battleStateInitIssue,
  battleStateInitIssues,
} from "./domain-helpers.ts";

import { resetBattleTurnResources } from "./turn-end-movement.ts";

import type {
  BattleCreatureState,
  BattleExecutionScopeAllocation,
  BattleRetiredExecutionScopeOwnership,
  BattleHidePrerequisite,
  BattleState,
  BattleStateInitIssue,
  BattleStateInitLeafIssue,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import {
  INITIAL_ROUND,
  INITIAL_TURN_RESOURCES,
} from "./battle-runtime-protocol.ts";

function admissionIssueToInitIssue(
  issue: BattleStateInitLeafIssue | BattleUnitSupportProfileIssue,
): BattleStateInitLeafIssue {
  if (issue.tag === "battleUnitSupportProfileIssue") {
    return { tag: "battleStateInitIssue", message: issue.message };
  }
  return issue;
}

export function battleStateInitIssueFromAdmissionIssues(
  issues: ReadonlyNonEmptyArray<
    BattleStateInitLeafIssue | BattleUnitSupportProfileIssue
  >,
): Either.Either<never, BattleStateInitIssue> {
  const first = admissionIssueToInitIssue(issues[0]);
  if (issues.length === 1) {
    return Either.left(first);
  }
  const second = admissionIssueToInitIssue(issues[1]);
  const rest = issues.slice(2).map(admissionIssueToInitIssue);
  return battleStateInitIssues(first, second, ...rest);
}

const InitialInitiativeSetupBrand: unique symbol = Symbol(
  "InitialInitiativeSetup",
);

class InitialInitiativeSetupWorkflow {
  readonly [InitialInitiativeSetupBrand] = true;
  #state: BattleState;
  readonly #context: BattleRuntimeContext;
  #setupOpen = true;
  readonly #consumedInitiativeSwapSources = new Set<CombatantId>();

  constructor(session: BattleRuntimeSession) {
    this.#state = session.state;
    this.#context = session.context;
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

  finish(): BattleRuntimeSession {
    this.#setupOpen = false;
    return battleRuntimeSessionFromAdmittedContext(this.#state, this.#context);
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
  const session = startBattle(input);
  return Either.isLeft(session)
    ? Either.left(session.left)
    : Either.right(initialInitiativeSetupState(session.right));
}

export function finishInitialInitiativeSetup(
  setup: InitialInitiativeSetup,
): BattleRuntimeSession {
  return setup.finish();
}

function initialInitiativeSetupState(
  session: BattleRuntimeSession,
): InitialInitiativeSetup {
  return new InitialInitiativeSetupWorkflow(session);
}

export function requiredInitiativeRollModeForCombatant(
  state: BattleState,
  combatantId: CombatantId,
): AttackRollMode | undefined {
  const combatant = state.combatants.get(combatantId);
  if (combatant?.origin.kind !== "character") {
    return undefined;
  }
  const hasRemarkableAthleteAdvantage = characterUnitProcedureBindings(
    combatant.origin.execution,
  ).some(({ procedure }) =>
    Match.value(procedure).pipe(
      Match.discriminatorsExhaustive("kind")({
        unitFeature: ({ execution }) =>
          execution.kind === "remarkableAthlete" &&
          execution.remarkableAthlete.initiative.kind === "rollAdvantage" &&
          execution.remarkableAthlete.initiative.roll === "initiative",
        unitSupportProfile: () => false,
      }),
    ),
  );
  return hasRemarkableAthleteAdvantage ? "advantage" : undefined;
}

export function startBattle(
  input: StartBattleInput,
): Either.Either<BattleRuntimeSession, BattleStateInitIssue> {
  if (input.combatants.length === 0) {
    return battleStateInitIssue("startBattle requires at least one combatant.");
  }

  const combatants = new Map<CombatantId, BattleCreatureState>();
  const executionScopeCursors = new Map<
    CombatantId,
    BattleExecutionScopeAllocation
  >();
  const characterContexts = new Map<
    CombatantId,
    CharacterBattleRuntimeContext
  >();
  const statBlockPresentations = new Map<
    CombatantId,
    import("../battle-runtime-context.ts").BattleStatBlockPresentationSource
  >();
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
    const admission = battleCreatureStateAdmissionFromInit(
      input.battleId,
      combatant,
      battleExecutionScopeOrdinal(0),
    );
    if (admission.tag === "invalid") {
      return battleStateInitIssueFromAdmissionIssues(admission.issues);
    }
    combatants.set(combatant.combatantId, admission.creature);
    if ("runtimeContext" in admission) {
      characterContexts.set(combatant.combatantId, admission.runtimeContext);
    }
    if ("statBlockPresentation" in admission) {
      statBlockPresentations.set(
        combatant.combatantId,
        admission.statBlockPresentation,
      );
    }
    if (admission.nextScopeOrdinal <= 0) {
      return battleStateInitIssue(
        `Combatant ${combatant.combatantId} admission allocated no execution scope.`,
      );
    }
    executionScopeCursors.set(combatant.combatantId, {
      kind: "active",
      nextScopeOrdinal: battleExecutionScopeCursor(admission.nextScopeOrdinal),
    });
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
  const state: BattleState = {
    battleId: input.battleId,
    initiative: initiative.right,
    combatants,
    executionScopeCursors,
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
  };
  const combatantsWithCharacterExecutions = new Map(state.combatants);
  for (const [combatantId, combatant] of state.combatants) {
    if (!isCharacterBattleCreatureState(combatant)) continue;
    const characterContext = characterContexts.get(combatantId);
    if (characterContext === undefined) {
      return battleStateInitIssue(
        `Character ${combatantId} is missing its runtime context.`,
      );
    }
    for (const attack of [
      combatant.origin.attack,
      combatant.origin.offHandAttack,
    ]) {
      if (attack == null) continue;
      const presentationSource = characterWeaponPresentationSource(
        characterContext,
        attack.weapon.weaponUnitId,
      );
      if (Either.isLeft(presentationSource)) {
        return battleStateInitIssue(
          `Character ${combatantId} weapon ${attack.weapon.weaponUnitId} has ${presentationSource.left.reason} authored presentation source.`,
        );
      }
    }
    const spellAdmission = admitCharacterSpellExecution({
      combatant,
      state,
      runtimeContext: characterContext,
    });
    combatantsWithCharacterExecutions.set(combatantId, spellAdmission.creature);
    characterContexts.set(combatantId, spellAdmission.runtimeContext);
  }
  return Either.right(
    battleRuntimeSessionFromAdmittedContext(
      {
        ...state,
        combatants: combatantsWithCharacterExecutions,
      },
      battleRuntimeContextFromCharacterAdmission(
        characterContexts,
        statBlockPresentations,
      ),
    ),
  );
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

export type InitiativeSwapCandidateWitness =
  | { readonly tag: "notAlly" }
  | { readonly tag: "unwillingAlly" }
  | { readonly tag: "willingAlly" };

const byInitiativeSwapCandidateWitnessTag = Match.discriminator("tag");

export function applyInitiativeSwap(input: {
  readonly setup: InitialInitiativeSetup;
  readonly sourceId: CombatantId;
  readonly candidateId: CombatantId;
  readonly candidateWitness: InitiativeSwapCandidateWitness;
}): Either.Either<InitialInitiativeSetup, BattleStateInitIssue> {
  const state = input.setup.state;
  if (!input.setup.setupOpen) {
    return battleStateInitIssue(
      "Initial Initiative setup is already complete.",
    );
  }
  if (input.sourceId === input.candidateId) {
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
  const candidate = state.combatants.get(input.candidateId);
  if (candidate === undefined) {
    return battleStateInitIssue(
      "Initiative Swap candidate must be a combatant in this battle.",
    );
  }
  if (!combatantHasInitiativeProficiencyAndSwap(source)) {
    return battleStateInitIssue(
      "Initiative Swap source lacks an admitted Initiative swap support profile.",
    );
  }
  const candidateIssue = Match.value(input.candidateWitness).pipe(
    byInitiativeSwapCandidateWitnessTag("notAlly", () =>
      battleStateInitIssue(
        "Initiative Swap requires an ally in the same combat.",
      ),
    ),
    byInitiativeSwapCandidateWitnessTag("unwillingAlly", () =>
      battleStateInitIssue("Initiative Swap requires a willing ally."),
    ),
    byInitiativeSwapCandidateWitnessTag("willingAlly", () => null),
    Match.exhaustive,
  );
  if (candidateIssue !== null) {
    return candidateIssue;
  }
  if (
    isIncapacitated(source.conditions) ||
    isIncapacitated(candidate.conditions)
  ) {
    return battleStateInitIssue(
      "Initiative Swap is blocked while either combatant is Incapacitated.",
    );
  }

  const initiative = swapInitialInitiativeScores(
    state.initiative,
    input.sourceId,
    input.candidateId,
  );
  if (Option.isNone(initiative)) {
    return battleStateInitIssue("Initiative Swap could not update Initiative.");
  }

  const combatants = new Map(state.combatants);
  combatants.set(input.sourceId, {
    ...source,
    initiative: candidate.initiative,
  });
  combatants.set(input.candidateId, {
    ...candidate,
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
    combatant.origin.execution.procedureBindings.some((binding) => {
      const procedure = binding.procedure;
      return (
        (procedure.kind === "unitFeature" ||
          procedure.kind === "unitSupportProfile") &&
        typeof procedure.execution === "object" &&
        procedure.execution.kind === "initiativeProficiencyAndSwap"
      );
    })
  );
}

type AddBattleCombatantInput = {
  readonly state: BattleState;
  readonly combatant: BattleCreatureInit;
  readonly tieOrderIndex?: number;
};

function admitCharacterSpellExecution(input: {
  readonly combatant: CharacterBattleCreatureState;
  readonly state: BattleState;
  readonly runtimeContext: CharacterBattleRuntimeContext;
}): {
  readonly creature: CharacterBattleCreatureState;
  readonly runtimeContext: CharacterBattleRuntimeContext;
} {
  const admitted = admittedSpellActs(
    input.combatant,
    input.state,
    input.runtimeContext.spellcastingPresentationSource,
  );
  const execution = characterExecutionWithSpellInvocations(
    input.combatant.origin.execution,
    admitted,
  );
  return {
    creature: {
      ...input.combatant,
      origin: {
        ...input.combatant.origin,
        execution,
      },
    },
    runtimeContext: {
      ...input.runtimeContext,
      spellPresentationSources: execution.procedureBindings.flatMap(
        ({ procedureRef, procedure }) =>
          Match.value(procedure).pipe(
            Match.discriminatorsExhaustive("kind")({
              spellInvocation: () => {
                const storedExecution = characterSpellProcedureExecution(
                  execution,
                  procedureRef,
                );
                const invocation =
                  storedExecution === undefined
                    ? undefined
                    : admitted.find((candidate) =>
                        spellInvocationMatchesExecution(
                          candidate,
                          storedExecution,
                        ),
                      );
                return invocation === undefined
                  ? []
                  : [
                      {
                        procedureRef,
                        invocation: bindAuthoredSelectedSpellInvocation(
                          invocation,
                          procedureRef,
                        ),
                      },
                    ];
              },
              unavailableSpellInvocation: () => [],
              unitFeature: () => [],
              unitSupportProfile: () => [],
            }),
          ),
      ),
    },
  };
}

function admitBattleCombatant(input: AddBattleCombatantInput): Either.Either<
  {
    readonly state: BattleState;
    readonly characterContext?: CharacterBattleRuntimeContext;
  },
  BattleStateInitIssue
> {
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
  const admission = battleCreatureStateAdmissionFromInit(
    input.state.battleId,
    input.combatant,
    battleExecutionScopeInitialOrNextOrdinal(
      input.state.executionScopeCursors.get(input.combatant.combatantId)
        ?.nextScopeOrdinal,
    ),
  );
  if (admission.tag === "invalid") {
    return battleStateInitIssueFromAdmissionIssues(admission.issues);
  }
  const combatantsWithAdmission = new Map(input.state.combatants).set(
    input.combatant.combatantId,
    admission.creature,
  );
  const stateWithAdmission = {
    ...input.state,
    combatants: combatantsWithAdmission,
  };
  const characterSpellAdmission =
    isCharacterBattleCreatureState(admission.creature) &&
    "runtimeContext" in admission
      ? admitCharacterSpellExecution({
          combatant: admission.creature,
          state: stateWithAdmission,
          runtimeContext: admission.runtimeContext,
        })
      : undefined;
  const admittedCreature =
    characterSpellAdmission?.creature ?? admission.creature;
  const nextCombatants = new Map(input.state.combatants).set(
    input.combatant.combatantId,
    admittedCreature,
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
  const executionScopeCursors = new Map(input.state.executionScopeCursors);
  if (admission.nextScopeOrdinal <= 0) {
    return battleStateInitIssue(
      `Combatant ${input.combatant.combatantId} admission allocated no execution scope.`,
    );
  }
  executionScopeCursors.set(input.combatant.combatantId, {
    kind: "active",
    nextScopeOrdinal: battleExecutionScopeCursor(admission.nextScopeOrdinal),
  });

  return Either.right({
    state: {
      ...input.state,
      initiative,
      combatants: nextCombatants,
      executionScopeCursors,
    },
    ...(characterSpellAdmission === undefined
      ? {}
      : { characterContext: characterSpellAdmission.runtimeContext }),
  });
}

export function addBattleCombatant(
  input: AddBattleCombatantInput,
): Either.Either<BattleState, BattleStateInitIssue> {
  return Either.map(
    admitBattleCombatant(input),
    (admission) => admission.state,
  );
}

export function addBattleRuntimeCombatant(input: {
  readonly session: BattleRuntimeSession;
  readonly combatant: BattleCreatureInit;
  readonly tieOrderIndex?: number;
}): Either.Either<BattleRuntimeSession, BattleStateInitIssue> {
  return Either.map(
    admitBattleCombatant({
      state: input.session.state,
      combatant: input.combatant,
      ...(input.tieOrderIndex === undefined
        ? {}
        : { tieOrderIndex: input.tieOrderIndex }),
    }),
    (admission) => {
      const characters = new Map(input.session.context.characters);
      if (admission.characterContext !== undefined) {
        characters.set(input.combatant.combatantId, admission.characterContext);
      }
      return battleRuntimeSessionFromAdmittedContext(
        admission.state,
        battleRuntimeContextFromCharacterAdmission(characters),
      );
    },
  );
}

function battleCreatureRetiredExecutionScopeOwnership(
  combatant: BattleCreatureState,
): BattleRetiredExecutionScopeOwnership {
  return combatant.origin.kind === "statBlock"
    ? {
        kind: "statBlock",
        statBlockScopeRef: combatant.origin.execution.scopeRef,
      }
    : {
        kind: "character",
        characterScopeRef: combatant.origin.execution.scopeRef,
        attackScopeRef: battleAttackExecutionScopeRefForProcedureRef(
          combatant.origin.unarmedStrike.procedureRef,
        ),
        formScopeRefs: (
          combatant.origin.druidWildShapeAvailableForms ?? []
        ).map((form) => form.execution.scopeRef),
      };
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
  const executionScopeCursors = new Map(input.state.executionScopeCursors);
  for (const id of removeIds) {
    const combatant = input.state.combatants.get(id);
    const allocation = executionScopeCursors.get(id);
    if (combatant === undefined || allocation?.kind !== "active") {
      return battleStateInitIssue(
        "Cannot retire a combatant without an active execution-scope allocation.",
      );
    }
    executionScopeCursors.set(id, {
      kind: "retired",
      nextScopeOrdinal: allocation.nextScopeOrdinal,
      ownership: battleCreatureRetiredExecutionScopeOwnership(combatant),
    });
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
      executionScopeCursors,
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
        [...input.state.hidePrerequisites].filter(([id, prerequisite]) =>
          hidePrerequisiteReferencedCombatantIds(id, prerequisite).every(
            (referencedId) => !removeIds.has(referencedId),
          ),
        ),
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

export function removeBattleRuntimeCombatants(input: {
  readonly session: BattleRuntimeSession;
  readonly combatantIds: readonly CombatantId[];
}): Either.Either<BattleRuntimeSession, BattleStateInitIssue> {
  return Either.map(
    removeBattleCombatants({
      state: input.session.state,
      combatantIds: input.combatantIds,
    }),
    (state) =>
      battleRuntimeSessionFromAdmittedContext(
        state,
        battleRuntimeContextFromCharacterAdmission(
          new Map(
            [...input.session.context.characters].filter(([combatantId]) =>
              state.combatants.has(combatantId),
            ),
          ),
        ),
      ),
  );
}

function combatantIdsWithPresentFindFamiliarDependents(
  state: BattleState,
  combatantIds: readonly CombatantId[],
): ReadonlySet<CombatantId> {
  const removeIds = new Set(combatantIds);
  for (const { companion } of battleCompanionEntries(state)) {
    if (companion.status === "present" && removeIds.has(companion.ownerId)) {
      removeIds.add(companion.combatantId);
    }
  }
  return removeIds;
}

function companionsAfterCombatantRemoval(
  state: BattleState,
  removeIds: ReadonlySet<CombatantId>,
): BattleState["companions"] {
  const retainedEntries: Array<readonly [CombatantId, BattleCompanionState]> =
    [];
  for (const { ownerId, companion } of battleCompanionEntries(state)) {
    if (removeIds.has(companion.ownerId)) {
      continue;
    }
    if (
      companion.status === "present" &&
      removeIds.has(companion.combatantId)
    ) {
      continue;
    }
    retainedEntries.push([ownerId, companion]);
  }
  return new Map(retainedEntries);
}
